import * as T from "three";
import { box, cylinder, tree, group, mat, tag } from "./primitives.js";
export function createCity(scene) {
  const city = group(scene);
  box(city, [17, 0.3, 12], [-5, 0.15, -2], 0xa4b49a);
  box(city, [17, 0.08, 2.2], [-5, 0.34, -0.5], 0x66716f);
  box(city, [2.1, 0.08, 12], [-5, 0.34, -2], 0x66716f);
  for (const z of [-1.8, 0.8])
    box(city, [17, 0.16, 0.38], [-5, 0.4, z], 0xdce0d3);
  for (const x of [-6.3, -3.7])
    box(city, [0.35, 0.16, 12], [x, 0.4, -2], 0xdce0d3);
  for (let x = -13; x < 3; x += 1.5)
    box(city, [0.65, 0.015, 0.05], [x, 0.39, -0.5], 0xf4e6bd);
  for (let z = -7; z < 4; z += 1.5)
    box(city, [0.05, 0.015, 0.65], [-5, 0.39, z], 0xf4e6bd);
  for (let i = 0; i < 5; i++) {
    box(city, [0.16, 0.02, 1.6], [-6.9 + i * 0.32, 0.4, -0.5], 0xf6f1df);
    box(city, [1.6, 0.02, 0.16], [-5, 0.4, 1.1 + i * 0.32], 0xf6f1df);
  }
  const homes = [
    [-11, -4, 2.1],
    [-8, -4, 1.7],
    [-1.4, -5, 3.1],
    [1.2, -5, 2.2],
    [-10, 2.5, 1.6],
    [-7.7, 2.5, 1.9],
    [-1, 2.2, 1.4],
  ];
  homes.forEach(([x, z, h], i) => {
    const w = i === 2 ? 2 : 1.65;
    box(
      city,
      [w, h, 1.8],
      [x, 0.5 + h / 2, z],
      [0xe6dfcd, 0xe8ebdf, 0xd5dace][i % 3],
    );
    if (i === 2) {
      box(city, [w + 0.12, 0.16, 2], [x, 0.55 + h, z], 0x6b7b78);
      box(city, [0.6, 0.3, 0.6], [x, 0.8 + h, z], 0xabb7af);
    } else {
      const roof = new T.Mesh(
        new T.CylinderGeometry(1.35, 1.35, 2.05, 3),
        mat(i % 2 ? 0x738a83 : 0xb47d62),
      );
      roof.rotation.z = Math.PI / 2;
      roof.rotation.y = Math.PI / 2;
      roof.position.set(x, h + 0.65, z);
      roof.scale.set(0.6, 1, 1);
      roof.castShadow = true;
      city.add(roof);
    }
    for (let yy = 0.95; yy < h + 0.2; yy += 0.75)
      for (const xx of [-0.43, 0.43]) {
        box(city, [0.35, 0.43, 0.035], [x + xx, yy, z + 0.91], 0x537c83);
        box(
          city,
          [0.035, 0.43, 0.35],
          [x + w / 2 + 0.01, yy, z + xx],
          0x537c83,
        );
      }
    box(city, [0.35, 0.7, 0.04], [x, 0.85, z + 0.93], 0x9a8e76);
  });
  [
    [-12, -6],
    [-9, -6],
    [-2, -7],
    [2, -7],
    [-12, 2.6],
    [-2.6, 2.5],
    [2.2, 2.4],
    [-7.2, -6.5],
    [-11, 0.9],
  ].forEach(([x, z]) => tree(city, x, z, 0.85));
  for (const [x, z] of [
    [-12, 1],
    [-8, -1.7],
    [-3, -1.7],
    [2, 1],
  ]) {
    cylinder(city, 0.045, 2.4, [x, 1.6, z], 0x617673);
    box(city, [0.45, 0.12, 0.18], [x + 0.15, 2.8, z], 0xe7e4d2);
  }
  for (const [x, z, c] of [
    [-10, -0.6, 0xce9a61],
    [-4.9, -5, 0xe9e5d8],
    [0, -0.3, 0x4f8c8b],
  ]) {
    box(city, [0.95, 0.3, 0.47], [x, 0.62, z], c);
    box(city, [0.48, 0.22, 0.43], [x, 0.86, z], 0xb3cdcc);
    for (const a of [-0.3, 0.3])
      for (const b of [-0.25, 0.25]) {
        const wheel = cylinder(city, 0.12, 0.08, [x + a, 0.5, z + b], 0x34433f);
        wheel.rotation.x = Math.PI / 2;
      }
  }
  tag(city, "city");
  return city;
}
