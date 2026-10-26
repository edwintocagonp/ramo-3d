import { ARRANGEMENTS, EXTRAS, FILLER, MAX_STEMS, PAPERS, PRESETS, RIBBONS, VARIANTS } from "./content";
import type { Arrangement, ExtraId, FillerLevel, Preset, Variant } from "./content";

export type Bouquet = {
  counts: Record<string, number>;
  order: string[];
  arrangement: Arrangement;
  filler: FillerLevel;
  eucalyptus: boolean;
  paper: [string, string];
  ribbon: string;
  extras: ExtraId[];
};

export type Gift = { to: string; from: string; message: string };

export const variant = (id: string): Variant => VARIANTS.find((v) => v.id === id) ?? VARIANTS[0];
export const paperSwatch = (id: string) => PAPERS.find((p) => p.id === id) ?? PAPERS[0];
export const ribbonSwatch = (id: string) => RIBBONS.find((r) => r.id === id) ?? RIBBONS[0];

export const totalStems = (b: Bouquet) => b.order.reduce((s, id) => s + (b.counts[id] ?? 0), 0);

export function fromPreset(p: Preset, base?: Bouquet): Bouquet {
  return {
    counts: { ...p.counts },
    order: Object.keys(p.counts),
    arrangement: p.arrangement ?? "mix",
    filler: p.filler ?? "none",
    eucalyptus: base?.eucalyptus ?? true,
    paper: p.paper ?? base?.paper ?? ["negro", "blanco"],
    ribbon: base?.ribbon ?? "blanco",
    extras: p.extras ?? [],
  };
}

export const DEFAULT_BOUQUET: Bouquet = { ...fromPreset(PRESETS[2]), eucalyptus: true, filler: "some", ribbon: "blanco" };

export function setCount(b: Bouquet, id: string, next: number): Bouquet {
  const v = variant(id);
  const others = totalStems(b) - (b.counts[id] ?? 0);
  const n = Math.max(0, Math.min(next, v.max, MAX_STEMS - others));
  const counts = { ...b.counts, [id]: n };
  if (!n) delete counts[id];
  const order = n ? (b.order.includes(id) ? b.order : [...b.order, id]) : b.order.filter((o) => o !== id);
  return { ...b, counts, order };
}

export const toggleExtra = (b: Bouquet, id: ExtraId): Bouquet => ({
  ...b,
  extras: b.extras.includes(id) ? b.extras.filter((e) => e !== id) : [...b.extras, id],
});

export function encodeBouquet(b: Bouquet, gift?: Gift): string {
  const p = new URLSearchParams({
    f: b.order.map((id) => `${id}:${b.counts[id]}`).join(","),
    a: b.arrangement,
    g: b.filler,
    e: b.eucalyptus ? "1" : "0",
    p: b.paper.join("."),
    r: b.ribbon,
    x: b.extras.join("."),
  });
  if (gift) {
    p.set("regalo", "1");
    p.set("para", gift.to);
    p.set("de", gift.from);
    p.set("m", gift.message);
  }
  return p.toString();
}

export function decodeHash(hash: string): { bouquet: Bouquet; gift: Gift | null } {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  if (!p.has("f")) return { bouquet: DEFAULT_BOUQUET, gift: null };
  let b: Bouquet = { ...DEFAULT_BOUQUET, counts: {}, order: [] };
  for (const part of (p.get("f") ?? "").split(",")) {
    const [id, n] = part.split(":");
    if (VARIANTS.some((v) => v.id === id)) b = setCount(b, id, Math.floor(Number(n)) || 0);
  }
  if (!b.order.length) b = { ...DEFAULT_BOUQUET };
  const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;
  const [outer, inner] = (p.get("p") ?? "").split(".");
  b = {
    ...b,
    arrangement: pick(p.get("a"), ARRANGEMENTS.map((a) => a.id), "mix"),
    filler: pick(p.get("g"), FILLER.levels.map((l) => l.id), "none"),
    eucalyptus: p.get("e") !== "0",
    paper: [pick(outer, PAPERS.map((x) => x.id), "negro"), pick(inner, PAPERS.map((x) => x.id), "blanco")],
    ribbon: pick(p.get("r"), RIBBONS.map((x) => x.id), "blanco"),
    extras: (p.get("x") ?? "").split(".").filter((x): x is ExtraId => EXTRAS.some((e) => e.id === x)),
  };
  const gift =
    p.get("regalo") === "1"
      ? { to: (p.get("para") ?? "").slice(0, 40), from: (p.get("de") ?? "").slice(0, 40), message: (p.get("m") ?? "").slice(0, 240) }
      : null;
  return { bouquet: b, gift };
}

export const pageUrl = (b: Bouquet, gift?: Gift) => `${window.location.origin}${window.location.pathname}#${encodeBouquet(b, gift)}`;

export function leadColor(b: Bouquet) {
  const first = variant(b.order[0] ?? "roja");
  return first.id === "blanca" || first.id.startsWith("hortensia-blanca") ? "#c9a27a" : first.colors[0];
}
