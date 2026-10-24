import * as T from "three";
import { box, cylinder, tree, group, mat, tag } from "./primitives.js";
export function createInfrastructure(scene) {
  const soil = group(scene);
  box(soil, [17, 3.8, 7.8], [-5, -2, -4.1], 0xbba98c);
  box(soil, [17, 0.28, 7.8], [-5, -0.3, -4.1], 0xcfc1a4);
  box(soil, [17, 0.2, 7.8], [-5, -2.8, -4.1], 0xa49378);
  box(scene, [18.1, 0.3, 13], [-5, -4, -2], 0x748a84);
  const underground = group(scene);
  function tank(x, z, w, d, key) {
    const g = group(underground);
    box(g, [w + 0.4, 0.2, d + 0.4], [x, -3.7, z], 0x9aa9a4);
    box(g, [w, 3, 0.13], [x, -2.1, z - d / 2], 0xa9bab5);
    for (const xx of [x - w / 2, x + w / 2])
      box(g, [0.13, 3, d], [xx, -2.1, z], 0x96aaa5);
    box(g, [w, 3, 0.05], [x, -2.1, z + d / 2], 0x93cbd0, {
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    });
    const water = box(g, [w - 0.2, 1, d - 0.2], [x, -3.2, z], 0x32a7b7, {
      transparent: true,
      opacity: 0.72,
      roughness: 0.23,
    });
    for (let i = 0; i <= 5; i++)
      box(
        g,
        [0.28, 0.025, 0.035],
        [x + w / 2 - 0.22, -3.6 + i * 0.55, z + d / 2 + 0.04],
        0x516d6b,
      );
    tag(g, key);
    return water;
  }
  const gallery = tank(-7, 3, 4, 2.8, "gallery"),
    tankWater = tank(-0.5, 3, 3.6, 2.8, "reservoir");
  const sensor = group(underground);
  box(sensor, [0.9, 0.1, 0.65], [-7, -0.45, 3], 0x226f61);
  box(sensor, [0.3, 0.07, 0.3], [-7, -0.35, 3], 0x354844);
  for (const x of [-7.28, -6.72]) {
    cylinder(sensor, 0.15, 0.22, [x, -0.6, 3.1], 0xb7c9c6);
  }
  tag(sensor, "sensor");
  const cone = new T.Mesh(
    new T.ConeGeometry(0.8, 2, 24, 1, true),
    mat(0x81d1cd, {
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  cone.position.set(-7, -1.7, 3);
  underground.add(cone);
  const pumps = [];
  for (const [x, key] of [
    [-3.6, "drain"],
    [2.6, "reuse"],
  ]) {
    const g = group(underground);
    box(g, [1.5, 0.24, 1.4], [x, -3.5, 3], 0x879c94);
    const body = cylinder(g, 0.48, 0.8, [x, -2.6, 3], 0x476963);
    body.rotation.z = Math.PI / 2;
    const rotor = new T.Mesh(
      new T.TorusGeometry(0.33, 0.055, 6, 16),
      mat(0xc5d6c5),
    );
    rotor.rotation.y = Math.PI / 2;
    rotor.position.set(x + 0.43, -2.6, 3);
    g.add(rotor);
    box(g, [0.1, 0.5, 0.07], [x + 0.45, -2.6, 3], 0xd2dfd5);
    const light = box(g, [0.2, 0.16, 0.22], [x, -1.95, 3], 0x77877b);
    light.material = light.material.clone();
    pumps.push({ rotor, light, key });
    tag(g, key);
  }
  const dam = group(scene);
  box(dam, [10, 0.5, 9], [10.5, -1.1, -3.4], 0x91a58a);
  const damWater = box(dam, [7.9, 0.6, 6.5], [11, -0.62, -4], 0x46a5b2, {
    transparent: true,
    opacity: 0.83,
    roughness: 0.24,
  });
  for (let i = 0; i < 9; i++) {
    const m = new T.Mesh(
      new T.IcosahedronGeometry(1.4 + (i % 3) * 0.3, 0),
      mat(i % 2 ? 0x97aa8f : 0xb3b6a2),
    );
    m.position.set(7.1 + i * 0.98, 0.25, -7.2);
    m.scale.set(1, 1 + (i % 2) * 0.6, 1);
    m.castShadow = true;
    dam.add(m);
  }
  box(dam, [8.8, 1.8, 0.65], [11, -0.05, -0.55], 0xb9c3b9);
  box(dam, [9.1, 0.2, 0.95], [11, 0.9, -0.55], 0xe1dfd0);
  for (let x = 7; x < 16; x += 1.1) {
    box(dam, [0.28, 1.4, 0.9], [x, -0.1, -0.25], 0x9fafa6);
    cylinder(dam, 0.03, 0.45, [x, 1.2, -0.55], 0x607c75);
  }
  box(dam, [8.8, 0.035, 0.035], [11, 1.4, -0.55], 0x607c75);
  [
    [6, -5],
    [6, -6.8],
    [15, -6.3],
    [16, -3],
    [15.5, -1.5],
  ].forEach(([x, z]) => tree(dam, x, z, 0.85, -0.8));
  tag(dam, "dam");
  // Visible drain covers connected to the collection chamber.
  const drains = [];
  for (const x of [-11, -7, -2]) {
    const g = group(scene);
    box(g, [0.8, 0.04, 0.5], [x, 0.45, 0.9], 0x415d59);
    for (let i = 0; i < 5; i++)
      box(g, [0.045, 0.012, 0.42], [x - 0.3 + i * 0.15, 0.48, 0.9], 0xa8b5a9);
    tag(g, "gallery");
    drains.push([x, 0.4, 0.9]);
  }
  return {
    soil,
    underground,
    gallery,
    tankWater,
    damWater,
    pumps,
    cone,
    drains,
  };
}
