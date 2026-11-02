import fs from "node:fs"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createServerFn } from "@tanstack/react-start"
import z from "zod/v4"
import {
  buildItemPrompt,
  buildItemResponseSchema,
} from "@/src/lib/aiItemPrompt"
import { cleanTags } from "@/src/lib/tagRules"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import { CategoryRepository } from "@/src/repositories/CategoryRepository"
import { TagsRepository } from "@/src/repositories/TagsRepository"

type AiItemResponse = {
  kategorie: string
  kategorie_neu: string | null
  hersteller: string | null
  modell: string | null
  schlagworte: string[]
  [key: string]: unknown
}

// Safety net for what the prompt asks: drop stop tags and tags repeating
// other fields, and reuse an existing category if the AI "invented" one
function postProcess(data: AiItemResponse, categories: string[]) {
  const proposed = data.kategorie_neu?.trim()
  const existing = proposed
    ? categories.find((c) => c.toLowerCase() === proposed.toLowerCase())
    : undefined
  const kategorie = existing ?? data.kategorie
  const kategorie_neu = existing ? null : proposed || null

  return {
    ...data,
    kategorie,
    kategorie_neu,
    schlagworte: cleanTags(data.schlagworte ?? [], {
      redundant: [kategorie, kategorie_neu, data.hersteller, data.modell],
    }),
  }
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "")
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.8-flash"

const imageInputSchema = z.object({
  base64Image: z.string().optional(),
  imagePath: z.string().optional(),
})

export const describeImageFn = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .validator(imageInputSchema)
  .handler(async ({ data }) => {
    let base64Image: string

    if (data.base64Image) {
      base64Image = data.base64Image
    } else if (data.imagePath) {
      const fullPath = `${process.env.SAVE_PATH}items/${data.imagePath}`
      const fileBuffer = fs.readFileSync(fullPath)
      const mimeType = data.imagePath.endsWith(".png")
        ? "image/png"
        : "image/jpeg"
      base64Image = `data:${mimeType};base64,${fileBuffer.toString("base64")}`
    } else {
      throw new Error("Either base64Image or imagePath must be provided")
    }

    const [categories, topTags] = await Promise.all([
      new CategoryRepository().findAllNames(),
      new TagsRepository().findTopTags(100),
    ])

    const model = genAI.getGenerativeModel({
      model: geminiModel,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: buildItemResponseSchema(categories),
      },
    })

    const prompt = buildItemPrompt({
      categories,
      topTags,
    })

    const imageParts = [
      {
        inlineData: { data: base64Image.split(",")[1], mimeType: "image/jpeg" },
      },
    ]

    try {
      const result = await model.generateContent([prompt, ...imageParts])
      console.log(result.response.text())
      return postProcess(JSON.parse(result.response.text()), categories)
    } catch (error: unknown) {
      console.error("AI Analysis error:", error)

      const statusCode = (error as { status?: number })?.status
      const message = (error as { message?: string })?.message || ""
      const errorDetails = (
        error as {
          errorDetails?: Array<{
            "@type"?: string
            retryDelay?: string
            violations?: Array<{ quotaId?: string }>
          }>
        }
      )?.errorDetails

      if (
        statusCode === 429 ||
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED")
      ) {
        // Check if it's a daily quota exhaustion
        const quotaFailure = errorDetails?.find((d) =>
          d["@type"]?.includes("QuotaFailure"),
        )
        const isDailyQuota =
          quotaFailure?.violations?.some((v) =>
            v.quotaId?.includes("PerDay"),
          ) ||
          message.includes("PerDay") ||
          message.includes("per day")

        if (isDailyQuota) {
          // Midnight PT is 08:00 UTC (PST) or 07:00 UTC (PDT)
          // In German time: ~09:00 CET/CEST (varies slightly during DST transitions)
          throw new Error(
            "Tägliches API-Limit erreicht. Versuche es ab ca. 09:00 Uhr erneut.",
          )
        }

        // Try to extract retry delay from errorDetails (structured data from SDK)
        const retryInfo = errorDetails?.find((d) =>
          d["@type"]?.includes("RetryInfo"),
        )
        if (retryInfo?.retryDelay) {
          const seconds = Math.ceil(parseFloat(retryInfo.retryDelay))
          throw new Error(
            `API-Limit erreicht. Versuche es in ${seconds} Sekunden erneut.`,
          )
        }

        // Fallback: try to extract from error message
        const retryMatch = message.match(/retry in (\d+(?:\.\d+)?)/i)
        if (retryMatch) {
          const seconds = Math.ceil(parseFloat(retryMatch[1]))
          throw new Error(
            `API-Limit erreicht. Versuche es in ${seconds} Sekunden erneut.`,
          )
        }

        throw new Error(
          "API-Limit erreicht. Bitte warte einen Moment und versuche es erneut.",
        )
      }

      if (statusCode === 402 || message.includes("402")) {
        throw new Error(
          "KI-Guthaben aufgebraucht. Bitte das Gemini-Konto aufladen.",
        )
      }

      if (statusCode === 404 || message.includes("404")) {
        throw new Error(
          `KI-Modell "${geminiModel}" ist nicht verfügbar. Bitte GEMINI_MODEL anpassen.`,
        )
      }

      if (statusCode === 431 || message.includes("431")) {
        throw new Error(
          "Das Bild ist zu groß. Bitte verwende ein kleineres Bild.",
        )
      }

      if (statusCode === 400 || message.includes("400")) {
        throw new Error(
          "Ungültige Anfrage. Das Bild konnte nicht verarbeitet werden.",
        )
      }

      if (statusCode === 503 || message.includes("503")) {
        throw new Error(
          "Der KI-Service ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.",
        )
      }

      throw new Error("KI-Analyse fehlgeschlagen. Bitte versuche es erneut.")
    }
  })
