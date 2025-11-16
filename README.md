# Danfoss Air API

A TypeScript/Node.js library for communicating with Danfoss Air ventilation systems over LAN.

## Features

- **TypeScript Support**: Full TypeScript definitions and type safety
- **Easy Integration**: Simple callback-based API for real-time data
- **Comprehensive Data**: Access to fan speeds, temperatures, humidity, battery status and more
- **MQTT Ready**: Built-in support for MQTT integration
- **Well Documented**: Complete API documentation and examples

## Installation

```bash
npm install danfoss-air-api
```

## Quick Start

### JavaScript

```javascript
const { init } = require('danfoss-air-api');

// Replace with your Danfoss Air unit's IP address
const danfossAir = init("192.168.1.100", 30, false, (data) => {
    console.log("Received data:", data);
    
    // Extract specific values
    const humidity = data.find(param => param.name === "relative humidity measured");
    const supplyFan = data.find(param => param.name === "Actual Supply Fan Speed");
    
    if (humidity && supplyFan) {
        console.log(`Humidity: ${humidity.value}%, Supply Fan: ${supplyFan.value}rpm`);
    }
});
```

### TypeScript

```typescript
import { init, ParamData } from 'danfoss-air-api';

const danfossAir = init("192.168.1.100", 30, false, (data: ParamData[]) => {
    console.log("Received data:", data);
    
    // Type-safe data access
    data.forEach(param => {
        console.log(`${param.name}: ${param.value}${param.unit}`);
    });
});
```

## API Reference

### `init(ip, delaySeconds, debug, callbackFunction)`

Initialize a connection to your Danfoss Air unit.

- **ip**: `string` - IP address of your Danfoss Air unit
- **delaySeconds**: `number` - Delay between data updates (minimum 3 seconds recommended)
- **debug**: `boolean` - Enable debug logging
- **callbackFunction**: `(data: ParamData[]) => void` - Function called with updated data

Returns a `DanfossAir` instance.

### Using `singleCallbackFunction` and Direct Class Instantiation

You can also use the `singleCallbackFunction` option to receive updates for each parameter as soon as it is read, instead of waiting for the full set. This is useful for streaming or real-time applications.

#### Example: Using `singleCallbackFunction`

```typescript
import { DanfossAir, ParamData } from 'danfoss-air-api';

const dfair = new DanfossAir({
    ip: '192.168.1.100',
    delaySeconds: 10,
    debug: false,
    singleCallbackFunction: (data: ParamData) => {
        console.log('Single param update:', data);
    }
});
```

#### Direct Class Instantiation

Instead of using the `init` function, you can instantiate the `DanfossAir` class directly for more advanced use cases. This allows you to specify both `callbackFunction` and `singleCallbackFunction` if desired:

```typescript
import { DanfossAir, ParamData } from 'danfoss-air-api';

const dfair = new DanfossAir({
    ip: '192.168.1.100',
    delaySeconds: 10,
    debug: true,
    callbackFunction: (data: ParamData[]) => {
        console.log('All params:', data);
    },
    singleCallbackFunction: (data: ParamData) => {
        console.log('Single param:', data);
    },
    errorCallback: (error: Error) => {
        console.error('Write operation failed:', error.message);
        // Handle write failures (e.g., network issues, device errors)
    }
});
```

### Write Operations

The library now supports write operations to control your Danfoss Air unit:

#### Quick Write Examples

```javascript
const { DanfossAir } = require('danfoss-air-api');

const dfair = new DanfossAir({
    ip: '192.168.1.100',
    delaySeconds: 30,
    debug: false
});

// Activate boost mode
await dfair.activateBoost();

// Set fan speed step (1-10)
await dfair.setFanStep(5);

// Deactivate boost mode
await dfair.deactivateBoost();

// Generic parameter write
await dfair.writeParameterValue('fan_step', 3);

// Clean up when done
dfair.cleanup();
```

#### Available Write Methods

- **`activateBoost()`** - Activate boost ventilation mode
- **`deactivateBoost()`** - Deactivate boost ventilation mode  
- **`setFanStep(step)`** - Set fan speed step (1-10)
- **`writeParameterValue(id, value)`** - Write to any writable parameter
- **`getParameter(id)`** - Get parameter information
- **`isWritableParameter(id)`** - Check if parameter supports writing

#### Writable Parameters

- **boost** - Boost mode (boolean)
- **bypass** - Bypass mode (boolean)
- **automatic_bypass** - Automatic bypass (boolean)
- **operation_mode** - Operation mode (0=demand, 1=program, 2=manual)
- **fan_step** - Fan speed step (1-10)

#### Write Operation Error Handling

Write operations use a buffered approach where commands are queued and sent during the refresh cycle. Error handling works as follows:

- **Parameter validation errors** (invalid parameter, not writable, etc.) are thrown immediately as promise rejections
- **Socket-level write errors** (network issues, device unavailable) are reported via the optional `errorCallback`
- **Optimistic updates** are applied immediately to local parameter values for responsive UI
- Write operations return promises that resolve when the command is queued successfully

