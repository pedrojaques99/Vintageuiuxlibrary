"use client";

import * as React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Eye Tracker: um rosto de dois olhos que acompanha o cursor e o foco.
 *
 * É mascote de estado vazio, de tela de login, de 404: um ponto de vida numa
 * área que de outro jeito seria só texto. O valor está em parecer atento, então
 * ele olha pra onde a pessoa está agindo, não só pra onde o mouse passa.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **Segue o foco do teclado também.** Quem navega com Tab não move mouse
 *    nenhum; sem isso o rosto fica parado pra essa pessoa. O alvo é o último
 *    que mexeu: ponteiro ou `focusin`, o que vier depois.
 * 2. **Os olhos andam juntos e o rosto inclina.** Olho independente vira
 *    estrábico de perto. O par anda como um bloco dentro do rosto, e o rosto
 *    gira um pouco em 3D na mesma direção: lê como cabeça virando, não como
 *    pupila solta.
 * 3. **Distância vira intensidade, com teto.** Cursor colado no rosto mexe
 *    pouco; a partir de ~260 px de tela o olhar está no máximo. Só a direção
 *    vem do retângulo de tela, então a escala da vitrine não distorce nada.
 * 4. **Piscada em intervalo sorteado** (2,5 a 5,5 s). Intervalo fixo é o que
 *    denuncia o robô. Com `prefers-reduced-motion` não pisca e o olhar salta
 *    pro alvo sem viagem.
 * 5. **Clique ou Enter cumprimenta.** Os olhos voltam pra frente, apertam
 *    num sorriso e um balão escreve o `greeting`; um `role="status"` lê a
 *    mesma frase.
 * 6. **Rosto e olho são props separadas.** `face` troca o corpo (cartão, orbe,
 *    vidro sobre um fundo vivo, cor da marca) e `eyes` troca o olhar. Com
 *    `pupil` a pupila corre um pouco a mais que o globo, o que dá profundidade
 *    sem precisar de 3D de verdade.
 */

export interface EyeTrackerProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart" | "onAnimationEnd"> {
  /** Lado do rosto, em px. */
  size?: number;
  /** Forma dos olhos. */
  eyes?: "slant" | "dots" | "bars" | "pupil";
  /** Corpo do rosto. `glass` foi feito pra ficar por cima de um fundo vivo. */
  face?: "card" | "orb" | "glass" | "brand";
  /** Quanto os olhos andam, de 0 a 1 (fração do meio rosto). */
  follow?: number;
  /** Pisca sozinho de vez em quando. */
  blink?: boolean;
  /** O que o balão escreve no clique. Vazio desliga o cumprimento. */
  greeting?: string;
}

const MOLA = { stiffness: 260, damping: 22, mass: 0.6 };
const ALCANCE = 260;

const OLHO = {
  slant: "h-[14%] w-[7%] rounded-[var(--r-pill)] -rotate-[18deg]",
  dots: "size-[10%] rounded-[var(--r-pill)]",
  bars: "h-[16%] w-[6%] rounded-[2px]",
  pupil: "grid size-[22%] place-items-center rounded-full",
} as const;

const ROSTO = {
  card: "rounded-[var(--r-surface)] border border-border bg-card [box-shadow:var(--e-raised)]",
  orb: "rounded-full border border-border bg-card [background-image:radial-gradient(circle_at_32%_28%,color-mix(in_oklab,var(--foreground)_12%,transparent),transparent_60%)] [box-shadow:var(--e-raised),inset_0_-10px_24px_-12px_color-mix(in_oklab,var(--foreground)_30%,transparent)]",
  glass:
    "rounded-[var(--r-surface)] border border-[color-mix(in_oklab,var(--foreground)_18%,transparent)] bg-[color-mix(in_oklab,var(--card)_45%,transparent)] backdrop-blur-md [box-shadow:var(--e-raised),inset_0_1px_0_color-mix(in_oklab,var(--foreground)_14%,transparent)]",
  brand: "rounded-[var(--r-surface)] bg-[var(--brand)] [box-shadow:var(--e-raised)]",
} as const;

