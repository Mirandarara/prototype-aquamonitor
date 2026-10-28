export const stages = [
  ['city', 'A cidade', 'A superfície urbana concentra a chuva nas bocas de lobo.'],
  ['city', 'A chuva começa', 'Nuvens e precipitação acompanham a intensidade simulada.'],
  ['city', 'Formação do alagamento', 'A água se acumula e o modelo calcula a elevação.'],
  ['sensor', 'Medição ultrassônica', 'Altura = referência de 30 cm − distância até a água.'],
  ['drain', 'Drenagem automática', 'O controle liga em 20 cm e desliga em 12 cm.'],
  ['gallery', 'Dentro da galeria', 'A água subterrânea é uma representação hidráulica didática.'],
  ['dam', 'Destino: barragem', 'O fluxo só aparece com drenagem ativa. Volume simulado.'],
  ['reuse', 'Reaproveitamento', 'O segundo relé controla a saída para reúso.'],
  ['exploded', 'Uma solução em camadas', 'Superfície, estrutura, hidráulica e eletrônica separadas.'],
  ['overview', 'O caminho da água', 'Da coleta urbana ao reaproveitamento.'],
];
export class Presentation {
  constructor(sim, select, change) { Object.assign(this, { sim, select, change, active: false, step: 0, clock: 0 }); }
  start() {
    if (this.sim.mode !== 'demo') return;
    this.saved = { ...this.sim.state, events: [...this.sim.state.events] };
    this.sim.reset(); this.active = true; this.paused = false;
    this.step = 0; this.clock = 0;
    this.sim.dispatch({ type: 'speed', value: 30 });
    this.sim.dispatch({ type: 'running', value: true });
    this.show();
  }
  show() {
    const [key] = stages[this.step];
    this.select(key);
    // Stage navigation changes view and rainfall inputs, never forces pump output.
    this.sim.dispatch({ type: 'rain', value: this.step >= 1 && this.step < 5 ? 100 : 0 });
    if (this.step === 7 && !this.sim.state.reuseRequested) this.sim.dispatch({ type: 'reuse' });
    this.change(stages[this.step], this.step);
  }
  move(delta) { this.step = Math.max(0, Math.min(stages.length - 1, this.step + delta)); this.clock = 0; this.show(); }
  pause() { this.paused = !this.paused; this.sim.dispatch({ type: 'running', value: !this.paused }); }
  update(dt) {
    if (!this.active || this.paused) return;
    this.clock += dt;
    if (this.clock >= 8) { if (this.step === stages.length - 1) this.end(); else this.move(1); }
  }
  end() {
    if (!this.active) return;
    this.active = false; this.sim.state = this.saved;
    this.select('overview'); this.change(null);
  }
}
