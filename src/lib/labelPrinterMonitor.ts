// Server-only: keeps one long-lived MQTT subscription and caches the latest
// state of every label printer. The ESP firmware publishes status every 30s
// without the retain flag or a last-will, so state can't be fetched on demand
// and "offline" can only be derived from the age of the last status message.
// Protocol: LabelPrinter-esp/MQTT_PROTOCOL.md
import mqtt, { type MqttClient } from "mqtt"

export type PrinterStatus = {
  printer: "connected" | "disconnected"
  battery?: number
  lastSeen?: number
  wifi: number
  heap: number
  uptime: number
}

export type PrinterEvent = {
  event: "printer_connected" | "printer_disconnected"
  receivedAt: number
}

export type PrintResult = {
  printId?: string
  success: boolean
  error?: string
  receivedAt: number
}

export type LabelPrinterState = {
  device: string
  status: PrinterStatus | null
  statusReceivedAt: number | null
  lastEvent: PrinterEvent | null
  recentResults: PrintResult[]
}

export type LabelPrinterSnapshot = {
  configured: boolean
  brokerConnected: boolean
  brokerError: string | null
  monitorStartedAt: number | null
  serverTime: number
  devices: LabelPrinterState[]
}

const MAX_RESULTS = 10

type MonitorState = {
  client: MqttClient | null
  brokerConnected: boolean
  brokerError: string | null
  startedAt: number | null
  devices: Map<string, LabelPrinterState>
}

// Stored on globalThis so dev hot reloads don't open a second connection
const globalForMonitor = globalThis as typeof globalThis & {
  __labelPrinterMonitor?: MonitorState
}

function getState(): MonitorState {
  globalForMonitor.__labelPrinterMonitor ??= {
    client: null,
    brokerConnected: false,
    brokerError: null,
    startedAt: null,
    devices: new Map(),
  }
  return globalForMonitor.__labelPrinterMonitor
}

function getDevice(state: MonitorState, device: string): LabelPrinterState {
  let entry = state.devices.get(device)
  if (!entry) {
    entry = {
      device,
      status: null,
      statusReceivedAt: null,
      lastEvent: null,
      recentResults: [],
    }
    state.devices.set(device, entry)
  }
  return entry
}

function isStatusMessage(msg: Record<string, unknown>): boolean {
  return (
    (msg.printer === "connected" || msg.printer === "disconnected") &&
    typeof msg.wifi === "number" &&
    typeof msg.uptime === "number"
  )
}

function isConnectionEvent(msg: Record<string, unknown>): boolean {
  return (
    msg.event === "printer_connected" || msg.event === "printer_disconnected"
  )
}

function handleMessage(state: MonitorState, topic: string, payload: Buffer) {
  // Topics are "{deviceName}/status" and "{deviceName}/result"
  const [device, kind] = topic.split("/")
  if (!device || !kind) return

  let msg: Record<string, unknown>
  try {
    msg = JSON.parse(payload.toString())
  } catch {
    return
  }
  if (!msg || typeof msg !== "object" || Array.isArray(msg)) return

  const now = Date.now()

  // The "+/status" wildcard can match unrelated devices on the broker, so
  // only accept payloads that have the label printer's shape
  if (kind === "status") {
    if (isStatusMessage(msg)) {
      const entry = getDevice(state, device)
      entry.status = msg as PrinterStatus
      entry.statusReceivedAt = now
    } else if (isConnectionEvent(msg)) {
      getDevice(state, device).lastEvent = {
        event: msg.event as PrinterEvent["event"],
        receivedAt: now,
      }
    }
  } else if (kind === "result" && typeof msg.success === "boolean") {
    // Only track results of devices already identified via status
    const entry = state.devices.get(device)
    if (!entry) return
    entry.recentResults = [
      {
        printId: typeof msg.printId === "string" ? msg.printId : undefined,
        success: msg.success,
        error: typeof msg.error === "string" ? msg.error : undefined,
        receivedAt: now,
      },
      ...entry.recentResults,
    ].slice(0, MAX_RESULTS)
  }
}

function ensureStarted(state: MonitorState) {
  const brokerUrl = process.env.MQTT_BROKER_URL
  if (state.client || !brokerUrl) return

  state.startedAt = Date.now()
  const client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    connectTimeout: 10000,
    reconnectPeriod: 5000,
    rejectUnauthorized: true,
  })
  state.client = client

  client.on("connect", () => {
    state.brokerConnected = true
    state.brokerError = null
    client.subscribe(["+/status", "+/result"], { qos: 0 }, (err) => {
      if (err) state.brokerError = `Subscribe fehlgeschlagen: ${err.message}`
    })
  })
  client.on("message", (topic, payload) => handleMessage(state, topic, payload))
  client.on("close", () => {
    state.brokerConnected = false
  })
  client.on("error", (err) => {
    state.brokerError = err.message
  })
}

export function getLabelPrinterSnapshot(): LabelPrinterSnapshot {
  const state = getState()
  ensureStarted(state)

  return {
    configured: !!process.env.MQTT_BROKER_URL,
    brokerConnected: state.brokerConnected,
    brokerError: state.brokerError,
    monitorStartedAt: state.startedAt,
    serverTime: Date.now(),
    devices: [...state.devices.values()]
      .sort((a, b) => a.device.localeCompare(b.device))
      .map((d) => ({ ...d, recentResults: [...d.recentResults] })),
  }
}
