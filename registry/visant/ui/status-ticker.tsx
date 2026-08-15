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

  // A palavra ASSENTADA, sem os quadros embaralhados da revelação. É ela que o
  // leitor de tela recebe — anunciar "cr*a-do" seria pior que não anunciar.
  const [alvo, setAlvo] = useState(steps[0] ?? "");

  const startedAt = useRef<number | null>(null);
  const wordIdx = useRef(0);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /*
   * `steps` não pode entrar como dependência de efeito.
   *
   * O default é um literal de array: identidade nova a cada render. E o efeito
   * abaixo faz `setState` a cada 380ms (os pontinhos), o que gera render, que
   * gera array novo, que refaz o efeito — e o efeito reinicia `startedAt`. Na
   * prática o cronômetro nunca passava de 0:00 e a palavra nunca girava, que é
   * exatamente o que a peça vende. Quem passa `steps={["a","b"]}` inline caía no
   * mesmo buraco. A chave de texto é estável; o conteúdo vive num ref.
   */
  const stepsKey = steps.join("|");
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    const primeiro = stepsRef.current[0] ?? "";
    setWord(primeiro);
    setAlvo(primeiro);
    wordIdx.current = 0;
  }, [stepsKey]);

  useEffect(() => {
    // `Date.now()` no efeito, não no render: em StrictMode/SSR o render roda
    // duas vezes e o cronômetro começaria negativo.
    startedAt.current = Date.now();

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const reveal = (target: string) => {
      setAlvo(target);
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

    // Contador próprio em vez de `sec % rotateEverySec`: um tick atrasado pelo
    // navegador (aba de fundo, GC) pulava o resto da divisão e a palavra ficava
    // parada mais um ciclo inteiro.
    let desdeATroca = 0;

    const tickId = setInterval(() => {
      const sec = Math.floor((Date.now() - (startedAt.current ?? 0)) / 1000);
      setTimer(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`);

      desdeATroca += 1;
      const lista = stepsRef.current;
      if (desdeATroca >= rotateEverySec && lista.length > 1) {
        desdeATroca = 0;
        wordIdx.current = (wordIdx.current + 1) % lista.length;
        reveal(lista[wordIdx.current]);
      }
    }, 1000);

    return () => {
      if (dotsId) clearInterval(dotsId);
      clearInterval(tickId);
      if (revealTimer.current) clearInterval(revealTimer.current);
    };
  }, [stepsKey, rotateEverySec]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 font-mono text-[11px] font-bold uppercase text-muted-foreground",
        className,
      )}
    >
      <GlitchChars className="text-[var(--accent-ink,var(--muted-foreground))]" />
      {/* min-w impede o bloco inteiro de pular a cada troca de palavra */}
      <span aria-hidden="true" className="min-w-[120px] text-foreground">
        {word}
        {dots}
      </span>
      {/* O que a região viva anuncia: só a palavra assentada. Sem isto o leitor
          de tela lia o cronômetro a cada segundo, para sempre. */}
      <span className="sr-only">{alvo}</span>
      {showTimer && (
        <span
          aria-hidden="true"
          className="ml-auto text-[10px] tabular-nums text-[var(--muted-foreground)]"
        >
          {timer}
        </span>
      )}
    </div>
  );
}
