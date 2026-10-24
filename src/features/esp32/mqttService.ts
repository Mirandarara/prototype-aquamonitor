import mqtt, { type MqttClient } from 'mqtt'
import { MQTT_CONFIG as config, parseTelemetry, type Command, type Telemetry } from './protocol.ts'
export type Connection = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error'
export interface MqttSnapshot {
  connection: Connection; telemetry: Telemetry | null; receivedAt: number | null
  deviceStatus: 'online' | 'offline' | 'unknown'; error: string | null
  samples: { at: number; level: number }[]; lastCommandAt: number | null
}
const initial = (): MqttSnapshot => ({ connection: 'offline', telemetry: null, receivedAt: null, deviceStatus: 'unknown', error: null, samples: [], lastCommandAt: null })
/** One owner acquires the connection; consumers subscribe through the shared React context. */
export class AquaMqttService {
  private client: MqttClient | null = null
  private snapshot = initial()
  private listeners = new Set<() => void>()
  private factory: typeof mqtt.connect
  constructor(factory: typeof mqtt.connect = mqtt.connect) { this.factory = factory }
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(patch: Partial<MqttSnapshot>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(fn => fn()) }
  start() {
    if (this.client) return
    this.snapshot = initial()
    this.update({ connection: 'connecting' })
    const client = this.factory(config.url, { clientId: `aquamonitor-web-${crypto.randomUUID()}`, clean: true, reconnectPeriod: 2000, connectTimeout: 10000, keepalive: 15, queueQoSZero: false, resubscribe: false })
    this.client = client
    client.on('connect', () => {
      this.update({ connection: 'connecting', receivedAt: null, deviceStatus: 'unknown' })
      client.subscribe([config.telemetry, config.status], { qos: 0 }, (error, granted) => {
        if (this.client !== client) return
        if (error || granted?.some(item => item.qos === 128)) { this.update({ connection: 'error', error: error?.message ?? 'Inscrição MQTT recusada' }); return }
        this.update({ connection: 'connected', error: null })
      })
    })
    client.on('reconnect', () => this.update({ connection: 'reconnecting', receivedAt: null }))
    client.on('close', () => this.update({ connection: 'offline', receivedAt: null }))
    client.on('error', error => this.update({ connection: 'error', error: error.message }))
    client.on('message', (topic, payload, packet) => {
      if (payload.length > 4096) { this.update({ error: 'Pacote MQTT excede o limite' }); return }
      if (topic === config.status) {
        const status = payload.toString().trim()
        if (status === 'online' || status === 'offline') this.update({ deviceStatus: status, ...(status === 'offline' ? { receivedAt: null } : {}) })
      }
      // Firmware publishes non-retained telemetry. A retained replay never proves freshness.
      if (topic !== config.telemetry || packet.retain) return
      try {
        const telemetry = parseTelemetry(payload.toString())
        const at = Date.now()
        this.update({ telemetry, receivedAt: at, deviceStatus: 'online', error: null, samples: [...this.snapshot.samples, { at, level: telemetry.level_cm }].slice(-120) })
      } catch (error) { this.update({ error: `Telemetria rejeitada: ${(error as Error).message}` }) }
    })
  }
  publish(command: Command) {
    const client = this.client
    if (!client?.connected || this.snapshot.connection !== 'connected') return false
    client.publish(config.commands, JSON.stringify(command), { qos: 0, retain: false }, error => {
      if (this.client !== client) return
      if (error) this.update({ error: `Falha no comando: ${error.message}` })
      else this.update({ lastCommandAt: Date.now() })
    })
    return true
  }
  stop() {
    const client = this.client
    this.client = null
    if (client) { client.removeAllListeners(); client.end(true) }
    this.update(initial())
  }
}
export const aquaMqtt = new AquaMqttService()
export function telemetryFresh(snapshot: MqttSnapshot, now: number) {
  return snapshot.connection === 'connected' && snapshot.deviceStatus !== 'offline' && snapshot.receivedAt !== null && now - snapshot.receivedAt < config.staleMs
}
