import { DanfossAir, init, ParamData } from '../src/index.ts';

console.log("TypeScript demo app started");

// Replace with your Danfoss Air unit's IP address
const DANFOSS_AIR_IP = process.env.DANFOSS_AIR_IP || "10.10.10.167";

const dfair = new DanfossAir({
    ip: DANFOSS_AIR_IP,
    delaySeconds: 5,
    debug: true,
    callbackFunction: dfairCallback,
    singleCallbackFunction: dfairSingleCallback,
    errorCallback: (err: Error) => {
        console.error("Write operation error:", err);
    }
});

dfair.start();

function dfairSingleCallback(data: ParamData): void {
    console.log("Single data received:", JSON.stringify(data, null, 2));
}

function dfairCallback(data: ParamData[]): void {
    //console.log("Data received:", JSON.stringify(data, null, 2));
    
    // Example: Extract specific values
    const humidity = data.find(param => param.id === "humidity_measured_relative");
    const supplyFanSpeed = data.find(param => param.id === "fanspeed_supply_actual");

    if (humidity && supplyFanSpeed) {
        console.log(`Humidity: ${humidity.value}${humidity.unit}, Supply Fan: ${supplyFanSpeed.value}${supplyFanSpeed.unit}`);
    }
}