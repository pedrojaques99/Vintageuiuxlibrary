"use client";

// Adaptado de Hold to confirm — https://uiarc.dev/components/hold-to-confirm — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).

import * as React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
  type Transition,
} from "motion/react";
import { Check, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Hold to Confirm: o botão que só age se você segurar.
 *
 * Diálogo de confirmação pra apagar uma linha que já está na tela é pedágio:
 * a pessoa vê o que vai sumir, clica, e ainda tem que ler um modal que repete
 * o que ela já sabia. Segurar resolve o mesmo risco (o toque sem querer) sem
 * tirar a pessoa do lugar. Quando a consequência NÃO está na tela, use diálogo.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **O rosto é desenhado duas vezes.** Uma cópia na superfície, outra dentro
 *    do preenchimento, recortada por `clip-path`. Assim o texto troca de cor
 *    exatamente na borda do preenchimento, sem `mix-blend` que muda com o tema.
 * 2. **O preenchimento é linear e a volta é mola.** Linear porque é um relógio
 *    (a pessoa precisa prever quando acaba); mola na volta porque soltar é
 *    gesto. Apertar de novo logo depois retoma de onde parou, não do zero.
 * 3. **Nada de `setState` por quadro.** O progresso é um `MotionValue` que
 *    alimenta o recorte direto; o React só renderiza nas trocas de estado.
 * 4. **Teclado segura também.** Espaço ou Enter pressionados enchem; soltar
 *    antes volta. Um texto escondido explica a duração pra leitor de tela, e
 *    o resultado é anunciado num `role="status"`.
 * 5. **Escorregar mais de 24 px pra fora cancela**, como faz o toque nativo.
 *    Sem isso, quem desiste arrastando o dedo pra longe confirma do mesmo jeito.
 */

export interface HoldToConfirmProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "onClick" | "onDrag" | "onDragEnd" | "onDragStart" | "onAnimationStart" | "onAnimationEnd"
  > {
  /** Instrução e ação na mesma frase, como "Segure pra apagar". */
  label: string;
  /** Rótulo depois de confirmado. */
  confirmedLabel?: string;
  /** Roda uma vez quando o preenchimento completa. */
  onConfirm?: () => void;
  /** Quanto tempo segurar, em ms. */
  duration?: number;
  /** Ícone à esquerda; vira um check quando confirma. */
  icon?: React.ReactNode;
  /** Cor do preenchimento: `danger` pra destruir, `brand` pra ação da marca, `neutral` pro resto. */
  tone?: "danger" | "brand" | "neutral";
  /** Controla o estado confirmado. Volte pra `false` pra rearmar (depois de um desfazer, por exemplo). */
  confirmed?: boolean;
  /** Avisa quando começa e termina de segurar, pra uma dica tipo "continue segurando". */
  onHoldChange?: (holding: boolean) => void;
}

const MOLA_FIRME: Transition = { type: "spring", visualDuration: 0.2, bounce: 0.15 };
const MOLA_LISA: Transition = { type: "spring", visualDuration: 0.3, bounce: 0 };
const MOLA_FORMA: Transition = { type: "spring", visualDuration: 0.3, bounce: 0.2 };
// O `--ease-out` da casa, em números, pro motion.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const FOLGA = 24;

const TOM = {
  danger: {
    tinta: "text-destructive",
    borda: "border-destructive/40",
    fundo: "bg-destructive text-destructive-foreground",
  },
  brand: {
    tinta: "text-foreground",
    borda: "border-[var(--brand)]",
    fundo: "bg-[var(--brand)] text-[var(--brand-foreground)]",
  },
  neutral: {
    tinta: "text-foreground",
    borda: "border-border",
    fundo: "bg-foreground text-background",
  },
} as const;

/** A largura do rótulo anda na mola quando o texto troca, pra o botão mudar de forma em vez de saltar. */
function useLarguraDoRotulo(reduzido: boolean) {
  const largura = useMotionValue<number | "auto">("auto");
  const [no, setNo] = React.useState<HTMLSpanElement | null>(null);
  React.useEffect(() => {
    if (!no || typeof ResizeObserver === "undefined") return;
    let ultimo: string | null = null;
    let anim: AnimationPlaybackControls | null = null;
    const obs = new ResizeObserver(([entrada]) => {
      // Largura de layout, não a pintada: o rótulo novo é medido com o botão ainda apertado (escala menor).
      const prox = entrada?.borderBoxSize?.[0]?.inlineSize ?? no.offsetWidth;
      const texto = no.textContent;
      const muda = ultimo !== null && ultimo !== texto && !reduzido && typeof largura.get() === "number";
      ultimo = texto;
      anim?.stop();
      if (muda) anim = animate(largura, prox, MOLA_FORMA);
      else largura.jump(prox);
    });
    obs.observe(no);
    return () => {
      obs.disconnect();
      anim?.stop();
    };
  }, [no, reduzido, largura]);
  return [largura, setNo] as const;
}

function Rosto({
  icon,
  texto,
  feito,
  largura,
  reduzido,
  medir,
}: {
  icon: React.ReactNode;
  texto: string;
  feito: boolean;
  largura: MotionValue<number | "auto">;
  reduzido: boolean;
  medir?: (no: HTMLSpanElement | null) => void;
}) {
  const entra = reduzido ? { opacity: 0 } : { opacity: 0, y: "0.3em", filter: "blur(4px)" };
  const sai = reduzido
    ? { opacity: 0, transition: { duration: 0.12 } }
    : { opacity: 0, y: "-0.3em", filter: "blur(2px)", transition: { duration: 0.16 } };
  const pousa = { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="grid size-[18px] flex-none place-items-center [&_svg]:size-[18px]">
        <AnimatePresence initial={false}>
          <motion.span
            key={feito ? "feito" : "parado"}
            className="col-start-1 row-start-1 grid place-items-center"
            initial={reduzido ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={pousa}
            exit={reduzido ? { opacity: 0 } : { opacity: 0, scale: 0.6, transition: { duration: 0.16 } }}
            transition={reduzido ? { duration: 0.16 } : { ...MOLA_FIRME, opacity: { duration: 0.16 } }}
          >
            {feito ? <Check strokeWidth={2} /> : icon}
          </motion.span>
        </AnimatePresence>
      </span>
      {/* O quadro recorta o rótulo que sai enquanto estreita, com folga pra subida e o desfoque. */}
      <motion.span className="relative inline-flex min-w-0 [clip-path:inset(-0.6em_-3px)]" style={{ width: largura }}>
        {medir && (
          <span ref={medir} className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap">
            {texto}
          </span>
        )}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={texto}
            className="block whitespace-nowrap"
            initial={entra}
            animate={pousa}
            exit={sai}
            transition={{ duration: reduzido ? 0.16 : 0.2, ease: EASE_OUT }}
          >
            {texto}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </span>
  );
}

export function HoldToConfirm({
  label,
  confirmedLabel = "Feito",
  onConfirm,
  duration = 1200,
  icon = <Trash2 strokeWidth={1.75} />,
  tone = "danger",
  confirmed,
  onHoldChange,
  className,
  disabled,
  ...props
}: HoldToConfirmProps) {
  const reduzido = useReducedMotion() ?? false;
  const dicaId = React.useId();
  const [feitoProprio, setFeitoProprio] = React.useState(false);
  const feito = confirmed ?? feitoProprio;
  const [segurando, setSegurando] = React.useState(false);
  const progresso = useMotionValue(0);
  const escala = useMotionValue(1);
  const recorte = useTransform(
    progresso,
    (v) => `inset(0 ${((1 - Math.min(1, Math.max(0, v))) * 100).toFixed(3)}% 0 0)`,
  );
  const [largura, medir] = useLarguraDoRotulo(reduzido);
  const fonte = React.useRef<"ponteiro" | "tecla" | null>(null);
  const tipoPonteiro = React.useRef("mouse");
  const enchendo = React.useRef<AnimationPlaybackControls | null>(null);
  const apertando = React.useRef<AnimationPlaybackControls | null>(null);
  const botao = React.useRef<HTMLButtonElement>(null);
  const texto = feito ? confirmedLabel : label;
  const segundos = (duration / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const tom = TOM[tone];

  function apertar(sim: boolean) {
    apertando.current?.stop();
    if (reduzido) return escala.jump(1);
    // Botão largo afunda menos: 3% de 300 px já é um tranco.
    const fundo = (botao.current?.offsetWidth ?? 0) > 220 ? 0.985 : 0.97;
    apertando.current = animate(escala, sim ? fundo : 1, MOLA_FIRME);
  }

  function rebobinar() {
    enchendo.current?.stop();
    if (reduzido) progresso.jump(0);
    else enchendo.current = animate(progresso, 0, { ...MOLA_LISA, velocity: 0 });
  }

  function largar() {
    fonte.current = null;
    setSegurando(false);
    onHoldChange?.(false);
    apertar(false);
  }

  function completar() {
    if (!fonte.current) return;
    largar();
    if (tipoPonteiro.current === "touch") navigator.vibrate?.(12);
    setFeitoProprio(true);
    onConfirm?.();
  }

  function comecar(de: "ponteiro" | "tecla") {
    if (feito || disabled || fonte.current) return;
    fonte.current = de;
    setSegurando(true);
    onHoldChange?.(true);
    apertar(true);
    enchendo.current?.stop();
    // Retoma do ponto atual: o tempo que falta é proporcional ao que falta encher.
    enchendo.current = animate(progresso, 1, {
      duration: ((1 - progresso.get()) * duration) / 1000,
      ease: "linear",
      onComplete: completar,
    });
  }

  function soltar() {
    if (!fonte.current) return;
    largar();
    rebobinar();
  }

  // Quem controla de fora pode rearmar (volta a false) ou marcar feito: o preenchimento acompanha.
  const sincronizar = React.useRef(() => {});
  sincronizar.current = () => {
    if (fonte.current) return;
    if (feito && progresso.get() < 1) {
      enchendo.current?.stop();
      if (reduzido) progresso.jump(1);
      else enchendo.current = animate(progresso, 1, MOLA_LISA);
    }
    if (!feito && progresso.get() > 0) rebobinar();
  };
  React.useEffect(() => sincronizar.current(), [feito]);
  React.useEffect(
    () => () => {
      enchendo.current?.stop();
      apertando.current?.stop();
    },
    [],
  );

  const rosto = { icon, texto, feito, largura, reduzido };

  return (
    <>
      <motion.button
        {...props}
        ref={botao}
        type="button"
        data-state={feito ? "done" : segurando ? "holding" : "idle"}
        disabled={disabled}
        aria-disabled={feito || undefined}
        aria-label={texto}
        aria-describedby={feito ? undefined : dicaId}
        style={{ scale: escala }}
        onPointerDown={(e) => {
          if (!e.isPrimary || e.button !== 0) return;
          tipoPonteiro.current = e.pointerType;
          e.currentTarget.setPointerCapture(e.pointerId);
          comecar("ponteiro");
        }}
        onPointerMove={(e) => {
          if (fonte.current !== "ponteiro") return;
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left - FOLGA || e.clientX > r.right + FOLGA ||
            e.clientY < r.top - FOLGA || e.clientY > r.bottom + FOLGA
          )
            soltar();
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onLostPointerCapture={soltar}
        onKeyDown={(e) => {
          if (e.key !== " " && e.key !== "Enter") return;
          e.preventDefault();
          if (!e.repeat) comecar("tecla");
        }}
        onKeyUp={(e) => {
          if (e.key !== " " && e.key !== "Enter") return;
          e.preventDefault();
          if (fonte.current === "tecla") soltar();
        }}
        onBlur={soltar}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "relative inline-flex h-10 select-none items-center justify-center rounded-[var(--r-control)] border bg-card px-5 text-sm font-medium outline-none [-webkit-touch-callout:none] [touch-action:manipulation]",
          "transition-[background-color,opacity] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
          "focus-visible:[box-shadow:var(--focus)] disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-default",
          "hover:bg-muted disabled:hover:bg-card aria-disabled:hover:bg-card",
          tom.tinta,
          tom.borda,
          className,
        )}
      >
        <Rosto {...rosto} medir={medir} />
        {/* Cobre a borda também (inset -1px) e mantém o próprio raio; o recorte só corta a borda da frente. */}
        <motion.span
          aria-hidden="true"
          className={cn("pointer-events-none absolute -inset-px flex items-center justify-center rounded-[var(--r-control)]", tom.fundo)}
          style={{ clipPath: recorte }}
        >
          <Rosto {...rosto} />
        </motion.span>
      </motion.button>
      <span id={dicaId} className="sr-only">
        {`Segure por ${segundos} s pra confirmar. No teclado, segure Espaço ou Enter.`}
      </span>
      <span className="sr-only" role="status">
        {feito ? confirmedLabel : ""}
      </span>
    </>
  );
}

export default HoldToConfirm;
