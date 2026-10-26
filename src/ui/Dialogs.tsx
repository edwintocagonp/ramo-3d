import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

import { BRAND, TIME_SLOTS, ZONES } from "../content";
import { pageUrl, totalStems } from "../design";
import type { Bouquet, Gift } from "../design";
import { computeQuote, giftMessage, money, orderMessage, whatsappAny, whatsappTo } from "../quote";
import type { OrderForm } from "../quote";
import { Icon, WhatsAppIcon } from "./icons";

function Modal({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            className="dialog glass"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
          >
            <button type="button" className="dialog__close tool" onClick={onClose} aria-label="Cerrar">
              <Icon name="close" size={18} />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Done({ title, text, href, onClose }: { title: string; text: string; href: string; onClose: () => void }) {
  return (
    <div className="dialog__done">
      <span className="dialog__check">
        <Icon name="check" size={28} />
      </span>
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      <a className="btn btn--ghost" href={href} target="_blank" rel="noopener noreferrer">
        ¿No se abrió? Ábrelo aquí
      </a>
      <button type="button" className="cta cta--block" onClick={onClose}>
        Seguir
      </button>
    </div>
  );
}

const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export function OrderDialog({ open, onClose, bouquet, onCard }: { open: boolean; onClose: () => void; bouquet: Bouquet; onCard: (to: string, message: string) => void }) {
  const [form, setForm] = useState<OrderForm>({ name: "", to: "", date: today(), slot: TIME_SLOTS[1], zone: ZONES[0].id, address: "", card: "" });
  const [sent, setSent] = useState<string | null>(null);
  const zone = ZONES.find((z) => z.id === form.zone) ?? ZONES[0];
  const q = computeQuote(bouquet);
  const withCard = bouquet.extras.includes("card");
  const set = (patch: Partial<OrderForm>) => {
    const next = { ...form, ...patch };
    setForm(next);
    if ("to" in patch || "card" in patch) onCard(next.to, next.card);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const url = whatsappTo(BRAND.whatsapp, orderMessage(bouquet, form, pageUrl(bouquet)));
    window.open(url, "_blank", "noopener");
    setSent(url);
  };
  const close = () => {
    setSent(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} label="Pedir el ramo">
      {sent ? (
        <Done title="¡Pedido listo!" text="Se abrió WhatsApp con tu pedido y el enlace a tu ramo en 3D. Solo falta enviarlo." href={sent} onClose={close} />
      ) : (
        <form className="form" onSubmit={submit}>
          <p className="eyebrow">Pedido · entrega en Quito</p>
          <h2>Pide tu ramo</h2>
          <div className="summary">
            <span>{totalStems(bouquet)} flores</span>
            <span className="mono">{money(q.total + zone.price)}</span>
          </div>
          <div className="grid2">
            <label className="field-input">
              <span className="label">Tu nombre</span>
              <input required autoComplete="name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label className="field-input">
              <span className="label">Para (opcional)</span>
              <input value={form.to} onChange={(e) => set({ to: e.target.value })} />
            </label>
            <label className="field-input">
              <span className="label">Fecha</span>
              <input type="date" required min={today()} value={form.date} onChange={(e) => set({ date: e.target.value })} />
            </label>
            <label className="field-input">
              <span className="label">Horario</span>
              <select value={form.slot} onChange={(e) => set({ slot: e.target.value })}>
                {TIME_SLOTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field-input">
            <span className="label">Zona</span>
            <select value={form.zone} onChange={(e) => set({ zone: e.target.value })}>
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                  {z.price ? ` · envío ${money(z.price)}` : ""}
                </option>
              ))}
            </select>
          </label>
          {zone.price > 0 && (
            <label className="field-input">
              <span className="label">Dirección</span>
              <input autoComplete="street-address" placeholder="Calle, número y una referencia" value={form.address} onChange={(e) => set({ address: e.target.value })} />
            </label>
          )}
          {withCard && (
            <label className="field-input">
              <span className="label">Mensaje de la tarjeta</span>
              <textarea rows={2} maxLength={160} value={form.card} onChange={(e) => set({ card: e.target.value })} />
            </label>
          )}
          <button type="submit" className="cta cta--block">
            <WhatsAppIcon size={19} />
            <span>Enviar pedido por WhatsApp</span>
          </button>
          <p className="muted small center">Precio referencial. La florería confirma disponibilidad y forma de pago.</p>
        </form>
      )}
    </Modal>
  );
}

export function GiftDialog({
  open,
  onClose,
  bouquet,
  onPreview,
  onCard,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  bouquet: Bouquet;
  onPreview: (gift: Gift) => void;
  onCard: (to: string, message: string) => void;
  notify: (text: string) => void;
}) {
  const [gift, setGift] = useState<Gift>({ to: "", from: "", message: "" });
  const [sent, setSent] = useState<string | null>(null);
  const set = (patch: Partial<Gift>) => {
    const next = { ...gift, ...patch };
    setGift(next);
    onCard(next.to, next.message);
  };
  const link = pageUrl(bouquet, gift);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const url = whatsappAny(giftMessage(gift, link));
    window.open(url, "_blank", "noopener");
    setSent(url);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      notify("Enlace del regalo copiado");
    } catch {
      notify("No se pudo copiar el enlace");
    }
  };
  const close = () => {
    setSent(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} label="Regalar un ramo digital">
      {sent ? (
        <Done title="¡Regalo enviado!" text="Elige a quién mandárselo en WhatsApp. Al abrir el enlace verá su ramo armándose flor por flor." href={sent} onClose={close} />
      ) : (
        <form className="form" onSubmit={submit}>
          <p className="eyebrow">Ramo digital · gratis</p>
          <h2>Regálalo con un enlace</h2>
          <p className="muted small">Quien lo reciba verá el ramo en 3D con tu mensaje, y podrá pedirlo de verdad si quiere.</p>
          <div className="grid2">
            <label className="field-input">
              <span className="label">Para</span>
              <input required maxLength={40} value={gift.to} onChange={(e) => set({ to: e.target.value })} />
            </label>
            <label className="field-input">
              <span className="label">De</span>
              <input required maxLength={40} value={gift.from} onChange={(e) => set({ from: e.target.value })} />
            </label>
          </div>
          <label className="field-input">
            <span className="label">Mensaje</span>
            <textarea rows={3} maxLength={240} placeholder="Feliz cumpleaños, gracias por todo..." value={gift.message} onChange={(e) => set({ message: e.target.value })} />
          </label>
          <button type="submit" className="cta cta--block">
            <WhatsAppIcon size={19} />
            <span>Enviar por WhatsApp</span>
          </button>
          <div className="row">
            <button type="button" className="btn btn--ghost" onClick={copy}>
              <Icon name="link" size={17} /> Copiar enlace
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onPreview(gift)}>
              <Icon name="gift" size={17} /> Ver cómo llega
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
