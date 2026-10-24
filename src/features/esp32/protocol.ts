export const MQTT_CONFIG = {
  url: 'wss://broker.emqx.io:8084/mqtt',
  telemetry: 'aquamonitor/demo-29out-b741d2/telemetria',
  commands: 'aquamonitor/demo-29out-b741d2/comandos',
  status: 'aquamonitor/demo-29out-b741d2/status',
  staleMs: 6000,
  commandIntervalMs: 2000,
} as const
export interface Telemetry {
  level_cm: number; level_pct: number; distance_cm: number
  sensor_ok: boolean; drain_on: boolean; reuse_on: boolean
  tank_full: boolean; tank_empty: boolean; alarm: boolean
  alarm_code: string; input_mode: 'virtual' | 'sensor'
}
export interface VirtualCommand {
  mode: 'virtual'; level_cm: number; tank_full: boolean; tank_empty: boolean
  reuse_requested: boolean; sensor_ok: boolean
}
export type Command = VirtualCommand | { mode: 'sensor' }
export function parseTelemetry(raw: string): Telemetry {
  const p = JSON.parse(raw)
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('Pacote não é um objeto')
  for (const key of ['sensor_ok', 'drain_on', 'reuse_on', 'tank_full', 'tank_empty', 'alarm']) {
    if (typeof p[key] !== 'boolean') throw new Error(`Campo inválido: ${key}`)
  }
  for (const [key, min, max] of [['level_cm', 0, 30], ['level_pct', 0, 100], ['distance_cm', -1, 1000]] as const) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max) throw new Error(`Campo inválido: ${key}`)
  }
  if (Math.abs(p.level_pct - p.level_cm / 30 * 100) > 0.5) throw new Error('Percentual incompatível com nível')
  if (!['sensor', 'virtual'].includes(p.input_mode) || typeof p.alarm_code !== 'string' || p.alarm_code.length > 80) throw new Error('Modo ou alarme inválido')
  return p as Telemetry
}
export function virtualCommand(s: { galleryLiters: number; tankLiters: number; capacityLiters: number; reuseRequested: boolean; sensorFault: boolean }): VirtualCommand {
  return { mode: 'virtual', level_cm: Math.min(30, Math.max(0, s.galleryLiters)), tank_full: s.tankLiters >= s.capacityLiters - 1e-9, tank_empty: s.tankLiters <= 1e-9, reuse_requested: s.reuseRequested, sensor_ok: !s.sensorFault }
}
