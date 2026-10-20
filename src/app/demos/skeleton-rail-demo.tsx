"use client";

/**
 * Os quatro movimentos do esqueleto, lado a lado, no mesmo card.
 *
 * A demo anterior mostrava cinco formatos e um trilho de cinco cards ao mesmo
 * tempo, trocando por conteúdo a cada dois segundos: muita coisa espremida, e o
 * que a pessoa escolhe de fato (como a espera se mexe) não aparecia. Agora é
 * UM formato repetido quatro vezes, e o que muda entre eles é só `motion`. O
 * nome embaixo é o valor da prop.
 *
 * Cada coluna é um `SkeletonRail` de um card só, pra os knobs da ficha (raio,
 * proporção, quantidade) continuarem mexendo na peça de verdade. O `motion`
 * vem depois dos knobs: é a variável que a cena compara.
 */

import {
  SkeletonRail,
  type SkeletonMotion,
} from "../../../registry/visant/ui/skeleton-rail";
import type { DemoProps } from "../catalog";

const MOVIMENTOS: SkeletonMotion[] = ["pulse", "shimmer", "wave", "none"];

export default function SkeletonRailDemo({ props }: DemoProps) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="flex h-full w-full items-center justify-center p-6"
    >
      <div className="grid w-[600px] max-w-full grid-cols-4 gap-6">
        {MOVIMENTOS.map((m) => (
          <div key={m} className="flex min-w-0 flex-col gap-1">
            <SkeletonRail
              cards={1}
              heading={false}
              itemWidth={100}
              gap={0}
              ratio="4 / 5"
              {...props}
              motion={m}
              label={false}
            />
            <span className="font-mono text-micro text-muted-foreground/70">{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
