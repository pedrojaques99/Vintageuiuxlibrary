"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sfx-bus";

/**
 * VintageSoundboardPad — o pad que agora **toca**.
 *
 * O relatado era literal: um pad de soundboard que não fazia som. A peça
 * desenhava o aceso, chamava `onTrigger` e cabia ao dono do app plugar áudio —
 * ou seja, a coisa que dá nome ao componente era exercício pro leitor.
 *
 * O som sai do `sfx-bus` da casa, e não de um `AudioContext` próprio. A razão
 * não é economia de linhas: um contexto de áudio por componente é o caminho
 * curto pra doze contextos numa página e pro navegador cortar o áudio inteiro.
 * O bus também já resolve o que sempre se esquece — contexto destravado só no
 * primeiro gesto, preferência de som guardada, e mudo sob
 * `prefers-reduced-motion`.
 *
 * `data-sfx-silent` no botão é obrigatório: sem ele, um app que monte o
 * `SfxProvider` na raiz sonorizaria o clique por delegação E o pad tocaria o
 * dele, dois estalos por dedo.
 *
 * Cada pad toca a voz do tipo dele (bumbo, caixa, chimbau, palma...),
 * sintetizada aqui mesmo em WebAudio, num contexto só pra todos os pads da
 * página. O que vem do bus é a PREFERÊNCIA de som (ligado, desligado, mudo
 * sob `prefers-reduced-motion`) e o destrave no primeiro gesto; pad sem voz
 * reconhecível cai no `drop` da casa.
 */
/** As vozes que o pad sabe tocar. Cada uma é sintetizada aqui, sem arquivo. */
export type PadVoice =
  | "kick"
  | "snare"
  | "hat"
  | "clap"
  | "tom"
  | "ride"
  | "bass"
  | "synth"
  | "fx"
  | "vox";

const VOZES: readonly PadVoice[] = [
  "kick", "snare", "hat", "clap", "tom", "ride", "bass", "synth", "fx", "vox",
];

/** O rótulo já diz a voz na maioria dos casos ("KICK", "Snare 2", "HAT"). */
function vozDoRotulo(label: string): PadVoice | null {
  const l = label.toLowerCase();
  return VOZES.find((v) => l.includes(v)) ?? null;
}

/*
 * Um contexto de áudio pra TODOS os pads da página, criado no primeiro toque.
 * Um por pad é o caminho curto pra doze contextos e pro navegador cortar o som.
 */
let ctxPads: AudioContext | null = null;
let ruidoPads: AudioBuffer | null = null;

function contexto() {
  if (typeof window === "undefined") return null;
  if (!ctxPads) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctxPads = new AC();
    const len = Math.floor(ctxPads.sampleRate * 0.6);
    ruidoPads = ctxPads.createBuffer(1, len, ctxPads.sampleRate);
    const d = ruidoPads.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctxPads.state === "suspended") void ctxPads.resume();
  return ctxPads;
}

/** Envelope curto: sobe em `atk`, cai exponencial até `dur`. */
function envelope(ctx: AudioContext, pico: number, atk: number, dur: number, t: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return g;
}

function ruido(ctx: AudioContext, saida: AudioNode, filtro: BiquadFilterType, hz: number, q: number, pico: number, atk: number, dur: number, t: number) {
  const src = ctx.createBufferSource();
  src.buffer = ruidoPads;
  const f = ctx.createBiquadFilter();
  f.type = filtro;
  f.frequency.value = hz;
  f.Q.value = q;
  const g = envelope(ctx, pico, atk, dur, t);
  src.connect(f).connect(g).connect(saida);
  src.start(t, Math.random() * 0.3, dur + 0.05);
}

function tom(ctx: AudioContext, saida: AudioNode, forma: OscillatorType, de: number, ate: number, pico: number, dur: number, t: number, corte?: number) {
  const o = ctx.createOscillator();
  o.type = forma;
  o.frequency.setValueAtTime(de, t);
  o.frequency.exponentialRampToValueAtTime(ate, t + dur * 0.6);
  const g = envelope(ctx, pico, 0.003, dur, t);
  if (corte) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = corte;
    o.connect(f).connect(g);
  } else o.connect(g);
  g.connect(saida);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/**
 * A voz de cada tipo. Volume de bancada, não de show: o pico mais alto é 0,32
 * antes do mestre de 0,5, e nada passa de 400 ms.
 */
