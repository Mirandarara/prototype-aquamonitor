import {
  createInitialState,
  simulationReducer,
  alarmLabels,
  SIMULATION_CONFIG as config,
} from "../features/simulation/engine/simulation.ts";
import { telemetryFresh, telemetryDelayed } from "../features/esp32/mqttService.ts";

const clamp = (n) => Math.min(1, Math.max(0, n));
// The existing engine's tankLiters is the sole downstream store: the dam.
// Keep the shared engine/telemetry names; there is no intermediate vessel.
export class SimulationController {
  constructor(mqtt) {
    this.mqtt = mqtt;
    this.mode = "demo";
    this.reset();
  }
  reset() {
    if (this.mode !== "demo") return;
    this.state = createInitialState();
    this.elapsed = 0;
    this.tour = false;
    this.liveDam = config.initialTankLiters / config.defaultCapacityLiters;
  }
  dispatch(action) {
    if (this.mode === "demo") this.state = simulationReducer(this.state, action);
  }
  setMode(mode) {
    if (!["demo", "mqtt"].includes(mode) || mode === this.mode) return;
    this.mode = mode;
    this.tour = false;
    this.liveDam = config.initialTankLiters / config.defaultCapacityLiters;
    if (mode === "mqtt") this.mqtt.start();
    else this.mqtt.stop();
  }
  startTour() {
    if (this.mode !== "demo") return;
    this.reset();
    this.tour = true;
    this.dispatch({ type: "speed", value: 120 });
    this.dispatch({ type: "reuse" });
    this.dispatch({ type: "rain", value: 100 });
    this.dispatch({ type: "running", value: true });
  }
  tick(dt, now = Date.now()) {
    if (!Number.isFinite(dt) || dt <= 0) return this.view(now);
    if (this.mode === "demo") {
      if (this.state.running) {
        this.elapsed += dt;
        if (this.tour && this.elapsed > 12 && this.state.rain)
          this.dispatch({ type: "rain", value: 0 });
      }
      this.dispatch({ type: "tick", seconds: dt });
      if (this.tour && this.elapsed > 70) {
        this.tour = false;
        this.dispatch({ type: "running", value: false });
      }
    }
    return this.view(now);
  }
  view(now = Date.now()) {
    if (this.mode === "demo") {
      const s = this.state;
      return {
        level: s.galleryLiters / 30,
        levelCm: s.sensorFault ? null : s.galleryLiters,
        distanceCm: s.sensorFault ? null : 30 - s.galleryLiters,
        dam: s.tankLiters / s.capacityLiters,
        rain: s.rain / 100,
        drain: s.drainage,
        reuse: s.reuse,
        drainFlow: s.running && s.drainage === "on" && s.galleryLiters > 0 && s.tankLiters < s.capacityLiters,
        reuseFlow: s.running && s.reuse === "on" && s.tankLiters > 0,
        sensor: !s.sensorFault,
        fresh: true,
        alarm: s.alarms.map((a) => alarmLabels[a]).join(" ") ||
          (s.risk === "critical" ? "Risco de alagamento" : s.risk === "attention" ? "Nível em atenção" : ""),
        input: "Demonstração simulada",
        device: "ESP32 · demonstração",
        connection: "local",
        running: s.running,
      };
    }
    const snap = this.mqtt.getSnapshot(), t = snap.telemetry;
    const fresh = Boolean(t && telemetryFresh(snap, now));
    return {
      level: t?.sensor_ok ? t.level_pct / 100 : null,
      levelCm: t?.sensor_ok ? t.level_cm : null,
      distanceCm: t?.sensor_ok ? t.distance_cm : null,
      dam: null,
      rain: 0,
      drain: fresh ? (t.drain_on ? "on" : "off") : "unknown",
      reuse: fresh ? (t.reuse_on ? "on" : "off") : "unknown",
      drainFlow: fresh && t.drain_on,
      reuseFlow: fresh && t.reuse_on,
      sensor: fresh ? t.sensor_ok : null,
      fresh,
      delayed: telemetryDelayed(snap, now),
      ageSeconds: snap.receivedAt === null ? null : Math.max(0, Math.floor((now - snap.receivedAt) / 1000)),
      alarm: fresh ? (t.alarm ? t.alarm_code : "") : "Sem telemetria atual",
      input: !t ? "Entrada desconhecida" : t.input_mode === "virtual" ? "Entrada virtual do ESP32" : "Sensor HC-SR04",
      device: typeof t?.device === "string" ? t.device : "ESP32 · identificação não informada",
      running: fresh,
      connection: snap.connection,
      error: snap.error,
      receivedAt: snap.receivedAt,
    };
  }
}
