import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { prototypeState } from '../src/simulation/prototypeState.js';
import { createInfrastructure } from '../src/scene/Infrastructure.js';
import { Layers } from '../src/scene/Layers.js';

test('hardware indicators distinguish commands, sensor faults and stale data', () => {
  const view = { fresh: true, drain: 'on', reuse: 'off', sensor: true, alarm: '' };
  assert.deepEqual(prototypeState(view), { drain: 'on', reuse: 'off', alert: 'off', sensor: 'on' });
  assert.equal(prototypeState({ ...view, reuse: 'on' }).reuse, 'on');
  assert.equal(prototypeState({ ...view, sensor: false }).alert, 'on');
  assert.equal(prototypeState({ ...view, alarm: 'Nível crítico' }).alert, 'on');
  assert.deepEqual(prototypeState({ ...view, fresh: false }), { drain: 'unknown', reuse: 'unknown', alert: 'unknown', sensor: 'unknown' });
});

test('physical assembly stays supported and LED animation survives layer material cloning', () => {
  const scene = new T.Scene(), parts = createInfrastructure(scene);
  scene.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(parts.esp);
  assert.ok(Math.abs(bounds.min.y - .46) < 1e-7);
  assert.ok(bounds.min.x >= .9 && bounds.max.x <= 3.6);
  assert.equal(parts.relays.length, 2);
  assert.deepEqual(parts.prototypeIndicators.map(i => i.key), ['drain', 'reuse', 'alert']);
  const led = parts.prototypeIndicators[0].led;
  const original = led.material;
  const layers = new Layers(scene, { electronics: [parts.esp] });
  original.emissive.setHex(0x287dff);
  original.emissiveIntensity = 1.4;
  layers.update(.1);
  assert.equal(led.material.emissive.getHex(), 0x287dff);
  assert.equal(led.material.emissiveIntensity, 1.4);
});