function tocarVoz(voz: PadVoice) {
  const ctx = contexto();
  if (!ctx || !ruidoPads) return;
  const t = ctx.currentTime + 0.005;
  const mestre = ctx.createGain();
  mestre.gain.value = 0.5;
  mestre.connect(ctx.destination);
  switch (voz) {
    case "kick":
      tom(ctx, mestre, "sine", 150, 45, 0.32, 0.28, t);
      ruido(ctx, mestre, "lowpass", 900, 0.7, 0.05, 0.001, 0.02, t);
      break;
    case "snare":
      ruido(ctx, mestre, "bandpass", 1900, 0.8, 0.18, 0.002, 0.17, t);
      tom(ctx, mestre, "triangle", 210, 170, 0.12, 0.08, t);
      break;
    case "hat":
      ruido(ctx, mestre, "highpass", 7200, 0.7, 0.09, 0.001, 0.06, t);
      break;
    case "clap":
      for (const d of [0, 0.011, 0.022]) ruido(ctx, mestre, "bandpass", 1250, 1.2, 0.14, 0.001, 0.025, t + d);
      ruido(ctx, mestre, "bandpass", 1250, 1, 0.08, 0.002, 0.16, t + 0.03);
      break;
    case "tom":
      tom(ctx, mestre, "sine", 220, 120, 0.26, 0.32, t);
      break;
    case "ride":
      ruido(ctx, mestre, "highpass", 5200, 0.7, 0.05, 0.002, 0.38, t);
      ruido(ctx, mestre, "bandpass", 8200, 4, 0.04, 0.001, 0.3, t);
      break;
    case "bass":
      tom(ctx, mestre, "sawtooth", 58, 55, 0.16, 0.34, t, 420);
      break;
    case "synth":
      tom(ctx, mestre, "square", 330, 330, 0.06, 0.28, t, 1800);
      tom(ctx, mestre, "square", 332.5, 332.5, 0.06, 0.28, t, 1800);
      break;
    case "fx":
      tom(ctx, mestre, "sine", 380, 1500, 0.1, 0.3, t);
      break;
    case "vox": {
      // Vogal "a" grosseira: serra num par de formantes.
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = 145;
      const g = envelope(ctx, 0.12, 0.02, 0.3, t);
      for (const hz of [750, 1150]) {
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = hz;
        f.Q.value = 6;
        o.connect(f).connect(g);
      }
      g.connect(mestre);
      o.start(t);
      o.stop(t + 0.35);
      break;
    }
  }
}

interface VintageSoundboardPadProps {
  label?: string;
  icon?: string;
  color?: string;
  active?: boolean;
  size?: number;
  /**
   * Que som o pad faz. Sem ela, a voz sai do rótulo ("KICK" toca bumbo); rótulo
   * que não nomeia voz nenhuma toca o `drop` da casa.
   */
  voice?: PadVoice;
  /** Não toca nada. Para quando o app já cuida do áudio no `onTrigger`. */
  silent?: boolean;
  onTrigger?: () => void;
  onRelease?: () => void;
  className?: string;
}

