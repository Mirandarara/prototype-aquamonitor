import * as T from 'three';

// Every offset is relative to a saved origin; repeated transitions never accumulate.
export class Layers {
  constructor(scene, definitions) {
    this.exploded = false;
    this.blend = 0;
    this.xray = 1;
    this.items = Object.entries(definitions).map(([key, roots], i) => {
      const materials = new Map();
      const meshes = [];
      roots.forEach(root => root.traverse(o => {
        if (!o.isMesh || Array.isArray(o.material)) return;
        if (!materials.has(o.material)) materials.set(o.material, o.material.clone());
        o.material = materials.get(o.material);
        meshes.push({ mesh: o, opacity: o.material.opacity, transparent: o.material.transparent });
      }));
      return { key, roots, meshes, visible: true, opacity: 1, offset: [0, 6, 1.8, 0, 4][i], origins: roots.map(r => r.position.clone()) };
    });
    const points = [];
    for (const x of [-16, 0]) for (const z of [-8, 3]) points.push(new T.Vector3(x, 0, z), new T.Vector3(x, 6, z));
    this.guides = new T.LineSegments(new T.BufferGeometry().setFromPoints(points), new T.LineDashedMaterial({ color: 0x82b5b0, dashSize: .18, gapSize: .18, transparent: true, opacity: .35 }));
    this.guides.computeLineDistances();
    this.guides.visible = false;
    scene.add(this.guides);
  }
  set(key, values) { Object.assign(this.items.find(i => i.key === key), values); }
  isolate(key) { this.items.forEach(i => i.visible = i.key === key); }
  restore() { this.exploded = false; this.xray = 1; this.items.forEach(i => { i.visible = true; i.opacity = 1; }); }
  update(dt, cutaway = 0) {
    this.blend += ((this.exploded ? 1 : 0) - this.blend) * (1 - Math.exp(-dt * 4));
    this.guides.visible = this.blend > .01;
    for (const item of this.items) {
      item.roots.forEach((r, i) => { r.visible = item.visible; r.position.copy(item.origins[i]); r.position.y += item.offset * this.blend; });
      const opacity = item.opacity * (item.key === 'structure' ? this.xray * (1 - cutaway * .96) : 1);
      item.meshes.forEach(({ mesh, opacity: original, transparent }) => {
        mesh.material.opacity = original * opacity;
        mesh.material.transparent = transparent || opacity < .999;
        mesh.material.depthWrite = mesh.material.opacity > .45;
      });
    }
  }
}
