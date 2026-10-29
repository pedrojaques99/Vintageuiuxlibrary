"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
  type Transition,
} from "motion/react";
import { ArrowRight, Check } from "lucide-react";

import { playSfx } from "@/lib/sfx-bus";
import { cn } from "@/lib/utils";

/**
 * Slide to Confirm: o trilho que só confirma quando o polegar chega ao fim.
 *
 * Serve pra ação que custa caro e não volta (pagar, publicar, encerrar turno)
 * quando a consequência já está escrita na tela. Um clique comum acontece sem
 * querer; arrastar 250 px na direção certa, não. É o mesmo problema do
 * `hold-to-confirm`, resolvido com distância em vez de tempo: aqui a pessoa vê
 * o quanto falta, e pode desistir no meio sem pensar.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **Passou da marca, o trilho termina sozinho.** Exigir o último pixel faz o
 *    dedo errar por pouco e voltar tudo. A partir de `threshold` (85%) soltar
 *    completa com mola; antes disso, a mola devolve o polegar pro começo.
 * 2. **Resistência nas pontas.** Dentro do trilho o polegar segue o dedo 1:1
 *    (é um ponteiro, não uma mola). Além das pontas ele cede só um pouco, o
 *    bastante pra dizer "acabou aqui" sem parecer travado.
 * 3. **A medida é local, não de tela.** A vitrine e muito layout de cliente
 *    escalam por `transform`; `getBoundingClientRect` vem encolhido. O curso do
 *    polegar sai de `offsetWidth`, e o delta do ponteiro é dividido pela escala.
 * 4. **O rótulo some com o progresso**, não com um tempo: na metade ele já está
 *    quase apagado, então o trilho lê "falta pouco" sem texto novo.
 * 5. **Teclado anda o mesmo trilho.** O polegar é um `slider`: setas andam um
 *    quarto, End vai ao fim, Esc volta. Parado no meio, ele volta sozinho em
 *    1,2 s, como o dedo que solta. Chegar a 100% confirma.
 */

export interface SlideToConfirmProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "children"> {
  /** Instrução no trilho, como "Deslize pra pagar". */
  label?: string;
  /** Rótulo depois de confirmado. */
  confirmedLabel?: string;
  /** Roda uma vez quando o polegar chega ao fim. */
  onConfirm?: () => void;
  /** Fração do curso (0 a 1) a partir da qual soltar completa sozinho. */
  threshold?: number;
  /** Cor do polegar e do rastro: `brand`, `neutral` ou `danger` pra destruir. */
  tone?: "brand" | "neutral" | "danger";
  /**
   * Cor do trilho depois de confirmado. `success` (padrão) pinta polegar e
   * rastro de aprovação, lido do token `--success` com verde de reserva;
   * `tone` mantém a cor de antes.
   */
  doneTone?: "success" | "tone";
  /** Controla o estado confirmado. Volte pra `false` pra rearmar o trilho. */
  confirmed?: boolean;
  disabled?: boolean;
}

const MOLA_VOLTA: Transition = { type: "spring", visualDuration: 0.3, bounce: 0.25 };
const MOLA_FIM: Transition = { type: "spring", visualDuration: 0.25, bounce: 0 };
const CEDE = 0.15; // quanto o polegar anda além das pontas, por px de dedo
const PASSO = 0.25;
const VOLTA_TECLA = 1200;

const TOM = {
  brand: "bg-[var(--brand)] text-[var(--brand-foreground)]",
  neutral: "bg-foreground text-background",
  danger: "bg-destructive text-destructive-foreground",
} as const;

// A tinta do rótulo final, que pousa sobre o rastro já cheio.
const TINTA = {
  brand: "text-[var(--brand-foreground)]",
  neutral: "text-background",
  danger: "text-destructive-foreground",
} as const;

// Aprovado: token do tema quando existe, verde da paleta do Tailwind quando não.
const APROVADO =
  "bg-[var(--success,var(--color-emerald-600))] text-[var(--success-foreground,var(--color-white))]";
