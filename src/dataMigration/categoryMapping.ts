// TEMPORARY: one-time category migration (AI-002). Remove after it ran on production.

const MOD = "Elektronik-Module & Sensoren"
const MCU = "Mikrocontroller & Boards"
const BT = "Elektronik-Bauteile"
const KAB = "Kabel & Adapter"
const STR = "Stromversorgung & Akkus"
const MESS = "Messtechnik"
const LOET = "Löten"
const HW = "Handwerkzeug"
const EW = "Elektrowerkzeug"
const MASCH = "Maschinen & Fertigung"
const COMP = "Computer, Drucker & Peripherie"
const FOTO = "Foto, Video & Optik"
const BUERO = "Büro & Papier"
const HAUS = "Haushalt & Küche"
const BASTEL = "Bastel- & Verbrauchsmaterial"
const SONST = "Sonstiges"

export const CURATED_CATEGORIES = [
  MOD,
  MCU,
  BT,
  KAB,
  STR,
  MESS,
  LOET,
  HW,
  EW,
  MASCH,
  COMP,
  FOTO,
  BUERO,
  HAUS,
  BASTEL,
  SONST,
]

// Old category → curated category, built from the production backup of 2026-11-01
export const CATEGORY_MAP: Record<string, string> = {
  "3D-Drucker": MASCH,
  "3D-Scanner": MASCH,
  "3D-Stift": MASCH,
  Akku: STR,
  Antenne: FOTO,
  "Arduino Shield": MCU,
  "Audio-Video Adapter": KAB,
  Bastelbedarf: BASTEL,
  "Bastel- & Bürobedarf": BUERO,
  "Batterie (Lithium)": STR,
  Batteriemanagement: STR,
  Büroartikel: BUERO,
  Büroausstattung: BUERO,
  Bürobedarf: BUERO,
  "Büro- und Haushaltsbedarf": HW,
  "CNC-Maschine": MASCH,
  Computerkabel: KAB,
  Display: MOD,
  "Einplatinencomputer Zubehör": MCU,
  "Elektrische Komponente": BT,
  Elektroinstallation: BASTEL,
  Elektromaterial: BASTEL,
  Elektronik: MOD,
  "Elektronik / Akustik-Modul": MOD,
  Elektronikbauteil: MOD,
  "Elektronik-Bauteile & Zubehör": KAB,
  Elektronikfertigung: MASCH,
  Elektronikkomponente: MOD,
  "Elektronik Komponente": BT,
  "Elektronik-Komponente": MOD,
  "Elektronik Komponenten": KAB,
  "Elektronik-Komponenten": MOD,
  "Elektronikkomponenten & Kabel": KAB,
  "Elektronik / LED-Modul": MOD,
  "Elektronik-Lötbedarf": LOET,
  "Elektronik & Messtechnik": MESS,
  Elektronikmodul: MOD,
  "Elektronik-Modul": MOD,
  Elektronikplatine: MCU,
  "Elektronik & Prototyping": KAB,
  "Elektronik-Steckverbinder": BT,
  "Elektronik, Stromversorgung, Wandler": STR,
  Elektronikwerkzeug: LOET,
  "Elektronik-Werkzeug": LOET,
  Elektronikzubehör: KAB,
  "Elektronik Zubehör": KAB,
  "Elektronik-Zubehör": KAB,
  "Elektronikzubehör, Batterien": STR,
  "Elektronik-Zubehör / Verkabelung": KAB,
  "Elektronische Bauteile": BT,
  "Elektronische Komponente": BT,
  "Elektronische Sensoren": MOD,
  Elektrowerkzeug: EW,
  Elektrozubehör: MESS,
  "Energieversorgung & Elektronik": STR,
  Entwicklungsboard: MCU,
  Etikettendrucker: COMP,
  "Fahrrad- und Mopedersatzteile": SONST,
  Farbkalibrierungssystem: COMP,
  "Fotografie-Zubehör": FOTO,
  Fotozubehör: FOTO,
  Großformatdrucker: COMP,
  Handwerkzeug: HW,
  Handwerkzeuge: HW,
  Haushaltsgerät: HAUS,
  Haushaltsgeräte: HAUS,
  Heizwerkzeug: LOET,
  Infrarotsensor: MOD,
  Inspektionskamera: FOTO,
  "Integrierter Schaltkreis (IC)": BT,
  Kabel: KAB,
  "Kabel & Adapter": KAB,
  Kabelmanagement: BASTEL,
  Klebstoff: BASTEL,
  Küchengerät: HAUS,
  Küchenzubehör: HAUS,
  Löttechnik: LOET,
  "Lötwerkzeuge & Zubehör": LOET,
  Lüftungstechnik: SONST,
  Messgerät: MESS,
  Messtechnik: MESS,
  Messwerkzeug: MESS,
  "Mikrocontroller-Entwicklungsboard": MCU,
  "Modellbaufarben und Zubehör": BASTEL,
  Navigationszubehör: COMP,
  Ofen: HAUS,
  Optik: MOD,
  "Optisches Gerät": FOTO,
  "POS-Hardware": COMP,
  Pumpe: SONST,
  Reinigungsmittel: BASTEL,
  Scanner: COMP,
  Schalter: BT,
  Sensor: MOD,
  Sensorik: MOD,
  Solartechnik: STR,
  Spezialwerkzeug: HW,
  "Verbrauchsmaterial & Kabelzubehör": BASTEL,
  Wärmepresse: MASCH,
  Werkzeug: HW,
  Werkzeuge: HW,
}

// Items whose old category mixed different things. Only applied when id,
// name prefix AND old category all match, so a different dataset with the
// same ids is not touched.
export type ItemOverride = {
  id: number
  namePrefix: string
  from: string
  to: string
}

export const ITEM_OVERRIDES: ItemOverride[] = [
  {
    id: 1286,
    namePrefix: "DC-DC Abwärtswandler",
    from: "Elektronikmodul",
    to: STR,
  },
  {
    id: 1287,
    namePrefix: "Mini DC-DC Spannungswandler",
    from: "Elektronikmodul",
    to: STR,
  },
  { id: 1324, namePrefix: "Piezosummer", from: "Elektronikkomponente", to: BT },
  {
    id: 1333,
    namePrefix: "Lichtsensor (LDR)",
    from: "Elektronikbauteil",
    to: BT,
  },
  {
    id: 1360,
    namePrefix: "Lithium-Akku Lade- und Schutzmodul",
    from: "Elektronik-Modul",
    to: STR,
  },
  {
    id: 1363,
    namePrefix: "100 Stück flache PVC Schrumpfschläuche",
    from: "Elektronik-Zubehör",
    to: BASTEL,
  },
  { id: 1372, namePrefix: "ESP8266 D1 WiFi", from: "Elektronik", to: MCU },
  {
    id: 1379,
    namePrefix: "4-stellige 7-Segment",
    from: "Elektronikkomponente",
    to: BT,
  },
  {
    id: 1382,
    namePrefix: "Sainsmart TFT LCD Mega Shield",
    from: "Elektronik-Modul",
    to: MCU,
  },
  {
    id: 1388,
    namePrefix: "Batteriehalter 2xAA",
    from: "Elektronikkomponente",
    to: STR,
  },
  {
    id: 1410,
    namePrefix: "Ravioli und Pastamaker",
    from: "Küchengerät",
    to: BASTEL,
  },
  {
    id: 1417,
    namePrefix: "Super Lötdraht",
    from: "Elektronik-Zubehör",
    to: LOET,
  },
]
