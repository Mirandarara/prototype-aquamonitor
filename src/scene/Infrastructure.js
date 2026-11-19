import * as T from "three";
import { createPhysicalPrototype } from "./PhysicalPrototype.js";
import { box, cylinder, tree, group, mat, tag } from "./primitives.js";

// Shared coordinates for geometry, plumbing, cameras and inspection anchors.
export const hydraulicPaths = {
  drain: [[-0.4, -2.85, 4.2], [0.6, -2.85, 4.2], [1, -2.85, 4.2], [1.4, -2.7, 4.2], [1.6, -2.1, 4.2], [1.9, 0.6, 4.2], [3.2, 1.2, 3.8], [5, 2.6, 2], [6.1, 4.1, -0.5], [7, 4.1, -2]],
  reuse: [[11, 1.34, -0.8], [11, 1.3, 0.3], [11, 0.8, 1.4], [11.7, -0.25, 3.4], [12.3, -0.48, 4.6]],
};
export function createInfrastructure(scene) {
  const soil = group(scene);
  box(soil, [17, 3.8, 8.5], [-8, -2, -4.75], 0xbba98c);
  box(soil, [17, 0.28, 8.5], [-8, -0.3, -4.75], 0xcfc1a4);
  box(soil, [17, 0.2, 8.5], [-8, -2.8, -4.75], 0xa49378);
  box(soil, [11.5, 3.8, 3.5], [-10.75, -2, 1.25], 0xbba98c);
  box(soil, [11.5, 0.2, 3.5], [-10.75, -2.8, 1.25], 0xa49378);
  // Dry technical terrace under the electronics and the two front trees.
  // It joins the city edge and stops before the exposed drain at z = 4.2.
  box(soil, [2.7, 3.9, 2.9], [2.25, -1.95, 2.65], 0xbba98c);
  box(scene, [35, 0.3, 16], [0, -4, -1.5], 0x748a84);
  box(scene, [5, 0.35, 7], [2.8, -0.15, -4.5], 0x9bac8c);
  const underground = group(scene);
  const chamber = group(underground);
  const x = -1.5, z = 3.8, w = 5, d = 3.6;
  box(chamber, [w + 0.4, 0.2, d + 0.4], [x, -3.7, z], 0x9aa9a4);
  box(chamber, [w, 3, 0.13], [x, -2.1, z - d / 2], 0xa9bab5);
  for (const xx of [x - w / 2, x + w / 2])
    box(chamber, [0.13, 3, d], [xx, -2.1, z], 0x93cbd0, { transparent: true, opacity: 0.25, depthWrite: false });
  box(chamber, [w, 3, 0.05], [x, -2.1, z + d / 2], 0x93cbd0, { transparent: true, opacity: 0.1, depthWrite: false });
  // A narrow structural rim leaves the sensor, pump and water exposed in section.
  for (const zz of [2, 5.6]) box(chamber, [5.2, 0.12, 0.14], [x, -0.58, zz], 0xd5ddd1);
  const gallery = box(chamber, [w - 0.2, 1, d - 0.2], [x, -3.2, z], 0x32a7b7, { transparent: true, opacity: 0.58, roughness: 0.23, depthWrite: false });
  for (let i = 0; i <= 6; i++)
    box(chamber, [0.25, 0.025, 0.035], [-3.75, -3.58 + i * 0.44, 5.66], 0x516d6b);
  // Exposed longitudinal storm channel joins the pump chamber under the city.
  box(chamber, [11.1, .22, 2.3], [-9.65, -3.7, 4.05], 0x879a94);
  box(chamber, [11.1, 2.8, .18], [-9.65, -2.2, 2.9], 0x9ba9a0);
  box(chamber, [11.1, 1.4, .08], [-9.65, -2.9, 5.17], 0x83a9ae, {transparent:true,opacity:.13,depthWrite:false});
  for (const xx of [-14.7,-11.5,-8.2,-5]) {
    box(chamber, [.26, 2.9, .34], [xx, -2.2, 3.02], 0xaeb6a8);
    box(chamber, [.26, .22, 2.3], [xx, -.7, 4.05], 0xb9beae);
  }
  tag(chamber, "gallery");

  const sensor = group(scene);
  // 30 cm calibrated span maps to 0.9 scene units above the street datum.
  const streetDatum = 0.39, sensorSpan = .9, sensorY = streetDatum + sensorSpan;
  cylinder(sensor, 0.045, 1.2, [-8.9, .99, -1.9], 0x547479);
  box(sensor, [1.3, 0.09, 0.09], [-8.35, sensorY + .22, -1.9], 0x819a9a);
  box(sensor, [0.65, 0.06, 0.3], [-7.8, sensorY + .06, -1.9], 0x286483);
  for (const xx of [-7.99, -7.61]) {
    cylinder(sensor, .13, .12, [xx, sensorY, -1.9], 0xb7c9c6);
    cylinder(sensor, .1, .012, [xx, sensorY - .067, -1.9], 0x263f47);
  }
  tag(sensor, "sensor");
  const cone = new T.Mesh(new T.ConeGeometry(.46, 1, 24, 1, true), mat(0x81d1cd, { transparent: true, opacity: .1, depthWrite: false, side: T.DoubleSide }));
  cone.position.set(-7.8, 1.6, -1.9);
  sensor.add(cone);

  const { esp, espLight, relays, prototypeIndicators } = createPhysicalPrototype(underground);

  const pump = group(underground);
  box(pump, [1.2, 0.16, 1.3], [-0.5, -3.48, 4.2], 0x647f77);
  cylinder(pump, 0.39, 0.85, [-0.5, -2.98, 4.2], 0x365e61);
  cylinder(pump, 0.44, 0.15, [-0.5, -3.3, 4.2], 0x273f40);
  box(pump, [0.65, 0.12, 0.16], [-0.5, -2.44, 4.2], 0xc2d2c4);
  for (let i = 0; i < 5; i++) box(pump, [0.06, 0.2, 0.035], [-0.78 + i * 0.14, -3.23, 4.6], 0xa5bcb1);
  const rotor = new T.Mesh(new T.TorusGeometry(0.23, 0.04, 6, 16), mat(0xc5d6c5));
  rotor.position.set(-0.5, -2.96, 4.6);
  pump.add(rotor);
  const light = box(pump, [0.15, 0.1, 0.12], [-0.5, -2.53, 4.48], 0x77877b);
  light.material = light.material.clone();
  tag(pump, "drain");

  const dam = group(scene);
  box(dam, [11.5, 5.1, 9.5], [10.5, -1.28, -3.5], 0x91a58a);
  box(dam, [11.5, 0.25, 9.5], [10.5, 1.15, -3.5], 0xa7b599);
  const shore = [[5.6,-1], [5.8,-4.9], [7.5,-6.9], [10.4,-7.1], [13.8,-6.5], [15.2,-4.6], [15.1,-0.85], [11,-0.8], [7,-0.85]];
  const shape = new T.Shape();
  shore.forEach(([xx, zz], i) => i ? shape.lineTo(xx, -zz) : shape.moveTo(xx, -zz));
  shape.closePath();
  const waterGeometry = new T.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  waterGeometry.rotateX(-Math.PI / 2);
  const damWater = new T.Mesh(waterGeometry, mat(0x39a8b3, { transparent: true, opacity: 0.8, roughness: 0.28 }));
  damWater.position.y = 1.3;
  dam.add(damWater);
  for (const [xx, zz, sx, sy, sz] of [
    [5.1,-4.7,1.1,2.5,2.6], [6.6,-7.9,1.8,3.2,1.5], [9,-8.3,2.6,3.8,1.5],
    [12,-8.2,2.4,3.3,1.5], [15,-7.5,1.7,3.2,1.7], [16,-3.8,1.1,2.2,2.9],
  ]) {
    const rock = new T.Mesh(new T.IcosahedronGeometry(1, 0), mat(xx > 10 ? 0x9aa68f : 0xa7ae99, { flatShading: true }));
    rock.position.set(xx, 1.8, zz); rock.scale.set(sx, sy, sz);
    rock.castShadow = true; rock.receiveShadow = true; dam.add(rock);
  }
  // Buttressed dam wall across the valley, with a maintenance crest and rail.
  box(dam, [10.1, 2.1, 0.65], [10.4, 2.25, -0.55], 0xb9c3b9);
  box(dam, [10.4, 0.2, 1], [10.4, 3.35, -0.55], 0xe1dfd0);
  for (let xx = 5.7; xx < 15.5; xx += 1.2) {
    const buttress = box(dam, [0.33, 2.1, 1.1], [xx, 2.2, -0.1], 0x9fafa6);
    buttress.rotation.x = -0.08;
    cylinder(dam, 0.025, 0.5, [xx, 3.65, -0.2], 0x607c75);
  }
  box(dam, [10, 0.035, 0.035], [10.4, 3.9, -0.2], 0x607c75);
  [[5,-6.8],[7.2,-8],[14.8,-7.9],[16,-5.8]].forEach(([xx,zz]) => tree(dam,xx,zz,0.9,1.3));
  tag(dam, "dam");

  const irrigation = group(scene);
  box(irrigation, [7.2, 3.1, 5], [11.4, -2.3, 4], 0xa3ad8c);
  box(irrigation, [6.8, 0.18, 4.6], [11.4, -0.65, 4], 0x7e9c73);
  for (let i = 0; i < 3; i++) {
    box(irrigation, [3.9, 0.12, 0.6], [10.6, -0.5, 3 + i * 1.05], 0x8b8066);
    for (let j = 0; j < 6; j++) tree(irrigation, 9 + j * 0.6, 3 + i * 1.05, 0.23, -0.42);
  }
  tree(irrigation, 14, 5, 0.9, -0.55);
  const valve = cylinder(irrigation, 0.3, 0.08, [11, 1.7, 0.4], 0x4a8b7b);
  valve.rotation.z = Math.PI / 2;
  box(irrigation, [0.08, 0.5, 0.08], [11, 1.5, 0.3], 0x6e837d);
  tag(irrigation, "reuse");
  // Visible collars at the chamber outlet and the gravity outlet through the wall.
  for (const [xx, yy, zz, axis] of [[1.04,-2.85,4.2,"z"], [11,1.34,-0.18,"x"], [-3,-1.7,2,"x"]]) {
    const collar = cylinder(scene, 0.29, 0.18, [xx, yy, zz], 0x526e70);
    collar.rotation[axis] = Math.PI / 2;
  }
  for (const [xx, yy, zz, base] of [[1.9,0.6,4.2,-3.85], [3.2,1.2,3.8,-3.85], [5,2.6,2,-3.85], [6.1,4.1,-0.5,1.3], [7,4.1,-2,1.3]]) {
    cylinder(scene, 0.06, yy - base, [xx, (yy + base) / 2, zz], 0x7c928c);
    box(scene, [0.5, 0.1, 0.5], [xx, base, zz], 0xb5c0b0);
  }
  const drains = [];
  const grates = group(scene);
  for (const xx of [-11, -4.5]) {
    const grate = group(grates);
    box(grate, [0.9, 0.05, 0.65], [xx, 0.44, -0.1], 0x354f4c);
    for (let i = 0; i < 6; i++) box(grate, [0.045, 0.015, 0.56], [xx - 0.36 + i * 0.14, 0.48, -0.1], 0xa8b5a9);
    tag(grate, "city");
    drains.push([xx, 0.42, -0.1]);
  }
  return { soil, underground, chamber, sensor, sensorY, sensorSpan, streetDatum, esp, relays, dam, irrigation, pump, gallery, damWater, pumps: [{ rotor, light, key: "drain" }], prototypeIndicators, cone, espLight, drains, grates, valve };
}
