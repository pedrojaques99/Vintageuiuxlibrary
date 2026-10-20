"use client";

/**
 * Um movimento por vez, num trilho de verdade.
 *
 * O report pediu "UM POR VEZ". A versão anterior punha quatro cards, um por
 * `motion`, com o nome embaixo de cada: quatro esperas diferentes no mesmo
 * quadro brigam pelo olho, e nenhuma parecia a tela de carregamento que ela é.
 * Agora é um trilho só, com três cards, esperando de um jeito; as setas trocam
 * o `motion` e o nome entre elas é o valor da prop.
 *
 * Os knobs da ficha (proporção, quantidade, largura) continuam mexendo na peça:
 * os valores daqui vêm antes do `{...props}`. O `motion` vem depois, porque é a
 * variável que o seletor troca.
 */

import * as React from "react";

import {
  SkeletonRail,
  type SkeletonMotion,
} from "../../../registry/visant/ui/skeleton-rail";
import type { DemoProps } from "../catalog";
import { Trocador, useUmPorVez } from "./um-por-vez";

const MOVIMENTOS: readonly SkeletonMotion[] = ["pulse", "shimmer", "wave", "none"];

export default function SkeletonRailDemo({ props }: DemoProps) {
  const { motion: _m, ...resto } = (props ?? {}) as { motion?: SkeletonMotion } & Record<string, unknown>;
  const { atual, rodada, passo, repetir } = useUmPorVez(MOVIMENTOS, _m);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6">
      <div className="w-[520px] max-w-full">
        <SkeletonRail
          key={`${atual}-${rodada}`}
          cards={3}
          heading={false}
          itemWidth={140}
          gap={16}
          ratio="4 / 5"
          {...resto}
          motion={atual}
        />
      </div>
      <Trocador nome={atual} onPasso={passo} onRepetir={repetir} />
    </div>
  );
}
