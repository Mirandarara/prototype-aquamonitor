import * as T from 'three';
import { box, cylinder, group, mat, tag } from './primitives.js';

function wire(parent, points, color) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
  parent.add(new T.Mesh(new T.TubeGeometry(curve, 16, .018, 5, false), mat(color)));
}
function light(parent, position, color, radius = .065) {
  const led = new T.Mesh(new T.SphereGeometry(radius, 10, 8), mat(color).clone());
  led.position.set(...position);
  led.material.userData.visualAnimation = true;
  parent.add(led);
  return led;
}

// Components use local coordinates so the whole dry assembly moves as one layer.
export function createPhysicalPrototype(parent) {
  const esp = group(parent);
  box(esp, [2.8, .16, 2.6], [0, 0, 0], 0xe0e3d7);
  for (const x of [-1.1, 1.1]) for (const z of [-1, 1])
    box(esp, [.12, .42, .12], [x, -.29, z], 0x81958a);

  // ESP32 DevKit: black PCB, metal radio shield, antenna, USB and pin headers.
  box(esp, [1.03, .08, 1.7], [-.55, .18, -.15], 0x182d30);
  box(esp, [.68, .15, .71], [-.55, .29, -.15], 0xbec9c8);
  box(esp, [.7, .025, .34], [-.55, .235, -.77], 0x132023);
  for (let i = 0; i < 4; i++) {
    box(esp, [.035, .018, .22], [-.82 + i * .17, .255, -.77], 0xb8ad70);
    if (i < 3) box(esp, [.17, .018, .035], [-.735 + i * .17, .255, -.77 + (i % 2 ? -.1 : .1)], 0xb8ad70);
  }
  for (const x of [-1.02, -.08]) {
    box(esp, [.1, .13, 1.4], [x, .27, -.12], 0x101a1d);
    for (let i = 0; i < 12; i++) box(esp, [.055, .07, .038], [x, .36, -.75 + i * .115], 0xd0be7c);
  }
  box(esp, [.34, .15, .24], [-.55, .28, .69], 0xb5c2c3);
  box(esp, [.23, .07, .012], [-.55, .28, .815], 0x17282c);
  const espLight = light(esp, [-.88, .29, .57], 0x4bd89f, .035);

  const relays = [];
  for (const [i, key] of ['drain', 'reuse'].entries()) {
    const z = -.66 + i * .96;
    box(esp, [.89, .07, .75], [.71, .18, z], 0xb72e36);
    box(esp, [.48, .29, .49], [.64, .36, z], 0x168ae2);
    box(esp, [.16, .2, .61], [1.08, .3, z], 0x3e83af);
    for (let j = 0; j < 3; j++) cylinder(esp, .043, .015, [1.08, .41, z - .2 + j * .2], 0xc5d3cb);
    const led = light(esp, [.39, .25, z + .27], 0x5bf2a5, .03);
    relays.push({ key, led });
    wire(esp, [[-.04,.35,z],[.14,.42,z],[.29,.25,z]], i ? 0x344df3 : 0xe8b443);
  }

  // The three status LEDs and their series resistors mirror the reference.
  const prototypeIndicators = [];
  for (const [i, [key, color]] of [['drain', 0x287dff], ['reuse', 0x3ce66b], ['alert', 0xff3e46]].entries()) {
    const x = -.9 + i * .87;
    for (const dx of [-.055, .055]) cylinder(esp, .012, .16, [x + dx, .18, 1.02], 0xb9c5bc, 6);
    const led = light(esp, [x, .32, 1.02], color, .095);
    cylinder(esp, .043, .22, [x, .19, .71], 0xd9c58e, 8);
    for (const y of [.13, .18, .24]) cylinder(esp, .045, .025, [x, y, .71], 0xb34b35, 8);
    wire(esp, [[x,.12,.64],[x,.12,.86],[x,.2,.98]], 0x32734e);
    prototypeIndicators.push({ key, color, led });
  }
  wire(esp, [[-.96,.18,.5],[-1.22,.16,.5],[-1.22,.16,-1.1],[1.23,.16,-1.1],[1.23,.2,.3]], 0xd4383d);
  wire(esp, [[-.8,.17,.65],[-1.16,.12,.9],[1.2,.12,.9],[1.2,.2,-.5]], 0x253b3e);

  esp.position.set(1.9, .71, 2.1);
  esp.scale.setScalar(.5);
  tag(esp, 'esp32');
  return { esp, espLight, relays, prototypeIndicators };
}
