import * as T from "three";
import { createCity } from "./City.js";
import { createInfrastructure } from "./Infrastructure.js";
import { CameraController } from "./CameraController.js";
import { Flow, Rain } from "./Water.js";
import { box } from "./primitives.js";
export class SceneManager {
  constructor(host, onSelect) {
    this.host = host;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0xe9eee7);
    this.scene.fog = new T.Fog(0xe9eee7, 65, 125);
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Maquete 3D interativa AquaMonitor. Use os botões de câmera para navegar.",
    );
    this.camera = new T.PerspectiveCamera(40, 1, 0.1, 180);
    this.cameraController = new CameraController(
      this.camera,
      this.renderer.domElement,
    );
    this.scene.add(new T.HemisphereLight(0xf4f7eb, 0x718b83, 2.3));
    this.sun = new T.DirectionalLight(0xfff2d8, 3.2);
    this.sun.position.set(-12, 26, 16);
    this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, {
      left: -28,
      right: 28,
      top: 25,
      bottom: -25,
      near: 1,
      far: 75,
    });
    this.sun.shadow.bias = -0.001;
    this.sun.shadow.normalBias = 0.05;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.sun);
    box(this.scene, [200, 0.2, 200], [0, -4.4, 0], 0xe4eae1);
    const grid = new T.GridHelper(90, 60, 0xcdd8cd, 0xdce3d8);
    grid.position.y = -4.28;
    this.scene.add(grid);
    this.time = 0;
    this.city = createCity(this.scene);
    this.parts = createInfrastructure(this.scene);
    this.rain = new Rain(this.scene);
    this.ripples = [];
    for (const [water, x, z, r] of [
      [this.parts.gallery, -7, 3, 0.8],
      [this.parts.tankWater, -0.5, 3, 0.7],
      [this.parts.damWater, 9, -3, 1.5],
    ])
      for (let i = 0; i < 3; i++) {
        const ring = new T.Mesh(
          new T.RingGeometry(r - 0.025, r, 40),
          new T.MeshBasicMaterial({
            color: 0xd3f3e8,
            transparent: true,
            opacity: 0.3,
            depthWrite: false,
            side: T.DoubleSide,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0, z);
        this.scene.add(ring);
        this.ripples.push({ ring, water, offset: i / 3 });
      }
    this.streetFlows = this.parts.drains.map(
      (p) =>
        new Flow(
          this.city,
          [
            [p[0] - 1, 0.46, -0.5],
            [p[0], 0.46, 0],
            [p[0], 0.46, 0.9],
          ],
          "gallery",
          0x82bcc1,
        ),
    );

    this.inlets = this.parts.drains.map(
      (p) =>
        new Flow(
          this.parts.underground,
          [p, [p[0], -1, 0.9], [-7, -2, 1.5], [-7, -3, 3]],
          "gallery",
          0x819b95,
        ),
    );
    this.drainFlow = new Flow(
      this.parts.underground,
      [
        [-5, -2.6, 3],
        [-3.6, -2.6, 3],
        [-2.3, -2.6, 3],
      ],
      "drain",
    );
    this.reuseFlow = new Flow(
      this.parts.underground,
      [
        [1.3, -2.6, 3],
        [2.6, -2.6, 3],
        [5, -2.6, 3],
        [6.5, -2, 2],
        [6.5, 0.1, -2],
        [8, 0.1, -3],
        [9, -0.35, -3],
      ],
      "pipes",
    );
    this.raycaster = new T.Raycaster();
    this.pointer = new T.Vector2();
    this.select = onSelect;
    this.down = null;
    this.onDown = (e) => (this.down = [e.clientX, e.clientY]);
    this.onUp = (e) => {
      if (
        !this.down ||
        Math.hypot(e.clientX - this.down[0], e.clientY - this.down[1]) > 5
      )
        return;
      const r = host.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster
        .intersectObjects(this.scene.children, true)
        .find((h) => {
          let p = h.object;
          while (p) {
            if (!p.visible) return false;
            p = p.parent;
          }
          return h.object.userData.component;
        });
      if (hit) onSelect(hit.object.userData.component);
    };
    this.renderer.domElement.addEventListener("pointerdown", this.onDown);
    this.renderer.domElement.addEventListener("pointerup", this.onUp);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.level = 0.267;
    this.tank = 0.125;
    this.quality = "auto";
    this.slow = 0;
    this.samples = 0;
    this.qualityTier = "medium";
    this.setQuality("auto");
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w < 700 ? Math.min(75, (40 * h) / w) : 40;
    this.camera.updateProjectionMatrix();
  }
  setQuality(q) {
    this.quality = q;
    const tier = q === "auto" ? "medium" : q;
    this.qualityTier = tier;
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, { low: 1, medium: 1.5, high: 2 }[tier]),
    );
    this.renderer.shadowMap.enabled = tier !== "low";
    this.rain.budget = { low: 250, medium: 550, high: 900 }[tier];
    this.resize();
  }
  setUnderground(enabled) {
    this.parts.soil.visible = !enabled;
    this.city.position.y = enabled ? 2 : 0;
  }
  update(dt, v) {
    this.time += dt;
    this.cameraController.update(dt);
    const alpha = 1 - Math.exp(-dt * 3);
    if (v.level !== null) this.level += (v.level - this.level) * alpha;
    this.tank += (v.tank - this.tank) * alpha;
    for (const [mesh, level] of [
      [this.parts.gallery, this.level],
      [this.parts.tankWater, this.tank],
    ]) {
      mesh.scale.y = Math.max(0.025, level * 2.65);
      mesh.position.y = -3.58 + mesh.scale.y / 2;
    }
    this.parts.gallery.material.opacity = v.fresh ? 0.72 : 0.27;
    this.parts.damWater.scale.y = 0.6 + Math.min(0.55, v.dam / 40);
    this.parts.damWater.position.y = -0.92 + this.parts.damWater.scale.y / 2;
    for (const { ring, water, offset } of this.ripples) {
      const phase = (this.time * 0.28 + offset) % 1;
      ring.position.y = water.position.y + water.scale.y / 2 + 0.018;
      ring.scale.setScalar(0.2 + phase);
      ring.material.opacity = (1 - phase) * 0.28;
      ring.visible = v.fresh;
    }
    const active = v.running;
    this.streetFlows.forEach((f) => {
      f.dots.visible = active && v.rain > 0;
      f.update(dt, active && v.rain > 0);
    });
    this.rain.update(dt, active ? v.rain : 0);
    this.inlets.forEach((f) => f.update(dt, active && v.rain > 0));
    this.drainFlow.update(dt, active && v.drain === "on");
    this.reuseFlow.update(dt, active && v.reuse === "on");
    for (const p of this.parts.pumps) {
      const state = v[p.key];
      p.light.material.color.setHex(
        state === "on"
          ? 0x4fbe8f
          : state === "blocked"
            ? 0xd78c53
            : state === "unknown"
              ? 0xc0aa80
              : 0x71857a,
      );
      if (active && state === "on") p.rotor.rotation.x += dt * 8;
    }
    this.parts.cone.visible = v.sensor === true;
    this.renderer.render(this.scene, this.camera);
    if (this.quality === "auto" && this.qualityTier !== "low") {
      this.samples++;
      this.slow += dt;
      if (this.samples >= 180) {
        if (this.slow / this.samples > 0.033) {
          this.setQuality("low");
          this.quality = "auto";
        }
        this.samples = 0;
        this.slow = 0;
      }
    }
  }
  project(point) {
    const p = new T.Vector3(...point).project(this.camera);
    return {
      x: ((p.x + 1) / 2) * this.host.clientWidth,
      y: ((1 - p.y) / 2) * this.host.clientHeight,
      visible: p.z < 1 && Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.95,
    };
  }
  dispose() {
    this.resizeObserver.disconnect();
    this.cameraController.dispose();
    this.renderer.domElement.removeEventListener("pointerdown", this.onDown);
    this.renderer.domElement.removeEventListener("pointerup", this.onUp);
    const geometries = new Set(),
      materials = new Set();
    this.scene.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material)
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.renderer.dispose();
  }
}
