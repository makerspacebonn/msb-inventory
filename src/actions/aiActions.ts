// src/funcs/describeImage.ts
import fs from "fs"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createServerFn } from "@tanstack/react-start"
import z from "zod/v4"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const imageInputSchema = z.object({
  base64Image: z.string().optional(),
  imagePath: z.string().optional(),
})

export const describeImageFn = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .inputValidator(imageInputSchema)
  .handler(async ({ data }) => {
    let base64Image: string

    if (data.base64Image) {
      base64Image = data.base64Image
    } else if (data.imagePath) {
      const fullPath = `${process.env.SAVE_PATH}items/${data.imagePath}`
      const fileBuffer = fs.readFileSync(fullPath)
      const mimeType = data.imagePath.endsWith(".png") ? "image/png" : "image/jpeg"
      base64Image = `data:${mimeType};base64,${fileBuffer.toString("base64")}`
    } else {
      throw new Error("Either base64Image or imagePath must be provided")
    }
    //console.log(base64Image)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    })

    const prompt = `Analysiere dieses Bild für ein Inventarsystem: 
    
    Erstelle ein JSON mit diesen Feldern: 
    { 
      "bezeichnung": string, 
      "hersteller": string | null, 
      "modell": string | null, 
      "seriennummer": string | null, 
      "kategorie": string, 
      "zustand": "neu" | "gut" | "gebraucht" | "defekt", 
      "beschreibung_kurz": string, 
      "schlagworte": string[] // Liste von Suchbegriffen wie Farbe, Material, Typ, Einsatzbereich, 
      "bedienungsanleitungen": string[] // Links zu PDF Dateien oder anderen Quellen, 
      "zusatzinfos": string // weitere infos, die du dazu packen würdest. Struktur bleibt dir überlassen. 
     } 
     
     Beispiel für Schlagworte bei einer Bohrmaschine: ["Werkzeug", "Blau", "Metall", "Elektrowerkzeug", "Akku", "Heimwerken"]
     wenn unbekannt, dann null als wert`

    const imageParts = [
      {
        inlineData: { data: base64Image.split(",")[1], mimeType: "image/jpeg" },
      },
    ]

    try {
      const result = await model.generateContent([prompt, ...imageParts])
      console.log(result.response.text())
      return JSON.parse(result.response.text())
    } catch (error: unknown) {
      console.error("AI Analysis error:", error)

      const statusCode = (error as { status?: number })?.status
      const message = (error as { message?: string })?.message || ""
      const errorDetails = (error as { errorDetails?: Array<{ "@type"?: string; retryDelay?: string; violations?: Array<{ quotaId?: string }> }> })?.errorDetails

      if (statusCode === 429 || message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
        // Check if it's a daily quota exhaustion
        const quotaFailure = errorDetails?.find(d => d["@type"]?.includes("QuotaFailure"))
        const isDailyQuota = quotaFailure?.violations?.some(v => v.quotaId?.includes("PerDay")) ||
          message.includes("PerDay") || message.includes("per day")

        if (isDailyQuota) {
          // Midnight PT is 08:00 UTC (PST) or 07:00 UTC (PDT)
          // In German time: ~09:00 CET/CEST (varies slightly during DST transitions)
          throw new Error("Tägliches API-Limit erreicht. Versuche es ab ca. 09:00 Uhr erneut.")
        }

        // Try to extract retry delay from errorDetails (structured data from SDK)
        const retryInfo = errorDetails?.find(d => d["@type"]?.includes("RetryInfo"))
        if (retryInfo?.retryDelay) {
          const seconds = Math.ceil(parseFloat(retryInfo.retryDelay))
          throw new Error(`API-Limit erreicht. Versuche es in ${seconds} Sekunden erneut.`)
        }

        // Fallback: try to extract from error message
        const retryMatch = message.match(/retry in (\d+(?:\.\d+)?)/i)
        if (retryMatch) {
          const seconds = Math.ceil(parseFloat(retryMatch[1]))
          throw new Error(`API-Limit erreicht. Versuche es in ${seconds} Sekunden erneut.`)
        }

        throw new Error("API-Limit erreicht. Bitte warte einen Moment und versuche es erneut.")
      }

      if (statusCode === 431 || message.includes("431")) {
        throw new Error("Das Bild ist zu groß. Bitte verwende ein kleineres Bild.")
      }

      if (statusCode === 400 || message.includes("400")) {
        throw new Error("Ungültige Anfrage. Das Bild konnte nicht verarbeitet werden.")
      }

      if (statusCode === 503 || message.includes("503")) {
        throw new Error("Der KI-Service ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.")
      }

      throw new Error("KI-Analyse fehlgeschlagen. Bitte versuche es erneut.")
    }
  })
