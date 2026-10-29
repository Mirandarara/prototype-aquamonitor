import * as T from "three";
import { createCity } from "./City.js";
import { createInfrastructure, hydraulicPaths } from "./Infrastructure.js";
import { CameraController, views } from "./CameraController.js";
import { Layers } from "./Layers.js";
import { Atmosphere } from "./Atmosphere.js";
import { Flow, Rain, waterSurface } from "./Water.js";
import { box } from "./primitives.js";
export class SceneManager {
  constructor(host, onSelect) {
    this.host = host;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x071b20);
    this.scene.fog = new T.Fog(0x071b20, 65, 125);
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
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
    this.atmosphere = new Atmosphere(this.scene, this.renderer);
    this.sun = this.atmosphere.sun;
    box(this.scene, [200, 0.2, 200], [0, -4.4, 0], 0xc4cec2);
    const grid = new T.GridHelper(90, 60, 0x173a3e, 0x102c31);
    grid.position.y = -4.28;
    grid.visible = false;
    this.scene.add(grid);
    this.time = 0;
    this.city = createCity(this.scene);
    this.parts = createInfrastructure(this.scene);
    this.environment = new T.Group(); this.scene.add(this.environment);
    this.rain = new Rain(this.environment);
    this.environment.add(this.atmosphere.clouds);
    this.atmosphere.cloudMat.userData.visualAnimation = true;
    this.street = waterSurface(this.city, 6, 1.95, [-4.8, .42, -.9]);
    this.street.mesh.userData.component = 'city';
    this.channelSurface = waterSurface(this.parts.underground, 10.8, 2, [-9.65, -3, 4.05]);
    this.gallerySurface = waterSurface(this.parts.underground, 4.7, 3.3, [-1.5, -3, 3.8]);
    this.damSurface = waterSurface(this.parts.dam, 8.5, 4.5, [10.4, 1.6, -3.7]);
    this.ripples = [];
    for (const [water, x, z, r, key] of [
      [this.parts.gallery, -2.4, 3.6, 0.7, "gallery"],
      [this.parts.damWater, 7, -2, 0.75, "dam"],
    ]) for (let i = 0; i < 3; i++) {
      const ring = new T.Mesh(new T.RingGeometry(r - 0.025, r, 32), new T.MeshBasicMaterial({ color: 0xd3f3e8, transparent: true, opacity: 0.3, depthWrite: false, side: T.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0, z);
      this.scene.add(ring);
      this.ripples.push({ ring, water, key, offset: i / 3 });
    }
    this.streetFlows = this.parts.drains.flatMap(p => [-1, 1].map(direction =>
      new Flow(this.scene, [[p[0] + direction * 2.3, 0.405, -2.15], [p[0] + direction * 1.1, 0.405, -1.4], [p[0], 0.49, -0.1]], "city", 0x82bcc1, { surface: true })
    ));
    this.inlets = this.parts.drains.map(p => new Flow(this.parts.underground,
      [p, [p[0], -1, -0.1], [-3, -1.2, 0.6], [-3, -1.7, 2.15]], "gallery", 0x819b95));
    this.drainFlow = new Flow(this.scene, hydraulicPaths.drain, "pipes", 0x247b9f);
    this.reuseFlow = new Flow(this.scene, hydraulicPaths.reuse, "reuse", 0x4a9387, { linear: true });
    this.delivery = new Flow(this.scene, [[7, 4.1, -2], [7, 1.3, -2]], "dam", 0x82bcc1, { surface: true });
    this.irrigation = new Flow(this.scene, [[12.3,-0.48,4.6], [11,-0.38,4.4], [9,-0.38,4.1]], "reuse", 0x82bcc1, { surface: true });
    this.cutaway = false;
    this.cutawayBlend = 0;
    this.flowSystem = new T.Group(); this.scene.add(this.flowSystem);
    for (const flow of [this.drainFlow, this.reuseFlow, this.delivery, this.irrigation]) {
      for (const root of [flow.pipe, flow.dots].filter(Boolean)) this.flowSystem.add(root);
    }
    // Street flow and ripples inherit their physical layer transform.
    for (const flow of this.streetFlows) this.city.attach(flow.dots);
    for (const ripple of this.ripples) (ripple.key === 'dam' ? this.parts.dam : this.parts.underground).add(ripple.ring);
    this.parts.underground.attach(this.parts.gallery);
    this.scene.attach(this.parts.chamber);
    this.layers = new Layers(this.scene, {
      environment: [this.environment],
      surface: [this.city, this.parts.grates, this.parts.sensor],
      structure: [this.parts.soil, this.parts.chamber],
      hydraulic: [this.parts.underground, this.parts.dam, this.parts.irrigation, this.flowSystem],
      electronics: [this.parts.esp],
    });
    this.highlight = new T.BoxHelper(this.parts.sensor, 0x87e3e0);
    this.highlight.visible = false; this.scene.add(this.highlight);
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
      const hits = this.raycaster
        .intersectObjects(this.scene.children, true)
        .filter((h) => {
          let p = h.object;
          while (p) {
            if (!p.visible) return false;
            p = p.parent;
          }
          return h.object.userData.component;
        });
      // Look through the acrylic/water when selecting equipment in the chamber.
      const hit = hits.find(h => ["sensor", "esp32", "drain"].includes(h.object.userData.component)) || hits[0];
      if (hit) onSelect(hit.object.userData.component, false);
    };
    this.renderer.domElement.addEventListener("pointerdown", this.onDown);
    this.renderer.domElement.addEventListener("pointerup", this.onUp);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.level = 0.267;
    this.dam = 0.125;
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
    this.camera.fov = w < 700 ? Math.min(75, (40 * h) / w) : 36;
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
    this.city.userData.splashes.budget = { low: 0.3, medium: 0.65, high: 1 }[tier];
    this.resize();
  }
  setUnderground(enabled, moveCamera = true) {
    this.cutaway = enabled;
    if (moveCamera) this.cameraController.go(enabled ? "gallery" : "overview");
  }
  update(dt, v) {
    if (v.running) this.time += dt;
    this.cameraController.update(dt);
    const alpha = 1 - Math.exp(-dt * 3);
    this.cutawayBlend += ((this.cutaway ? 1 : 0) - this.cutawayBlend) * alpha;
    const weatherIntensity = v.fresh && v.running ? v.rain : 0;
    const weatherDt = v.running || v.rain === 0 ? dt : 0;
    const weather = this.atmosphere.update(weatherDt, weatherIntensity);
    this.city.userData.updateVisuals(v.running ? dt : 0, {
      time: this.time,
      rain: weatherIntensity,
      wind: weather.storm,
      dark: weather.dark,
    });
    this.layers.update(dt, this.cutawayBlend);
    const environmentOpacity = this.layers.items.find(i => i.key === 'environment').opacity;
    this.rain.lines.material.opacity = .55 * environmentOpacity;
    if (v.level !== null) this.level += (v.level - this.level) * alpha;
    this.dam += (v.dam - this.dam) * alpha;
    this.parts.gallery.scale.y = Math.max(0.001, this.level * 2.65);
    this.parts.gallery.position.y = -3.58 + this.parts.gallery.scale.y / 2;
    this.parts.gallery.visible = this.level > 0.001;
    // Street reading is calibrated at the road. Gallery volume is an illustrative
    // synchronized hydraulic view, never a second measured water level.
    this.street.mesh.position.y = this.parts.streetDatum + this.level * this.parts.sensorSpan;
    this.street.mesh.visible = v.level !== null && this.level > .003;
    this.street.mesh.material.opacity = (v.fresh ? .62 : .22) * this.layers.items.find(i => i.key === "surface").opacity;
    this.street.update(this.time);
    this.gallerySurface.mesh.position.y = this.parts.gallery.position.y + this.parts.gallery.scale.y / 2 + .015;
    this.channelSurface.mesh.position.y = this.gallerySurface.mesh.position.y;
    this.channelSurface.mesh.visible = this.parts.gallery.visible;
    this.channelSurface.update(this.time, .8);
    this.gallerySurface.update(this.time, v.drainFlow ? 1.8 : .65);
    this.gallerySurface.mesh.visible = this.parts.gallery.visible;
    this.damSurface.mesh.position.y = 1.3 + this.parts.damWater.scale.y + .015;
    this.damSurface.update(this.time, v.drainFlow ? 1.5 : .7);
    this.parts.gallery.material.opacity = (v.fresh ? 0.58 : 0.23) * this.layers.items.find(i => i.key === "hydraulic").opacity;
    this.parts.damWater.scale.y = Math.max(0.001, this.dam * 1.8);
    this.parts.damWater.visible = this.dam > 0.001;
    for (const { ring, water, key, offset } of this.ripples) {
      const phase = (this.time * 0.45 + offset) % 1;
      ring.position.y = key === "gallery" ? water.position.y + water.scale.y / 2 + 0.018 : 1.3 + water.scale.y + 0.018;
      ring.scale.setScalar(0.2 + phase);
      ring.material.opacity = (1 - phase) * 0.28;
      ring.visible = v.fresh && v.running && (key === "gallery" ? this.level > 0.001 && (v.rain > 0 || v.drainFlow) : v.drainFlow);
    }
    const rainActive = v.fresh && v.running && v.rain > 0;
    this.streetFlows.forEach(f => f.update(dt, rainActive && this.city.visible));
    this.rain.update(dt, rainActive && this.city.visible ? Math.min(v.rain, this.atmosphere.storm) : 0);
    this.inlets.forEach(f => f.update(dt, rainActive));
    this.drainFlow.update(dt, v.drainFlow);
    this.reuseFlow.update(dt, v.reuseFlow);
    // The free jet ends exactly at the current illustrative dam surface.
    this.delivery.curve.points[1].y = 1.3 + this.parts.damWater.scale.y;
    this.delivery.curve.updateArcLengths();
    this.delivery.update(dt, v.drainFlow);
    this.irrigation.update(dt, v.reuseFlow);
    for (const p of this.parts.pumps) {
      const state = v[p.key];
      p.light.material.color.setHex(state === "on" ? 0x4fbe8f : state === "blocked" ? 0xd78c53 : state === "unknown" ? 0xc0aa80 : 0x71857a);
      if (v.drainFlow) p.rotor.rotation.z += dt * 8;
    }
    this.parts.espLight.material.color.setHex(v.fresh ? 0x4fbe8f : 0xc0aa80);
    this.parts.relays.forEach(({ key, led }) => led.material.color.setHex(v[key] === 'on' ? 0x60eab0 : v[key] === 'unknown' ? 0xdca35b : 0x526a68));
    this.parts.cone.visible = v.sensor === true;
    if (this.highlight.visible) this.highlight.update();
    const distance = Math.max(0.05, this.parts.sensorY - this.street.mesh.position.y);
    this.parts.cone.scale.y = distance;
    this.parts.cone.position.y = this.parts.sensorY - distance / 2;
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
  thumbnails(canvases) {
    const camera = this.camera.clone();
    const saved = new T.Vector2(); this.renderer.getSize(saved);
    this.renderer.setSize(240, 130, false);
    camera.aspect = 240 / 130; camera.fov = 40; camera.updateProjectionMatrix();
    this.highlight.visible = false;
    for (const canvas of canvases) {
      const v = views[canvas.dataset.thumbnail] || views.overview;
      camera.position.set(...v.position); camera.lookAt(new T.Vector3(...v.target));
      this.renderer.render(this.scene, camera);
      canvas.width = 240; canvas.height = 130;
      canvas.getContext('2d').drawImage(this.renderer.domElement, 0, 0, 240, 130);
    }
    this.renderer.setSize(saved.x, saved.y, false);
  }
  focus(key) {
    const roots = { city: this.city, sensor: this.parts.sensor, esp32: this.parts.esp, gallery: this.parts.underground, drain: this.parts.pump, dam: this.parts.dam, reuse: this.parts.irrigation };
    this.highlight.visible = Boolean(roots[key]);
    if (roots[key]) this.highlight.setFromObject(roots[key]);
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
    const textures = new Set();
    for (const material of materials) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
    textures.forEach(texture => texture.dispose());
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
