"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { GlitchChars } from "@/components/ui/glitch-chars";

/**
 * Linha de status para espera longa: ruído + verbo que gira + cronômetro.
 *
 * O problema que resolve não é técnico, é de percepção. Numa geração de 20–60s
 * uma barra de progresso mente (não existe progresso real para medir) e um
 * spinner some da consciência em 5s. Uma palavra que TROCA — "Criando",
 * "Refinando", "Lapidando" — mantém a leitura de que há trabalho acontecendo, e
 * o cronômetro dá ao usuário o direito de decidir se vale esperar.
 *
 * Os verbos entram por prop de propósito: são a voz da marca, não do componente.
 *
 * A troca é revelada caractere a caractere (7 passos de 50ms) em vez de cortar
 * seco — o corte seco lê como bug de render, a revelação lê como escrita.
 *
 * `prefers-reduced-motion`: sem ruído, sem revelação; a palavra troca direto e o
 * cronômetro continua (informação, não animação).
 */
export function StatusTicker({
  steps = ["Criando", "Desenhando", "Refinando", "Compondo", "Lapidando"],
  rotateEverySec = 3,
  showTimer = true,
  className,
}: {
  /** Verbos rotativos. A voz da marca entra aqui. */
  steps?: readonly string[];
  /** Segundos em cada verbo antes de trocar. */
  rotateEverySec?: number;
  /** Cronômetro à direita — o que dá ao usuário a decisão de esperar. */
  showTimer?: boolean;
  className?: string;
}) {
  const [word, setWord] = useState(steps[0] ?? "");
  const [dots, setDots] = useState(".");
  const [timer, setTimer] = useState("0:00");

  const startedAt = useRef<number | null>(null);
  const wordIdx = useRef(0);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setWord(steps[0] ?? "");
    wordIdx.current = 0;
  }, [steps]);

  useEffect(() => {
    // `Date.now()` no efeito, não no render: em StrictMode/SSR o render roda
    // duas vezes e o cronômetro começaria negativo.
    startedAt.current = Date.now();

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const reveal = (target: string) => {
      if (reduced) {
        setWord(target);
        return;
      }
      const totalSteps = 7;
      const pool = "abcdefghijklmnopqrstuvwxyz*•-□";
      let step = 0;
      if (revealTimer.current) clearInterval(revealTimer.current);
      revealTimer.current = setInterval(() => {
        step += 1;
        if (step >= totalSteps) {
          if (revealTimer.current) clearInterval(revealTimer.current);
          setWord(target);
          return;
        }
        const revealed = Math.floor((step / totalSteps) * target.length);
        setWord(
          Array.from({ length: target.length }, (_, i) =>
            i < revealed
              ? target[i]
              : pool[Math.floor(Math.random() * pool.length)],
          ).join(""),
        );
      }, 50);
    };

    const dotsId = reduced
      ? null
      : setInterval(() => setDots((d) => (d.length >= 1 ? "" : ".")), 380);

    const tickId = setInterval(() => {
      const sec = Math.floor((Date.now() - (startedAt.current ?? 0)) / 1000);
      setTimer(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`);

      if (sec > 0 && sec % rotateEverySec === 0 && steps.length > 1) {
        wordIdx.current = (wordIdx.current + 1) % steps.length;
        reveal(steps[wordIdx.current]);
      }
    }, 1000);

    return () => {
      if (dotsId) clearInterval(dotsId);
      clearInterval(tickId);
      if (revealTimer.current) clearInterval(revealTimer.current);
    };
  }, [steps, rotateEverySec]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 font-mono text-[11px] font-bold uppercase text-muted-foreground",
        className,
      )}
    >
      <GlitchChars className="text-brand opacity-60" />
      {/* min-w impede o bloco inteiro de pular a cada troca de palavra */}
      <span className="min-w-[120px] text-foreground">
        {word}
        {dots}
      </span>
      {showTimer && (
        <span className="ml-auto text-[10px] tabular-nums opacity-60">
          {timer}
        </span>
      )}
    </div>
  );
}
