import mqtt from "mqtt"
import { createServerFn } from "@tanstack/react-start"
import { v4 as uuidv4 } from "uuid"
import z from "zod/v4"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"

const printLabelSchema = z.object({
  link: z.string(),
  name: z.string(),
  id: z.string(),
})

type PrintResult = {
  printId: string
  success: boolean
  error?: string
}

export const printLabelFn = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .inputValidator(printLabelSchema)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const brokerUrl = process.env.MQTT_BROKER_URL
    const username = process.env.MQTT_USERNAME
    const password = process.env.MQTT_PASSWORD

    if (!brokerUrl) {
      throw new Error("MQTT nicht konfiguriert")
    }

    const printId = uuidv4()

    return new Promise((resolve) => {
      const client = mqtt.connect(brokerUrl, {
        username,
        password,
        connectTimeout: 10000,
        rejectUnauthorized: true,
      })

      const timeout = setTimeout(() => {
        client.end()
        resolve({ success: false, error: "Zeitüberschreitung beim Warten auf Druckergebnis" })
      }, 30000)

      client.on("connect", () => {
        // Subscribe to result topic first
        client.subscribe("labelprinter/result", { qos: 1 }, (err) => {
          if (err) {
            clearTimeout(timeout)
            client.end()
            resolve({ success: false, error: "Fehler beim Abonnieren des Ergebnis-Topics" })
            return
          }

          // Send print message with printId
          const message = JSON.stringify({ ...data, printId })

          client.publish("labelprinter/print", message, { qos: 1 }, (err) => {
            if (err) {
              clearTimeout(timeout)
              client.end()
              console.error("MQTT publish error:", err)
              resolve({ success: false, error: "Fehler beim Senden an den Drucker" })
            } else {
              console.log("Label print message sent:", message)
            }
          })
        })
      })

      client.on("message", (topic, payload) => {
        if (topic === "labelprinter/result") {
          try {
            const result: PrintResult = JSON.parse(payload.toString())

            // Only handle result for our printId
            if (result.printId === printId) {
              clearTimeout(timeout)
              client.end()

              if (result.success) {
                resolve({ success: true })
              } else {
                resolve({ success: false, error: result.error || "Druckfehler" })
              }
            }
          } catch (e) {
            console.error("Failed to parse print result:", e)
          }
        }
      })

      client.on("error", (err) => {
        clearTimeout(timeout)
        console.error("MQTT connection error:", err)
        client.end()
        resolve({ success: false, error: "Verbindungsfehler zum MQTT-Broker" })
      })
    })
  })
