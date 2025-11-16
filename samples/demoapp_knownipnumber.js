const { init } = require('../dist/index.js');

console.log("demoapp_knownipnumber started");

// Replace with your Danfoss Air unit's IP address
const DANFOSS_AIR_IP = process.env.DANFOSS_AIR_IP || "10.10.10.167";

const dfair1 = init(DANFOSS_AIR_IP, 5, false, dfair_callback);

dfair1.start();

function dfair_callback(payloadObject) {
    console.log("dfair_callback invoked: payload:", JSON.stringify(payloadObject, null, 2));
}