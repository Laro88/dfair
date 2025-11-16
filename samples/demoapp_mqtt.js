const mqtt = require("mqtt");
const { init } = require('../dist/index.js');

async function initMqttDemo(mqttserverurl) {
  try {
    const client = mqtt.connect(mqttserverurl);

    client.on("connect", function () {
      console.log("Connected to MQTT broker");
      client.subscribe("danfoss/air/status", function (err) {
        if (!err) {
          client.publish("danfoss/air/status", "Danfoss Air API connected");
        }
      });
    });

    client.on("message", function (topic, message) {
      console.log(`MQTT message received on ${topic}:`, message.toString());
    });

    // Initialize Danfoss Air connection
    // Replace with your Danfoss Air unit's IP address
    const DANFOSS_AIR_IP = "10.10.10.167";
    
    const dfair = init(DANFOSS_AIR_IP, 30, false, function(data) {
      // Publish data to MQTT
      for (const param of data) {
        const topic = `danfoss/air/${param.name.replace(/\s+/g, '_').toLowerCase()}`;
        const payload = JSON.stringify({
          value: param.value,
          unit: param.unit,
          timestamp: new Date().toISOString()
        });
        client.publish(topic, payload);
      }
    });

  } catch (err) {
    console.log("Exception: " + err);
  }
}

module.exports = { init: initMqttDemo };