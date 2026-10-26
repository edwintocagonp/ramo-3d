import type { CSSProperties, ReactNode, Ref } from "react";
import { motion } from "motion/react";

import { ARRANGEMENTS, EXTRAS, FILLER, MAX_STEMS, PAPERS, PRESETS, RIBBONS, VARIANTS } from "../content";
import type { Swatch, Variant } from "../content";
import { fromPreset, setCount, toggleExtra, totalStems } from "../design";
import type { Bouquet } from "../design";
import { computeQuote, money } from "../quote";
import { Icon, WhatsAppIcon } from "./icons";
import { Ticker } from "./Ticker";

type PanelProps = {
  bouquet: Bouquet;
  onChange: (b: Bouquet) => void;
  onOrder: () => void;
  onGift: () => void;
  open: boolean;
  onToggle: () => void;
  panelRef: Ref<HTMLElement>;
};

function Section({ index, title, aside, children }: { index: number; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      className="section"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.06, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <header className="section__head">
        <h2>
          <span className="section__num">{String(index + 1).padStart(2, "0")}</span>
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </motion.section>
  );
}

const dotStyle = (v: Variant) =>
  ({ "--c": v.colors.length > 1 ? `conic-gradient(${v.colors.join(", ")}, ${v.colors[0]})` : v.colors[0] }) as CSSProperties;

