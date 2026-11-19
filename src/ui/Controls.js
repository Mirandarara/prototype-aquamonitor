import { bindMqttSession } from './MqttSession.js';
import { prototypeMarkup, bindPrototypeDialog } from "./PrototypeDialog.js";
import { Presentation } from "./Presentation.js";
const brandLogo = new URL("../assets/brand/aquamonitor.png", import.meta.url).href;
export const components = {
  city: ["Captação urbana", "A chuva percorre o pavimento até as bocas de lobo. A tubulação de chegada conduz essa água à galeria em corte."],
  gallery: ["Galeria pluvial", "Galeria em corte. Seu nível é ilustrativo; o único sensor fica na rua. A água segue diretamente para a barragem quando a bomba é acionada."],
  sensor: ["Sensor ultrassônico", "Instalado sobre o ponto baixo da rua e apontado verticalmente para a água. Referência calibrada: 30 cm. Altura = 30 cm menos a distância; não mede a galeria."],
  esp32: ["Controlador ESP32", "Placa instalada fora da água, conectada ao sensor e ao circuito da bomba. O laboratório acompanha a conexão MQTT existente em modo somente leitura."],
  drain: ["Bomba de drenagem", "Instalada no fundo da galeria, bombeia diretamente para a barragem. Na demonstração automática, liga em 20 cm e desliga em 12 cm. Os controles manuais mantêm as proteções de nível e sensor."],
  pipes: ["Transporte até a barragem", "Mangueira ligada à saída da bomba. O fluxo segue da galeria até a barragem apenas com bombeamento ativo e água disponível."],
  dam: ["Barragem", "Único armazenamento após a galeria. Recebe a água bombeada e alimenta o reúso por gravidade. Volume ilustrativo, sem sensor próprio e sem conversão para litros reais."],
  reuse: ["Reaproveitamento · relé 2", "O firmware aciona o segundo relé (GPIO 27) quando há solicitação e água disponível. reuse_on informa esse comando; a tubulação descendente ilustra o destino para irrigação. O circuito não comprova o tipo de atuador conectado."],
};
const cameraButtons = [
  ["overview", "A", "Visão geral"], ["city", "B", "Cidade"],
  ["section", "C", "Corte transversal"], ["gallery", "D", "Subsolo"],
  ["drain", "E", "Bombeamento"], ["dam", "F", "Barragem"],
  ["esp32", "G", "Eletrônica"], ["reuse", "H", "Reaproveitamento"],
  ["exploded", "I", "Explodida"],
];
export function layout() {
  document.querySelector("#app").innerHTML = `
<header><a class="brand" href="./" aria-label="AquaMonitor — Laboratório 3D"><img class="brand-logo" src="${brandLogo}" alt="AquaMonitor" width="1599" height="893" /><span class="brand-descriptor">LABORATÓRIO<span>3D INTERATIVO</span></span></a>
<nav class="top-views" aria-label="Visualização">${[['overview','Visão geral'],['city','Cidade'],['gallery','Subsolo'],['esp32','Eletrônica'],['exploded','Explodida']].map(([k,l])=>`<button data-camera="${k}" class="${k==='overview'?'active':''}">${l}</button>`).join('')}</nav>
<div class="header-right"><div class="mode-switch"><button id="demo-mode" class="active" aria-pressed="true">● Simulação local</button><button id="mqtt-mode" aria-pressed="false">ESP32 · MQTT</button></div><button id="fullscreen" title="Tela cheia" aria-label="Tela cheia">⛶</button></div></header>
<main><div id="scene"></div><div id="labels"></div>
<div class="source-line"><span id="source-badge">● CENÁRIO SIMULADO · OFFLINE</span><span id="connection">● Operação local</span></div>
<nav class="side-nav" aria-label="Ferramentas">${[['layers','◇','Camadas'],['cameras','▣','Câmeras'],['weather','☁','Clima'],['components','⌘','Componentes'],['settings','⚙','Configurações']].map(([k,icon,l])=>`<button data-panel="${k}" title="${l}" aria-expanded="false"><b>${icon}</b><span>${l}</span></button>`).join('')}</nav>
<section id="context" class="context-panel" hidden><button id="close-context" class="close" aria-label="Fechar painel">×</button><div id="context-content"></div></section>
<aside class="monitor"><div class="panel-top">Estação de monitoramento <button id="monitor-toggle" title="Recolher monitoramento" aria-label="Recolher monitoramento" aria-expanded="true">−</button></div><div class="monitor-body"><div class="station">Nível de alagamento <span>(rua)</span><i class="live-dot"></i></div><div class="reading"><strong id="level">—</strong><span>%</span><span class="wave-icon">≋</span></div><div class="level-track"><i id="level-bar"></i></div><div class="range-label"><span id="cm">— / 30 cm</span></div><div id="risk" class="risk">Nível normal</div>
<div class="rain-summary">☁ <span>Intensidade da chuva<small id="rain-measure">Cenário local · 0%</small></span><span class="rain-bars">▁▂▃▅▆</span></div>
<dl><div><dt>Sensor ultrassônico</dt><dd id="sensor-state">—</dd></div><div><dt>Bomba de drenagem</dt><dd id="drain-state">—</dd></div><div><dt>Reúso · relé 2</dt><dd id="reuse-state">—</dd></div><div><dt>ESP32 / MQTT</dt><dd id="hardware-state">Não utilizado</dd></div></dl><div class="destination"><small>DESTINO · BARRAGEM</small><span>Volume estimado <b id="dam-value">—</b>%</span></div><p id="data-note" class="panel-foot"></p></div></aside>
<section id="inspector" class="inspector" hidden><button id="close-inspector" class="close" aria-label="Fechar inspeção">×</button><small>INSPEÇÃO DO SISTEMA</small><h2 id="inspect-title"></h2><p id="inspect-description"></p><span id="inspect-value"></span><div class="inspector-actions"><button id="focus-component">Aproximar</button><button id="back-component">Voltar</button></div><div id="hardware-links" hidden><button data-inspect="sensor">HC-SR04</button><button data-inspect="esp32">ESP32 + relés</button><button data-prototype-open>Circuito completo ↗</button></div></section>
<div class="scene-tools"><button data-prototype-open>⌘ Protótipo físico</button><button id="underground" aria-pressed="false">▱ Corte</button><button id="city-toggle" aria-pressed="true">⌂ Cidade</button><button id="reset-camera" title="Restaurar câmera">↺</button><button id="labels-toggle" aria-pressed="true">Etiquetas</button><button id="clean" title="Ocultar interface">◱ Foco</button></div><button id="restore-ui" hidden>◱ Mostrar interface</button>
<div id="presentation" hidden><small id="presentation-step"></small><h2 id="presentation-title"></h2><p id="presentation-text"></p><div><button id="prev-step" aria-label="Etapa anterior">←</button><button id="pause-presentation">Pausar</button><button id="next-step" aria-label="Próxima etapa">→</button><button id="end-presentation">Encerrar</button></div></div>
<div class="navigation-hint">Arraste para orbitar · Scroll para zoom · Botão direito para mover</div></main>
<footer><button id="perspectives-toggle" aria-expanded="true">Perspectivas <span>⌄</span></button><nav class="camera-nav" aria-label="Perspectivas">${cameraButtons.map(([key,n,label])=>`<button data-camera="${key}" class="camera-card ${key==='overview'?'active':''}"><canvas data-thumbnail="${key}" aria-hidden="true"></canvas><span><small>${n}</small>${label}</span></button>`).join('')}</nav>
<div class="simulation-controls"><button id="tour" class="primary">▶ Apresentação</button><button id="play" aria-label="Iniciar ou pausar simulação">▶</button><label class="rain-control"><span>Intensidade da chuva <output id="rain-value">0%</output></span><input id="rain" type="range" min="0" max="100" value="0" aria-label="Intensidade da chuva"></label><label class="pump-control">Modo da bomba<select id="pump-mode"><option value="auto">Automática</option><option value="on">Ligada</option><option value="off">Desligada</option></select></label><button id="reuse">Abrir reúso</button><button id="storm">⚠ Simular alerta</button><button id="fault">Falha do sensor</button><button id="reset" title="Reiniciar simulação">↺</button><label class="speed-control">Velocidade<select id="speed"><option value="1">1×</option><option value="30" selected>30×</option><option value="60">60×</option><option value="120">120×</option></select></label><span id="scenario-title"></span><input id="guided" type="checkbox" hidden></div></footer><div id="error" role="alert" hidden></div>${prototypeMarkup()}`;
}
export function bindControls(sim, scene) {
  const $ = (id) => document.getElementById(id);
  let current = 'overview', previous = 'overview';
  const select = (key, move = true) => {
    previous = current; current = key;
    scene.focus(key);
    if (key === "esp32" && !move) prototype.open();
    scene.layers.exploded = key === 'exploded';
    const cutaway = ["gallery", "section", "drain"].includes(key);
    scene.setUnderground(cutaway, false);
    $("underground").setAttribute("aria-pressed", String(cutaway));
    if (move) scene.cameraController.go(key);
    document
      .querySelectorAll("[data-camera]")
      .forEach((b) => b.classList.toggle("active", b.dataset.camera === key));
    if (["overview", "section", "exploded"].includes(key)) {
      $("inspector").hidden = true;
      return;
    }
    $("hardware-links").hidden = !["gallery", "sensor", "esp32", "drain"].includes(key);
    const info = components[key];
    if (info) {
      $("inspect-title").textContent = info[0];
      $("inspect-description").textContent = info[1];
      $("inspector").hidden = false;
      $("inspector").dataset.key = key;
    }
  };
  const prototype = bindPrototypeDialog(select);
  const mqttSession = bindMqttSession(sim);
  document
    .querySelectorAll("[data-camera]")
    .forEach((b) => (b.onclick = () => select(b.dataset.camera)));
  document.querySelectorAll("[data-inspect]").forEach(b => b.onclick = () => select(b.dataset.inspect));
  for (const mode of ["demo", "mqtt"])
    $(mode + "-mode").onclick = () => {
      presentation.end();
      sim.setMode(mode);
      for (const m of ["demo", "mqtt"]) {
        $(m + "-mode").classList.toggle("active", m === mode);
        $(m + "-mode").setAttribute("aria-pressed", String(m === mode));
      }
      document
        .querySelectorAll(
          ".simulation-controls button,.simulation-controls input,.simulation-controls select",
        )
        .forEach((el) => (el.disabled = mode === "mqtt"));
      $("source-badge").textContent =
        mode === "demo"
          ? "● CENÁRIO SIMULADO · OFFLINE"
          : "● TELEMETRIA ESP32 · SOMENTE LEITURA";
    };
  const presentation = new Presentation(sim, select, (stage, step) => {
    document.body.classList.toggle('presenting', Boolean(stage));
    $('presentation').hidden = !stage;
    if (stage) {
      $('presentation-step').textContent = `AQUAMONITOR · ${step + 1} / 10`;
      $('presentation-title').textContent = stage[1]; $('presentation-text').textContent = stage[2];
    }
  });
  $('tour').onclick = () => presentation.start();
  $('prev-step').onclick = () => presentation.move(-1);
  $('next-step').onclick = () => presentation.move(1);
  $('end-presentation').onclick = () => presentation.end();
  $('pause-presentation').onclick = () => { presentation.pause(); $('pause-presentation').textContent = presentation.paused ? 'Continuar' : 'Pausar'; };
  $('focus-component').onclick = () => scene.cameraController.go(current);
  $('back-component').onclick = () => select(previous);
  $('speed').onchange = e => sim.dispatch({ type: 'speed', value: Number(e.target.value) });
  $('monitor-toggle').onclick = () => { const closed = document.querySelector('.monitor').classList.toggle('collapsed'); $('monitor-toggle').textContent = closed ? '+' : '−'; $('monitor-toggle').setAttribute('aria-expanded', String(!closed)); };
  $('perspectives-toggle').onclick = () => { const closed = document.querySelector('footer').classList.toggle('nav-collapsed'); $('perspectives-toggle').setAttribute('aria-expanded', String(!closed)); };
  let showLabels = true;
  $('labels-toggle').onclick = () => { showLabels = !showLabels; $('labels').hidden = !showLabels; $('labels-toggle').setAttribute('aria-pressed', String(showLabels)); };
  const clean = value => { document.body.classList.toggle('clean-view', value); $('restore-ui').hidden = !value; };
  $('clean').onclick = () => clean(true); $('restore-ui').onclick = () => clean(false);
  const onKeyDown = e => { if (e.key === 'Escape' && !$('prototype-dialog').open) { clean(false); presentation.end(); $('context').hidden = true; } };
  document.addEventListener('keydown', onKeyDown);
  $('close-context').onclick = () => $('context').hidden = true;
  const names = { environment: 'A · Ambiance et climat', surface: 'B · Superfície urbana', structure: 'C · Estrutura subterrânea', hydraulic: 'D · Sistema hidráulico', electronics: 'E · Eletrônica' };
  names.environment = 'A · Ambiente e clima';
  document.querySelectorAll('[data-panel]').forEach(button => button.onclick = () => {
    const key = button.dataset.panel, content = $('context-content');
    const closing = !$('context').hidden && $('context').dataset.panel === key;
    $('context').hidden = closing; $('context').dataset.panel = key;
    document.querySelectorAll('[data-panel]').forEach(b => b.setAttribute('aria-expanded', String(!closing && b === button)));
    if (closing) return;
    if (key === 'layers') {
      content.innerHTML = `<h2>Camadas</h2><p>Explore a construção da maquete.</p>${scene.layers.items.map(i => `<div class="layer-row"><label><input type="checkbox" data-layer="${i.key}" ${i.visible?'checked':''}>${names[i.key]}</label><input type="range" aria-label="Transparência de ${names[i.key]}" data-opacity="${i.key}" min="0" max="1" step=".05" value="${i.opacity}"><button data-isolate="${i.key}">Isolar</button></div>`).join('')}<label class="setting">Raio-X do solo<input id="xray" aria-label="Opacidade do solo" type="range" min=".03" max="1" step=".01" value="${scene.layers.xray}"></label><label class="setting"><input id="explode" type="checkbox" ${scene.layers.exploded?'checked':''}>Visão explodida</label><button id="restore-layers">Restaurar camadas</button>`;
      content.querySelectorAll('[data-layer]').forEach(e => e.onchange = () => scene.layers.set(e.dataset.layer, { visible: e.checked }));
      content.querySelectorAll('[data-opacity]').forEach(e => e.oninput = () => scene.layers.set(e.dataset.opacity, { opacity: Number(e.value) }));
      content.querySelectorAll('[data-isolate]').forEach(e => e.onclick = () => { scene.layers.isolate(e.dataset.isolate); button.click(); button.click(); });
      $('xray').oninput = e => scene.layers.xray = Number(e.target.value);
      $('explode').onchange = e => { scene.layers.exploded = e.target.checked; scene.cameraController.go(e.target.checked?'exploded':'overview'); };
      $('restore-layers').onclick = () => { scene.layers.restore(); button.click(); button.click(); };
    } else if (key === 'cameras' || key === 'components') {
      content.innerHTML = `<h2>${key==='cameras'?'Perspectivas':'Componentes'}</h2><div class="context-list">${(key==='cameras'?cameraButtons.map(([k,,l])=>[k,l]):Object.entries(components).map(([k,v])=>[k,v[0]])).map(([k,l])=>`<button data-view="${k}">${l} ↗</button>`).join('')}</div>`;
      content.querySelectorAll('[data-view]').forEach(b => b.onclick = () => select(b.dataset.view));
    } else if (key === 'weather') {
      content.innerHTML = '<h2>Clima</h2><p>A chuva é uma entrada do cenário local. O ESP32 não transmite precipitação.</p><button id="weather-clear">Céu limpo</button><button id="weather-rain">Chuva moderada</button>';
      for (const [id,rain] of [['weather-clear',0],['weather-rain',50]]) { $(id).disabled = sim.mode !== 'demo'; $(id).onclick = () => { sim.dispatch({type:'rain',value:rain}); sim.dispatch({type:'running',value:true}); }; }
    } else {
      content.innerHTML = '<h2>Configurações</h2><label class="setting">Qualidade gráfica<select id="quality"><option value="auto">Automática</option><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><p>Qualidade automática reduz sombras e partículas em dispositivos lentos.</p><p>Tecla Esc restaura a interface e encerra a apresentação.</p>';
      $('quality').value = scene.quality; $('quality').onchange = e => scene.setQuality(e.target.value);
    }
  });
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
  $("pump-mode").onchange = (e) => {
    sim.tour = false;
    sim.dispatch({ type: "drainage", value: e.target.value });
    sim.dispatch({ type: "running", value: true });
  };
  $("reuse").onclick = () => sim.dispatch({ type: "reuse" });
  $("fault").onclick = () =>
    sim.dispatch({ type: "sensor", value: !sim.state.sensorFault });
  $("reset").onclick = () => sim.reset();

  $("reset-camera").onclick = () => select("overview");
  $("close-inspector").onclick = () => ($("inspector").hidden = true);
  $("underground").onclick = () => {
    const enabled = $("underground").getAttribute("aria-pressed") !== "true";
    $("underground").setAttribute("aria-pressed", String(enabled));
    select(enabled ? "gallery" : "overview");
  };
  $("city-toggle").onclick = () => {
    scene.layers.set("surface", { visible: !scene.city.visible });
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
    ["sensor", [-7.8, 3.2, -1.9], "01 · Área de alagamento"],
    ["gallery", [-3.3, -0.7, 5.8], "02 · Galeria"],
    ["drain", [0.2, -3.5, 5.8], "03 · Bombeamento"],
    ["dam", [10.3, 4.8, -2.8], "04 · Barragem"],
    ["reuse", [12, -0.3, 6.5], "05 · Reaproveitamento"],
  ];
  const labels = anchors.map(([key, point, text]) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.className = "world-label";
    b.onclick = () => select(key);
    $("labels").append(b);
    return { b, point, key };
  });
  let last = 0;
  let lastLabels = 0;
  let tourStep = -1;
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
    dispose() { mqttSession.dispose(); document.removeEventListener('keydown', onKeyDown); prototype.dispose(); },
    update(v, time) {
      if (!this.thumbnailsDone) { scene.thumbnails(document.querySelectorAll('[data-thumbnail]')); this.thumbnailsDone = true; }
      presentation.update(Math.max(0, time - (this.lastTime ?? time))); this.lastTime = time;
      mqttSession.update();
      $('rain-measure').textContent = sim.mode === 'mqtt' || v.input?.includes('ESP32') || v.input === 'Sensor HC-SR04' ? 'Não medida pelo ESP32' : `Cenário simulado · ${Math.round(v.rain * 100)}%`;
      $('hardware-state').textContent = sim.mode === 'demo' ? 'Não utilizado' : v.fresh ? (v.delayed ? `Última leitura há ${v.ageSeconds} s` : 'Telemetria atual') : 'Aguardando dados';
      if (sim.tour && $("guided").checked) {
        const step = Math.min(6, Math.floor(sim.elapsed / 10));
        if (step !== tourStep) { select(cameraButtons[step][0]); tourStep = step; }
      } else tourStep = -1;
      if (time - lastLabels >= 0.06) {
        lastLabels = time;
        const origin = scene.host.getBoundingClientRect();
        const obstacles = [document.querySelector(".monitor"), $("inspector"), $("context")]
          .filter(el => !el.hidden).map(el => el.getBoundingClientRect());
        const occupied = [];
        for (const { b, point, key } of labels) {
          const layerKey = ['city','sensor'].includes(key) ? 'surface' : 'hydraulic';
          const item = scene.layers.items.find(i => i.key === layerKey);
          const anchor = [...point]; if (layerKey === 'surface') anchor[1] += 6 * scene.layers.blend;
          const p = scene.project(anchor);
          b.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
          const rect = { left: origin.left + p.x - 65, right: origin.left + p.x + 65, top: origin.top + p.y - 12, bottom: origin.top + p.y + 12 };
          const overlaps = r => rect.left < r.right && rect.right > r.left && rect.top < r.bottom && rect.bottom > r.top;
          b.hidden = presentation.active || !item.visible || !p.visible || (key === "city" && !scene.city.visible) || obstacles.some(overlaps) || occupied.some(overlaps);
          if (!b.hidden) occupied.push(rect);
        }
      }
      if (time - last < 0.15) return;
      last = time;
      prototype.update(v, sim.mode);
      document.querySelector('.live-dot').style.background = v.fresh && !v.delayed ? '#a2cfa8' : '#c5a46e';
      $("level").style.opacity = v.fresh ? '1' : '.45';
      $("level").textContent = v.level === null ? "—" : format(v.level * 100);
      $("level-bar").style.width = `${(v.level || 0) * 100}%`;
      $("cm").textContent =
        v.levelCm === null
          ? "Leitura indisponível"
          : `${format(v.levelCm)} / 30 cm`;
      $("sensor-state").textContent =
        v.sensor === null ? "Desconhecido" : v.sensor ? "Operacional" : "Falha";
      for (const key of ["drain", "reuse"]) {
        $(key + "-state").textContent = key === "reuse" ? ({ on: "Liberado", off: "Fechado", blocked: "Sem água", unknown: "Desconhecido" }[v[key]]) : stateLabels[v[key]];
        $(key + "-state").className = v[key] === "on" ? "on" : "";
      }
      $("risk").textContent =
        v.alarm || (v.level >= 0.6 ? "Nível em atenção" : "Nível normal");
      $("risk").className =
        "risk " + (v.alarm || v.level >= 0.6 ? "warning" : "");
      $("dam-value").textContent = v.dam === null ? '—' : format(v.dam * 100);
      $("connection").textContent =
        sim.mode === "demo"
          ? "● Operação local"
          : v.fresh
            ? (v.delayed ? "● ESP32 online · recebimento com atraso" : "● ESP32 transmitindo")
            : v.connection === "connected"
              ? "◌ Aguardando ESP32"
              : `◌ MQTT · ${v.connection}`;
      $("data-note").textContent =
        sim.mode === "demo"
          ? "Simulação local · escala didática"
          : v.error ||
            `${v.fresh ? (v.delayed ? `Última leitura há ${v.ageSeconds} s` : "Leitura atual") : v.level === null ? "Aguardando leitura válida" : "Última leitura · desatualizada"} · ${v.input}${v.receivedAt ? " · " + new Date(v.receivedAt).toLocaleTimeString("pt-BR") : ""}`;
      $("pump-mode").value = sim.state.drainageMode || "auto";
      $("rain").value = sim.state.rain;
      $("rain-value").textContent = sim.mode === "demo" ? sim.state.rain + "%" : "—";
      $("speed").value = String(sim.state.speed);
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
        ? "Fechar reúso"
        : "Abrir reúso";
      $("fault").textContent = sim.state.sensorFault
        ? "Restaurar sensor"
        : "Falha do sensor";
      const key = $("inspector").dataset.key;
      $("inspect-value").textContent =
        key === "gallery" ? "Nível da galeria de 30 cm compartilhado com a lâmina da rua na maquete." : key === "dam"
          ? `Volume estimado: ${v.dam === null ? 'não medido' : format(v.dam * 100) + '%'} · ${v.fresh ? "estimativa visual" : "estimativa pausada"}`
          : key === "esp32"
            ? `${v.device} · MQTT: ${v.connection === "local" ? "não utilizado" : v.connection} · ${v.input} · Bomba: ${stateLabels[v.drain]}${v.fresh ? "" : " · Telemetria desatualizada"}`
            : key === "sensor"
              ? `${v.fresh ? "Atual" : "Desatualizado"} · ${v.levelCm === null ? "Sem leitura" : format(v.levelCm) + " cm"} · Sensor: ${v.sensor === null ? "desconhecido" : v.sensor ? "operacional" : "falha"}${key === "sensor" && v.distanceCm !== null ? " · Distância: " + format(v.distanceCm) + " cm" : ""}`
              : key === "drain" || key === "pipes"
                ? `Bomba: ${stateLabels[v.drain]} · ${v.drainFlow ? "Fluxo para a barragem" : "Sem transporte ativo"}`
                : key === "reuse"
                  ? `${v.reuse === "unknown" ? "Estado desconhecido" : v.reuse === "on" ? "Saída liberada" : v.reuse === "blocked" ? "Barragem vazia" : "Saída fechada"} · ${v.reuseFlow ? "Fluxo de reúso · relé 2" : "Sem fluxo"}`
                  : "";
    },
  };
}
