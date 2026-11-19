// Shared implementation: no duplicated topic, validation, timeout or connection policy.
// In direct MQTT mode, only virtual inputs are published; relay decisions belong to ESP32.
export {
  AquaMqttService,
  aquaMqtt,
  telemetryFresh,
} from "../features/esp32/mqttService.ts";
export {
  MQTT_CONFIG,
  parseTelemetry,
} from "../features/esp32/protocol.ts";
