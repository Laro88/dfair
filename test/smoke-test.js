const { init, DanfossAir } = require('../dist/index.js');

// Basic smoke test to ensure the module loads and exports work correctly
console.log('Running basic smoke tests...');

// Test 1: Check exports exist
if (typeof init !== 'function') {
    console.error('FAIL: init function not exported');
    process.exit(1);
}

if (typeof DanfossAir !== 'function') {
    console.error('FAIL: DanfossAir class not exported');
    process.exit(1);
}

// Test 2: Check init function creates instance (will fail to connect but that's expected)
try {
    const instance = init('127.0.0.1', 30, false, () => {});
    if (!instance) {
        console.error('FAIL: init did not return an instance');
        process.exit(1);
    }
    
    // Clean up the instance
    setTimeout(() => {
        instance.cleanup();
        console.log('PASS: All smoke tests passed!');
        console.log('Note: Actual device connection testing requires a Danfoss Air unit on the network.');
        process.exit(0);
    }, 1000);
    
} catch (error) {
    // Expected to fail connection, but should not throw during initialization
    if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
        console.log('PASS: Module loads correctly (connection failure expected without device)');
        process.exit(0);
    } else {
        console.error('FAIL: Unexpected error during initialization:', error.message);
        process.exit(1);
    }
}