"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
  type Transition,
} from "motion/react";

import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx-bus";

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
 * 6. **O gesto se anuncia sem legenda.** Uma alça no topo diz "isto puxa"
 *    antes de qualquer toque; durante o puxão a frase ao lado do anel muda de
 *    "Puxe pra atualizar" pra "Solte pra atualizar" no ponto exato em que
 *    soltar passa a valer, com um clique baixo (`detent`) no mesmo quadro. Com
 *    `nudge`, o painel ainda dá uma puxadinha sozinho de tempos em tempos até a
 *    pessoa mexer nele: é a demonstração do gesto, no próprio componente.
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
  /** Alça no topo do painel, o sinal de "isto puxa". Default `true`. */
  handle?: boolean;
  /** As frases ao lado do anel. `false` some com elas e deixa só o anel. */
  labels?: { pull?: string; release?: string; refreshing?: string } | false;
  /**
   * Puxadinha sozinha a cada `nudge` ms (`true` = 4000) enquanto ninguém mexeu
   * no painel. Para no primeiro toque, tecla ou foco. Desligada sob movimento
   * reduzido.
   */
  nudge?: boolean | number;
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
  handle = true,
  labels,
  nudge = false,
  className,
  children,
  onKeyDown,
  onFocus,
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
  const [pronto, setPronto] = React.useState(false);
  const [tocado, setTocado] = React.useState(false);
  const frases = labels === false ? null : { pull: "Puxe pra atualizar", release: "Solte pra atualizar", refreshing: "Atualizando", ...labels };
  const opacidadeFrase = useTransform(altura, [8, 28], [0, 1]);
  // A alça sai de cena assim que o painel estica: o anel e a frase assumem.
  const opacidadeAlca = useTransform(altura, [0, 10], [1, 0]);

  // A virada de "puxe" pra "solte" é o momento em que soltar passa a valer: a
  // frase troca e o clique toca no mesmo quadro. Só durante o gesto do dedo,
  // nunca na volta da mola nem na puxadinha automática.
  useMotionValueEvent(altura, "change", (v) => {
    const agora = v >= threshold;
    if (agora === pronto) return;
    setPronto(agora);
    if (agora && gesto.current) playSfx("detent");
  });

  // A puxadinha: um convite que se repete até alguém aceitar.
  const intervalo = nudge === true ? 4000 : typeof nudge === "number" ? nudge : 0;
  React.useEffect(() => {
    if (!intervalo || tocado || reduzido || disabled) return;
    const id = window.setInterval(() => {
      if (gesto.current || carregandoRef.current) return;
      anim.current?.stop();
      anim.current = animate(altura, [0, Math.round(threshold * 0.45), 0], {
        duration: 0.9,
        times: [0, 0.35, 1],
        ease: ["easeOut", "easeInOut"],
      });
    }, intervalo);
    return () => window.clearInterval(id);
  }, [intervalo, tocado, reduzido, disabled, threshold, altura]);

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
      onFocus={(e) => {
        onFocus?.(e);
        setTocado(true);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        void atualizar();
      }}
      onPointerDown={(e) => {
        if (disabled || carregandoRef.current || !e.isPrimary || e.button !== 0) return;
        const el = e.currentTarget;
        setTocado(true);
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
      {handle ? (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1.5 z-10 h-1 w-8 -translate-x-1/2 rounded-[var(--r-pill)] bg-border"
          style={{ opacity: opacidadeAlca }}
        />
      ) : null}
      <motion.div aria-hidden="true" className="relative shrink-0 overflow-hidden" style={{ height: altura }}>
        <div className="absolute inset-0 flex items-center justify-center gap-2.5">
          <motion.span className="relative size-6 shrink-0" style={{ rotate: giroPuxao }}>
            {/* O giro de espera é CSS na camada de dentro: quando para, não briga com o giro do puxão. */}
            <span className={cn("absolute inset-0", carregando && "animate-spin motion-reduce:animate-none")}>
              {Array.from({ length: dots }, (_, i) => (
                <Ponto key={i} i={i} total={dots} progresso={progresso} />
              ))}
            </span>
          </motion.span>
          {frases ? (
            <motion.span
              className={cn(
                "whitespace-nowrap text-xs font-medium",
                pronto || carregando ? "text-foreground" : "text-muted-foreground",
              )}
              style={{ opacity: opacidadeFrase }}
            >
              {carregando ? frases.refreshing : pronto ? frases.release : frases.pull}
            </motion.span>
          ) : null}
        </div>
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
