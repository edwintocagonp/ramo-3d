export const BRAND = {
  name: "Flor de Altura",
  tagline: "Rosas de altura · Quito",
  whatsapp: "593985757117",
};

export type FlowerKind = "rose" | "sunflower" | "hydrangea";

export type Variant = {
  id: string;
  kind: FlowerKind;
  name: string;
  colors: string[];
  price: number;
  max: number;
};

// USD, referencia de floristerías de Quito (2026)
export const VARIANTS: Variant[] = [
  { id: "roja", kind: "rose", name: "Rosa roja", colors: ["#a3112c"], price: 1.05, max: 100 },
  { id: "rosada", kind: "rose", name: "Rosa rosada", colors: ["#ee8fb0"], price: 1.05, max: 100 },
  { id: "blanca", kind: "rose", name: "Rosa blanca", colors: ["#f4eee4"], price: 1.05, max: 100 },
  { id: "durazno", kind: "rose", name: "Rosa durazno", colors: ["#f5a983"], price: 1.15, max: 100 },
  { id: "amarilla", kind: "rose", name: "Rosa amarilla", colors: ["#f3c53f"], price: 0.95, max: 100 },
  { id: "lila", kind: "rose", name: "Rosa lila", colors: ["#b493d8"], price: 1.3, max: 100 },
  { id: "azul", kind: "rose", name: "Rosa azul", colors: ["#2747b0"], price: 2, max: 100 },
  {
    id: "arcoiris",
    kind: "rose",
    name: "Rosa arcoíris",
    colors: ["#e3263b", "#f58a1f", "#f4d03a", "#3fb45a", "#2f6fe0", "#8a3fd1"],
    price: 2.9,
    max: 100,
  },
  { id: "girasol", kind: "sunflower", name: "Girasol", colors: ["#f2b705"], price: 1.8, max: 12 },
  { id: "hortensia-azul", kind: "hydrangea", name: "Hortensia azul", colors: ["#8aa6e6"], price: 3.5, max: 6 },
  { id: "hortensia-blanca", kind: "hydrangea", name: "Hortensia blanca", colors: ["#f1efe6"], price: 3.5, max: 6 },
];

export const MAX_STEMS = 100;

export type Arrangement = "mix" | "rings" | "heart";
export const ARRANGEMENTS: { id: Arrangement; name: string; hint: string }[] = [
  { id: "mix", name: "Mixto", hint: "Los colores se reparten por todo el ramo." },
  { id: "rings", name: "Por anillos", hint: "El primer color va al centro y los demás alrededor." },
  { id: "heart", name: "Corazón", hint: "El primer color dibuja un corazón; queda mejor con unas 2 de cada 5 flores de ese color." },
];

export type Swatch = { id: string; name: string; hex: string };

export const PAPERS: Swatch[] = [
  { id: "negro", name: "Negro", hex: "#1d1c1f" },
  { id: "blanco", name: "Blanco", hex: "#f3f0ea" },
  { id: "palo", name: "Rosa palo", hex: "#efc3c9" },
  { id: "kraft", name: "Kraft", hex: "#c79b6d" },
  { id: "lila", name: "Lila", hex: "#c9b6e4" },
  { id: "celeste", name: "Celeste", hex: "#b9d7ec" },
  { id: "salvia", name: "Salvia", hex: "#a9bba3" },
];

export const RIBBONS: Swatch[] = [
  { id: "rojo", name: "Rojo", hex: "#b3122e" },
  { id: "blanco", name: "Blanco", hex: "#f5f2ec" },
  { id: "negro", name: "Negro", hex: "#161518" },
  { id: "dorado", name: "Dorado", hex: "#caa04a" },
  { id: "rosa", name: "Rosa", hex: "#e98fae" },
];

export type FillerLevel = "none" | "some" | "lots";
export const FILLER = {
  name: "Gypsophila",
  levels: [
    { id: "none" as const, name: "Sin", price: 0 },
    { id: "some" as const, name: "Poca", price: 2.5 },
    { id: "lots" as const, name: "Mucha", price: 4.5 },
  ],
  eucalyptus: { name: "Eucalipto", price: 2.5 },
};

export type ExtraId = "crown" | "butterflies" | "lights" | "chocolates" | "bear" | "card";
export const EXTRAS: { id: ExtraId; name: string; detail: string; price: number }[] = [
  { id: "crown", name: "Corona", detail: "Dorada, al centro", price: 6 },
  { id: "butterflies", name: "Mariposas", detail: "Tres, con alambre", price: 3.5 },
  { id: "lights", name: "Luces LED", detail: "Guirnalda a pilas", price: 4.5 },
  { id: "chocolates", name: "Chocolates", detail: "6 bombones", price: 6.5 },
  { id: "bear", name: "Peluche", detail: "Osito de 20 cm", price: 9 },
  { id: "card", name: "Tarjeta", detail: "Con tu mensaje", price: 0 },
];

export const WRAP_PRICES = [
  { upTo: 12, price: 5 },
  { upTo: 36, price: 7 },
  { upTo: 60, price: 8 },
  { upTo: MAX_STEMS, price: 11 },
];

export const ZONES = [
  { id: "norte", name: "Quito norte", price: 2.5 },
  { id: "centro", name: "Quito centro", price: 3 },
  { id: "sur", name: "Quito sur", price: 3.5 },
  { id: "cumbaya", name: "Cumbayá y Tumbaco", price: 5 },
  { id: "chillos", name: "Valle de los Chillos", price: 5 },
  { id: "local", name: "Retiro en el local", price: 0 },
];

export const TIME_SLOTS = ["Mañana (9:00 a 13:00)", "Tarde (13:00 a 18:00)", "Noche (18:00 a 20:00)"];

export type Preset = {
  id: string;
  name: string;
  counts: Record<string, number>;
  arrangement?: Arrangement;
  extras?: ExtraId[];
  filler?: FillerLevel;
  paper?: [string, string];
};

export const PRESETS: Preset[] = [
  { id: "clasico", name: "12 rojas", counts: { roja: 12 }, filler: "some", paper: ["negro", "blanco"] },
  { id: "mix", name: "Mix 24", counts: { rosada: 8, blanca: 8, durazno: 8 }, paper: ["palo", "blanco"] },
  { id: "corazon", name: "Corazón", counts: { roja: 19, blanca: 26 }, arrangement: "heart", paper: ["negro", "palo"] },
  {
    id: "buchon",
    name: "Buchón 50",
    counts: { rosada: 30, blanca: 20 },
    extras: ["crown", "butterflies", "lights"],
    paper: ["palo", "blanco"],
  },
  { id: "cien", name: "100 rosas", counts: { roja: 100 }, paper: ["negro", "negro"] },
  { id: "sol", name: "Girasoles", counts: { girasol: 7 }, filler: "lots", paper: ["kraft", "blanco"] },
];
