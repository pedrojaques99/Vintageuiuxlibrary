"use client";

/**
 * A árvore parada no palco, arrastável — sem scroll.
 *
 * O modo `scroll` precisa de uma seção de página inteira para ter o que rolar;
 * num card ele não teria comprimento nenhum. Aqui o progresso fica fixo no meio
 * da caminhada (a árvore inteira no quadro, a névoa já abrindo) e o que a demo
 * prova é o resto: o duotone lendo os tokens do tema da vitrine, o arrasto com
 * inércia e o texto por cima pelo slot de `children`.
 */

import * as React from "react";

import { FogTree } from "../../../registry/visant/ui/fog-tree";
import type { DemoProps } from "../catalog";

export default function FogTreeDemo({ props }: DemoProps) {
  return (
    <FogTree
      // min-h: na rota solo o palco não tem altura, e com min-h-0 a cena virava uma faixa achatada
      className="h-full min-h-[480px] rounded-[var(--r-surface,0.875rem)] border border-border"
      progress={0.35}
      draggable
      {...props}
    >
      <div className="flex h-full flex-col justify-between p-6 text-foreground">
        <p className="text-[length:var(--text-micro,0.68rem)] uppercase tracking-[0.12em] opacity-60">
          Tema central
        </p>
        <div className="flex items-end justify-between gap-6">
          <h3 className="max-w-[14ch] text-4xl font-normal leading-[0.95] tracking-tight">
            Um jardim que aparece aos poucos
          </h3>
          <span className="shrink-0 text-[length:var(--text-micro,0.68rem)] uppercase tracking-[0.12em] opacity-60">
            arraste
          </span>
        </div>
      </div>
    </FogTree>
  );
}
