import "./styles/main.css";
import { SceneManager } from "./scene/SceneManager.js";
import { SimulationController } from "./simulation/SimulationController.js";
import { AquaMqttService } from "./mqtt/mqttClient.js";
import { layout, bindControls } from "./ui/Controls.js";
layout();
const mqtt = new AquaMqttService(),
  sim = new SimulationController(mqtt);
let scene,
  ui,
  frame,
  last = performance.now(),
  elapsed = 0;
try {
  scene = new SceneManager(document.querySelector("#scene"), (key, move) =>
    ui?.select(key, move),
  );
  ui = bindControls(sim, scene);
  function animate(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;
    const view = sim.tick(dt);
    scene.update(dt, view);
    ui.update(view, elapsed);
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
  });
  window.addEventListener(
    "pagehide",
    () => {
      cancelAnimationFrame(frame);
      mqtt.stop();
      ui?.dispose();
      scene.dispose();
    },
    { once: true },
  );
  document.querySelector("canvas").addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    cancelAnimationFrame(frame);
    const el = document.querySelector("#error");
    el.textContent =
      "A renderização foi interrompida. Recarregue a página e selecione qualidade baixa.";
    el.hidden = false;
  });
} catch (error) {
  const el = document.querySelector("#error");
  el.textContent = `Não foi possível iniciar o ambiente 3D. Verifique se WebGL está habilitado. ${error.message}`;
  el.hidden = false;
  console.error(error);
}
