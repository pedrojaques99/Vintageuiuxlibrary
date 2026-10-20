"use client";

/**
 * Um tubo, um programa por vez, e um som de verdade passando por ele.
 *
 * A cena anterior mostrava os quatro modos lado a lado comendo um buffer de
 * mentira: bonito, mas ninguém mexia em nada, e o traço não era de som nenhum.
 * Agora o PLAY liga um loop curto sintetizado aqui (bumbo, chimbau, baixo e um
 * arpejo), o loop passa por um `AnalyserNode`, e o tubo desenha ESSE sinal: o
 * que se ouve é o que se vê. As teclas embaixo trocam o programa do tubo.
 *
 * Sem som tocando o tubo fica no traço reto, que é o que um osciloscópio sem
 * entrada mostra. Card fora da tela (`useStageActive`) para o som e o relógio.
 *
 * `fft` fica fora das teclas: o modo lê magnitudes em dB, não amostras no
 * tempo, e o analisador aqui entrega amostras.
 */

import * as React from "react";

import { useStageActive } from "../stage";
import type { DemoProps } from "../catalog";
import {
  VintageOscilloscope,
  type VintageScopeMode,
} from "../../../registry/vintage/ui/vintage-oscilloscope";
import { VintageButton } from "../../../registry/vintage/ui/vintage-button";

const MODOS: VintageScopeMode[] = ["scope", "wave", "rings", "grid"];
const FOSFORO = "var(--vintage-value)";

/** 16 passos a 112 BPM: semicolcheia. */
const PASSO = 60 / 112 / 4;
const BAIXO = [55, 0, 0, 55, 0, 0, 65.4, 0, 49, 0, 0, 49, 0, 0, 73.4, 0];
const ARPEJO = [440, 0, 523, 0, 659, 0, 523, 0, 392, 0, 494, 0, 587, 0, 494, 0];

/** O motor do loop: contexto, analisador e um agendador com folga. */
function useLoop(ligado: boolean) {
  const [analyser, setAnalyser] = React.useState<AnalyserNode | null>(null);
  const ctxRef = React.useRef<AudioContext | null>(null);

  React.useEffect(() => {
    if (!ligado) return;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = ctxRef.current ?? new AC();
    ctxRef.current = ctx;
    void ctx.resume();

    // O analisador lê o sinal ANTES do volume: o tubo desenha a forma cheia,
    // e o alto-falante recebe só um quarto dela.
    const mestre = ctx.createGain();
    mestre.gain.value = 1;
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    const volume = ctx.createGain();
    volume.gain.value = 0.22;
    mestre.connect(an).connect(volume).connect(ctx.destination);
    setAnalyser(an);

    const len = Math.floor(ctx.sampleRate * 0.3);
    const ruido = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const env = (pico: number, dur: number, t: number) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(pico, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      g.connect(mestre);
      return g;
    };
    const osc = (forma: OscillatorType, de: number, ate: number, pico: number, dur: number, t: number) => {
      const o = ctx.createOscillator();
      o.type = forma;
      o.frequency.setValueAtTime(de, t);
      if (ate !== de) o.frequency.exponentialRampToValueAtTime(ate, t + dur * 0.5);
      o.connect(env(pico, dur, t));
      o.start(t);
      o.stop(t + dur + 0.02);
    };
    const chiado = (pico: number, dur: number, t: number) => {
      const s = ctx.createBufferSource();
      s.buffer = ruido;
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 7000;
      s.connect(f).connect(env(pico, dur, t));
      s.start(t, 0, dur + 0.02);
    };

    let passo = 0;
    let proximo = ctx.currentTime + 0.05;
    const agendar = () => {
      // Folga de 120 ms: o `setInterval` atrasa, o relógio do áudio não.
      while (proximo < ctx.currentTime + 0.12) {
        const i = passo % 16;
        if (i % 4 === 0) osc("sine", 140, 45, 0.9, 0.22, proximo);
        if (i % 4 === 2) chiado(0.25, 0.05, proximo);
        if (BAIXO[i]) osc("sawtooth", BAIXO[i], BAIXO[i], 0.28, PASSO * 2.5, proximo);
        if (ARPEJO[i]) osc("triangle", ARPEJO[i], ARPEJO[i], 0.18, PASSO * 1.6, proximo);
        proximo += PASSO;
        passo += 1;
      }
    };
    agendar();
    const id = window.setInterval(agendar, 30);

    return () => {
      window.clearInterval(id);
      // Solta a cauda das notas em vez de cortar no meio.
      volume.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
      window.setTimeout(() => volume.disconnect(), 200);
      setAnalyser(null);
    };
  }, [ligado]);

  React.useEffect(
    () => () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    []
  );

  return analyser;
}

export default function VintageOscilloscopeDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const [tocando, setTocando] = React.useState(false);
  const [modo, setModo] = React.useState<VintageScopeMode>("scope");
  const analyser = useLoop(tocando && ativo);

  // Sem entrada: traço reto, como um tubo ligado sem cabo.
  const silencio = React.useMemo(() => new Float32Array(256), []);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div
        className="flex flex-col gap-3 rounded-[var(--r-control,10px)] p-3"
        style={{
          // O painel do kit: chapa escura, luz de cima, sombra que fecha embaixo.
          background: "linear-gradient(180deg, var(--vintage-surface-3), var(--vintage-surface-2))",
          border: "1px solid var(--vintage-surface-1)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 1px rgba(0,0,0,0.5), 0 10px 24px -8px rgba(0,0,0,0.6)",
        }}
      >
        <VintageOscilloscope
          analyser={analyser}
          data={silencio}
          mode={modo}
          color={FOSFORO}
          width={380}
          height={180}
          active={ativo}
          {...props}
        />

        <div className="flex items-center justify-between gap-3">
          <div role="radiogroup" aria-label="Programa do tubo" className="flex gap-1.5">
            {MODOS.map((m) => {
              const sel = m === modo;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setModo(m)}
                  className="group relative flex items-center gap-1.5 rounded-[4px] px-2 py-1.5 font-vintage-mono text-[10px] font-semibold uppercase tracking-[0.14em] outline-none"
                  style={{
                    color: sel ? "var(--vintage-label)" : "var(--vintage-text-muted)",
                    // Tecla de rack: a escolhida fica travada, mais funda.
                    background: sel
                      ? "linear-gradient(180deg, var(--vintage-surface-2), var(--vintage-surface-3))"
                      : "linear-gradient(180deg, var(--vintage-surface-4), var(--vintage-surface-3))",
                    boxShadow: sel
                      ? "inset 0 1px 3px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.6)"
                      : "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 1px rgba(0,0,0,0.6), 0 2px 3px rgba(0,0,0,0.5)",
                    transition:
                      "color var(--dur-fast,160ms) var(--ease-out,ease), box-shadow var(--dur-press,120ms) var(--ease-out,ease)",
                  }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-px rounded-[inherit] group-focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--vintage-value))]"
                  />
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: sel ? "var(--vintage-value)" : "var(--vintage-surface-1)",
                      boxShadow: sel ? "0 0 6px var(--vintage-value)" : "inset 0 1px 1px rgba(0,0,0,0.8)",
                    }}
                  />
                  {m}
                </button>
              );
            })}
          </div>

          <VintageButton
            label={tocando ? "STOP" : "PLAY"}
            active={tocando}
            onClick={() => setTocando((v) => !v)}
          />
        </div>
      </div>
    </div>
  );
}
