const { DanfossAir } = require('../dist/index.js');

// Test write operations functionality
console.log('Running write operations tests...');

// Test 1: Check that write methods exist
const dfair = new DanfossAir({
    ip: '127.0.0.1',
    delaySeconds: 30,
    debug: false
});

if (typeof dfair.writeParameterValue !== 'function') {
    console.error('FAIL: writeParameterValue method not found');
    process.exit(1);
}

if (typeof dfair.activateBoost !== 'function') {
    console.error('FAIL: activateBoost method not found');
    process.exit(1);
}

if (typeof dfair.deactivateBoost !== 'function') {
    console.error('FAIL: deactivateBoost method not found');
    process.exit(1);
}

if (typeof dfair.setFanStep !== 'function') {
    console.error('FAIL: setFanStep method not found');
    process.exit(1);
}

if (typeof dfair.getParameter !== 'function') {
    console.error('FAIL: getParameter method not found');
    process.exit(1);
}

if (typeof dfair.isWritableParameter !== 'function') {
    console.error('FAIL: isWritableParameter method not found');
    process.exit(1);
}

console.log('PASS: All write operation methods are available');

// Test 2: Check parameter retrieval
const boostParam = dfair.getParameter('boost');
if (!boostParam) {
    console.error('FAIL: boost parameter not found');
    process.exit(1);
}

if (boostParam.id !== 'boost' || boostParam.datatype !== 'bool') {
    console.error('FAIL: boost parameter has incorrect properties');
    process.exit(1);
}

console.log('PASS: Parameter retrieval works correctly');

// Test 3: Check writable parameter validation
if (!dfair.isWritableParameter('boost')) {
    console.error('FAIL: boost parameter should be writable');
    process.exit(1);
}

if (dfair.isWritableParameter('humidity_measured_relative')) {
    console.error('FAIL: humidity parameter should not be writable');
    process.exit(1);
}

console.log('PASS: Writable parameter validation works correctly');

// Test 4: Check validation in convenience methods
async function testValidation() {
    try {
        // This should fail validation because the step is invalid
        await dfair.setFanStep(0);
        console.error('FAIL: setFanStep should reject invalid step values');
        process.exit(1);
    } catch (error) {
        if (!error.message.includes('Fan step must be between 1 and 10')) {
            console.error('FAIL: setFanStep should validate step range, got:', error.message);
            process.exit(1);
        }
    }

    try {
        await dfair.setFanStep(11);
        console.error('FAIL: setFanStep should reject invalid step values');
        process.exit(1);
    } catch (error) {
        if (!error.message.includes('Fan step must be between 1 and 10')) {
            console.error('FAIL: setFanStep should validate step range, got:', error.message);
            process.exit(1);
        }
    }

    console.log('PASS: Input validation works correctly');

    // Test 5: Check error handling for invalid parameters
    try {
        await dfair.writeParameterValue('nonexistent', true);
        console.error('FAIL: writeParameterValue should reject nonexistent parameters');
        process.exit(1);
    } catch (error) {
        if (!error.message.includes("Parameter 'nonexistent' not found")) {
            console.error('FAIL: writeParameterValue should handle missing parameters correctly, got:', error.message);
            process.exit(1);
        }
    }

    try {
        await dfair.writeParameterValue('humidity_measured_relative', 50);
        console.error('FAIL: writeParameterValue should reject non-writable parameters');
        process.exit(1);
    } catch (error) {
        if (!error.message.includes("is not writable")) {
            console.error('FAIL: writeParameterValue should handle non-writable parameters correctly, got:', error.message);
            process.exit(1);
        }
    }

    console.log('PASS: Error handling for invalid parameters works correctly');

    // Clean up
    dfair.cleanup();

    console.log('PASS: All write operation tests passed!');
    console.log('Note: Actual device communication testing requires a Danfoss Air unit on the network.');
    process.exit(0);
}

testValidation().catch(error => {
    console.error('FAIL: Unexpected error in async test:', error.message);
    process.exit(1);
});