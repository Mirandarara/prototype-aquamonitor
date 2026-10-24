// Shared implementation: no duplicated topic, validation, timeout or connection policy.
// This prototype subscribes only. It never invokes publish() or changes firmware inputs.
export {
  AquaMqttService,
  telemetryFresh,
} from "../features/esp32/mqttService.ts";
export {
  MQTT_CONFIG,
  parseTelemetry,
} from "../features/esp32/protocol.ts";
