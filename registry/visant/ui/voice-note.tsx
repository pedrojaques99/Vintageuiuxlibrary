"use client";

import * as React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import { Pause, Play, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Voice Note: a nota de voz de chat, com forma de onda, play/pause e progresso.
 *
 * A forma de onda é o que faz um áudio parecer conteúdo e não anexo: dá pra ver
 * onde a pessoa falou e onde respirou, e clicar direto no trecho. Esta peça é a
 * casca de reprodução: recebe os picos (`peaks`) e a duração, e anda um relógio
 * próprio. Não grava nem toca som: quem tem o áudio liga `onPlayingChange` e
 * `onSeek` no player real, ou usa como está pra protótipo e demo.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **A onda é desenhada duas vezes.** Uma camada apagada, outra cheia por
 *    cima, recortada por `clip-path` no ponto do progresso. O corte pode cair
 *    no meio de uma barra, como no áudio de verdade, e nada renderiza por
 *    quadro: o progresso é um `MotionValue`.
 * 2. **O relógio na tela troca uma vez por segundo**, não por quadro. Mostra o
 *    tempo corrido enquanto toca ou está pausado no meio, e a duração total
 *    quando está parado no início, que é o que se quer saber antes de tocar.
 * 3. **A onda é um `slider`.** Clique e arrasto buscam; com foco, setas andam
 *    1 s, Home/End vão às pontas, Espaço toca e pausa. O tempo falado é
 *    "0:02 de 0:07", não um número solto.
 * 4. **Acabou, volta pro começo.** O botão vira play de novo e o próximo
 *    toque recomeça, sem a pessoa precisar arrastar de volta.
 */

export interface VoiceNoteProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart" | "onAnimationEnd"> {
  /** Picos da onda, de 0 a 1. Cada um vira uma barra. */
  peaks?: number[];
  /** Duração em segundos. */
  duration?: number;
  /** Cor do botão e da onda tocada. */
  tone?: "neutral" | "brand";
  /** Mostra o X e chama isto ao apagar. */
  onDelete?: () => void;
  /** Avisa quando toca e pausa (pra ligar num player de verdade). */
  onPlayingChange?: (playing: boolean) => void;
  /** Avisa a posição buscada, em segundos. */
  onSeek?: (seconds: number) => void;
  /** Nome da nota pra leitor de tela. */
  label?: string;
}

/** Onda de demo com cara de fala: frases com pausa entre elas. Determinística, pra não piscar no SSR. */
function ondaDeDemo(n = 36) {
  return Array.from({ length: n }, (_, i) => {
    const frase = Math.abs(Math.sin(i / 3.1));
    const grao = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    return Math.max(0.08, Math.min(1, frase * 0.75 + Math.abs(grao) * 0.35));
  });
}

const DEMO = ondaDeDemo();

function relogio(s: number) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

const TOM = {
  neutral: { botao: "bg-foreground text-background", onda: "bg-foreground" },
  brand: { botao: "bg-[var(--brand)] text-[var(--brand-foreground)]", onda: "bg-[var(--brand)]" },
} as const;

function Barras({ peaks, cor }: { peaks: number[]; cor: string }) {
  return (
    <span className="flex h-full w-full items-center justify-between gap-[2px]">
      {peaks.map((p, i) => (
        <span
          key={i}
          className={cn("w-[2px] flex-none rounded-[var(--r-pill)]", cor)}
          style={{ height: `${Math.round(12 + Math.min(1, Math.max(0, p)) * 88)}%` }}
        />
      ))}
    </span>
  );
}

