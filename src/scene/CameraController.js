import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export const views = {
  overview: { position: [24, 22, 30], target: [2, 0, -1] },
  city: { position: [-17, 12, 16], target: [-8, 0, -2] },
  section: { position: [0, 3, 32], target: [-2, -1, 0] },
  exploded: { position: [28, 30, 38], target: [-1, 2, -1] },
  gallery: { position: [2, 4.5, 15], target: [-1.3, -1.5, 3.5] },
  sensor: { position: [-11, 6, 4], target: [-7.8, 1.6, -1.9] },
  esp32: { position: [3.6, 2.6, 4.5], target: [2, .8, 2.1] },
  drain: { position: [3.8, 0.5, 10.5], target: [-0.4, -2.6, 4.2] },
  pipes: { position: [14, 10, 18], target: [3.5, 0.6, 2.3] },
  dam: { position: [19, 20, 15], target: [10.5, 2, -3] },
  reuse: { position: [19, 8, 14], target: [11.3, 0.5, 2.4] },
};
export class CameraController {
  constructor(camera, canvas) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, canvas);
    this.controls.enableDamping = true;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 65;
    this.controls.maxPolarAngle = Math.PI * 0.51;
    this.controls.addEventListener("start", () => (this.destination = null));
    this.go("overview", true);
  }
  go(key, instant = false) {
    const v = views[key] || views.overview;
    this.destination = {
      position: new T.Vector3(...v.position),
      target: new T.Vector3(...v.target),
    };
    if (instant) {
      this.camera.position.copy(this.destination.position);
      this.controls.target.copy(this.destination.target);
      this.destination = null;
    }
    this.controls.update();
  }
  update(dt) {
    if (this.destination) {
      const alpha = 1 - Math.exp(-dt * 4);
      this.camera.position.lerp(this.destination.position, alpha);
      this.controls.target.lerp(this.destination.target, alpha);
      if (this.camera.position.distanceTo(this.destination.position) < 0.02)
        this.destination = null;
    }
    this.controls.update();
  }
  dispose() {
    this.controls.dispose();
  }
}
