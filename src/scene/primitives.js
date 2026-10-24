import * as T from "three";
const materials = new Map();
export const mat = (color, extra = {}) => {
  const key = JSON.stringify([color, extra]);
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshStandardMaterial({ color, roughness: 0.78, ...extra }),
    );
  return materials.get(key);
};
const cube = new T.BoxGeometry(1, 1, 1);
export function box(parent, size, pos, color, extra = {}) {
  const m = new T.Mesh(cube, mat(color, extra));
  m.scale.set(...size);
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function cylinder(parent, r, h, pos, color) {
  const m = new T.Mesh(new T.CylinderGeometry(r, r, h, 12), mat(color));
  m.position.set(...pos);
  m.castShadow = true;
  parent.add(m);
  return m;
}
export function tree(parent, x, z, s = 1, y = 0) {
  cylinder(parent, 0.09 * s, 0.9 * s, [x, y + 0.45 * s, z], 0x817458);
  const m = new T.Mesh(new T.IcosahedronGeometry(0.65 * s, 1), mat(0x73977a));
  m.scale.y = 1.35;
  m.position.set(x, y + 1.3 * s, z);
  m.castShadow = true;
  parent.add(m);
}
export function tag(object, key) {
  object.traverse((o) => {
    o.userData.component = key;
  });
  return object;
}
export function group(parent) {
  const g = new T.Group();
  parent.add(g);
  return g;
}
