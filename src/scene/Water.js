import * as T from "three";
import { mat, tag } from "./primitives.js";
export class Flow {
  constructor(parent, points, key, color = 0x397d83) {
    this.curve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...p)),
      false,
      "centripetal",
    );
    const pipe = new T.Mesh(
      new T.TubeGeometry(this.curve, 48, 0.19, 8, false),
      mat(color, { transparent: true, opacity: 0.43, depthWrite: false }),
    );
    parent.add(pipe);
    tag(pipe, key);
    this.dots = new T.InstancedMesh(
      new T.SphereGeometry(0.095, 6, 4),
      mat(0xb9f5ef, { roughness: 0.3 }),
      16,
    );
    this.dots.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.dots.frustumCulled = false;
    parent.add(this.dots);
    this.phase = 0;
    this.dummy = new T.Object3D();
  }
  update(dt, on) {
    this.dots.visible = on;
    if (!on) return;
    this.phase = (this.phase + dt * 0.16) % 1;
    for (let i = 0; i < 16; i++) {
      this.dummy.position.copy(
        this.curve.getPointAt((i / 16 + this.phase) % 1),
      );
      this.dummy.updateMatrix();
      this.dots.setMatrixAt(i, this.dummy.matrix);
    }
    this.dots.instanceMatrix.needsUpdate = true;
  }
}
export class Rain {
  constructor(scene) {
    this.count = 900;
    this.positions = new Float32Array(this.count * 6);
    for (let i = 0; i < this.count; i++) {
      let k = i * 6;
      this.positions[k] = -13 + Math.random() * 16;
      this.positions[k + 1] = 0.5 + Math.random() * 11;
      this.positions[k + 2] = -7 + Math.random() * 11;
    }
    this.geometry = new T.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new T.BufferAttribute(this.positions, 3),
    );
    this.lines = new T.LineSegments(
      this.geometry,
      new T.LineBasicMaterial({
        color: 0x7fa8b0,
        transparent: true,
        opacity: 0.55,
      }),
    );
    this.lines.frustumCulled = false;
    scene.add(this.lines);
    this.budget = 600;
  }
  update(dt, intensity) {
    this.lines.visible = intensity > 0;
    this.geometry.setDrawRange(0, Math.floor(this.budget * intensity) * 2);
    if (!intensity) return;
    for (let i = 0; i < this.count; i++) {
      const k = i * 6;
      this.positions[k + 1] -= dt * 10;
      if (this.positions[k + 1] < 0.5) this.positions[k + 1] = 11;
      this.positions[k + 3] = this.positions[k] - 0.07;
      this.positions[k + 4] = this.positions[k + 1] + 0.42;
      this.positions[k + 5] = this.positions[k + 2];
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
