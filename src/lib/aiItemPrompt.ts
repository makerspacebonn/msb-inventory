import { type ObjectSchema, SchemaType } from "@google/generative-ai"

/**
 * Prompt and response format for describing an item from a photo.
 * Existing categories and tags are passed in so the AI reuses the
 * inventory's vocabulary instead of inventing new words.
 */
export function buildItemPrompt({
  categories,
  topTags,
}: {
  categories: string[]
  topTags: string[]
}): string {
  const categoryRule =
    categories.length > 0
      ? `"kategorie": Wähle genau eine passende Kategorie aus der vorgegebenen Liste.
Nur wenn wirklich keine passt, wähle "Sonstiges" und schlage in "kategorie_neu" eine neue, allgemeine Kategorie vor. Sonst ist "kategorie_neu" null.`
      : `"kategorie": Eine allgemeine Kategorie, z.B. "Messtechnik" oder "Handwerkzeug". "kategorie_neu" ist null.`

  const tagVocabulary =
    topTags.length > 0
      ? `\nBereits verwendete Schlagworte (bevorzuge diese Schreibweisen, wenn sie passen):\n${topTags.join(", ")}\n`
      : ""

  return `Analysiere dieses Bild eines Gegenstands für das Inventar eines Makerspace.
Gib nur Informationen an, die helfen, den Gegenstand zu identifizieren und wiederzufinden.

${categoryRule}

"beschreibung_kurz": 1–2 sachliche Sätze: was es ist und wofür man es benutzt.
Keine Werbesprache, keine Beschreibung von Farbe oder Aussehen.

"schlagworte": 3–6 Suchbegriffe, die jemand eintippen würde, um genau diesen Gegenstand zu finden:
Art des Gegenstands, Funktion, Einsatzzweck, kompatible Systeme oder Schnittstellen (z.B. "Arduino", "I2C", "USB-C").
Nicht verwenden:
- Farben und Materialien (z.B. "Schwarz", "Metall", "Kunststoff"), außer sie unterscheiden den Gegenstand wirklich
- allgemeine Wörter wie "Elektronik", "Modul", "Bauteil", "Zubehör", "Gerät", "DIY", "Werkzeug"
- Wörter, die schon in Kategorie, Hersteller oder Modell stehen
${tagVocabulary}
Beispiel für eine Akku-Bohrmaschine von Makita: ["Bohrmaschine", "Akku", "18V", "Schlagbohren"]

Wenn etwas unbekannt ist, verwende null.`
}

export function buildItemResponseSchema(categories: string[]): ObjectSchema {
  const nullableString = { type: SchemaType.STRING, nullable: true } as const

  return {
    type: SchemaType.OBJECT,
    properties: {
      bezeichnung: { type: SchemaType.STRING },
      hersteller: nullableString,
      modell: nullableString,
      seriennummer: nullableString,
      kategorie:
        categories.length > 0
          ? { type: SchemaType.STRING, format: "enum", enum: categories }
          : { type: SchemaType.STRING },
      kategorie_neu: nullableString,
      zustand: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["neu", "gut", "gebraucht", "defekt"],
      },
      beschreibung_kurz: { type: SchemaType.STRING },
      schlagworte: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
      bedienungsanleitungen: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Links zu Bedienungsanleitungen (PDF oder Webseite)",
      },
      zusatzinfos: {
        type: SchemaType.STRING,
        nullable: true,
        description: "Weitere nützliche Infos, z.B. technische Daten",
      },
    },
    required: [
      "bezeichnung",
      "kategorie",
      "kategorie_neu",
      "zustand",
      "beschreibung_kurz",
      "schlagworte",
      "bedienungsanleitungen",
    ],
  }
}
