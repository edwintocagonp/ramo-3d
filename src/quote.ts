import { BRAND, EXTRAS, FILLER, WRAP_PRICES, ZONES } from "./content";
import { paperSwatch, ribbonSwatch, totalStems, variant } from "./design";
import type { Bouquet, Gift } from "./design";

const currency = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
export const money = (n: number) => currency.format(n);

export type QuoteLine = { label: string; detail: string; amount: number };

export function computeQuote(b: Bouquet) {
  const lines: QuoteLine[] = [];
  for (const id of b.order) {
    const v = variant(id);
    const n = b.counts[id] ?? 0;
    if (n) lines.push({ label: v.name, detail: `${n} × ${money(v.price)}`, amount: n * v.price });
  }
  const filler = FILLER.levels.find((l) => l.id === b.filler);
  if (filler && filler.price) lines.push({ label: FILLER.name, detail: filler.name, amount: filler.price });
  if (b.eucalyptus) lines.push({ label: FILLER.eucalyptus.name, detail: "Follaje", amount: FILLER.eucalyptus.price });
  const stems = totalStems(b);
  const wrap = WRAP_PRICES.find((w) => stems <= w.upTo) ?? WRAP_PRICES[WRAP_PRICES.length - 1];
  lines.push({ label: "Papel coreano y lazo", detail: `Para ${stems} tallos`, amount: wrap.price });
  for (const e of EXTRAS) if (b.extras.includes(e.id)) lines.push({ label: e.name, detail: e.detail, amount: e.price });
  const total = stems ? lines.reduce((s, l) => s + l.amount, 0) : 0;
  return { lines, total, stems };
}

export type OrderForm = { name: string; to: string; date: string; slot: string; zone: string; address: string; card: string };

const longDate = (iso: string) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long" }) : "";

export function orderMessage(b: Bouquet, form: OrderForm, link: string) {
  const q = computeQuote(b);
  const zone = ZONES.find((z) => z.id === form.zone) ?? ZONES[0];
  const flowers = b.order.map((id) => `${b.counts[id]} ${variant(id).name.toLowerCase()}`).join(", ");
  const extras = EXTRAS.filter((e) => b.extras.includes(e.id)).map((e) => e.name.toLowerCase());
  return [
    `Hola ${BRAND.name} 🌹 Quiero pedir este ramo:`,
    "",
    `• Flores: ${flowers}`,
    `• Papel: ${paperSwatch(b.paper[0]).name.toLowerCase()} y ${paperSwatch(b.paper[1]).name.toLowerCase()} · lazo ${ribbonSwatch(b.ribbon).name.toLowerCase()}`,
    extras.length ? `• Extras: ${extras.join(", ")}` : null,
    `• Entrega: ${longDate(form.date)}, ${form.slot.toLowerCase()}`,
    `• Zona: ${zone.name}${zone.price ? ` (envío ${money(zone.price)})` : ""}`,
    form.address.trim() ? `• Dirección: ${form.address.trim()}` : null,
    form.to.trim() ? `• Para: ${form.to.trim()}` : null,
    form.card.trim() ? `• Tarjeta: "${form.card.trim()}"` : null,
    "",
    `Total referencial: ${money(q.total + zone.price)}`,
    `Mi ramo en 3D: ${link}`,
    "",
    `Mi nombre: ${form.name}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export const giftMessage = (gift: Gift, link: string) =>
  `${gift.to ? `${gift.to}, ` : ""}te armé un ramo 💐 Ábrelo aquí: ${link}`;

export const whatsappTo = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
export const whatsappAny = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
