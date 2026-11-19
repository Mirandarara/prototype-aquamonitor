import { telemetryFresh, telemetryDelayed } from '../features/esp32/mqttService.ts';
import { MQTT_CONFIG } from '../features/esp32/protocol.ts';
export function bindMqttSession(sim) {
  const host = document.createElement('div');
  host.innerHTML = '<details id="mqtt-session" class="mqtt-session" hidden><summary>Conexão EMQX Cloud e entradas virtuais</summary><form id="mqtt-login" autocomplete="off"><label>Usuário MQTT<input name="username" autocomplete="off" required></label><label>Senha temporária<input name="password" type="password" autocomplete="new-password" required></label><button>Conectar</button><button id="mqtt-disconnect" type="button">Desconectar</button></form><p>Credenciais apenas na memória durante a conexão. Produção requer bridge/backend autenticado.</p><label>Entrada ESP32<select id="mqtt-input"><option value="sensor">Sensor físico / Wokwi</option><option value="virtual">Virtual · comandos a cada 2 s</option></select></label><fieldset id="mqtt-inputs" disabled><legend>Entradas solicitadas (aguarde telemetria)</legend><label>Nível (cm)<input id="mqtt-level" type="number" min="0" max="30" step="0.1" value="22"></label><label><input id="mqtt-full" type="checkbox">Boia cheio</label><label><input id="mqtt-empty" type="checkbox" checked>Boia vazio</label><label><input id="mqtt-reuse" type="checkbox">Solicitar reúso</label><label><input id="mqtt-sensor" type="checkbox" checked>Sensor operacional</label></fieldset><p id="mqtt-session-state" role="status"></p><p id="mqtt-session-help"></p></details>';
  document.body.append(host);
  const get = id => document.getElementById(id);
  const form = get('mqtt-login');
  let virtualActive = false;
  let timer = null;
  form.onsubmit = event => {
    event.preventDefault();
    sim.mqtt.stop();
    sim.mqtt.start({ username: form.elements.username.value, password: form.elements.password.value });
    form.reset();
    send();
  };
  get('mqtt-disconnect').onclick = () => { sim.mqtt.stop(); get('mqtt-input').value = 'sensor'; send(); };
  function send() {
    const active = sim.mode === 'mqtt' && get('mqtt-input').value === 'virtual';
    get('mqtt-inputs').disabled = !active;
    if (active && !timer) timer = setInterval(send, MQTT_CONFIG.commandIntervalMs);
    if (!active && timer) { clearInterval(timer); timer = null; }
    if (sim.mode === 'mqtt') {
      sim.mqtt.publish(active ? {mode:'virtual', level_cm:Number(get('mqtt-level').value), tank_full:get('mqtt-full').checked, tank_empty:get('mqtt-empty').checked, reuse_requested:get('mqtt-reuse').checked, sensor_ok:get('mqtt-sensor').checked} : {mode:'sensor'});
    } else if (virtualActive) sim.mqtt.publish({mode:'sensor'});
    virtualActive = active;
  }
  get('mqtt-input').onchange = send;
  get('mqtt-inputs').onchange = send;

  return {
    update() {
      const active = sim.mode === 'mqtt' && get('mqtt-input').value === 'virtual';
      if (active !== virtualActive) send();
      get('mqtt-session').hidden = sim.mode !== 'mqtt';
      if (sim.mode !== 'mqtt') { form.reset(); return; }
      const s = sim.mqtt.getSnapshot();
      const now = Date.now();
      const fresh = telemetryFresh(s, now);
      const delayed = telemetryDelayed(s, now);
      const age = s.receivedAt === null ? null : Math.max(0, Math.floor((now - s.receivedAt) / 1000));
      const device = fresh ? 'online' : s.deviceStatus === 'offline' ? 'offline' : s.receivedAt !== null ? 'telemetria desatualizada' : 'aguardando telemetria';
      get('mqtt-session-state').textContent = `Broker: ${{connected:'conectado',connecting:'conectando',reconnecting:'reconectando',offline:'desconectado',error:'falha'}[s.connection]} • ESP32: ${device}${s.error ? ` • ${s.error}` : ''}`;
      get('mqtt-session-help').textContent = delayed
        ? `Recebimento com atraso: última leitura há ${age} s. Mantendo a última leitura recebida enquanto aguarda a próxima mensagem; após ${MQTT_CONFIG.staleMs / 1000} s, os estados ficam desconhecidos.`
        : fresh ? `Última leitura há ${age} s. Telemetria recebida do ESP32. Entradas virtuais só são confirmadas quando o dispositivo responde.`
        : s.connection === 'connected' && s.receivedAt !== null ? `Sem telemetria válida há ${age} s. Confira se o Wokwi continua executando e conectado; a última leitura não confirma o estado atual.`
        : s.connection === 'connected' && s.deviceStatus === 'offline' ? 'O broker informou ESP32 offline. Se a mensagem for de uma sessão anterior, a próxima telemetria válida confirma a reconexão. Confira a execução no Wokwi.'
        : s.connection === 'connected' ? 'Broker conectado. Aguardando a primeira leitura válida do ESP32; mantenha o Wokwi executando.' : '';
    },
    dispose() { clearInterval(timer); if (virtualActive) sim.mqtt.publish({mode:'sensor'}); form.reset(); host.remove(); },
  };
}
