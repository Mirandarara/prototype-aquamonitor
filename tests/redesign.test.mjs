import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { Layers } from '../src/scene/Layers.js';
import { Presentation } from '../src/ui/Presentation.js';
import { SimulationController } from '../src/simulation/SimulationController.js';

test('layers preserve origins across repeated explosions and restore visibility and opacity', () => {
  const scene = new T.Scene();
  const roots = Array.from({length:5}, (_, i) => {
    const g = new T.Group(); g.position.set(i, i * .5, -i);
    g.add(new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial()));
    scene.add(g); return g;
  });
  const origins = roots.map(r => r.position.clone());
  const layers = new Layers(scene, Object.fromEntries(['environment','surface','structure','hydraulic','electronics'].map((k,i) => [k,[roots[i]]])));
  for (let n=0;n<3;n++) {
    layers.exploded = true; for(let i=0;i<150;i++) layers.update(.05);
    assert.ok(roots[1].position.y > origins[1].y + 5.9);
    assert.equal(roots[3].position.y, origins[3].y);
    layers.exploded = false; for(let i=0;i<150;i++) layers.update(.05);
    roots.forEach((r,i) => assert.ok(r.position.distanceTo(origins[i]) < 1e-8));
  }
  layers.xray = .2; layers.update(.1);
  assert.equal(roots[2].children[0].material.opacity, .2);
  assert.equal(roots[1].children[0].material.opacity, 1);
  layers.isolate('hydraulic'); layers.update(.1);
  roots.forEach((r,i) => assert.equal(r.visible, i === 3));
  layers.restore(); layers.update(.1);
  assert.ok(roots.every(r => r.visible));
  assert.equal(roots[2].children[0].material.opacity, 1);
});

test('presentation uses real automatic pump control, pauses, restores previous state and rejects live mode', () => {
  const sim = new SimulationController({ start(){}, stop(){} });
  const original = sim.state;
  const views = [];
  const presentation = new Presentation(sim, k => views.push(k), () => {});
  presentation.start();
  let sawPump = false, sawDrainAtStage4 = false;
  for(let i=0;i<800;i++) {
    const view = sim.tick(.1); presentation.update(.1);
    sawPump ||= view.drainFlow;
    if(presentation.step === 4 && view.drainFlow) sawDrainAtStage4 = true;
  }
  assert.ok(sawPump); assert.ok(sawDrainAtStage4);
  presentation.end();
  assert.deepEqual(sim.state, original);
  assert.ok(views.includes('sensor') && views.includes('exploded'));
  presentation.start(); presentation.pause();
  const before = sim.state.time;
  sim.tick(2); presentation.update(20);
  assert.equal(sim.state.time, before); assert.equal(presentation.step, 0);
  presentation.end(); sim.setMode('mqtt'); presentation.start();
  assert.equal(presentation.active, false);
});
