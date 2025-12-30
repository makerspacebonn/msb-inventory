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

    const result = await model.generateContent([prompt, ...imageParts])
    console.log(result.response.text())
    return JSON.parse(result.response.text())
  })
