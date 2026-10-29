"use client";

/**
 * Uma dobra por vez, e as setas trocam o lado da foto.
 *
 * O report pediu "UM POR VEZ". A versão anterior empilhava duas dobras num
 * palco que rolava por dentro: a segunda ficava cortada e a primeira pequena.
 * Agora é uma dobra só, inteira, e a seta troca pra próxima, que chega com a
 * foto do outro lado. É a alternância que a peça vende, vista um passo de cada
 * vez: trocar remonta a dobra, então a moldura abre e o texto entra de novo,
 * vindo da borda de fora.
 *
 * O nome entre as setas é o valor de `side`.
 */

import * as React from "react";

import { Media } from "../media";
import { PhotoSplit } from "../../../registry/visant/ui/photo-split";
import type { DemoProps } from "../catalog";
import { Trocador, useUmPorVez } from "./um-por-vez";

const DOBRAS = [
  {
    side: "left",
    eyebrow: "Marca",
    title: "A guideline compilada entra antes da primeira tela.",
    lead: "Cor, tipografia e regra de logo saem do vault. O site nasce com a marca resolvida.",
    indice: 0,
  },
  {
    side: "right",
    eyebrow: "Produção",
    title: "A dobra seguinte inverte sozinha.",
    lead: "O lado de cada foto é escrito pela pilha. Inserir uma dobra no meio não desalinha as de baixo.",
    indice: 3,
  },
] as const;

const LADOS = DOBRAS.map((d) => d.side);

export default function PhotoSplitDemo({ props }: DemoProps) {
  // `start` e `space` são da pilha, que aqui não existe: uma dobra por vez.
  const { side: _s, start: _st, space: _sp, ...resto } = (props ?? {}) as Record<string, unknown>;
  const { i, rodada, passo, repetir } = useUmPorVez(LADOS, _s);
  const d = DOBRAS[i];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden px-6 py-4">
      <PhotoSplit
        key={`${i}-${rodada}`}
        className="w-full max-w-[52rem]"
        eyebrow={d.eyebrow}
        title={d.title}
        lead={d.lead}
        ratio="4/3"
        gap={2.5}
        media={<Media papel="cena" indice={d.indice} className="size-full" />}
        {...resto}
        side={d.side}
      />

      <Trocador nome={d.side} onPasso={passo} onRepetir={repetir} />
    </div>
  );
}
