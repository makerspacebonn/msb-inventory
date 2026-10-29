import { Badge } from "@components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card"
import { createFileRoute } from "@tanstack/react-router"
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Bluetooth,
  BluetoothOff,
  CheckCircle2,
  Clock,
  Cpu,
  Loader2,
  Printer,
  Wifi,
  XCircle,
} from "lucide-react"
import { useEffect, useState } from "react"
import { fetchLabelPrinterStatus } from "@/src/actions/labelPrinterActions"
import type {
  LabelPrinterSnapshot,
  LabelPrinterState,
} from "@/src/lib/labelPrinterMonitor"

// The firmware publishes status every 30s; allow 2.5 missed intervals
const OFFLINE_AFTER_MS = 75_000
const REFRESH_MS = 5_000

export const Route = createFileRoute("/printers")({
  component: PrintersPage,
  beforeLoad: ({ context }) => {
    if (!context.isLoggedIn) {
      throw new Error("Unauthorized")
    }
  },
  loader: () => fetchLabelPrinterStatus(),
  head: () => ({
    meta: [{ title: "Labelprinter | MSB Inventar" }],
  }),
})

function formatAge(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `vor ${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  return `vor ${h} h ${m % 60} min`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d} d ${h} h`
  if (h > 0) return `${h} h ${m} min`
  return `${m} min`
}

function wifiQuality(rssi: number): string {
  if (rssi >= -60) return "gut"
  if (rssi >= -70) return "ok"
  return "schwach"
}

function BatteryIcon({ level }: { level: number }) {
  if (level >= 60) return <BatteryFull className="w-4 h-4" />
  if (level >= 25) return <BatteryMedium className="w-4 h-4" />
  return <BatteryLow className="w-4 h-4 text-destructive" />
}

function StatusRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium text-right">{children}</span>
    </div>
  )
}

function PrinterCard({
  printer,
  serverTime,
}: {
  printer: LabelPrinterState
  serverTime: number
}) {
  const { status, statusReceivedAt, lastEvent, recentResults } = printer
  const statusAge =
    statusReceivedAt !== null ? serverTime - statusReceivedAt : null
  const online = statusAge !== null && statusAge < OFFLINE_AFTER_MS
  const bluetoothConnected = status?.printer === "connected"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            {printer.device}
          </CardTitle>
          <Badge variant={online ? "default" : "destructive"}>
            {online ? "Online" : "Offline"}
          </Badge>
        </div>
        <CardDescription>
          {statusAge !== null
            ? `Letzte Statusmeldung ${formatAge(statusAge)}`
            : "Noch keine Statusmeldung"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <div className="divide-y">
            <StatusRow
              icon={
                bluetoothConnected ? (
                  <Bluetooth className="w-4 h-4" />
                ) : (
                  <BluetoothOff className="w-4 h-4" />
                )
              }
              label="Drucker (Bluetooth)"
            >
              <span
                className={bluetoothConnected ? undefined : "text-destructive"}
              >
                {bluetoothConnected ? "verbunden" : "getrennt"}
              </span>
            </StatusRow>
            {status.battery !== undefined && (
              <StatusRow
                icon={<BatteryIcon level={status.battery} />}
                label="Akku"
              >
                {status.battery} %
              </StatusRow>
            )}
            {status.lastSeen !== undefined && (
              <StatusRow
                icon={<Clock className="w-4 h-4" />}
                label="Letzter Druckerkontakt"
              >
                {formatAge(status.lastSeen * 1000)}
              </StatusRow>
            )}
            <StatusRow icon={<Wifi className="w-4 h-4" />} label="WLAN">
              {status.wifi} dBm ({wifiQuality(status.wifi)})
            </StatusRow>
            <StatusRow
              icon={<Cpu className="w-4 h-4" />}
              label="Freier Speicher"
            >
              {Math.round(status.heap / 1024)} KB
            </StatusRow>
            <StatusRow icon={<Clock className="w-4 h-4" />} label="Laufzeit">
              {formatUptime(status.uptime)}
            </StatusRow>
          </div>
        )}

        {lastEvent && (
          <p className="text-sm text-muted-foreground">
            Letztes Ereignis:{" "}
            {lastEvent.event === "printer_connected"
              ? "Drucker verbunden"
              : "Drucker getrennt"}{" "}
            ({formatAge(serverTime - lastEvent.receivedAt)})
          </p>
        )}

        {recentResults.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Letzte Druckaufträge</h3>
            <ul className="space-y-1 text-sm">
              {recentResults.map((result) => (
                <li
                  key={`${result.receivedAt}-${result.printId ?? ""}`}
                  className="flex items-center gap-2"
                >
                  {result.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span>
                    {result.success ? "Gedruckt" : result.error || "Fehler"}
                  </span>
                  <span className="ml-auto text-muted-foreground">
                    {formatAge(serverTime - result.receivedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PrintersPage() {
  const initial = Route.useLoaderData()
  const [snapshot, setSnapshot] = useState<LabelPrinterSnapshot>(initial)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        setSnapshot(await fetchLabelPrinterStatus())
        setFetchError(null)
      } catch (error) {
        setFetchError(
          error instanceof Error
            ? error.message
            : "Aktualisierung fehlgeschlagen",
        )
      }
    }, REFRESH_MS)
    return () => clearInterval(interval)
  }, [])

  const waitingForFirstStatus =
    snapshot.monitorStartedAt !== null &&
    snapshot.serverTime - snapshot.monitorStartedAt < OFFLINE_AFTER_MS

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Labelprinter</h1>
        <p className="text-sm text-muted-foreground">
          Aktualisiert sich automatisch alle {REFRESH_MS / 1000} Sekunden.
        </p>
      </div>

      {!snapshot.configured ? (
        <Card>
          <CardContent className="pt-6 text-sm">
            MQTT ist nicht konfiguriert (<code>MQTT_BROKER_URL</code> fehlt).
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">MQTT-Broker:</span>
            <Badge
              variant={snapshot.brokerConnected ? "secondary" : "destructive"}
            >
              {snapshot.brokerConnected ? "verbunden" : "nicht verbunden"}
            </Badge>
            {snapshot.brokerError && (
              <span className="text-destructive">{snapshot.brokerError}</span>
            )}
            {fetchError && (
              <span className="text-destructive">{fetchError}</span>
            )}
          </div>

          {snapshot.devices.length === 0 ? (
            <Card>
              <CardContent className="pt-6 flex items-center gap-2 text-sm text-muted-foreground">
                {waitingForFirstStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Warte auf die erste Statusmeldung (Drucker melden sich alle
                    30 Sekunden)…
                  </>
                ) : (
                  "Keine Labelprinter gefunden."
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {snapshot.devices.map((printer) => (
                <PrinterCard
                  key={printer.device}
                  printer={printer}
                  serverTime={snapshot.serverTime}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
