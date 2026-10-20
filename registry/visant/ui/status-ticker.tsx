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
 *
 * ── Quatro jeitos de esperar, a mesma máquina por baixo ────────────────────
 *
 * | `variant` | quando |
 * |---|---|
 * | `linha` | o default: ruído, verbo e cronômetro numa linha só |
 * | `barra` | a mesma linha com uma faixa varrendo embaixo, pra quem sente falta de "barra" sem prometer porcentagem |
 * | `etapas` | os passos todos à vista: o que já foi, o que está indo e o que falta |
 * | `pulso` | sem ruído de máquina: um ponto que respira, pra produto mais quieto |
 *
 * As quatro leem o mesmo relógio e a mesma lista de `steps`; trocar de variante
 * não reinicia o cronômetro de quem já está esperando.
 */
export type StatusTickerVariant = "linha" | "barra" | "etapas" | "pulso";

export function StatusTicker({
  steps = ["Criando", "Desenhando", "Refinando", "Compondo", "Lapidando"],
  rotateEverySec = 3,
  showTimer = true,
  variant = "linha",
  loop = true,
  className,
}: {
  /** Como a espera aparece. Ver a tabela acima. */
  variant?: StatusTickerVariant;
  /**
   * Volta ao primeiro passo depois do último. `false` segura no último, que é
   * o honesto quando a lista descreve um processo de verdade (`etapas`).
   */
  loop?: boolean;
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
  // O índice em estado (além do ref) porque `etapas` desenha a lista inteira.
  const [idx, setIdx] = useState(0);

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
  const loopRef = useRef(loop);
  loopRef.current = loop;

  useEffect(() => {
    const primeiro = stepsRef.current[0] ?? "";
    setWord(primeiro);
    setAlvo(primeiro);
    wordIdx.current = 0;
    setIdx(0);
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
      const noFim = !loopRef.current && wordIdx.current >= lista.length - 1;
      if (desdeATroca >= rotateEverySec && lista.length > 1 && !noFim) {
        desdeATroca = 0;
        wordIdx.current = (wordIdx.current + 1) % lista.length;
        setIdx(wordIdx.current);
        reveal(lista[wordIdx.current]);
      }
    }, 1000);

    return () => {
      if (dotsId) clearInterval(dotsId);
      clearInterval(tickId);
      if (revealTimer.current) clearInterval(revealTimer.current);
    };
  }, [stepsKey, rotateEverySec]);

  const relogio = showTimer ? (
    <span aria-hidden="true" className="ml-auto pl-3 text-[10px] tabular-nums text-muted-foreground">
      {timer}
    </span>
  ) : null;

  // O que a região viva anuncia: só a palavra assentada. Sem isto o leitor de
  // tela lia o cronômetro a cada segundo, para sempre.
  const anuncio = <span className="sr-only">{alvo}</span>;

  // `min-w` impede o bloco inteiro de pular a cada troca de palavra.
  const palavra = (
    <span aria-hidden="true" className="min-w-[120px] text-foreground">
      {word}
      {dots}
    </span>
  );

  const base = "font-mono text-[11px] font-bold uppercase text-muted-foreground";
  const ruido = <GlitchChars className="text-[var(--accent-ink,var(--muted-foreground))]" />;

  if (variant === "etapas") {
    const lista = steps.length ? steps : [""];
    return (
      <div role="status" aria-live="polite" className={cn(base, "flex flex-col gap-2", className)}>
        {anuncio}
        {lista.map((passo, i) => {
          const feito = i < idx;
          const agora = i === idx;
          return (
            <div key={`${passo}-${i}`} aria-hidden="true" className="flex items-center gap-3">
              {/* Marcador em caixa fixa: o ruído, o ponto cheio e o anel ocupam
                  a mesma largura, então a coluna de texto não dança. */}
              <span className="grid w-[2ch] shrink-0 place-items-center">
                {agora ? (
                  ruido
                ) : (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      feito ? "bg-muted-foreground" : "border border-border",
                    )}
                  />
                )}
              </span>
              {agora ? (
                palavra
              ) : (
                <span className={cn("min-w-[120px]", feito ? "text-muted-foreground" : "text-muted-foreground/50")}>
                  {passo}
                </span>
              )}
              {agora ? relogio : null}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === "barra") {
    return (
      <div role="status" aria-live="polite" className={cn(base, "flex flex-col gap-2.5", className)}>
        <div className="flex items-center gap-3">
          {ruido}
          {palavra}
          {anuncio}
          {relogio}
        </div>
        <Varredura />
      </div>
    );
  }

  if (variant === "pulso") {
    return (
      <div role="status" aria-live="polite" className={cn(base, "flex items-center gap-3", className)}>
        <span aria-hidden="true" className="relative grid size-2 shrink-0 place-items-center">
          <span className="absolute inset-0 rounded-full bg-[var(--brand,var(--foreground))] opacity-40 motion-safe:animate-ping" />
          <span className="relative size-2 rounded-full bg-[var(--brand,var(--foreground))]" />
        </span>
        {palavra}
        {anuncio}
        {relogio}
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className={cn(base, "flex items-center gap-3", className)}>
      {ruido}
      {palavra}
      {anuncio}
      {relogio}
    </div>
  );
}

/**
 * A faixa que varre sem prometer número.
 *
 * Indeterminada de propósito: o ticker existe justamente pra espera em que não
 * há progresso real pra medir. Web Animations API em vez de keyframe CSS, pra
 * peça não depender de um bloco `css` instalado à parte. Sob
 * `prefers-reduced-motion` o segmento fica parado no meio.
 */
function Varredura() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const a = el.animate(
      [{ transform: "translateX(-100%)" }, { transform: "translateX(300%)" }],
      { duration: 1600, iterations: Infinity, easing: "cubic-bezier(0.45, 0, 0.25, 1)" },
    );
    return () => a.cancel();
  }, []);
  return (
    <span aria-hidden="true" className="relative block h-[2px] w-full overflow-hidden rounded-full bg-muted">
      <span
        ref={ref}
        className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--brand,var(--foreground))]"
        style={{ transform: "translateX(100%)" }}
      />
    </span>
  );
}
