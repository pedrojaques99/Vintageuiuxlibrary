"use client";

/**
 * Duas molduras vizinhas, defasadas — que é como a peça vive numa página.
 *
 * Uma moldura só não mostraria a armadilha 2 do componente: vizinhas com o mesmo
 * relógio trocam juntas e a página pisca inteira. Aqui elas começam em slides
 * diferentes (`start`) e trocam em intervalos que não se alinham tão cedo.
 *
 * A segunda leva o `overlay` — um véu de leitura em `color-mix` sobre o fundo —
 * pra mostrar que a camada atravessa a névoa junto com a foto certa.
 *
 * O pai de cada uma é `relative` com `aspect-ratio`: a peça preenche o pai e
 * não tem altura própria. É o contrato, e a demo o cumpre à vista.
 */

import * as React from "react";

import { MistSwap } from "../../../registry/visant/ui/mist-swap";
import { midia, type Papel } from "../media";
import type { DemoProps } from "../catalog";

function slides(papel: Papel, n: number) {
  return Array.from({ length: n }, (_, i) => midia(papel, i))
    .filter((m): m is NonNullable<typeof m> => !!m && m.tipo === "imagem")
    .map((m) => <img key={m.id} src={m.src} alt={m.alt} loading="lazy" decoding="async" />);
}

export default function MistSwapDemo(_: DemoProps) {
  const cenas = React.useMemo(() => slides("cena", 4), []);
  const texturas = React.useMemo(() => slides("textura", 4), []);

  return (
    <div className="grid h-full w-full grid-cols-2 items-center gap-4 px-5">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--r-surface,16px)] bg-muted">
        <MistSwap interval={4200}>{cenas}</MistSwap>
      </div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--r-surface,16px)] bg-muted">
        <MistSwap
          interval={5300}
          start={1}
          overlay={
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_oklab,var(--background)_70%,transparent),transparent_55%)]"
            />
          }
        >
          {texturas}
        </MistSwap>
        <p className="pointer-events-none absolute bottom-4 left-4 font-mono text-rotulo uppercase tracking-[0.12em] text-foreground">
          com overlay
        </p>
      </div>
    </div>
  );
}
