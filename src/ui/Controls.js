export const components = {
  city: [
    "Bairro urbano",
    "Superfícies urbanas conduzem a chuva até os bueiros. A maquete apresenta o caminho da água em corte.",
  ],
  gallery: [
    "Galeria de coleta",
    "Nível de 0–30 cm monitorado pelo HC-SR04. No modo MQTT, este é o nível medido pelo ESP32.",
  ],
  sensor: [
    "Sensor ultrassônico",
    "HC-SR04 conectado ao ESP32. Mede a distância até a lâmina de água da galeria.",
  ],
  reservoir: [
    "Reservatório de coleta",
    "Recebe a drenagem da galeria. O firmware informa boias de cheio e vazio; o volume intermediário é uma estimativa ilustrativa.",
  ],
  drain: [
    "Bomba de drenagem · P01",
    "Transfere água da galeria para o reservatório. Na demonstração, liga em 20 cm e desliga em 12 cm, com proteção do sensor e reservatório cheio.",
  ],
  reuse: [
    "Bomba de reúso · P02",
    "Retira água do reservatório. A tubulação até a barragem representa uma extensão ilustrativa deste circuito, sem alterar o significado de reuse_on.",
  ],
  pipes: [
    "Linha de transporte",
    "As partículas mostram a direção do fluxo. O percurso até a barragem é ilustrativo e acompanha o estado da bomba de reúso.",
  ],
  dam: [
    "Barragem de destino",
    "Destino ilustrativo da água transportada. O acúmulo é estimado; não existe medição da barragem na telemetria do ESP32.",
  ],
};
const cameraButtons = [
  ["overview", "01", "Visão geral"],
  ["gallery", "02", "Galerias"],
  ["reservoir", "03", "Reservatório"],
  ["drain", "04", "Bombas"],
  ["pipes", "05", "Tubulação"],
  ["dam", "06", "Barragem"],
];
export function layout() {
  document.querySelector("#app").innerHTML = `
<header><a class="brand" href="./" aria-label="AquaMonitor início"><svg viewBox="0 0 32 36" aria-hidden="true"><path d="M16 1C13 8 3 17 3 23a13 13 0 0 0 26 0C29 17 19 8 16 1Z" fill="currentColor"/><path d="M7 24q5-6 10 0t9 0" fill="none" stroke="#d8eee7" stroke-width="2"/></svg><span>Aqua<span class="brand-light">Monitor</span><small>LABORATÓRIO DE INFRAESTRUTURA URBANA</small></span></a><div class="header-right"><span id="connection" class="connection">● Operação local</span><div class="mode-switch" aria-label="Fonte dos dados"><button id="demo-mode" class="active" aria-pressed="true">Demonstração</button><button id="mqtt-mode" aria-pressed="false">ESP32 · MQTT</button></div><button class="icon" id="fullscreen" title="Tela cheia" aria-label="Tela cheia">⛶</button></div></header>
<main><div id="scene"></div><div class="scene-heading"><div class="eyebrow">AQUAMONITOR / PROTÓTIPO 3D</div><h1>O caminho da água.</h1><p>Uma cidade preparada começa abaixo da superfície.</p><span id="source-badge" class="source-badge">● CENÁRIO SIMULADO · OFFLINE</span></div>
<div id="labels" aria-label="Componentes da maquete"></div>
<aside class="monitor"><div class="panel-top"><span>ESTAÇÃO DE MONITORAMENTO</span><span class="live-dot"></span></div><div class="station">Galeria pluvial <span>AM–01</span></div><div class="reading"><strong id="level">26,7</strong><span>%</span><svg viewBox="0 0 60 55" aria-hidden="true"><path d="M2 22q7-8 14 0t14 0t14 0t14 0M2 35q7-8 14 0t14 0t14 0t14 0M2 48q7-8 14 0t14 0t14 0t14 0" fill="none" stroke="currentColor" stroke-width="2"/></svg></div><div class="level-track"><i id="level-bar"></i><b></b></div><div class="range-label"><span id="cm">8,0 / 30 cm</span><span>Limite</span></div><div id="risk" class="risk">Nível normal</div>
<dl><div><dt>Sensor ultrassônico</dt><dd id="sensor-state">Operacional</dd></div><div><dt>P01 · Drenagem</dt><dd id="drain-state">Desligada</dd></div><div><dt>P02 · Reúso / transporte</dt><dd id="reuse-state">Desligada</dd></div></dl><div class="destination"><span class="destination-icon">↗</span><div><small>DESTINO DO TRANSPORTE</small><strong>Barragem</strong><span>Acúmulo ilustrativo · <b id="dam-value">0,0</b> L</span></div></div><div class="panel-foot" id="data-note">Dados simulados · escala didática</div></aside>
<div class="scene-tools"><button id="underground" aria-pressed="false" title="Separar superfície e estrutura">▱ <span>Vista subterrânea</span></button><button id="city-toggle" aria-pressed="true">⌂ <span>Exibir cidade</span></button><button id="reset-camera" title="Restaurar câmera" aria-label="Restaurar câmera">↺</button><label class="quality-label">Qualidade <select id="quality" aria-label="Qualidade gráfica"><option value="auto">Auto</option><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label></div>
<section id="inspector" class="inspector" hidden><button id="close-inspector" aria-label="Fechar inspeção">×</button><small>INSPEÇÃO DO SISTEMA</small><h2 id="inspect-title"></h2><p id="inspect-description"></p><span id="inspect-value"></span></section>
<div class="navigation-hint">Arraste para orbitar <span>·</span> Scroll para zoom <span>·</span> Botão direito para mover</div><div class="compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 40 40"><path d="M20 5 25 28 20 24 15 28Z" fill="#3d7065"/></svg></div>
</main>
<footer><div class="simulation-controls"><div class="control-title"><span class="eyebrow">CONTROLE DO CENÁRIO</span><strong id="scenario-title">Explore o sistema</strong></div><button id="tour" class="primary">▶ <span>Demonstração completa</span></button><button id="play" class="square" title="Iniciar ou pausar simulação" aria-label="Iniciar ou pausar simulação">▶</button><label class="rain-control"><span>☂ Intensidade da chuva <output id="rain-value">0%</output></span><input id="rain" type="range" min="0" max="100" value="0" aria-label="Intensidade da chuva"></label><button id="storm">Simular alerta</button><button id="reuse">Acionar reúso</button><button id="fault">Falha do sensor</button><button id="reset" class="square" title="Reiniciar simulação" aria-label="Reiniciar simulação">↺</button></div><nav class="camera-nav" aria-label="Posições da câmera"><span class="eyebrow">PONTOS DE VISTA</span>${cameraButtons.map(([key, n, label]) => `<button data-camera="${key}" class="${key === "overview" ? "active" : ""}"><small>${n}</small>${label}</button>`).join("")}<span class="project-note">PROJETO ACADÊMICO <b>2026</b></span></nav></footer><div id="error" role="alert" hidden></div>`;
}
export function bindControls(sim, scene) {
  const $ = (id) => document.getElementById(id);
  const select = (key) => {
    scene.cameraController.go(key);
    document
      .querySelectorAll("[data-camera]")
      .forEach((b) => b.classList.toggle("active", b.dataset.camera === key));
    if (key === "overview") {
      $("inspector").hidden = true;
      return;
    }
    const info = components[key];
    if (info) {
      $("inspect-title").textContent = info[0];
      $("inspect-description").textContent = info[1];
      $("inspector").hidden = false;
      $("inspector").dataset.key = key;
    }
  };
  document
    .querySelectorAll("[data-camera]")
    .forEach((b) => (b.onclick = () => select(b.dataset.camera)));
  for (const mode of ["demo", "mqtt"])
    $(mode + "-mode").onclick = () => {
      sim.setMode(mode);
      for (const m of ["demo", "mqtt"]) {
        $(m + "-mode").classList.toggle("active", m === mode);
        $(m + "-mode").setAttribute("aria-pressed", String(m === mode));
      }
      document
        .querySelectorAll(
          ".simulation-controls button,.simulation-controls input",
        )
        .forEach((el) => (el.disabled = mode === "mqtt"));
      $("source-badge").textContent =
        mode === "demo"
          ? "● CENÁRIO SIMULADO · OFFLINE"
          : "● TELEMETRIA ESP32 · SOMENTE LEITURA";
    };
  $("tour").onclick = () => {
    sim.startTour();
    select("overview");
  };
  $("play").onclick = () =>
    sim.dispatch({ type: "running", value: !sim.state.running });
  $("rain").oninput = (e) => {
    sim.tour = false;
    sim.dispatch({ type: "rain", value: Number(e.target.value) });
    sim.dispatch({ type: "running", value: true });
  };
  $("storm").onclick = () => {
    sim.tour = false;
    sim.dispatch({ type: "speed", value: 120 });
    sim.dispatch({ type: "rain", value: 100 });
    sim.dispatch({ type: "running", value: true });
  };
  $("reuse").onclick = () => sim.dispatch({ type: "reuse" });
  $("fault").onclick = () =>
    sim.dispatch({ type: "sensor", value: !sim.state.sensorFault });
  $("reset").onclick = () => sim.reset();
  $("quality").onchange = (e) => scene.setQuality(e.target.value);
  $("reset-camera").onclick = () => select("overview");
  $("close-inspector").onclick = () => ($("inspector").hidden = true);
  $("underground").onclick = () => {
    const enabled = $("underground").getAttribute("aria-pressed") !== "true";
    $("underground").setAttribute("aria-pressed", String(enabled));
    scene.setUnderground(enabled);
  };
  $("city-toggle").onclick = () => {
    scene.city.visible = !scene.city.visible;
    $("city-toggle").setAttribute("aria-pressed", String(scene.city.visible));
  };
  $("fullscreen").onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      $("error").hidden = false;
      $("error").textContent =
        "Tela cheia indisponível neste navegador. Use F11 para apresentar.";
    }
  };
  const anchors = [
    ["gallery", [-7, -0.5, 4.5], "01 · Galeria"],
    ["reservoir", [-0.5, -0.4, 4.5], "02 · Reservatório"],
    ["pipes", [5, -1, 3], "03 · Transporte"],
    ["dam", [11, 1, -2], "04 · Barragem"],
  ];
  const labels = anchors.map(([key, point, text]) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.className = "world-label";
    b.onclick = () => select(key);
    $("labels").append(b);
    return { b, point };
  });
  let last = 0;
  const format = (n) =>
    n.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    });
  const stateLabels = {
    on: "Ligada",
    off: "Desligada",
    blocked: "Bloqueada",
    unknown: "Desconhecida",
  };
  return {
    select,
    update(v, time) {
      for (const { b, point } of labels) {
        const p = scene.project(point);
        b.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
        b.hidden = !p.visible;
      }
      if (time - last < 0.15) return;
      last = time;
      document.querySelector('.live-dot').style.background = v.fresh ? '#a2cfa8' : '#c5a46e';
      $("level").style.opacity = v.fresh ? '1' : '.45';
      $("level").textContent = v.level === null ? "—" : format(v.level * 100);
      $("level-bar").style.width = `${(v.level || 0) * 100}%`;
      $("cm").textContent =
        v.level === null
          ? "Leitura indisponível"
          : `${format(v.level * 30)} / 30 cm`;
      $("sensor-state").textContent =
        v.sensor === null ? "Desconhecido" : v.sensor ? "Operacional" : "Falha";
      for (const key of ["drain", "reuse"]) {
        $(key + "-state").textContent = stateLabels[v[key]];
        $(key + "-state").className = v[key] === "on" ? "on" : "";
      }
      $("risk").textContent =
        v.alarm || (v.level >= 0.6 ? "Nível em atenção" : "Nível normal");
      $("risk").className =
        "risk " + (v.alarm || v.level >= 0.6 ? "warning" : "");
      $("dam-value").textContent = format(v.dam);
      $("connection").textContent =
        sim.mode === "demo"
          ? "● Operação local"
          : v.fresh
            ? "● ESP32 transmitindo"
            : v.connection === "connected"
              ? "◌ Aguardando ESP32"
              : `◌ MQTT · ${v.connection}`;
      $("data-note").textContent =
        sim.mode === "demo"
          ? "Dados simulados · escala didática"
          : v.error ||
            `${v.fresh ? "Leitura atual" : v.level === null ? "Aguardando leitura válida" : "Última leitura · desatualizada"} · ${v.input}${v.receivedAt ? " · " + new Date(v.receivedAt).toLocaleTimeString("pt-BR") : ""}`;
      $("rain").value = sim.state.rain;
      $("rain-value").textContent = sim.state.rain + "%";
      $("play").textContent = sim.state.running ? "Ⅱ" : "▶";
      $("scenario-title").textContent =
        sim.mode === "mqtt"
          ? "Recebendo telemetria"
          : sim.tour
            ? sim.elapsed < 12
              ? "Chuva e coleta"
              : "Drenagem e transporte"
            : sim.state.running
              ? "Simulação em execução"
              : "Explore o sistema";
      $("reuse").textContent = sim.state.reuseRequested
        ? "Desligar reúso"
        : "Acionar reúso";
      $("fault").textContent = sim.state.sensorFault
        ? "Restaurar sensor"
        : "Falha do sensor";
      const key = $("inspector").dataset.key;
      $("inspect-value").textContent =
        key === "reservoir"
          ? `Volume ilustrativo: ${format(v.tank * 100)}%`
          : key === "dam"
            ? `Acúmulo ilustrativo: ${format(v.dam)} L`
            : key === "gallery" || key === "sensor"
              ? `${v.fresh ? "Atual" : "Desatualizado"} · ${v.level === null ? "Sem leitura" : format(v.level * 30) + " cm"}`
              : key === "drain" || key === "reuse"
                ? `Estado: ${stateLabels[v[key]]}`
                : "";
    },
  };
}
