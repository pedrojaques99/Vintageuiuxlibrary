"use client";

/**
 * A cena em que o rolo se paga: o preço trocando de plano.
 *
 * Os dois números são da mesma conta (cobrança mensal ou anual), então o giro
 * conta uma coisa verdadeira: o preço desceu, e os dígitos rodam pra baixo.
 * O total do ano embaixo mostra o outro truque, o de 1.548 pra 1.188 em que só
 * os dígitos giram e o ponto de milhar fica parado.
 */

import * as React from "react";

import { SlotText } from "../../../registry/visant/ui/slot-text";
import type { DemoProps } from "../catalog";

type Ciclo = "mensal" | "anual";

const PRECO: Record<Ciclo, number> = { mensal: 129, anual: 99 };

const opcao =
  "h-8 rounded-[var(--r-pill)] px-4 text-apoio font-medium [transition:background-color_var(--dur-fast)_var(--ease-out),color_var(--dur-fast)_var(--ease-out)] focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]";

export default function SlotTextDemo({ props }: DemoProps) {
  const [ciclo, setCiclo] = React.useState<Ciclo>("mensal");
  const preco = PRECO[ciclo];

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div role="group" aria-label="Ciclo de cobrança" className="inline-flex gap-1 rounded-[var(--r-pill)] border border-border bg-muted p-1">
          {(["mensal", "anual"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={ciclo === c}
              onClick={() => setCiclo(c)}
              className={`${opcao} ${ciclo === c ? "bg-card text-foreground [box-shadow:var(--e-raised)]" : "text-muted-foreground hover:text-foreground"}`}
            >
              {c === "mensal" ? "Mensal" : "Anual"}
            </button>
          ))}
        </div>

        <div className="flex items-baseline gap-1.5 text-foreground">
          <span className="text-titulo font-medium text-muted-foreground">R$</span>
          <SlotText className="text-[3.25rem] font-semibold tracking-tight" value={preco} {...props} />
          <span className="text-corpo text-muted-foreground">por mês</span>
        </div>

        <p className="text-apoio text-muted-foreground">
          <SlotText value={preco * 12} {...props} /> reais no ano
        </p>
      </div>
    </div>
  );
}