export function VoiceNote({
  peaks = DEMO,
  duration = 7,
  tone = "neutral",
  onDelete,
  onPlayingChange,
  onSeek,
  label = "Nota de voz",
  className,
  ...props
}: VoiceNoteProps) {
  const reduzido = useReducedMotion() ?? false;
  const tempo = useMotionValue(0);
  const recorte = useTransform(tempo, (t) => `inset(0 ${(100 - (t / duration) * 100).toFixed(3)}% 0 0)`);
  const [tocando, setTocando] = React.useState(false);
  const [segundo, setSegundo] = React.useState(0);
  const anim = React.useRef<AnimationPlaybackControls | null>(null);
  const arrasto = React.useRef<number | null>(null);
  const tom = TOM[tone];

  React.useEffect(() => tempo.on("change", (t) => setSegundo(Math.floor(t))), [tempo]);
  React.useEffect(() => () => anim.current?.stop(), []);

  function tocar(de = tempo.get()) {
    anim.current?.stop();
    const inicio = de >= duration ? 0 : de;
    tempo.jump(inicio);
    // O relógio anda linear: é tempo de áudio, não gesto.
    anim.current = animate(tempo, duration, {
      duration: duration - inicio,
      ease: "linear",
      onComplete: () => {
        setTocando(false);
        onPlayingChange?.(false);
        tempo.jump(0);
      },
    });
    setTocando(true);
    onPlayingChange?.(true);
  }

  function pausar() {
    anim.current?.stop();
    setTocando(false);
    onPlayingChange?.(false);
  }

  function alternar() {
    if (tocando) pausar();
    else tocar();
  }

  function buscar(s: number) {
    const alvo = Math.min(duration, Math.max(0, s));
    if (tocando) tocar(alvo);
    else tempo.jump(alvo);
    onSeek?.(alvo);
  }

  function posicao(e: React.PointerEvent<HTMLDivElement>) {
    // Razão entre dois retângulos de tela: a escala da página se cancela.
    const r = e.currentTarget.getBoundingClientRect();
    return r.width ? ((e.clientX - r.left) / r.width) * duration : 0;
  }

  const parado = !tocando && segundo === 0;

  return (
    <div
      {...props}
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex h-12 w-[280px] max-w-full items-center gap-3 rounded-[var(--r-pill)] border border-border bg-card pl-1.5 pr-3 text-card-foreground [box-shadow:var(--e-raised)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={alternar}
        aria-label={tocando ? "Pausar" : "Tocar"}
        className={cn(
          "grid size-9 flex-none place-items-center rounded-[var(--r-pill)] outline-none [font:inherit] focus-visible:[box-shadow:var(--focus)]",
          "transition-[opacity] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:opacity-90 active:opacity-80",
          tom.botao,
        )}
      >
        <span className="grid [&>*]:col-start-1 [&>*]:row-start-1">
          <AnimatePresence initial={false}>
            <motion.span
              key={tocando ? "pausa" : "play"}
              className="grid place-items-center"
              initial={reduzido ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduzido ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            >
              {tocando ? (
                <Pause className="size-4" fill="currentColor" strokeWidth={0} />
              ) : (
                <Play className="ml-0.5 size-4" fill="currentColor" strokeWidth={0} />
              )}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Posição"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={segundo}
        aria-valuetext={`${relogio(segundo)} de ${relogio(duration)}`}
        onPointerDown={(e) => {
          if (!e.isPrimary || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          arrasto.current = e.pointerId;
          buscar(posicao(e));
        }}
        onPointerMove={(e) => {
          if (arrasto.current !== e.pointerId) return;
          const s = Math.min(duration, Math.max(0, posicao(e)));
          // Durante o arrasto o relógio segue o dedo; só volta a andar quando solta.
          anim.current?.stop();
          tempo.jump(s);
        }}
        onPointerUp={(e) => {
          if (arrasto.current !== e.pointerId) return;
          arrasto.current = null;
          buscar(posicao(e));
        }}
        onPointerCancel={() => {
          arrasto.current = null;
        }}
        onKeyDown={(e) => {
          const t = tempo.get();
          let alvo: number | null = null;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") alvo = t + 1;
          else if (e.key === "ArrowLeft" || e.key === "ArrowDown") alvo = t - 1;
          else if (e.key === "Home") alvo = 0;
          else if (e.key === "End") alvo = duration;
          else if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            alternar();
            return;
          }
          if (alvo === null) return;
          e.preventDefault();
          buscar(alvo);
        }}
        className="relative h-7 min-w-0 flex-1 cursor-pointer touch-none rounded-[var(--r-control)] outline-none focus-visible:[box-shadow:var(--focus)]"
      >
        <span aria-hidden="true" className="absolute inset-0 opacity-30">
          <Barras peaks={peaks} cor="bg-muted-foreground" />
        </span>
        <motion.span aria-hidden="true" className="absolute inset-0" style={{ clipPath: recorte }}>
          <Barras peaks={peaks} cor={tom.onda} />
        </motion.span>
      </div>

      <span className="w-9 flex-none text-right text-xs tabular-nums text-muted-foreground" aria-hidden="true">
        {relogio(parado ? duration : segundo)}
      </span>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Apagar nota de voz"
          className="-mr-1 grid size-7 flex-none place-items-center rounded-[var(--r-pill)] text-muted-foreground outline-none [font:inherit] transition-[background-color,color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:bg-muted hover:text-foreground focus-visible:[box-shadow:var(--focus)]"
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

export default VoiceNote;
