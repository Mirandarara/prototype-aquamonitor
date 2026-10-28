import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createInfrastructure, hydraulicPaths } from "../src/scene/Infrastructure.js";
import { Flow } from "../src/scene/Water.js";
import { views } from "../src/scene/CameraController.js";

test("physical layout has one submerged pump, dry electronics and no intermediate vessel", () => {
  const scene = new T.Scene(), parts = createInfrastructure(scene);
  scene.updateMatrixWorld(true);
  assert.equal(parts.pumps.length, 1);
  const pump = parts.pumps[0].rotor.position;
  assert.ok(pump.x > -4 && pump.x < 1 && pump.z > 2 && pump.z < 5.6);
  assert.ok(pump.y > -3.58 && pump.y < -0.93);
  const electronics = [];
  scene.traverse(o => {
    assert.notEqual(o.userData.component, "reservoir");
    if (o.isMesh && o.userData.component === "esp32" && o.position.y > 0) electronics.push(o);
  });
  assert.ok(electronics.length > 0);
  assert.equal(parts.sensor.parent, scene);
  assert.equal(parts.relays.length, 2);
  assert.ok(Math.abs(parts.sensorY - parts.streetDatum - parts.sensorSpan) < 1e-8);
  const sensorCamera = new T.Vector3(...views.sensor.position);
  const ray = new T.Raycaster(sensorCamera, new T.Vector3(-7.8, parts.sensorY, -1.9).sub(sensorCamera).normalize());
  assert.ok(ray.intersectObjects(scene.children, true).some(h => h.object.userData.component === "sensor"));
});

test("gravity path only descends and flow particles stop immediately when disabled", () => {
  const flow = new Flow(new T.Group(), hydraulicPaths.reuse, "reuse", 0x4a9387, { linear: true });
  let previous = Infinity;
  for (let i = 0; i <= 200; i++) {
    const y = flow.curve.getPointAt(i / 200).y;
    assert.ok(y <= previous + 1e-9);
    previous = y;
  }
  flow.update(0.1, true);
  assert.equal(flow.dots.visible, true);
  const phase = flow.phase;
  flow.update(1, false);
  assert.equal(flow.dots.visible, false);
  assert.equal(flow.phase, phase);
  assert.ok(hydraulicPaths.drain.at(-1)[1] > hydraulicPaths.drain[0][1]);
});

test("all seven viewpoints put their target ahead of the camera within clipping planes", () => {
  for (const key of ["overview", "city", "gallery", "drain", "pipes", "dam", "reuse", "sensor", "esp32"]) {
    const view = views[key], camera = new T.PerspectiveCamera(40, 1.6, 0.1, 180);
    camera.position.set(...view.position);
    camera.lookAt(new T.Vector3(...view.target));
    camera.updateMatrixWorld();
    const target = new T.Vector3(...view.target).project(camera);
    assert.ok(Math.abs(target.x) < 1e-7 && Math.abs(target.y) < 1e-7);
    assert.ok(target.z > -1 && target.z < 1);
  }
});
