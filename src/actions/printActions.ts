import mqtt from "mqtt"
import { createServerFn } from "@tanstack/react-start"
import z from "zod/v4"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"

const printLabelSchema = z.object({
  link: z.string(),
  name: z.string(),
  id: z.string(),
})

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

    return new Promise((resolve) => {
      const client = mqtt.connect(brokerUrl, {
        username,
        password,
        connectTimeout: 10000,
        rejectUnauthorized: true,
      })

      const timeout = setTimeout(() => {
        client.end()
        resolve({ success: false, error: "Verbindungstimeout zum MQTT-Broker" })
      }, 10000)

      client.on("connect", () => {
        const message = JSON.stringify(data)

        client.publish("labelprinter/print", message, { qos: 1 }, (err) => {
          clearTimeout(timeout)
          client.end()

          if (err) {
            console.error("MQTT publish error:", err)
            resolve({ success: false, error: "Fehler beim Senden an den Drucker" })
          } else {
            console.log("Label print message sent:", message)
            resolve({ success: true })
          }
        })
      })

      client.on("error", (err) => {
        clearTimeout(timeout)
        console.error("MQTT connection error:", err)
        client.end()
        resolve({ success: false, error: "Verbindungsfehler zum MQTT-Broker" })
      })
    })
  })
