const { test } = require('node:test');
const assert = require('node:assert');

const { DanfossAir } = require('../dist/index.js');
const {
  createMockServer,
  sleep,
  byteBuf,
  boolBuf,
  ushortBuf,
  uintBuf
} = require('./mock-server');

// Track unhandled rejections for the whole file so the cleanup test can assert
// that releasing an in-flight operation does not leak one.
const unhandledRejections = [];
process.on('unhandledRejection', (reason) => {
  unhandledRejections.push(reason);
});

// Serial-number reads (addresses 36/37) must always succeed so start() resolves.
const SERIAL_ADDRESSES = new Set([36, 37]);

// P1 — with continueOnError the inter-cycle delay must be restored: after a
// burst of reads there should be a quiet gap of ~delaySeconds before the next
// burst (the old code busy-polled with no gap).
test('continueOnError keeps a delay between refresh cycles', async () => {
  const mock = createMockServer();
  await mock.listen();

  const dfair = new DanfossAir({
    ip: '127.0.0.1',
    delaySeconds: 1,
    continueOnError: true,
    callbackFunction: () => {}
  });

  try {
    await dfair.start();
    await sleep(4500);
  } finally {
    dfair.cleanup();
    await mock.close();
  }

  const times = mock.requests.map((r) => r.time);
  assert.ok(times.length > 5, `expected several requests, got ${times.length}`);

  let maxGap = 0;
  for (let i = 1; i < times.length; i++) {
    maxGap = Math.max(maxGap, times[i] - times[i - 1]);
  }
  // Reads within a cycle are ~100ms apart; the restored inter-cycle delay is
  // ~1000ms. Busy-polling (the bug) would never produce a gap this large.
  assert.ok(maxGap > 600, `expected an inter-cycle gap > 600ms, max gap was ${maxGap}ms`);
});

// P1 — with only a singleCallbackFunction (no callbackFunction) the loop must
// keep running. The old code stopped after a single cycle in this configuration.
test('polling continues with only a singleCallbackFunction', async () => {
  const mock = createMockServer();
  await mock.listen();

  let supplyReports = 0;
  const dfair = new DanfossAir({
    ip: '127.0.0.1',
    delaySeconds: 1,
    singleCallbackFunction: (data) => {
      if (data.id === 'fanspeed_supply_actual') {
        supplyReports++;
      }
    }
  });

  try {
    await dfair.start();
    // Wait long enough for at least two full cycles (first cycle ~2s).
    const deadline = Date.now() + 9000;
    while (supplyReports < 2 && Date.now() < deadline) {
      await sleep(200);
    }
  } finally {
    dfair.cleanup();
    await mock.close();
  }

  assert.ok(
    supplyReports >= 2,
    `expected polling to repeat (>=2 cycles), got ${supplyReports} reports`
  );
});

// P2 — cleanup() while a read is in flight must release the pending await
// (no hang, no unhandled rejection) and must not re-arm the loop afterwards.
test('cleanup mid-flight releases in-flight operation and stops polling', async () => {
  const before = unhandledRejections.length;

  const mock = createMockServer({
    responder: (req) => {
      if (SERIAL_ADDRESSES.has(req.address)) {
        return ushortBuf(1);
      }
      // Stall every other read so one stays in flight when we clean up.
      return { buffer: ushortBuf(0), delay: 5000 };
    }
  });
  await mock.listen();

  let connectionErrors = 0;
  const dfair = new DanfossAir({
    ip: '127.0.0.1',
    delaySeconds: 1,
    callbackFunction: () => {},
    errorCallback: (_err, type) => {
      if (type === 'connection') {
        connectionErrors++;
      }
    }
  });

  await dfair.start();
  // Let the first refresh cycle begin and a stalled read go in flight.
  await sleep(800);
  const requestsAtCleanup = mock.requests.length;

  dfair.cleanup();

  // Give any leaked timer/promise a chance to misbehave.
  await sleep(1200);
  const requestsAfterCleanup = mock.requests.length;

  await mock.close();

  assert.strictEqual(
    requestsAfterCleanup,
    requestsAtCleanup,
    'no further requests should be issued after cleanup'
  );
  assert.ok(connectionErrors >= 1, 'the released in-flight read should surface a connection error');
  assert.strictEqual(
    unhandledRejections.length,
    before,
    `cleanup must not leak an unhandled rejection (new: ${unhandledRejections.slice(before)})`
  );
});

// P2 — a late/duplicate frame arriving with no operation in flight must be
// ignored, not applied to whatever parameter is read next.
test('stale duplicate response is ignored', async () => {
  // humidity (byte, addr 5232): reply 255 -> 100, then a late bogus 0 frame.
  const HUMIDITY_ADDR = 5232;
  const mock = createMockServer({
    responder: (req) => {
      if (req.address === HUMIDITY_ADDR) {
        return [byteBuf(255), { buffer: byteBuf(0), delay: 20 }];
      }
      // 4 bytes satisfies every read datatype (byte/bool/ushort/uint).
      return uintBuf(0);
    }
  });
  await mock.listen();

  let dfair;
  const firstCycle = new Promise((resolve) => {
    dfair = new DanfossAir({
      ip: '127.0.0.1',
      delaySeconds: 1,
      callbackFunction: () => resolve()
    });
  });

  try {
    await dfair.start();
    await firstCycle;
    // Allow the late duplicate frame (delay 20ms) to arrive between reads.
    await sleep(200);
    const humidity = dfair.getParameter('humidity_measured_relative');
    assert.strictEqual(
      humidity.value,
      100,
      `humidity should reflect the first response (100), got ${humidity.value}`
    );
  } finally {
    dfair.cleanup();
    await mock.close();
  }
});

// Parsing — each datatype decodes and scales correctly end-to-end.
test('decodes and scales each datatype correctly', async () => {
  const responder = (req) => {
    switch (req.address) {
      case 5232: // humidity_measured_relative: byte, scale 100/255, precision 1
        return byteBuf(255);
      case 0x1472: // temperature_outdoor: ushort, scale 0.01
        return ushortBuf(2000);
      case 992: // total_running_minutes: uint, scale 1
        return uintBuf(12345);
      case 5424: // boost: bool
        return boolBuf(1);
      default:
        // 4 bytes satisfies every read datatype (byte/bool/ushort/uint).
        return uintBuf(0);
    }
  };
  const mock = createMockServer({ responder });
  await mock.listen();

  let dfair;
  const firstCycle = new Promise((resolve) => {
    dfair = new DanfossAir({
      ip: '127.0.0.1',
      delaySeconds: 1,
      callbackFunction: () => resolve()
    });
  });

  try {
    await dfair.start();
    await firstCycle;

    assert.strictEqual(dfair.getParameter('humidity_measured_relative').value, 100);
    assert.strictEqual(dfair.getParameter('temperature_outdoor').value, 20);
    assert.strictEqual(dfair.getParameter('total_running_minutes').value, 12345);
    assert.strictEqual(dfair.getParameter('boost').value, true);
  } finally {
    dfair.cleanup();
    await mock.close();
  }
});
