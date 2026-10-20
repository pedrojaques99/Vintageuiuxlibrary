"use client";

/**
 * Um pedido em andamento, o caso em que o card se paga.
 *
 * O resumo atualiza sozinho a cada poucos segundos ("3 itens" vira "4 itens")
 * para mostrar a segunda metade da peça: só a palavra que mudou rola, o resto
 * fica parado. Aberto, o card cresce para os lados além de para baixo.
 */

import * as React from "react";

import { ExpandableCard } from "../../../registry/visant/ui/expandable-card";
import type { DemoProps } from "../catalog";

const RESUMOS = [
  "3 itens, sai amanhã cedo",
  "4 itens, sai amanhã cedo",
  "4 itens, saiu para entrega",
];

const ITENS = [
  ["Caderno pautado A5", "R$ 48"],
  ["Caneta tinteiro", "R$ 129"],
  ["Refil azul, caixa com 6", "R$ 36"],
  ["Embalagem presente", "R$ 12"],
];

export default function ExpandableCardDemo({ props }: DemoProps) {
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setI((v) => (v + 1) % RESUMOS.length), 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <ExpandableCard
        title="Pedido 2048"
        description={RESUMOS[i]}
        width={340}
        expandedWidth={440}
        {...props}
      >
        <ul className="grid gap-2">
          {ITENS.map(([nome, preco]) => (
            <li key={nome} className="flex justify-between gap-4">
              <span>{nome}</span>
              <span className="tabular-nums text-foreground">{preco}</span>
            </li>
          ))}
        </ul>
      </ExpandableCard>
    </div>
  );
}
