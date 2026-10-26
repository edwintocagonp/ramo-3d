import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";

import { ARRANGEMENTS, BRAND } from "./content";
import { decodeHash, encodeBouquet, leadColor, pageUrl, totalStems } from "./design";
import type { Bouquet, Gift } from "./design";
import type { Insets } from "./scene/Stage";
import { GiftDialog, OrderDialog } from "./ui/Dialogs";
import { GiftView } from "./ui/GiftView";
import { Icon, RoseMark } from "./ui/icons";
import { Loader } from "./ui/Loader";
import { Panel } from "./ui/Panel";

const Stage = lazy(() => import("./scene/Stage"));

type Theme = "light" | "dark";

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("ramo-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useInsets(panel: RefObject<HTMLElement | null>, gift: boolean): Insets {
  const [insets, setInsets] = useState<Insets>({ left: 0, right: 0, bottom: 0 });
  useEffect(() => {
    const measure = () => {
      const wide = window.matchMedia("(min-width: 900px)").matches;
      if (!wide) setInsets({ left: 0, right: 0, bottom: Math.round(window.innerHeight * (gift ? 0.4 : 0.46)) });
      else if (gift) setInsets({ left: 0, right: 460, bottom: 0 });
      else setInsets({ left: (panel.current?.offsetWidth ?? 420) + 16, right: 0, bottom: 0 });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [panel, gift]);
  return insets;
}

export default function App() {
  const [initial] = useState(() => decodeHash(window.location.hash));
  const [bouquet, setBouquet] = useState<Bouquet>(initial.bouquet);
  const [gift, setGift] = useState<Gift | null>(initial.gift);
  const [card, setCard] = useState({ to: initial.gift?.to ?? "", message: initial.gift?.message ?? "" });
  const [ordering, setOrdering] = useState(false);
  const [gifting, setGifting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reset, setReset] = useState(0);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [stageReady, setStageReady] = useState(false);
  const [intro, setIntro] = useState(true);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const panel = useRef<HTMLElement>(null);
  const insets = useInsets(panel, !!gift);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#140c0f" : "#f4ece3");
    try {
      localStorage.setItem("ramo-theme", theme);
    } catch {
    }
  }, [theme]);

  useEffect(() => {
    const id = setTimeout(() => history.replaceState(null, "", `#${encodeBouquet(bouquet, gift ?? undefined)}`), 250);
    return () => clearTimeout(id);
  }, [bouquet, gift]);

  useEffect(() => {
    if (!stageReady) return;
    const id = setTimeout(() => setIntro(false), Math.max(0, 1200 - performance.now()));
    return () => clearTimeout(id);
  }, [stageReady]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOrdering(false);
      setGifting(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const notify = (text: string) => setToast({ id: Date.now(), text });
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  const share = async () => {
    const url = pageUrl(bouquet, gift ?? undefined);
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: BRAND.name, text: "Mira este ramo en 3D", url });
      } catch {
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      notify("Enlace copiado: abre este mismo ramo");
    } catch {
      notify("No se pudo copiar el enlace");
    }
  };

  const download = () => {
    const canvas = document.querySelector<HTMLCanvasElement>(".stage canvas");
    if (!canvas) return;
    const ratio = canvas.width / canvas.clientWidth;
    const x = Math.round(insets.left * ratio);
    const w = Math.round((canvas.clientWidth - insets.left - insets.right) * ratio);
    const h = Math.round((canvas.clientHeight - insets.bottom) * ratio);
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(canvas, x, 0, w, h, 0, 0, w, h);
    ctx.font = `italic ${Math.round(15 * ratio)}px "Bodoni Moda Variable", serif`;
    ctx.fillStyle = "rgba(42,26,23,0.7)";
    ctx.textAlign = "right";
    ctx.fillText(BRAND.name, w - 18 * ratio, h - 18 * ratio);
    out.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mi-ramo.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      notify("Imagen descargada");
    }, "image/png");
  };

  const lead = leadColor(bouquet);
  const vars = { "--accent": lead } as CSSProperties;
  const arrangement = ARRANGEMENTS.find((a) => a.id === bouquet.arrangement)?.name;

  return (
    <div className={`app${gift ? " is-gift" : ""}`} style={vars}>
      <div className="stage-wrap">
        <Suspense fallback={null}>
          <Stage
            bouquet={bouquet}
            card={card}
            tint={lead}
            dark={theme === "dark"}
            insets={insets}
            reset={reset}
            reveal={!!gift}
            onReady={() => setStageReady(true)}
          />
        </Suspense>
      </div>

      <motion.header className="topbar" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}>
        <a className="brand glass" href="./" aria-label={`${BRAND.name}, inicio`}>
          <RoseMark />
          <span className="brand__name">{BRAND.name}</span>
          <span className="brand__sub">{BRAND.tagline}</span>
        </a>
        <div className="tools glass">
          <button
            type="button"
            className="tool"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={19} />
          </button>
          <button type="button" className="tool" onClick={() => setReset((n) => n + 1)} aria-label="Centrar la vista" title="Centrar la vista">
            <Icon name="focus" size={19} />
          </button>
          <button type="button" className="tool" onClick={share} aria-label="Compartir" title="Compartir">
            <Icon name="share" size={19} />
          </button>
          <button type="button" className="tool" onClick={download} aria-label="Descargar imagen" title="Descargar imagen">
            <Icon name="camera" size={19} />
          </button>
        </div>
      </motion.header>

      {!gift && (
        <div className="hud" aria-hidden="true">
          <span className="hud__count">{totalStems(bouquet)}</span>
          <span>
            flores · {arrangement?.toLowerCase()}
            <br />
            <span className="hud__hint">Arrastra para girar el ramo</span>
          </span>
        </div>
      )}

      {gift ? (
        <GiftView
          gift={gift}
          bouquet={bouquet}
          onOrder={() => {
            setGift(null);
            setOrdering(true);
          }}
          onCreate={() => setGift(null)}
        />
      ) : (
        <Panel
          bouquet={bouquet}
          onChange={setBouquet}
          onOrder={() => setOrdering(true)}
          onGift={() => setGifting(true)}
          open={sheetOpen}
          onToggle={() => setSheetOpen((v) => !v)}
          panelRef={panel}
        />
      )}

      <OrderDialog open={ordering} onClose={() => setOrdering(false)} bouquet={bouquet} onCard={(to, message) => setCard({ to, message })} />
      <GiftDialog
        open={gifting}
        onClose={() => setGifting(false)}
        bouquet={bouquet}
        notify={notify}
        onCard={(to, message) => setCard({ to, message })}
        onPreview={(g) => {
          setGifting(false);
          setGift(g);
        }}
      />

      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast.id}
            className="toast glass"
            role="status"
            initial={{ opacity: 0, y: 16, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
          >
            {toast.text}
          </motion.p>
        )}
      </AnimatePresence>

      <Loader visible={intro} gift={!!gift} />
    </div>
  );
}
