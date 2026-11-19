import { prototypeState } from '../simulation/prototypeState.js';
import '../styles/prototype.css';

const circuitImage = new URL('../assets/prototype/circuito.png', import.meta.url).href;
const items = [
  ['esp32', '01', 'ESP32 DevKit', 'Controle e comunicação', 'Recebe a leitura do sensor e coordena os relés e os indicadores. No modo conectado, os estados acompanham a fonte de dados selecionada.'],
  ['sensor', '02', 'Sensor HC-SR04', 'Medição ultrassônica', 'Os dois transdutores ficam apontados para a água na rua. A referência de 30 cm permite converter a distância em altura do alagamento.'],
  ['drain', '03', 'Relé de drenagem', 'Saída para bombeamento', 'Representa o comando da bomba que transfere água da galeria para a barragem. O LED azul acompanha esse comando.'],
  ['reuse', '04', 'Relé de reúso', 'Saída para reaproveitamento', 'Representa a liberação da saída de reúso. O LED verde acompanha o comando do segundo relé.'],
  ['alert', '05', 'Indicadores de estado', 'Azul · verde · vermelho', 'Azul indica drenagem, verde indica reúso e vermelho indica alerta ou falha do sensor. Os resistores também aparecem na montagem 3D.'],
];

export function prototypeMarkup() {
  return `<dialog id="prototype-dialog" class="prototype-dialog" aria-labelledby="prototype-title">
    <div class="prototype-heading"><div><span class="prototype-eyebrow">AQUAMONITOR · HARDWARE</span><h2 id="prototype-title">Do circuito à maquete</h2><p>Explore os componentes do protótipo e acompanhe seus estados.</p></div><button id="prototype-close" aria-label="Fechar protótipo" autofocus>×</button></div>
    <div class="prototype-source"><span id="prototype-source"></span><span id="prototype-fresh"></span></div>
    <div class="prototype-body"><section class="prototype-visual" aria-label="Diagrama do circuito"><div class="prototype-image-toolbar"><span>CIRCUITO DE REFERÊNCIA</span><button id="prototype-zoom" aria-pressed="false">Ampliar imagem</button></div><div id="prototype-image-stage" class="prototype-image-stage" tabindex="0" aria-label="Imagem do circuito; ao ampliar, role para explorar"><img src="${circuitImage}" alt="Circuito enviado: sensor HC-SR04 à esquerda, ESP32 ao centro, dois módulos de relé acima e LEDs de drenagem, reúso e alerta abaixo." /></div><p class="prototype-caption">Montagem de referência enviada por você.</p></section>
    <aside class="prototype-components" aria-label="Componentes do protótipo"><h3>Na bancada</h3><div class="prototype-component-list">${items.map(([key,n,title,subtitle]) => `<button data-prototype-component="${key}" aria-pressed="${key === 'esp32'}"><span class="prototype-number">${n}</span><span><strong>${title}</strong><small>${subtitle}</small></span><span class="prototype-component-state" data-prototype-state="${key}">—</span></button>`).join('')}</div><section class="prototype-detail"><h3 id="prototype-detail-title">ESP32 DevKit</h3><p id="prototype-detail-text">${items[0][4]}</p><div class="prototype-sensor-reading"><span>Leitura na rua</span><strong id="prototype-reading">—</strong></div><button id="prototype-view-3d">Ver componente no 3D ↗</button></section></aside></div>
    <div class="prototype-bottom"><div class="prototype-indicators" aria-label="LEDs do protótipo">${[['drain','Drenagem','blue'],['reuse','Reúso','green'],['alert','Alerta','red']].map(([key,label,color]) => `<span class="prototype-indicator ${color}" data-prototype-led="${key}"><i></i>${label}<b>—</b></span>`).join('')}</div><p>Os LEDs acompanham os comandos. Sem dados atuais, o estado fica desconhecido.</p></div>
  </dialog>`;
}

export function bindPrototypeDialog(select) {
  const dialog = document.getElementById('prototype-dialog');
  let selected = 'esp32';
  const open = () => { if (!dialog.open) dialog.showModal(); };
  document.querySelectorAll('[data-prototype-open]').forEach(button => button.onclick = open);
  document.getElementById('prototype-close').onclick = () => dialog.close();
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  } });
  const zoom = document.getElementById('prototype-zoom');
  zoom.onclick = () => {
    const expanded = document.getElementById('prototype-image-stage').classList.toggle('zoomed');
    zoom.setAttribute('aria-pressed', String(expanded));
    zoom.textContent = expanded ? 'Ajustar imagem' : 'Ampliar imagem';
  };
  dialog.querySelectorAll('[data-prototype-component]').forEach(button => button.onclick = () => {
    selected = button.dataset.prototypeComponent;
    const item = items.find(([key]) => key === selected);
    document.getElementById('prototype-detail-title').textContent = item[2];
    document.getElementById('prototype-detail-text').textContent = item[4];
    dialog.querySelectorAll('[data-prototype-component]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  });
  document.getElementById('prototype-view-3d').onclick = () => {
    dialog.close();
    select(selected === 'sensor' ? 'sensor' : 'esp32');
  };
  const statusLabels = { on: 'Ativo', off: 'Desligado', unknown: 'Sem dados' };
  return {
    open,
    update(v, mode) {
      if (!dialog.open) return;
      const state = prototypeState(v);
      document.getElementById('prototype-source').textContent = mode === 'demo' ? '● Simulação local' : mode === 'dashboard' ? '● Dashboard' : '● ESP32 · MQTT';
      document.getElementById('prototype-fresh').textContent = !v.fresh ? 'Aguardando dados atuais' : mode === 'demo' ? 'Demonstração simulada' : 'Dados atuais';
      document.getElementById('prototype-reading').textContent = v.fresh && v.sensor && Number.isFinite(v.levelCm) ? `${v.levelCm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} / 30 cm` : 'Leitura indisponível';
      for (const key of ['drain', 'reuse', 'alert']) {
        const badge = dialog.querySelector(`[data-prototype-led="${key}"]`);
        badge.dataset.state = state[key];
        badge.querySelector('b').textContent = statusLabels[state[key]];
      }
      for (const key of ['esp32', 'sensor', 'drain', 'reuse', 'alert']) {
        const value = key === 'esp32' ? v.fresh ? 'on' : 'unknown' : state[key];
        const badge = dialog.querySelector(`[data-prototype-state="${key}"]`);
        badge.dataset.state = value;
        badge.textContent = key === 'esp32' && mode === 'demo' ? 'Simulado' : key === 'sensor' && value !== 'unknown' ? value === 'on' ? 'Operacional' : 'Falha' : statusLabels[value];
      }
    },
    dispose() { if (dialog.open) dialog.close(); },
  };
}
