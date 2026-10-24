import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export const views = {
  overview: { position: [25, 22, 31], target: [0, -0.3, -1] },
  city: { position: [-19, 15, 18], target: [-5, 0, -2] },
  gallery: { position: [-13, 5, 13], target: [-7, -1.5, 2] },
  sensor: { position: [-11, 3, 9], target: [-7, -1, 3] },
  reservoir: { position: [6, 4, 12], target: [-0.5, -2, 3] },
  drain: { position: [1, 2, 9], target: [-3.6, -2.6, 3] },
  reuse: { position: [7, 2, 10], target: [2.6, -2.6, 3] },
  pipes: { position: [12, 8, 16], target: [7, -1, 2] },
  dam: { position: [23, 12, 13], target: [11, 0, -3] },
};
export class CameraController {
  constructor(camera, canvas) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, canvas);
    this.controls.enableDamping = true;
    this.controls.minDistance = 5;
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
