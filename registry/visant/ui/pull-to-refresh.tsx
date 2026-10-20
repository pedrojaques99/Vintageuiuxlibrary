"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
  type Transition,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Pull to Refresh: puxar o painel pra baixo pra buscar dado novo.
 *
 * É pra widget de altura fixa (saldo, placar, fila de pedidos) que mostra um
 * dado que envelhece, e onde um botão de atualizar seria mais um ícone
 * disputando o canto. NÃO é pra lista longa que rola: ali o navegador do
 * telefone já tem o gesto nativo, e reimplementá-lo briga com a rolagem.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **O painel estica, não desliza.** O topo ganha altura e o conteúdo desce;
 *    a borda de baixo fica onde estava. Lê como elástico preso, que é o que
 *    convida a soltar.
 * 2. **Resistência que cresce.** O puxão vira altura por uma curva que satura
 *    (`1 - 1/(x+1)`): os primeiros px respondem quase 1:1 e depois cada px de
 *    dedo rende menos. Nunca trava, nunca passa de `max`.
 * 3. **Os pontos contam quanto falta.** Cada ponto do anel acende numa fração
 *    do caminho até a marca; com todos acesos, soltar atualiza. Quando a
 *    promessa resolve, o anel para de girar e o painel volta com mola.
 * 4. **O arrasto é medido em px locais.** O delta do ponteiro é dividido pela
 *    escala do elemento, porque a vitrine e muito layout escalam por
 *    `transform`.
 * 5. **Teclado:** com o painel focado, Enter ou Espaço atualizam, com o mesmo
 *    anel e o mesmo aviso no `role="status"`. Tecla vinda de um botão de
 *    dentro não dispara nada.
 */

export interface PullToRefreshProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart" | "onAnimationEnd"> {
  /** Busca o dado novo. Enquanto a promessa não resolve, o anel gira. */
  onRefresh?: () => Promise<unknown> | void;
  /** Quanto puxar (px de painel esticado) até valer. */
  threshold?: number;
  /** Teto do esticão, em px. */
  max?: number;
  /** Pontos no anel. */
  dots?: number;
  /** Nome do painel pra leitor de tela. */
  label?: string;
  disabled?: boolean;
}

const MOLA_VOLTA: Transition = { type: "spring", visualDuration: 0.3, bounce: 0.2 };
const MOLA_PARA: Transition = { type: "spring", visualDuration: 0.25, bounce: 0 };

function Ponto({ i, total, progresso }: { i: number; total: number; progresso: MotionValue<number> }) {
  const limiar = (i + 1) / total;
  const opacidade = useTransform(progresso, [limiar - 1 / total, limiar], [0.18, 1]);
  const ang = (i / total) * Math.PI * 2 - Math.PI / 2;
  return (
    <motion.span
      className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-[var(--r-pill)] bg-foreground"
      style={{ opacity: opacidade, marginLeft: Math.cos(ang) * 8, marginTop: Math.sin(ang) * 8 }}
    />
  );
}

export function PullToRefresh({
  onRefresh,
  threshold = 64,
  max = 120,
  dots = 8,
  label = "Painel",
  disabled = false,
  className,
  children,
  onKeyDown,
  ...props
}: PullToRefreshProps) {
  const reduzido = useReducedMotion() ?? false;
  const altura = useMotionValue(0);
  const progresso = useTransform(altura, (v) => Math.min(1, v / threshold));
  const giroPuxao = useTransform(altura, (v) => (v / threshold) * 180);
  const [carregando, setCarregando] = React.useState(false);
  const [aviso, setAviso] = React.useState("");
  const carregandoRef = React.useRef(false);
  const gesto = React.useRef<{ id: number; inicioY: number; escala: number } | null>(null);
  const anim = React.useRef<AnimationPlaybackControls | null>(null);
  const vivo = React.useRef(true);
  const descanso = Math.min(threshold, 48); // altura que o anel ocupa enquanto gira

  React.useEffect(
    () => () => {
      vivo.current = false;
      anim.current?.stop();
    },
    [],
  );

  function ir(alvo: number, mola: Transition) {
    anim.current?.stop();
    if (reduzido) altura.jump(alvo);
    else anim.current = animate(altura, alvo, mola);
  }

  async function atualizar() {
    if (carregandoRef.current || disabled) return;
    carregandoRef.current = true;
    setCarregando(true);
    setAviso("Atualizando");
    ir(descanso, MOLA_PARA);
    try {
      await onRefresh?.();
    } finally {
      if (vivo.current) {
        carregandoRef.current = false;
        setCarregando(false);
        setAviso("Atualizado");
        ir(0, MOLA_VOLTA);
      }
    }
  }

  function soltar() {
    if (!gesto.current) return;
    gesto.current = null;
    if (altura.get() >= threshold) void atualizar();
    else ir(0, MOLA_VOLTA);
  }

  return (
    <div
      {...props}
      role="region"
      aria-label={label}
      aria-busy={carregando || undefined}
      aria-keyshortcuts="Enter"
      tabIndex={disabled ? undefined : 0}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        void atualizar();
      }}
      onPointerDown={(e) => {
        if (disabled || carregandoRef.current || !e.isPrimary || e.button !== 0) return;
        const el = e.currentTarget;
        anim.current?.stop();
        gesto.current = {
          id: e.pointerId,
          inicioY: e.clientY,
          escala: el.offsetHeight ? el.getBoundingClientRect().height / el.offsetHeight : 1,
        };
        // A base é a altura atual: pegar o painel no meio da volta continua dali.
        gesto.current.inicioY -= cruDe(altura.get(), max) * gesto.current.escala;
      }}
      onPointerMove={(e) => {
        const g = gesto.current;
        if (!g || g.id !== e.pointerId) return;
        const dy = (e.clientY - g.inicioY) / (g.escala || 1);
        if (dy > 4 && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
        altura.set(dy <= 0 ? 0 : max * (1 - 1 / (dy / max + 1)));
      }}
      onPointerUp={soltar}
      onPointerLeave={(e) => {
        // Sem captura ainda (não passou dos 4 px): sair do painel encerra o gesto.
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) soltar();
      }}
      onPointerCancel={soltar}
      onLostPointerCapture={soltar}
      className={cn(
        "relative flex select-none flex-col overflow-hidden rounded-[var(--r-surface)] border border-border bg-card text-card-foreground outline-none [box-shadow:var(--e-raised)] [touch-action:pan-x] focus-visible:[box-shadow:var(--focus)]",
        disabled && "opacity-60",
        className,
      )}
    >
      <motion.div aria-hidden="true" className="relative shrink-0 overflow-hidden" style={{ height: altura }}>
        <motion.span
          className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2"
          style={{ rotate: giroPuxao }}
        >
          {/* O giro de espera é CSS na camada de dentro: quando para, não briga com o giro do puxão. */}
          <span className={cn("absolute inset-0", carregando && "animate-spin motion-reduce:animate-none")}>
            {Array.from({ length: dots }, (_, i) => (
              <Ponto key={i} i={i} total={dots} progresso={progresso} />
            ))}
          </span>
        </motion.span>
      </motion.div>
      <div className="min-h-0 flex-1">{children}</div>
      <span className="sr-only" role="status">
        {aviso}
      </span>
    </div>
  );
}

/** Inverso da curva de resistência: de altura esticada pra px de dedo. */
function cruDe(h: number, max: number) {
  if (h <= 0) return 0;
  const f = Math.min(0.99, h / max);
  return (1 / (1 - f) - 1) * max;
}

export default PullToRefresh;
