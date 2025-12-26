// src/funcs/describeImage.ts
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createServerFn } from "@tanstack/react-start"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const describeImageFn = createServerFn({ method: "POST" })
  .inputValidator((base64Image: string) => base64Image)
  .handler(async ({ data: base64Image }) => {
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
