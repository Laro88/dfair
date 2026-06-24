const net = require('net');

// The Danfoss Air protocol uses fixed 63-byte request frames on TCP port 30046:
//   [0]    endpoint
//   [1]    operation (4 = read, 6 = write)
//   [2..3] address (big-endian uint16)
// Responses carry the raw value starting at offset 0, decoded per datatype.
const REQUEST_FRAME_SIZE = 63;
const DANFOSS_PORT = 30046;

// Helpers to build response payloads matching what processIncomingData decodes.
function byteBuf(value) {
  return Buffer.from([value & 0xff]);
}
function boolBuf(value) {
  return Buffer.from([value ? 1 : 0]);
}
function ushortBuf(value) {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(value & 0xffff, 0);
  return b;
}
function uintBuf(value) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(value >>> 0, 0);
  return b;
}

/**
 * Create a mock Danfoss Air device.
 *
 * @param {object} [options]
 * @param {(req: {endpoint:number, op:number, address:number, time:number}) =>
 *          (Buffer | {buffer: Buffer, delay?: number} | Array | null | undefined)} [options.responder]
 *   Returns the response payload(s) for a request, or null/undefined for no reply.
 *   A `{buffer, delay}` entry sends that buffer after `delay` ms.
 *   Defaults to a 4-byte zero payload (valid for any read type).
 */
function createMockServer(options = {}) {
  const requests = [];
  let responder = options.responder || (() => Buffer.alloc(4));

  const server = net.createServer((socket) => {
    socket.on('error', () => { /* ignore client teardown errors */ });
    socket.on('data', (data) => {
      for (let off = 0; off + REQUEST_FRAME_SIZE <= data.length; off += REQUEST_FRAME_SIZE) {
        const frame = data.subarray(off, off + REQUEST_FRAME_SIZE);
        const req = {
          endpoint: frame[0],
          op: frame[1],
          address: frame.readUInt16BE(2),
          time: Date.now()
        };
        requests.push(req);

        const result = responder(req);
        if (result == null) {
          continue;
        }
        const entries = Array.isArray(result) ? result : [result];
        for (const entry of entries) {
          const buf = Buffer.isBuffer(entry) ? entry : entry.buffer;
          const delay = Buffer.isBuffer(entry) ? 0 : (entry.delay || 0);
          if (!buf) {
            continue;
          }
          if (delay > 0) {
            setTimeout(() => {
              if (!socket.destroyed) {
                socket.write(buf);
              }
            }, delay);
          } else if (!socket.destroyed) {
            socket.write(buf);
          }
        }
      }
    });
  });

  return {
    server,
    requests,
    setResponder(fn) {
      responder = fn;
    },
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(DANFOSS_PORT, '127.0.0.1', () => {
          server.removeListener('error', reject);
          resolve();
        });
      });
    },
    close() {
      return new Promise((resolve) => server.close(() => resolve()));
    }
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  createMockServer,
  sleep,
  byteBuf,
  boolBuf,
  ushortBuf,
  uintBuf,
  DANFOSS_PORT
};
