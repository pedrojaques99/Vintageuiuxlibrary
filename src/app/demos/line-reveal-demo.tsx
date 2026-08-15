"use client";

/**
 * A galeria das quatro revelações, rodando ao mesmo tempo.
 *
 * ── Por que quatro juntas, e não uma por vez com setas ─────────────────────
 *
 * É o oposto da decisão do `marquee-demo`, e de propósito. Lá a peça é uma
 * faixa que responde ao SCROLL: comparar duas ao mesmo tempo é impossível
 * porque a comparação depende de um gesto contínuo, e só se pode olhar uma.
 * Aqui a peça é uma entrada de meio segundo disparada por um botão. Quatro
 * entradas curtas no mesmo quadro é exatamente o que deixa a diferença visível
 * — em sequência, a memória da anterior já apagou quando a próxima termina.
 *
 * Por isso o replay dispara as quatro juntas: o `key` remonta a galeria
 * inteira, cada `LineReveal` refaz o split e a comparação acontece uma vez, no
 * mesmo instante, com a mesma frase.
 *
 * ── As decisões pequenas ───────────────────────────────────────────────────
 *
 * · **A mesma frase nas quatro.** Trocar o texto por coluna faria comparar
 *   texto, não revelação.
 * · **Coluna estreita de propósito.** A peça revela POR LINHA; numa faixa larga
 *   a frase caberia numa linha só e a cascata teria um elemento — que é o mesmo
 *   que não ter cascata. ~300px força três linhas em todas.
 * · **`immediate`.** Num palco que já nasce visível, um gatilho de rolagem nunca
 *   dispara, e o card ficaria com quatro títulos parados prometendo animação.
 * · **O rótulo é o nome da prop.** Quem está escolhendo a variação vai digitar
 *   `variant="curtain"`, não "cortina" — o rótulo da vitrine é a chave da API.
 */

import * as React from "react";

import { LineReveal } from "../../../registry/visant/ui/line-reveal";
import type { LineRevealVariant } from "../../../registry/visant/ui/line-reveal";

const FRASE = "A quebra de linha é do navegador. O corte, do desenho.";

const VARIACOES: ReadonlyArray<{ v: LineRevealVariant; nota: string }> = [
  { v: "mask", nota: "sobe de dentro do corte" },
  { v: "blur", nota: "desfoca e assenta" },
  { v: "curtain", nota: "limpa da esquerda" },
  { v: "rise", nota: "sobe sem corte" },
];

export default function LineRevealDemo() {
  const [n, setN] = React.useState(0);

  return (
    <div className="flex h-full w-full flex-col justify-center gap-6 px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setN((x) => x + 1)}
          className="alvo-toque inline-flex shrink-0 items-center gap-2 rounded-[var(--r-control,0.5rem)] border border-border px-3 py-1.5 text-apoio text-muted-foreground outline-none transition-[color,border-color,transform] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--brand)] hover:text-foreground focus-visible:border-[var(--brand)] focus-visible:text-foreground active:scale-[0.97] active:[transition-duration:var(--dur-press)] motion-reduce:active:scale-100"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
          </svg>
          revelar as quatro
        </button>
      </div>

      {/* `key` na galeria inteira: cada replay remonta os quatro splits no
          mesmo quadro. Remontar é a única forma honesta de repetir uma entrada
          que, por contrato, acontece uma vez só. */}
      {/* Quatro colunas só onde cabem quatro colunas. A frase de comparação tem
          medida própria: espremida em 90px no celular ela quebra em seis linhas
          e a diferença entre as revelações — que é o produto desta galeria —
          some. Duas a duas continua comparável; quatro a 360px, não. */}
      <div key={n} className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {VARIACOES.map(({ v, nota }) => (
          <div key={v} className="flex min-w-0 flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-rotulo tracking-[0.12em] text-foreground">{v}</span>
              <span className="truncate font-mono text-micro text-muted-foreground">{nota}</span>
            </div>
            <span className="block h-px bg-border" />
            <LineReveal
              as="h3"
              variant={v}
              immediate
              className="text-[1.35rem] font-medium leading-[1.2]"
            >
              {FRASE}
            </LineReveal>
          </div>
        ))}
      </div>
    </div>
  );
}
