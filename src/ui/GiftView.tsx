import { motion } from "motion/react";

import { BRAND } from "../content";
import { totalStems } from "../design";
import type { Bouquet, Gift } from "../design";
import { Icon, RoseMark } from "./icons";

export function GiftView({ gift, bouquet, onOrder, onCreate }: { gift: Gift; bouquet: Bouquet; onOrder: () => void; onCreate: () => void }) {
  return (
    <motion.aside
      className="gift-card glass"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.4, duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
      aria-label="Mensaje del regalo"
    >
      <p className="eyebrow">Un ramo para</p>
      <p className="gift-card__to">{gift.to || "ti"}</p>
      {gift.message && <p className="gift-card__msg">“{gift.message}”</p>}
      {gift.from && <p className="gift-card__from">— {gift.from}</p>}
      <p className="gift-card__meta">
        <RoseMark size={18} /> {totalStems(bouquet)} flores de {BRAND.name}
      </p>
      <div className="gift-card__actions">
        <button type="button" className="cta" onClick={onOrder}>
          <span>Pedirlo de verdad</span>
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCreate}>
          <Icon name="gift" size={17} /> Armar uno
        </button>
      </div>
    </motion.aside>
  );
}