export function VintageSoundboardPad({
  label = "PAD",
  icon,
  color = "var(--vintage-accent)",
  active: controlledActive,
  size = 96,
  silent = false,
  voice,
  onTrigger,
  onRelease,
  className,
}: VintageSoundboardPadProps) {
  const [internalActive, setInternalActive] = React.useState(false);
  const isActive =
    controlledActive !== undefined ? controlledActive : internalActive;

  const bater = React.useCallback(() => {
    if (controlledActive === undefined) setInternalActive(true);
    if (!silent) {
      // `arm` antes de `press` porque o primeiro toque da página é justamente o
      // que destrava o contexto — sem isto o primeiro pad da sessão fica mudo.
      sfx.arm();
      const v = voice ?? vozDoRotulo(label);
      // A preferência de som é do bus (e já nasce desligada pra quem pediu
      // menos movimento): a voz própria do pad obedece a ela também.
      if (v) {
        if (sfx.isEnabled()) tocarVoz(v);
      } else sfx.play("drop");
    }
    onTrigger?.();
  }, [controlledActive, onTrigger, silent, voice, label]);

  const soltar = React.useCallback(() => {
    if (controlledActive === undefined) setInternalActive(false);
    onRelease?.();
  }, [controlledActive, onRelease]);

  // Curso do pad em px: borracha afunda um pouco sob o dedo.
  const afundado = isActive ? 1.5 : 0;

  return (
    <button
      type="button"
      aria-pressed={isActive}
      // O bus da casa não toca por cima: quem toca é o pad, logo abaixo.
      data-sfx-silent=""
      className={cn(
        "group relative flex cursor-pointer select-none touch-none flex-col items-center justify-center gap-1",
        "rounded-[var(--r-control,10px)] outline-none",
        className
      )}
      style={{
        width: size,
        height: size,
        /*
         * Borracha de pad, iluminada por baixo. A cor de quem tocou é a da
         * lâmpada atrás da borracha, não a da borracha: o pad aceso acende POR
         * DENTRO, misturado ao escuro, em vez de virar um quadrado de cor
         * chapada que brigava com o resto do kit.
         */
        background: isActive
          ? `radial-gradient(90% 90% at 50% 55%, color-mix(in srgb, ${color} 38%, var(--vintage-surface-2)) 0%, color-mix(in srgb, ${color} 12%, var(--vintage-surface-2)) 100%)`
          : "radial-gradient(110% 90% at 50% 20%, var(--vintage-surface-3) 0%, var(--vintage-surface-2) 100%)",
        boxShadow: isActive
          ? `inset 0 1px 3px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.65), 0 0 14px color-mix(in srgb, ${color} 22%, transparent)`
          : "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(0,0,0,0.65), 0 3px 4px rgba(0,0,0,0.5)",
        transform: `translateY(${afundado}px)`,
        transition:
          "transform var(--dur-press,120ms) var(--ease-out,ease), box-shadow var(--dur-fast,160ms) var(--ease-out,ease), background var(--dur-fast,160ms) var(--ease-out,ease)",
      }}
      // Ponteiro em vez de mouse+touch: com os dois, um toque na tela disparava
      // `touchstart` e o `mousedown` sintetizado logo atrás, dois disparos.
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        bater();
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          bater();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") soltar();
      }}
    >
      {/* Anel de foco num filho: o relevo do pad mora no `box-shadow` inline,
          que venceria qualquer classe de foco no próprio botão. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[inherit] group-focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--vintage-value))]"
      />

      {icon && (
        <span
          className="leading-none"
          style={{
            fontSize: size * 0.3,
            filter: isActive ? "brightness(1.2)" : "none",
          }}
        >
          {icon}
        </span>
      )}

      <span
        className="max-w-[90%] truncate font-semibold uppercase tracking-[0.16em]"
        style={{
          fontSize: Math.max(9, Math.round(size * 0.12)),
          color: isActive ? "var(--vintage-label)" : "var(--vintage-text-muted)",
          fontFamily: "var(--font-vintage-mono, monospace)",
          textShadow: isActive
            ? "0 1px 2px rgba(0,0,0,0.6)"
            : "0 -1px 0 rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {label}
      </span>

      {/* Lâmpada do pad: a cor de quem tocou, numa lente pequena. */}
      <span
        aria-hidden
        className="absolute bottom-[10%] h-1.5 w-1.5 rounded-full"
        style={{
          background: isActive ? color : "var(--vintage-surface-1)",
          boxShadow: isActive
            ? `0 0 6px ${color}, 0 0 0 1px rgba(0,0,0,0.5)`
            : "inset 0 1px 1px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.06)",
          transition: "background var(--dur-fast,160ms) var(--ease-out,ease)",
        }}
      />
    </button>
  );
}
