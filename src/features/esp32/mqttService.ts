import mqtt, { type MqttClient } from 'mqtt'
import { MQTT_CONFIG as config, parseTelemetry, encodeCommand, type Command, type Telemetry } from './protocol.ts'
export interface SessionCredentials { username: string; password: string }
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
  private virtualActive = false
  private factory: typeof mqtt.connect
  constructor(factory: typeof mqtt.connect = mqtt.connect) { this.factory = factory }
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(patch: Partial<MqttSnapshot>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(fn => fn()) }
  start(credentials?: SessionCredentials) {
    if (this.client) return
    if (!credentials?.username || !credentials.password) {
      this.update({ connection: 'offline', error: 'Insira as credenciais temporárias para conectar ao EMQX Cloud.' })
      return
    }
    this.snapshot = initial()
    this.update({ connection: 'connecting' })
    let client: MqttClient
    try { client = this.factory(config.url, { username: credentials.username, password: credentials.password, clientId: `aquamonitor-web-${crypto.randomUUID()}`, clean: true, reconnectPeriod: 2000, connectTimeout: 10000, keepalive: 15, queueQoSZero: false, resubscribe: false }) }
    catch { this.update({ connection: 'error', error: 'Não foi possível iniciar a conexão MQTT.' }); return }
    this.client = client
    client.on('connect', () => {
      this.update({ connection: 'connecting', receivedAt: null, deviceStatus: 'unknown' })
      client.subscribe([config.telemetry, config.status], { qos: 0 }, (error, granted) => {
        if (this.client !== client) return
        if (error || granted?.some(item => item.qos === 128)) { this.update({ connection: 'error', error: 'Inscrição MQTT recusada. Verifique as permissões dos tópicos.' }); return }
        this.update({ connection: 'connected', error: null })
      })
    })
    client.on('reconnect', () => this.update({ connection: 'reconnecting', receivedAt: null, deviceStatus: 'unknown' }))
    client.on('close', () => this.update({ connection: 'offline', receivedAt: null, deviceStatus: 'unknown' }))
    client.on('error', () => this.update({ connection: 'error', receivedAt: null, error: 'Falha MQTT. Verifique credenciais, rede e permissões no EMQX Cloud.' }))
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
        this.update({ telemetry, receivedAt: at, deviceStatus: telemetry.wifi_connected && telemetry.mqtt_connected ? 'online' : 'offline', error: null, samples: telemetry.sensor_ok ? [...this.snapshot.samples, { at, level: telemetry.level_cm }].slice(-120) : this.snapshot.samples })
      } catch (error) { this.update({ error: `Telemetria rejeitada: ${(error as Error).message}` }) }
    })
  }
  publish(command: Command) {
    const client = this.client
    if (!client?.connected || this.snapshot.connection !== 'connected') return false
    let payload: string
    try { payload = encodeCommand(command) } catch { this.update({ error: 'Comando inválido' }); return false }
    this.virtualActive = command.mode === 'virtual'
    client.publish(config.commands, payload, { qos: 0, retain: false }, error => {
      if (this.client !== client) return
      if (error) this.update({ error: 'Falha ao transmitir comando MQTT.' })
      else this.update({ lastCommandAt: Date.now() })
    })
    return true
  }
  stop() {
    const client = this.client
    this.client = null
    if (client) {
      // Queue the sensor handoff before DISCONNECT, including mode changes/unmount.
      if (this.virtualActive && client.connected) client.publish(config.commands, JSON.stringify({ mode: 'sensor' }), { qos: 0, retain: false })
      client.removeAllListeners()
      client.on('error', () => {})
      delete client.options.password
      delete client.options.username
      const deadline = setTimeout(() => client.end(true, {}, () => client.removeAllListeners()), 1000)
      client.end(false, {}, () => { clearTimeout(deadline); client.removeAllListeners() })
    }
    this.virtualActive = false
    this.update(initial())
  }
}
export const aquaMqtt = new AquaMqttService()
export function telemetryFresh(snapshot: MqttSnapshot, now: number) {
  return snapshot.connection === 'connected' && snapshot.deviceStatus !== 'offline' && snapshot.receivedAt !== null && Math.max(0, now - snapshot.receivedAt) < config.staleMs
}
// Short gateway delays keep the last observation usable, with an explicit age warning.
// Status/transport disconnects still invalidate it immediately via telemetryFresh.
export function telemetryDelayed(snapshot: MqttSnapshot, now: number) {
  return telemetryFresh(snapshot, now) && now - snapshot.receivedAt! >= config.lateMs
}