```javascript
const dfair = new DanfossAir({
    ip: '192.168.1.100',
    delaySeconds: 30,
    errorCallback: (error) => {
        console.error('Network/device error during write:', error.message);
        // Handle socket-level failures
    }
});

try {
    await dfair.activateBoost(); // Resolves when queued, not when sent
} catch (error) {
    console.error('Parameter validation error:', error.message);
}
```

### Data Parameters

The library provides access to the following parameters:

- **relative humidity measured** (%)
- **Actual Supply Fan Speed** (rpm)
- **Actual Extract Fan Speed** (rpm)
- **Total running minutes** (min)
- **Battery Indication Percent** (%)
- **Filter Fouling** (%)
- **Outdoor Temperature** (°C)
- **Boost** (boolean)
- **Defrost status** (boolean)
- **Temperature 1-4** (°C)
- **Unit Hardware Revision**
- **Unit SerialNumber** (High/Low Word)

## Finding Your Danfoss Air Unit

### Using Wireshark

Filter network traffic with: `eth.addr contains 00:07:68`

### Using Danfoss Air PC Tool

Download from: [Danfoss Air PC Tool](https://www.danfoss.com/da-dk/service-and-support/downloads/dhs/danfoss-air-pc-tool-end-user/)

## Examples

See the [samples/](./samples/) directory for complete examples:

- **Basic Usage**: `samples/demoapp_knownipnumber.js`
- **MQTT Integration**: `samples/demoapp_mqtt.js`
- **TypeScript Example**: `samples/demoapp_typescript.ts`
- **Write Operations Demo**: `samples/write-operations-demo.js`

## MQTT Integration

```javascript
const mqtt = require("mqtt");
const { init } = require('danfoss-air-api');

const client = mqtt.connect("mqtt://your-broker-url");
const danfossAir = init("192.168.1.100", 30, false, (data) => {
    data.forEach(param => {
        const topic = `danfoss/air/${param.name.replace(/\s+/g, '_').toLowerCase()}`;
        const payload = JSON.stringify({
            value: param.value,
            unit: param.unit,
            timestamp: new Date().toISOString()
        });
        client.publish(topic, payload);
    });
});
```

## Node-RED Integration

For Node-RED users, check out [@Laro88/node-red-dfair](https://github.com/Laro88/node-red-dfair) which provides a ready-to-use Node-RED node based on this library.

## Development

### Building from Source

```bash
git clone https://github.com/Laro88/dfair.git
cd danfoss-air-api
npm install
npm run build
```

### Project Structure

```
├── src/           # TypeScript source code
├── dist/          # Compiled JavaScript (generated)
├── samples/       # Example applications
├── .github/       # GitHub Actions workflows
└── README.md
```

## Compatibility

- **Node.js**: >= 14.0.0
- **Danfoss Air Units**: Tested with units having MAC addresses in range `00:07:68:*`

## Testing

Tested with:
- Node.js LTS version v22.12.0
- Danfoss Air unit MAC address `00:07:68:...` (Danfoss A/S MAC range)

Set the environment variable `DANFOSS_AIR_IP` to the discovered IP, and run 
```
npx tsx .\samples\demoapp_typescript.ts
```

## Contributing

Keep pull requests small, simple and easy to test. This library aims to be minimal and focused.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Troubleshooting

### Connection Issues

1. Ensure your Danfoss Air unit is connected to the same network
2. Verify the IP address using network scanning tools
3. Check that port 30046 is accessible
4. Try the Danfoss Air PC Tool to confirm connectivity

### Performance

- **Recommended polling interval**: 30 seconds or more
- **Minimum polling interval**: 3 seconds (the library will warn about faster intervals)
- **Network timeout**: 3 seconds per parameter read

Each parameter in the Danfoss Air API can have its own interval, an undefined interval, or a 0 interval value:

- If a parameter has a specific interval (e.g., 60 seconds), it will only be updated at multiples of that interval, synchronized with the polling cycle.
- If a parameter has an interval of 0 (such as hardware/software revision), it is read only once after connection and not polled again.
- If a parameter's interval is undefined, it will be updated on every polling step.

The library calculates a common polling cycle and step based on all defined intervals. The `step` is the greatest common divisor (GCD) of all intervals, and the `cycle` is the least common multiple (LCM). Polling occurs every `step` seconds, and each parameter is refreshed according to its interval within the cycle. This ensures efficient polling and avoids unnecessary network traffic. It maintains a single timer in the library and maintains a liniar polling of data from the system.

## Changelog

### v1.0.0
- Complete TypeScript rewrite
- Included ids for all params (without spaces)
- Modern npm package structure
- Improved type safety and documentation
- Moved examples to samples/ directory
- Added GitHub Actions for CI/CD

### v0.0.6 (Legacy)
- Original JavaScript implementation