function Swatches({ label, options, value, onPick }: { label: string; options: Swatch[]; value: string; onPick: (id: string) => void }) {
  const current = options.find((o) => o.id === value) ?? options[0];
  return (
    <div className="field">
      <div className="field__head">
        <span className="label">{label}</span>
        <span className="field__value">{current.name}</span>
      </div>
      <div className="swatches" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === current.id}
            aria-label={o.name}
            title={o.name}
            className="swatch"
            style={{ "--c": o.hex } as CSSProperties}
            onClick={() => onPick(o.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function Panel({ bouquet, onChange, onOrder, onGift, open, onToggle, panelRef }: PanelProps) {
  const stems = totalStems(bouquet);
  const quote = computeQuote(bouquet);
  const set = (patch: Partial<Bouquet>) => onChange({ ...bouquet, ...patch });
  const groups = [
    { title: "Rosas", items: VARIANTS.filter((v) => v.kind === "rose") },
    { title: "Girasoles y hortensias", items: VARIANTS.filter((v) => v.kind !== "rose") },
  ];

  return (
    <aside ref={panelRef} className={`panel glass${open ? " is-open" : ""}`} aria-label="Arma tu ramo">
      <button type="button" className="panel__handle" onClick={onToggle} aria-expanded={open}>
        <span className="panel__grip" />
        <span>{open ? "Ver el ramo" : "Personalizar"}</span>
        <Icon name="chevron" size={16} />
      </button>

      <div className="panel__scroll">
        <motion.div className="panel__intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}>
          <p className="eyebrow">Arma tu ramo · 3D</p>
          <h1>
            Rosas de altura, <em>a tu manera</em>
          </h1>
          <p className="muted">Elige las flores, el papel y los detalles. Lo pides tal cual por WhatsApp o lo regalas como un ramo digital.</p>
        </motion.div>

        <Section index={0} title="Empieza con un estilo">
          <div className="presets">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" className="preset" onClick={() => onChange(fromPreset(p, bouquet))}>
                {p.name}
              </button>
            ))}
          </div>
        </Section>

        <Section
          index={1}
          title="Flores"
          aside={
            <span className="pill mono">
              {stems}/{MAX_STEMS} tallos
            </span>
          }
        >
          <div className="meter" aria-hidden="true">
            <span style={{ transform: `scaleX(${stems / MAX_STEMS})` }} />
          </div>
          {groups.map((g) => (
            <div key={g.title} className="flower-group">
              <p className="label">{g.title}</p>
              <ul className="flowers">
                {g.items.map((v) => {
                  const n = bouquet.counts[v.id] ?? 0;
                  return (
                    <li key={v.id} className={n ? "is-on" : ""}>
                      <span className="flower-dot" style={dotStyle(v)} />
                      <span className="flower-name">
                        {v.name}
                        <small className="mono">{money(v.price)} c/u</small>
                      </span>
                      <span className="stepper">
                        <button type="button" aria-label={`Quitar ${v.name}`} disabled={!n} onClick={() => onChange(setCount(bouquet, v.id, n - 1))}>
                          <Icon name="minus" size={16} />
                        </button>
                        <output className="mono" aria-live="polite">
                          {n}
                        </output>
                        <button
                          type="button"
                          aria-label={`Agregar ${v.name}`}
                          disabled={n >= v.max || stems >= MAX_STEMS}
                          onClick={() => onChange(setCount(bouquet, v.id, n + 1))}
                        >
                          <Icon name="plus" size={16} />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </Section>

        <Section index={2} title="Arreglo">
          <div className="segmented" role="radiogroup" aria-label="Arreglo">
            {ARRANGEMENTS.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={bouquet.arrangement === a.id} onClick={() => set({ arrangement: a.id })}>
                {bouquet.arrangement === a.id && <motion.span layoutId="arr" className="segmented__thumb" transition={{ type: "spring", bounce: 0.2, duration: 0.45 }} />}
                <span>{a.name}</span>
              </button>
            ))}
          </div>
          <p className="muted small">{ARRANGEMENTS.find((a) => a.id === bouquet.arrangement)?.hint}</p>
        </Section>

        <Section index={3} title="Relleno y follaje">
          <div className="field">
            <div className="field__head">
              <span className="label">{FILLER.name} (flor de nube)</span>
            </div>
            <div className="segmented" role="radiogroup" aria-label={FILLER.name}>
              {FILLER.levels.map((l) => (
                <button key={l.id} type="button" role="radio" aria-checked={bouquet.filler === l.id} onClick={() => set({ filler: l.id })}>
                  {bouquet.filler === l.id && <motion.span layoutId="fill" className="segmented__thumb" transition={{ type: "spring", bounce: 0.2, duration: 0.45 }} />}
                  <span>
                    {l.name}
                    {l.price ? <small className="mono"> +{money(l.price)}</small> : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={bouquet.eucalyptus} onChange={(e) => set({ eucalyptus: e.target.checked })} />
            <span className="toggle__track" />
            {FILLER.eucalyptus.name} <small className="mono muted">+{money(FILLER.eucalyptus.price)}</small>
          </label>
        </Section>

        <Section index={4} title="Envoltura">
          <Swatches label="Papel de afuera" options={PAPERS} value={bouquet.paper[0]} onPick={(id) => set({ paper: [id, bouquet.paper[1]] })} />
          <Swatches label="Papel de adentro" options={PAPERS} value={bouquet.paper[1]} onPick={(id) => set({ paper: [bouquet.paper[0], id] })} />
          <Swatches label="Lazo de satín" options={RIBBONS} value={bouquet.ribbon} onPick={(ribbon) => set({ ribbon })} />
        </Section>

        <Section index={5} title="Detalles">
          <div className="extras">
            {EXTRAS.map((e) => {
              const on = bouquet.extras.includes(e.id);
              return (
                <button key={e.id} type="button" className="extra" aria-pressed={on} onClick={() => onChange(toggleExtra(bouquet, e.id))}>
                  <Icon name={e.id} size={22} />
                  <span className="extra__name">{e.name}</span>
                  <span className="extra__price mono">{e.price ? `+${money(e.price)}` : "Gratis"}</span>
                  <span className="extra__check" aria-hidden="true">
                    <Icon name="check" size={13} />
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section index={6} title="Resumen" aside={<span className="pill">Referencial</span>}>
          <ul className="quote">
            {quote.lines.map((l) => (
              <li key={l.label}>
                <span>
                  {l.label}
                  <small className="mono">{l.detail}</small>
                </span>
                <span className="mono">{l.amount ? money(l.amount) : "Gratis"}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">El envío se calcula al pedir, según tu zona de Quito.</p>
        </Section>
      </div>

      <footer className="panel__footer">
        <div className="total">
          <span className="total__label">Total</span>
          <Ticker value={quote.total} format={money} />
        </div>
        <button type="button" className="btn btn--ghost" onClick={onGift} disabled={!stems}>
          <Icon name="gift" size={18} />
          <span>Regalar</span>
        </button>
        <button type="button" className="cta" onClick={onOrder} disabled={!stems}>
          <WhatsAppIcon size={19} />
          <span>Pedir</span>
        </button>
      </footer>
    </aside>
  );
}
