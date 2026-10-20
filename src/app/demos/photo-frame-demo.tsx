"use client";

/**
 * Uma moldura por vez, e as setas trocam de onde ela abre.
 *
 * ── O que os reports acusaram ──────────────────────────────────────────────
 *
 * Primeiro "sempre em loop, com timer": a revelação durava 1,4s e depois o
 * card era foto parada. Depois "UM POR VEZ": três molduras pequenas lado a
 * lado, cada uma com legenda técnica, dividiam o olho e nenhuma era grande o
 * bastante pra se ver o corte abrindo.
 *
 * Agora é uma moldura só, grande, e a variação é `from` (o lado de onde ela
 * abre). Trocar remonta a peça e a revelação acontece na hora; clicar no nome
 * repete. Com o palco em tela, a mesma variação volta a abrir sozinha a cada
 * ciclo, e o anel ao lado do seletor mostra onde o ciclo está.
 *
 * ── Por que o loop mora aqui e não no componente ───────────────────────────
 *
 * Revelar em loop seria ERRADO no `@visant/photo-frame`: numa página de verdade
 * a foto se revela quando a pessoa chega nela, uma vez. O que a VITRINE precisa
 * é rever o gesto, e rever, em React, é remontar pela `key`.
 *
 * As duas paradas da casa valem: fora da tela o relógio não roda
 * (`useStageActive`), e sob `prefers-reduced-motion` não há loop nem anel.
 */

import * as React from "react";

import { Media } from "../media";
import { PhotoFrame, type PhotoFrameProps } from "../../../registry/visant/ui/photo-frame";
import { useStageActive } from "../stage";
import type { DemoProps } from "../catalog";
import { Trocador, useUmPorVez } from "./um-por-vez";

type Lado = NonNullable<PhotoFrameProps["from"]>;
const LADOS: readonly Lado[] = ["bottom", "left", "top", "right"];
/** Uma foto por lado: trocar a variação também troca a imagem, e a troca se vê. */
const FOTO: Record<Lado, { papel: "cena" | "retrato"; indice: number }> = {
  bottom: { papel: "cena", indice: 1 },
  left: { papel: "retrato", indice: 2 },
  top: { papel: "cena", indice: 3 },
  right: { papel: "cena", indice: 0 },
};

/** Duração do ciclo. A revelação leva 1,4s; o resto é tempo de olhar. */
const CICLO = 4200;

const usaMovimento = () =>
  typeof window === "undefined" ||
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const R = 8;
const VOLTA = 2 * Math.PI * R;

/** O anel do ciclo. Remontado a cada rodada; a `key` é quem reinicia o traço. */
function Temporizador({ ms }: { ms: number }) {
  const [correndo, setCorrendo] = React.useState(false);
  // Um quadro parado antes de soltar: `transition` só existe entre dois valores
  // já pintados.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setCorrendo(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 -rotate-90" aria-hidden fill="none">
      <circle cx="10" cy="10" r={R} stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <circle
        cx="10"
        cy="10"
        r={R}
        stroke="var(--brand)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={VOLTA}
        style={{
          strokeDashoffset: correndo ? 0 : VOLTA,
          transition: `stroke-dashoffset ${ms}ms linear`,
        }}
      />
    </svg>
  );
}

export default function PhotoFrameDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const [anima] = React.useState(usaMovimento);
  const { from: _f, ...resto } = (props ?? {}) as { from?: Lado } & Record<string, unknown>;
  const { atual, rodada, passo, repetir } = useUmPorVez(LADOS, _f);
  const foto = FOTO[atual];

  React.useEffect(() => {
    if (!ativo || !anima) return;
    const id = window.setTimeout(repetir, CICLO);
    return () => window.clearTimeout(id);
  }, [ativo, anima, rodada, repetir]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-3">
      <PhotoFrame
        key={`${atual}-${rodada}`}
        ratio="4/5"
        className="w-[min(200px,60vw)] max-w-full"
        {...resto}
        from={atual}
      >
        <Media papel={foto.papel} indice={foto.indice} className="size-full" />
      </PhotoFrame>

      <div className="flex items-center gap-1 text-muted-foreground">
        <Trocador nome={atual} onPasso={passo} onRepetir={repetir} />
        {anima ? <Temporizador key={rodada} ms={CICLO} /> : null}
      </div>
    </div>
  );
}
