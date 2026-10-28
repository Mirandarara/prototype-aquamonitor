import * as T from "three";
import { mat, tag } from "./primitives.js";
export class Flow {
  constructor(parent, points, key, color = 0x397d83, { surface = false, linear = false } = {}) {
    this.curve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...p)),
      false,
      "centripetal",
    );
    if (linear) {
      this.curve = new T.CurvePath();
      points.slice(1).forEach((p, i) => this.curve.add(new T.LineCurve3(new T.Vector3(...points[i]), new T.Vector3(...p))));
    }
    const pipe = new T.Mesh(
      new T.TubeGeometry(this.curve, 48, surface ? 0.045 : 0.16, 8, false),
      mat(color, { transparent: true, opacity: 0.43, depthWrite: false }),
    );
    if (!surface) parent.add(pipe);
    else pipe.geometry.dispose();
    this.pipe = surface ? null : pipe;
    tag(pipe, key);
    this.dots = new T.InstancedMesh(
      new T.SphereGeometry(surface ? 0.065 : 0.085, 6, 4),
      mat(0xb9f5ef, { roughness: 0.3 }),
      16,
    );
    this.dots.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.dots.frustumCulled = false;
    parent.add(this.dots);
    this.surface = surface;
    this.dots.visible = false;
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
      this.dummy.scale.set(1, this.surface ? 0.3 : 1, 1);
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
      this.positions[k] = -16 + Math.random() * 16;
      this.positions[k + 1] = 0.5 + Math.random() * 11;
      this.positions[k + 2] = -8 + Math.random() * 7;
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

export function waterSurface(parent, width, depth, position) {
  const geometry = new T.PlaneGeometry(width, depth, 32, 20);
  geometry.rotateX(-Math.PI / 2);
  const material = new T.MeshStandardMaterial({ color: 0x258d9d, metalness: .32, roughness: .22, transparent: true, opacity: .72, side: T.DoubleSide, depthWrite: false });
  const mesh = new T.Mesh(geometry, material);
  mesh.position.set(...position);
  parent.add(mesh);
  const original = geometry.attributes.position.array.slice();
  return { mesh, update(time, strength = 1) {
    const a = geometry.attributes.position;
    for (let i = 0; i < a.count; i++) a.setY(i, Math.sin(original[i*3]*3.2 + time*2) * Math.cos(original[i*3+2]*2.5 + time) * .027 * strength);
    a.needsUpdate = true;
    geometry.computeVertexNormals();
  } };
}

export class Weather {
  constructor(parent) {
    this.clouds = new T.Group(); parent.add(this.clouds);
    const geometry = new T.IcosahedronGeometry(1, 2);
    this.material = new T.MeshStandardMaterial({ color: 0x89999a, roughness: 1, transparent: true, opacity: .88 });
    for (let i = 0; i < 24; i++) {
      const cloud = new T.Mesh(geometry, this.material);
      cloud.position.set(-14 + (i % 8) * 2.1, 7 + Math.sin(i*4)*.45, -7 + Math.floor(i/8)*2.4);
      cloud.scale.set(1.5, .6 + (i%3)*.1, 1.15);
      this.clouds.add(cloud);
    }
    this.amount = 0;
  }
  update(dt, intensity, time) {
    this.amount += (intensity - this.amount) * (1 - Math.exp(-dt*.8));
    this.material.opacity = this.amount * .88;
    this.clouds.visible = this.amount > .005;
    this.clouds.position.x = Math.sin(time*.08)*.35;
  }
}
