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
  assert.ok(s.state.reusedTotal > 0);
  assert.equal(s.view().dam, s.state.tankLiters / s.state.capacityLiters);
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
  assert.equal(s.view().dam, 0.125);
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

test("A/B: no rain preserves volume; rain reaches gallery with drainage disabled", () => {
  const s = new SimulationController(fixture());
  s.dispatch({ type: "running", value: true });
  s.tick(1);
  assert.equal(s.state.galleryLiters, 8);
  assert.equal(s.view().drainFlow, false);
  const dam = s.view().dam;
  s.dispatch({ type: "drainage", value: "off" });
  s.dispatch({ type: "rain", value: 100 });
  s.tick(10);
  assert.ok(s.state.galleryLiters > 8);
  assert.equal(s.view().dam, dam);
  assert.equal(s.view().reuseFlow, false);
});

test("C/D: pump transfers directly to dam and stopping it stops all transfer", () => {
  const s = new SimulationController(fixture());
  s.dispatch({ type: "drainage", value: "on" });
  s.dispatch({ type: "running", value: true });
  const before = s.state;
  assert.equal(s.view().drainFlow, true);
  s.tick(1);
  const after = s.state;
  const transfer = before.galleryLiters - after.galleryLiters;
  assert.ok(transfer > 0);
  assert.ok(Math.abs(after.tankLiters - before.tankLiters - transfer) < 1e-8);
  s.dispatch({ type: "drainage", value: "off" });
  const stopped = s.view();
  s.tick(1);
  assert.equal(s.view().dam, stopped.dam);
  assert.equal(s.view().level, stopped.level);
  assert.equal(s.view().drainFlow, false);
});

test("E: gravity empties dam without returning water to the gallery", () => {
  const s = new SimulationController(fixture());
  s.dispatch({ type: "reuse" });
  s.dispatch({ type: "running", value: true });
  assert.equal(s.view().reuseFlow, true);
  s.tick(1);
  assert.ok(s.view().dam < 0.125);
  assert.equal(s.state.galleryLiters, 8);
  for (let i = 0; i < 20; i++) s.tick(1);
  assert.ok(s.view().dam < 1e-9);
  assert.equal(s.view().reuseFlow, false);
  assert.equal(s.state.galleryLiters, 8);
});

test("manual pump retains dry-run, full-store and sensor protections", () => {
  for (const setup of [
    s => { s.state.galleryLiters = 0; },
    s => { s.dispatch({ type: "fill" }); },
    s => { s.dispatch({ type: "sensor", value: true }); },
  ]) {
    const s = new SimulationController(fixture());
    setup(s);
    s.dispatch({ type: "drainage", value: "on" });
    s.dispatch({ type: "running", value: true });
    const dam = s.view().dam;
    s.tick(1);
    assert.equal(s.view().drain, "blocked");
    assert.equal(s.view().drainFlow, false);
    assert.equal(s.view().dam, dam);
  }
});

test("F/G: live gallery is authoritative; only drain_on fills the illustrative dam", () => {
  const f = fixture(), s = new SimulationController(f);
  s.setMode("mqtt");
  const original = structuredClone(f.state.telemetry);
  const first = s.tick(1, 1000);
  assert.equal(first.level, original.level_pct / 100);
  assert.ok(first.dam > 0.125);
  assert.deepEqual(f.state.telemetry, original);
  f.state.telemetry = payload({ drain_on: false });
  const off = s.tick(1, 2000);
  assert.equal(off.drainFlow, false);
  assert.equal(off.dam, first.dam);
  f.state.telemetry = payload({ drain_on: false, reuse_on: true });
  const reused = s.tick(1, 3000);
  assert.ok(reused.dam < off.dam);
  assert.equal(reused.level, original.level_pct / 100);
  f.state.telemetry = payload({ reuse_on: true });
  const stale = s.tick(1, 7000);
  assert.equal(stale.dam, reused.dam);
  assert.equal(stale.drainFlow, false);
  assert.equal(stale.reuseFlow, false);
  assert.equal(stale.drain, "unknown");
  f.state.receivedAt = 7001;
  assert.equal(s.tick(0.1, 7001).drainFlow, true);
  f.state.deviceStatus = "offline";
  const offline = s.tick(1, 7100);
  assert.equal(offline.fresh, false);
  assert.equal(offline.drainFlow, false);
});

test("legacy floats never become invented dam measurements; local actions cannot mutate live state", () => {
  const f = fixture(), s = new SimulationController(f);
  s.setMode("mqtt");
  f.state.telemetry = payload({ drain_on: false, tank_full: true });
  assert.equal(s.tick(1, 1000).dam, 0.125);
  f.state.telemetry = payload({ drain_on: false, tank_empty: true });
  assert.equal(s.tick(1, 1000).dam, 0.125);
  s.reset(); s.startTour();
  s.dispatch({ type: "drainage", value: "on" });
  assert.equal(s.view(1000).drain, "off");
  assert.equal(s.view(1000).dam, 0.125);
  assert.equal(s.tour, false);
});

test("bounded hydraulic model conserves volume at varied frame rates, capacity and operating modes", () => {
  for (const dt of [1 / 60, 0.1, 0.37]) {
    const s = new SimulationController(fixture());
    s.dispatch({ type: "speed", value: 120 });
    s.dispatch({ type: "rain", value: 100 });
    s.dispatch({ type: "running", value: true });
    for (let i = 0; i < 200; i++) {
      if (i === 20) s.dispatch({ type: "capacity", value: 5 });
      if (i === 50) s.dispatch({ type: "reuse" });
      if (i === 90) s.dispatch({ type: "rain", value: 0 });
      if (i === 110) s.dispatch({ type: "drainage", value: "on" });
      s.tick(dt);
      const v = s.view(), st = s.state;
      assert.ok(v.level >= 0 && v.level <= 1 && v.dam >= 0 && v.dam <= 1);
      assert.ok(Math.abs(st.galleryLiters + st.tankLiters + st.reusedTotal + st.overflowTotal - 13 - st.rainTotal) < 1e-7);
    }
  }
});

test("no flow from invalid or empty live gallery and no flow while paused", () => {
  const f = fixture(), s = new SimulationController(f);
  s.startTour();
  s.dispatch({ type: "drainage", value: "on" });
  s.dispatch({ type: "running", value: false });
  assert.equal(s.view().drainFlow, false);
  assert.equal(s.view().reuseFlow, false);
  s.setMode("mqtt");
  for (const patch of [{ sensor_ok: false }, { level_pct: 0, level_cm: 0 }]) {
    f.state.telemetry = payload(patch);
    const before = s.view(1000).dam;
    assert.equal(s.tick(1, 1000).drainFlow, false);
    assert.equal(s.view(1000).dam, before);
  }
});
