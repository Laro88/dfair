const { DanfossAir } = require('../src/index');

/**
 * Example demonstrating write operations with Danfoss Air API
 * 
 * This example shows how to:
 * - Activate/deactivate boost mode
 * - Set fan speed step
 * - Write custom parameter values
 * 
 * Note: Replace '192.168.1.100' with your actual Danfoss Air unit's IP address
 */

async function demonstrateWriteOperations() {
    // Initialize the Danfoss Air connection
    const dfair = new DanfossAir({
        ip: process.env.DANFOSS_AIR_IP || '192.168.1.100',  // Replace with your device IP
        delaySeconds: 3,
        debug: false,
        callbackFunction: (data) => {
            console.log('Received updated data after write operations:');
            const boost = data.find(param => param.id === 'Boost');
            const fanStep = data.find(param => param.name === 'Fan Step');
            const mode = data.find(param => param.id === 'operation_mode');

            if (boost) {
                console.log(`  Boost mode: ${boost.value ? 'ACTIVE' : 'INACTIVE'}`);
            }
            if (fanStep) {
                console.log(`  Fan step: ${fanStep.value}`);
            }
            if (mode) {
                console.log(`  Operation mode: ${mode.value}`);
            }
        },
        errorCallback: (error) => {
            console.error('❌ Write operation failed:', error);
            console.log('   This callback is called when socket-level write operations fail');
        }
    });
    await dfair.start();

    try {
        console.log('=== Danfoss Air Write Operations Demo ===\n');
        const fanModeParam = dfair.getParameter('operation_mode');
        console.log(`   Fan mode parameter: ${fanModeParam?.value} (last updated: ${new Date(fanModeParam?.valuetimestamp || 0).toLocaleTimeString()})`);

        console.log('1. Activating manual mode...');
        await dfair.setMode(2);
        console.log(`   Fan mode parameter: ${fanModeParam?.value} (last updated: ${new Date(fanModeParam?.valuetimestamp || 0).toLocaleTimeString()})`);


        console.log('   ✓ Manual mode activated\n');

        // Wait a moment
        await sleep(5000);
        console.log(`   Fan mode parameter: ${fanModeParam?.value} (last updated: ${new Date(fanModeParam?.valuetimestamp || 0).toLocaleTimeString()})`);

        
        // Example 2: Set fan step to 5
        console.log('2. Setting fan step to 5...');
        await dfair.setFanStep(5);
        console.log('   ✓ Fan step set to 5\n');
        
        // Wait a moment
        await sleep(10000);

        // Example 2: Set fan step to 2
        console.log('2. Setting fan step to 2...');
        await dfair.setFanStep(2);
        console.log('   ✓ Fan step set to 2\n');
        
        // Wait a moment
        await sleep(10000);
        console.log(`   Fan mode parameter: ${fanModeParam?.value} (last updated: ${new Date(fanModeParam?.valuetimestamp || 0).toLocaleTimeString()})`);

        // Example 3: Deactivate manual mode
        console.log('3. Deactivating manual mode...');
        await dfair.setMode(0);
        console.log(`   Fan mode parameter: ${fanModeParam?.value} (last updated: ${new Date(fanModeParam?.valuetimestamp || 0).toLocaleTimeString()})`);

        console.log('   ✓ Manual mode deactivated\n');

        await sleep(6000);

        console.log(`   Fan mode parameter: ${fanModeParam?.value} (last updated: ${new Date(fanModeParam?.valuetimestamp || 0).toLocaleTimeString()})`);


        // Example 5: Check parameter status
        console.log('5. Checking current parameter values...');
        const boostParam = dfair.getParameter('boost');
        const fanParam = dfair.getParameter('fan_step');
        
        await sleep(20000);
        console.log(`   Boost parameter: ${boostParam?.value} (last updated: ${new Date(boostParam?.valuetimestamp || 0).toLocaleTimeString()})`);
        console.log(`   Fan step parameter: ${fanParam?.value} (last updated: ${new Date(fanParam?.valuetimestamp || 0).toLocaleTimeString()})`);
        console.log(`   Fan mode parameter: ${fanModeParam?.value} (last updated: ${new Date(fanModeParam?.valuetimestamp || 0).toLocaleTimeString()})`);

        console.log('\n=== Write Operations Demo Complete ===');

    } catch (error) {
        console.error('Error during write operations:', error?.message || error);

        if (error?.message?.includes('ECONNREFUSED') || error?.message?.includes('connect')) {
            console.log('\n📡 Connection failed - this is expected if no Danfoss Air unit is available at the specified IP.');
            console.log('   To test with a real device:');
            console.log('   1. Find your Danfoss Air unit\'s IP address');
            console.log('   2. Update the IP address in this script');
            console.log('   3. Ensure the device is connected to your network');
        }
    } finally {
        // Clean up
        //dfair.cleanup();
    }
}

// Helper function for delays
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {

    try {
        // Show available write operations
        console.log('📝 Available Write Operations:');
        console.log('  • activateBoost() / deactivateBoost()');
        console.log('  • setFanStep(1-10)');
        console.log('  • writeParameterValue(id, value)');
        console.log('');

        console.log('🔧 Supported Writable Parameters:');
        const dfairTemp = new DanfossAir({ ip: '127.0.0.1', delaySeconds: 30 });
        ['boost', 'bypass', 'automatic_bypass', 'operation_mode', 'fan_step'].forEach(paramId => {
            const param = dfairTemp.getParameter(paramId);
            if (param) {
                console.log(`  • ${paramId}: ${param.name} (${param.datatype})`);
            }
        });
        dfairTemp.cleanup();
        console.log('');

        // Run the demonstration
        await demonstrateWriteOperations();

    } catch (e) {
        console.error(e);
    }
})();

// Handle the SIGINT signal (Ctrl+C)
process.on('SIGINT', () => {
    dfair.cleanup();
    console.log("\nExiting the application. Goodbye!");
    process.exit(0); // Exit gracefully
});

// Keep the process running
process.stdin.resume();