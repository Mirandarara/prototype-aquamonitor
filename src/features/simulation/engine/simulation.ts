/** Modelo didático: galeria prismática de base 0,1 m² (1 L/cm).
 * Chuva efetiva máxima: 3 L/min após coleta; filtro ideal sem perdas/atraso.
 * Passos fixos de 0,25 s, com resíduo preservado entre ticks, independem do FPS.
 * Unidades internas: litros, centímetros e segundos simulados.
 */
export const SIMULATION_CONFIG = {
  maxHeightCm: 30,
  litersPerCm: 1,
  rainLitersPerMinute: 3,
  drainageLitersPerMinute: 2,
  reuseLitersPerMinute: 1.2,
  drainageStartCm: 20,
  drainageStopCm: 12,
  attentionCm: 18,
  criticalCm: 26,
  initialGalleryLiters: 8,
  initialTankLiters: 5,
  defaultCapacityLiters: 40,
  stepSeconds: 0.25,
  maxEvents: 500,
} as const

export type Risk = 'normal' | 'attention' | 'critical'
export type PumpState = 'on' | 'off' | 'blocked'
export type Alarm = 'sensor' | 'tank-full' | 'tank-empty' | 'gallery-full'
export interface SimulationEvent { id: number; time: number; message: string }
export interface SimulationState {
  externalControl?: { drainage: PumpState; reuse: PumpState }
  time: number
  remainder: number
  running: boolean
  started: boolean
  speed: number
  rain: number
  galleryLiters: number
  tankLiters: number
  capacityLiters: number
  sensorFault: boolean
  reuseRequested: boolean
  drainage: PumpState
  drainageMode?: 'auto' | 'on' | 'off'
  reuse: PumpState
  risk: Risk
  alarms: Alarm[]
  events: SimulationEvent[]
  nextEventId: number
  rainTotal: number
  drainedTotal: number
  reusedTotal: number
  overflowTotal: number
  externalAddedTotal: number
}
export type SimulationAction =
  | { type: 'drainage'; value: 'auto' | 'on' | 'off' }
  | { type: 'external'; value: SimulationState['externalControl'] }
  | { type: 'tick'; seconds: number }
  | { type: 'running'; value: boolean }
  | { type: 'rain' | 'speed' | 'capacity'; value: number }
  | { type: 'sensor'; value: boolean }
  | { type: 'reuse' | 'fill' | 'reset' }