export function EyeTracker({
  size = 112,
  eyes = "slant",
  face = "card",
  follow = 0.6,
  blink = true,
  greeting = "Oi, tudo bem?",
  className,
  onClick,
  style,
  ...props
}: EyeTrackerProps) {
  const reduzido = useReducedMotion() ?? false;
  const rosto = React.useRef<HTMLButtonElement>(null);
  const alvoX = useMotionValue(0);
  const alvoY = useMotionValue(0);
  const molaX = useSpring(alvoX, MOLA);
  const molaY = useSpring(alvoY, MOLA);
  const olhoX = reduzido ? alvoX : molaX;
  const olhoY = reduzido ? alvoY : molaY;
  const giroY = useTransform(olhoX, (v) => v * 0.5);
  const giroX = useTransform(olhoY, (v) => -v * 0.5);
  // A pupila anda mais um tanto dentro do globo.
  const pupilaX = useTransform(olhoX, (v) => v * 0.35);
  const pupilaY = useTransform(olhoY, (v) => v * 0.35);
  const palpebra = useMotionValue(1);
  const [falando, setFalando] = React.useState(false);
  const [escrito, setEscrito] = React.useState("");
  const falandoRef = React.useRef(false);

  // Meio rosto vezes `follow`: o teto do passeio em px locais.
  const teto = (size / 2) * Math.min(1, Math.max(0, follow)) * 0.55;

  const olharPara = React.useCallback(
    (px: number, py: number) => {
      const el = rosto.current;
      if (!el || falandoRef.current) return;
      const r = el.getBoundingClientRect();
      const dx = px - (r.left + r.width / 2);
      const dy = py - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d < 1) return;
      const forca = Math.min(1, d / ALCANCE) * teto;
      alvoX.set((dx / d) * forca);
      alvoY.set((dy / d) * forca);
    },
    [alvoX, alvoY, teto],
  );

  React.useEffect(() => {
    const mover = (e: PointerEvent) => olharPara(e.clientX, e.clientY);
    const focar = (e: FocusEvent) => {
      const t = e.target;
      if (!(t instanceof Element) || t === rosto.current) return;
      const r = t.getBoundingClientRect();
      olharPara(r.left + r.width / 2, r.top + r.height / 2);
    };
    const sair = () => {
      if (falandoRef.current) return;
      alvoX.set(0);
      alvoY.set(0);
    };
    window.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("focusin", focar);
    document.documentElement.addEventListener("pointerleave", sair);
    return () => {
      window.removeEventListener("pointermove", mover);
      document.removeEventListener("focusin", focar);
      document.documentElement.removeEventListener("pointerleave", sair);
    };
  }, [olharPara, alvoX, alvoY]);

  // Piscada: um quadro curto fechando e abrindo, em intervalo sorteado.
  React.useEffect(() => {
    if (!blink || reduzido) return;
    let timer = 0;
    const agendar = () => {
      timer = window.setTimeout(() => {
        animate(palpebra, [1, 0.1, 1], { duration: 0.16, times: [0, 0.4, 1], ease: "easeInOut" });
        agendar();
      }, 2500 + Math.random() * 3000);
    };
    agendar();
    return () => window.clearTimeout(timer);
  }, [blink, reduzido, palpebra]);

  // O balão escreve uma letra por vez e some depois de um respiro.
  React.useEffect(() => {
    if (!falando) return;
    let i = 0;
    const passo = reduzido ? greeting.length : 1;
    const tic = window.setInterval(() => {
      i = Math.min(greeting.length, i + passo);
      setEscrito(greeting.slice(0, i));
      if (i >= greeting.length) window.clearInterval(tic);
    }, 55);
    const fim = window.setTimeout(() => {
      falandoRef.current = false;
      setFalando(false);
    }, greeting.length * 55 + 1600);
    return () => {
      window.clearInterval(tic);
      window.clearTimeout(fim);
    };
  }, [falando, greeting, reduzido]);

  function cumprimentar() {
    if (!greeting || falandoRef.current) return;
    falandoRef.current = true;
    alvoX.set(0);
    alvoY.set(0);
    setEscrito("");
    setFalando(true);
  }

  // Falando, os olhos apertam: o sorriso que um rosto sem boca consegue dar.
  React.useEffect(() => {
    if (!falando) return;
    if (reduzido) return;
    animate(palpebra, 0.45, { duration: 0.18, ease: "easeOut" });
    return () => {
      animate(palpebra, 1, { duration: 0.18, ease: "easeOut" });
    };
  }, [falando, reduzido, palpebra]);

  const corOlho = face === "brand" ? "bg-[var(--brand-foreground)]" : "bg-foreground";
  const olho = (
    <span className={cn("block", corOlho, OLHO[eyes])}>
      {eyes === "pupil" && (
        <motion.span
          className={cn(
            "block size-[46%] rounded-full",
            face === "brand" ? "bg-[var(--brand)]" : "bg-background",
          )}
          style={{ x: pupilaX, y: pupilaY }}
        />
      )}
    </span>
  );

  return (
    <span className="relative inline-flex [perspective:600px]">
      <motion.button
        {...props}
        ref={rosto}
        type="button"
        aria-label={greeting ? `Mascote. Clique pra ele dizer "${greeting}"` : "Mascote"}
        onClick={(e) => {
          onClick?.(e);
          cumprimentar();
        }}
        style={{ ...style, width: size, height: size, rotateX: giroX, rotateY: giroY }}
        className={cn(
          "relative grid cursor-pointer place-items-center outline-none [font:inherit] focus-visible:[box-shadow:var(--focus)]",
          ROSTO[face],
          className,
        )}
      >
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center gap-[16%]"
          style={{ x: olhoX, y: olhoY, scaleY: palpebra }}
        >
          {olho}
          {olho}
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {falando && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute left-[78%] top-[72%] whitespace-nowrap rounded-[var(--r-pill)] bg-[var(--brand)] px-3 py-1 text-xs font-medium text-[var(--brand-foreground)] [box-shadow:var(--e-raised)]"
            initial={reduzido ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.16 } }}
            transition={reduzido ? { duration: 0.16 } : { type: "spring", visualDuration: 0.25, bounce: 0.3 }}
            style={{ transformOrigin: "0% 0%" }}
          >
            {escrito || " "}
          </motion.span>
        )}
      </AnimatePresence>

      <span className="sr-only" role="status">
        {falando ? greeting : ""}
      </span>
    </span>
  );
}

export default EyeTracker;
