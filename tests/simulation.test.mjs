import test from "node:test";
import assert from "node:assert/strict";
import { SimulationController } from "../src/simulation/SimulationController.js";
import {
  AquaMqttService,
  parseTelemetry,
  MQTT_CONFIG,
} from "../src/mqtt/mqttClient.js";
import { EventEmitter } from "node:events";
const payload = (patch = {}) => ({
  level_cm: 22,
  level_pct: 73.3,
  distance_cm: 8,
  sensor_ok: true,
  drain_on: true,
  reuse_on: false,
  tank_full: false,
  tank_empty: false,
  alarm: false,
  alarm_code: "none",
  input_mode: "sensor",
  ...patch,
});
function fixture() {
  let started = 0,
    stopped = 0;
  const state = {
    connection: "connected",
    deviceStatus: "online",
    receivedAt: 1000,
    telemetry: payload(),
  };
  return {
    state,
    getSnapshot: () => state,
    start: () => started++,
    stop: () => stopped++,
    counts: () => [started, stopped],
  };
}
test("complete offline cycle collects, drains and transports with conserved volume", () => {
  const s = new SimulationController(fixture());
  s.startTour();
  let drained = false,
    transported = false,
    peak = 0;
  for (let i = 0; i < 701; i++) {
    const v = s.tick(0.1);
    drained ||= v.drain === "on";
    transported ||= v.reuse === "on";
    peak = Math.max(peak, v.level);
  }
  assert.ok(drained && transported);
  assert.ok(peak > 0.6);
  assert.ok(s.state.galleryLiters < 12.1);
  assert.ok(s.dam > 0);
  assert.equal(s.state.running, false);
  const total =
    s.state.galleryLiters +
    s.state.tankLiters +
    s.state.reusedTotal +
    s.state.overflowTotal;
  assert.ok(Math.abs(total - (13 + s.state.rainTotal)) < 1e-7);
});
test("sensor failure blocks drainage and recovery reconciles state", () => {
  const s = new SimulationController(fixture());
  s.startTour();
  for (let i = 0; i < 70; i++) s.tick(0.1);
  s.dispatch({ type: "sensor", value: true });
  assert.equal(s.view().drain, "blocked");
  s.dispatch({ type: "sensor", value: false });
  assert.equal(s.view().drain, "on");
});
test("pause freezes model and reset restores all demonstration state", () => {
  const s = new SimulationController(fixture());
  s.startTour();
  s.tick(1);
  s.dispatch({ type: "running", value: false });
  const a = s.state.galleryLiters;
  s.tick(1);
  assert.equal(s.state.galleryLiters, a);
  s.reset();
  assert.equal(s.dam, 0);
  assert.equal(s.state.galleryLiters, 8);
  assert.equal(s.state.rain, 0);
});
test("MQTT state mirrors firmware, expires at six seconds, and demo cannot alter it", () => {
  const f = fixture(),
    s = new SimulationController(f);
  s.setMode("mqtt");
  assert.equal(s.tick(0.1, 1000).drain, "on");
  f.state.telemetry = payload({ drain_on: false, reuse_on: true });
  assert.equal(s.tick(0.1, 2000).drain, "off");
  assert.equal(s.view(2000).reuse, "on");
  s.dispatch({ type: "sensor", value: true });
  assert.equal(s.view(2000).sensor, true);
  const v = s.tick(0.1, 7000);
  assert.equal(v.fresh, false);
  assert.equal(v.drain, "unknown");
  assert.equal(v.sensor, null);
  s.setMode("demo");
  assert.deepEqual(f.counts(), [1, 1]);
});
test("invalid sensor does not expose numeric measurement", () => {
  const f = fixture(),
    s = new SimulationController(f);
  s.setMode("mqtt");
  f.state.telemetry = payload({ sensor_ok: false });
  assert.equal(s.view(1000).level, null);
});
test("shared MQTT service subscribes, rejects retained and invalid payloads, never publishes", () => {
  const c = new EventEmitter();
  c.subscribe = (topics, opts, done) => {
    assert.deepEqual(topics, [MQTT_CONFIG.telemetry, MQTT_CONFIG.status]);
    done(null, [{ qos: 0 }]);
  };
  c.end = () => {};
  c.publish = () => assert.fail("prototype must never publish");
  const service = new AquaMqttService(() => c);
  const sim = new SimulationController(service);
  sim.setMode("mqtt");
  c.emit("connect");
  const send = (p, retain = false) =>
    c.emit("message", MQTT_CONFIG.telemetry, Buffer.from(JSON.stringify(p)), {
      retain,
    });
  send(payload(), true);
  assert.equal(service.getSnapshot().telemetry, null);
  send(payload({ level_pct: 99 }));
  assert.equal(service.getSnapshot().telemetry, null);
  send(payload());
  assert.equal(sim.view().drain, "on");
  c.emit("close");
  assert.equal(sim.view().drain, "unknown");
  sim.setMode("demo");
  assert.equal(c.listenerCount("message"), 0);
});
test("schema retains booleans, range and coherence protections of dashboard", () => {
  for (const patch of [
    { tank_full: undefined },
    { sensor_ok: 1 },
    { level_cm: 31 },
    { level_pct: 0 },
    { input_mode: "invented" },
  ])
    assert.throws(() => parseTelemetry(JSON.stringify(payload(patch))));
  assert.equal(parseTelemetry(JSON.stringify(payload())).level_cm, 22);
});