const TINTA_APROVADO = "text-[var(--success-foreground,var(--color-white))]";
// A troca de cor no fim é resposta ao gesto: curta, só a cor.
const TROCA_COR =
  "transition-[background-color,color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]";

export function SlideToConfirm({
  label = "Deslize pra confirmar",
  confirmedLabel = "Confirmado",
  onConfirm,
  threshold = 0.85,
  tone = "neutral",
  doneTone = "success",
  confirmed,
  disabled = false,
  className,
  ...props
}: SlideToConfirmProps) {
  const reduzido = useReducedMotion() ?? false;
  const [feitoProprio, setFeitoProprio] = React.useState(false);
  const feito = confirmed ?? feitoProprio;
  const [arrastando, setArrastando] = React.useState(false);
  const [valor, setValor] = React.useState(0); // só pro aria, em %

  const trilho = React.useRef<HTMLDivElement>(null);
  const polegar = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const curso = React.useRef(0);
  const gesto = React.useRef<{ id: number; inicioX: number; base: number; escala: number } | null>(null);
  const anim = React.useRef<AnimationPlaybackControls | null>(null);
  const voltaTimer = React.useRef(0);

  // Curso = trilho menos o polegar menos o respiro de 4 px de cada lado, em px locais.
  const medir = React.useCallback(() => {
    const t = trilho.current;
    const p = polegar.current;
    if (!t || !p) return 0;
    curso.current = Math.max(0, t.offsetWidth - p.offsetWidth - 8);
    return curso.current;
  }, []);

  const progresso = useTransform(x, (v) => (curso.current ? Math.min(1, Math.max(0, v / curso.current)) : 0));
  const rotuloOpacidade = useTransform(progresso, [0, 0.6], [1, 0]);
  const rastro = useTransform(x, (v) => `calc(${Math.max(0, v)}px + var(--slide-thumb))`);

  function ir(alvo: number, mola: Transition, depois?: () => void) {
    anim.current?.stop();
    if (reduzido) {
      x.jump(alvo);
      depois?.();
      return;
    }
    anim.current = animate(x, alvo, { ...mola, onComplete: depois });
  }

  function confirmar() {
    window.clearTimeout(voltaTimer.current);
    setValor(100);
    // Obturador armando e soltando: o fim do trilho tem som próprio.
    playSfx("complete");
    setFeitoProprio(true);
    onConfirm?.();
  }

  function voltar() {
    setValor(0);
    ir(0, MOLA_VOLTA);
  }

  // Rearme por fora e mudança de tamanho: o polegar acompanha o estado, não o contrário.
  React.useEffect(() => {
    const t = trilho.current;
    if (!t) return;
    const ro = new ResizeObserver(() => {
      const c = medir();
      if (!gesto.current) x.jump(feito ? c : 0);
    });
    ro.observe(t);
    return () => ro.disconnect();
  }, [feito, medir, x]);

  React.useEffect(() => {
    const c = medir();
    if (gesto.current) return;
    if (feito) ir(c, MOLA_FIM);
    else if (x.get() !== 0) voltar();
    setValor(feito ? 100 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feito]);

  React.useEffect(
    () => () => {
      anim.current?.stop();
      window.clearTimeout(voltaTimer.current);
    },
    [],
  );

  const parado = feito || disabled;
  const aprovado = feito && doneTone === "success";
  const cor = aprovado ? APROVADO : TOM[tone];

  function soltar() {
    const g = gesto.current;
    if (!g) return;
    gesto.current = null;
    setArrastando(false);
    const c = curso.current;
    if (c && x.get() >= c * threshold) ir(c, MOLA_FIM, confirmar);
    else voltar();
  }

  function teclar(e: React.KeyboardEvent<HTMLDivElement>) {
    if (parado) return;
    const c = medir();
    const atual = c ? x.get() / c : 0;
    let prox: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") prox = Math.min(1, atual + PASSO);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") prox = Math.max(0, atual - PASSO);
    else if (e.key === "End") prox = 1;
    else if (e.key === "Home" || e.key === "Escape") prox = 0;
    if (prox === null) return;
    e.preventDefault();
    window.clearTimeout(voltaTimer.current);
    setValor(Math.round(prox * 100));
    if (prox >= 1) {
      ir(c, MOLA_FIM, confirmar);
      return;
    }
    ir(prox * c, MOLA_FIM);
    if (prox > 0) voltaTimer.current = window.setTimeout(voltar, VOLTA_TECLA);
  }

  return (
    <div
      {...props}
      ref={trilho}
      data-state={feito ? "done" : arrastando ? "dragging" : "idle"}
      className={cn(
        "relative h-14 w-[300px] max-w-full select-none overflow-hidden rounded-[var(--r-pill)] border border-border bg-card text-foreground [box-shadow:var(--e-raised)] [--slide-thumb:3rem]",
        disabled && "opacity-50",
        className,
      )}
    >
      {/* O rastro nasce atrás do polegar e cresce com ele: o caminho andado fica pintado. */}
      <motion.div
        aria-hidden="true"
        className={cn("absolute bottom-1 left-1 top-1 rounded-[var(--r-pill)]", TROCA_COR, cor)}
        style={{ width: rastro }}
      />

      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-[calc(var(--slide-thumb)+0.25rem)] right-0 flex items-center justify-center text-sm font-medium text-muted-foreground"
        style={{ opacity: feito ? 0 : rotuloOpacidade }}
      >
        {label}
      </motion.span>

      <motion.span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 right-[calc(var(--slide-thumb)+0.25rem)] flex items-center justify-center gap-1.5 text-sm font-medium",
          aprovado ? TINTA_APROVADO : TINTA[tone],
        )}
        initial={false}
        animate={{ opacity: feito ? 1 : 0 }}
        transition={{ duration: reduzido ? 0 : 0.2, delay: feito && !reduzido ? 0.08 : 0 }}
      >
        {confirmedLabel}
      </motion.span>

      <motion.div
        ref={polegar}
        role="slider"
        tabIndex={parado ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valor}
        aria-valuetext={feito ? confirmedLabel : `${valor}%`}
        aria-disabled={parado || undefined}
        style={{ x }}
        onPointerDown={(e) => {
          if (parado || !e.isPrimary || e.button !== 0) return;
          const t = trilho.current;
          if (!t) return;
          anim.current?.stop();
          window.clearTimeout(voltaTimer.current);
          medir();
          const r = t.getBoundingClientRect();
          gesto.current = {
            id: e.pointerId,
            inicioX: e.clientX,
            base: x.get(),
            escala: t.offsetWidth ? r.width / t.offsetWidth : 1,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          setArrastando(true);
        }}
        onPointerMove={(e) => {
          const g = gesto.current;
          if (!g || g.id !== e.pointerId) return;
          const c = curso.current;
          const cru = g.base + (e.clientX - g.inicioX) / (g.escala || 1);
          // 1:1 dentro do trilho, cede pouco além das pontas.
          const v = cru < 0 ? cru * CEDE : cru > c ? c + (cru - c) * CEDE : cru;
          x.set(v);
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onLostPointerCapture={soltar}
        onKeyDown={teclar}
        className={cn(
          "absolute left-1 top-1 grid size-[var(--slide-thumb)] place-items-center rounded-[var(--r-pill)] outline-none [touch-action:none] focus-visible:[box-shadow:var(--focus)]",
          TROCA_COR,
          cor,
          parado ? "cursor-default" : arrastando ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        {feito ? <Check className="size-5" strokeWidth={2} /> : <ArrowRight className="size-5" strokeWidth={2} />}
      </motion.div>

      <span className="sr-only" role="status">
        {feito ? confirmedLabel : ""}
      </span>
    </div>
  );
}

export default SlideToConfirm;