export const riskLabels: Record<Risk, string> = { normal: 'Normal', attention: 'Atenção', critical: 'Crítico' }
export const pumpLabels: Record<PumpState, string> = { on: 'Ligada', off: 'Desligada', blocked: 'Bloqueada' }
export const alarmLabels: Record<Alarm, string> = {
  sensor: 'Falha do sensor: drenagem bloqueada.',
  'tank-full': 'Barragem cheia: drenagem bloqueada.',
  'tank-empty': 'Barragem vazia: reúso bloqueado.',
  'gallery-full': 'Galeria no limite: risco de transbordamento.',
}
export const galleryHeight = (s: SimulationState) => s.galleryLiters / SIMULATION_CONFIG.litersPerCm
export const tankLabel = (s: SimulationState) => s.tankLiters >= s.capacityLiters - 1e-9 ? 'Cheio' : s.tankLiters <= 1e-9 ? 'Vazio' : 'Disponível'
export const formatTime = (seconds: number) => {
  const whole = Math.floor(seconds)
  return `${String(Math.floor(whole / 3600)).padStart(2, '0')}:${String(Math.floor(whole / 60) % 60).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}
function record(s: SimulationState, message: string): SimulationState {
  return { ...s, nextEventId: s.nextEventId + 1, events: [...s.events, { id: s.nextEventId, time: s.time, message }].slice(-SIMULATION_CONFIG.maxEvents) }
}
function reconcile(s: SimulationState): SimulationState {
  const c = SIMULATION_CONFIG
  const height = galleryHeight(s)
  const full = s.tankLiters >= s.capacityLiters - 1e-9
  const empty = s.tankLiters <= 1e-9
  const drainage: PumpState = s.externalControl?.drainage ?? (s.drainageMode === 'off' ? 'off' : s.sensorFault || full ? 'blocked'
    : s.drainageMode === 'on' ? height > 0 ? 'on' : 'blocked'
    : height >= c.drainageStartCm || (s.drainage === 'on' && height > c.drainageStopCm) ? 'on' : 'off')
  const reuse: PumpState = s.externalControl?.reuse ?? (s.reuseRequested ? empty ? 'blocked' : 'on' : 'off')
  const risk: Risk = height >= c.criticalCm ? 'critical' : height >= c.attentionCm ? 'attention' : 'normal'
  const alarms: Alarm[] = []
  if (s.sensorFault) alarms.push('sensor')
  if (full) alarms.push('tank-full')
  if (empty && s.reuseRequested) alarms.push('tank-empty')
  if (height >= c.maxHeightCm - 1e-9) alarms.push('gallery-full')
  let next = { ...s, drainage, reuse, risk, alarms }
  if (drainage !== s.drainage) next = record(next, `Drenagem: ${pumpLabels[drainage].toLowerCase()}.`)
  if (reuse !== s.reuse) next = record(next, `Reúso: ${pumpLabels[reuse].toLowerCase()}.`)
  if (risk !== s.risk) next = record(next, `Cenário virtual: ${riskLabels[risk].toLowerCase()}.`)
  for (const alarm of alarms) if (!s.alarms.includes(alarm)) next = record(next, alarmLabels[alarm])
  for (const alarm of s.alarms) if (!alarms.includes(alarm)) next = record(next, `Proteção normalizada: ${alarmLabels[alarm].split(':')[0].replace('.', '')}.`)
  return next
}
export function createInitialState(): SimulationState {
  return {
    time: 0, remainder: 0, running: false, started: false, speed: 30, rain: 0,
    galleryLiters: SIMULATION_CONFIG.initialGalleryLiters, tankLiters: SIMULATION_CONFIG.initialTankLiters,
    capacityLiters: SIMULATION_CONFIG.defaultCapacityLiters, sensorFault: false, reuseRequested: false,
    drainage: 'off', reuse: 'off', risk: 'normal', alarms: [],
    events: [{ id: 0, time: 0, message: 'Estação de demonstração pronta. Valores didáticos estimados.' }], nextEventId: 1,
    rainTotal: 0, drainedTotal: 0, reusedTotal: 0, overflowTotal: 0, externalAddedTotal: 0,
  }
}
export function simulationReducer(s: SimulationState, action: SimulationAction): SimulationState {
  const c = SIMULATION_CONFIG
  if (action.type === 'reset') return s.externalControl ? reconcile({ ...createInitialState(), externalControl: s.externalControl }) : createInitialState()
  if (action.type === 'external') return reconcile({ ...s, externalControl: action.value })
  if (action.type === 'tick') {
    if (!s.running || !Number.isFinite(action.seconds) || action.seconds <= 0) return s
    const available = s.remainder + action.seconds * s.speed
    const steps = Math.floor((available + 1e-9) / c.stepSeconds)
    let next = { ...s, remainder: Math.max(0, available - steps * c.stepSeconds) }
    for (let i = 0; i < steps; i++) {
      next = reconcile(next)
      const minutes = c.stepSeconds / 60
      const reuse = next.reuse === 'on' ? Math.min(next.tankLiters, c.reuseLitersPerMinute * minutes) : 0
      const drainage = next.drainage === 'on' ? Math.min(next.galleryLiters, next.capacityLiters - next.tankLiters + reuse, c.drainageLitersPerMinute * minutes) : 0
      const rain = next.rain / 100 * c.rainLitersPerMinute * minutes
      const gallery = next.galleryLiters - drainage + rain
      const overflow = Math.max(0, gallery - c.maxHeightCm * c.litersPerCm)
      next = reconcile({ ...next, time: next.time + c.stepSeconds,
        galleryLiters: Math.min(c.maxHeightCm * c.litersPerCm, Math.max(0, gallery)),
        tankLiters: Math.min(next.capacityLiters, Math.max(0, next.tankLiters - reuse + drainage)),
        rainTotal: next.rainTotal + rain, drainedTotal: next.drainedTotal + drainage,
        reusedTotal: next.reusedTotal + reuse, overflowTotal: next.overflowTotal + overflow,
      })
      if (overflow > 0 && next.overflowTotal === overflow) next = record(next, 'Primeiro transbordamento simulado contabilizado.')
    }
    return next
  }
  let next = s
  switch (action.type) {
    case 'running':
      if (action.value === s.running) return s
      next = record({ ...s, running: action.value, started: true }, action.value ? 'Simulação em execução.' : 'Simulação pausada.')
      break
    case 'rain':
      if (!Number.isFinite(action.value)) return s
      next = record({ ...s, rain: Math.min(100, Math.max(0, action.value)) }, `Chuva ajustada: ${Math.min(100, Math.max(0, action.value))}%.`)
      break
    case 'speed':
      if (!Number.isFinite(action.value)) return s
      next = record({ ...s, speed: Math.min(120, Math.max(1, action.value)) }, `Velocidade do tempo: ${Math.min(120, Math.max(1, action.value))}×.`)
      break
    case 'capacity': {
      if (!Number.isFinite(action.value)) return s
      const capacity = Math.min(200, Math.max(5, action.value))
      next = record({ ...s, capacityLiters: capacity, tankLiters: Math.min(s.tankLiters, capacity), overflowTotal: s.overflowTotal + Math.max(0, s.tankLiters - capacity) }, `Capacidade ilustrativa da barragem: ${capacity} unidades. Excesso contabilizado como transbordamento.`)
      break
    }
    case 'drainage': next = { ...s, drainageMode: action.value }; break
    case 'sensor': next = record({ ...s, sensorFault: action.value }, action.value ? 'Falha do sensor simulada.' : 'Sensor virtual restaurado.'); break
    case 'reuse': next = record({ ...s, reuseRequested: !s.reuseRequested }, s.reuseRequested ? 'Solicitação de reúso encerrada.' : 'Reúso solicitado até cancelamento ou esvaziamento.'); break
    case 'fill': next = record({ ...s, tankLiters: s.capacityLiters, externalAddedTotal: s.externalAddedTotal + s.capacityLiters - s.tankLiters }, 'Barragem preenchida para teste de proteção (aporte externo simulado).'); break
  }
  return reconcile(next)
}
