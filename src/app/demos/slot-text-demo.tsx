"use client";

/**
 * A cena em que o rolo se paga: o placar de vendas do dia, que anda sozinho.
 *
 * Cada venda nova soma no total e os rolos giram até o valor novo, da esquerda
 * pra direita, com o ponto de milhar parado no lugar (12.480 vira 12.660 sem o
 * separador piscar). O contador de pedidos embaixo mostra o rolo pequeno, com
 * `spins={0}`, que é o que a peça recomenda pra número que muda sempre.
 *
 * O preço mensal/anual, que também é caso da peça, já mora no Billing Toggle;
 * aqui a cena é outra pra os dois ladrilhos não contarem a mesma história.
 * O botão existe pra quem não quer esperar a próxima venda.
 */

import * as React from "react";
import { Plus } from "lucide-react";

import { SlotText } from "../../../registry/visant/ui/slot-text";
import type { DemoProps } from "../catalog";

/** Vendas que vão chegando, em reais. Fixas: servidor e cliente desenham igual. */
const VENDAS = [180, 95, 240, 60, 315, 120, 45, 210];

export default function SlotTextDemo({ props }: DemoProps) {
  const [placar, setPlacar] = React.useState({ total: 12480, pedidos: 38 });
  const proxima = React.useRef(0);

  const vender = React.useCallback(() => {
    const valor = VENDAS[proxima.current % VENDAS.length]!;
    proxima.current += 1;
    setPlacar((p) => ({ total: p.total + valor, pedidos: p.pedidos + 1 }));
  }, []);

  React.useEffect(() => {
    const t = window.setInterval(vender, 3200);
    return () => window.clearInterval(t);
  }, [vender]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <p className="text-apoio text-muted-foreground">Vendas hoje</p>

        <div className="flex items-baseline gap-1.5 text-foreground">
          <span className="text-titulo font-medium text-muted-foreground">R$</span>
          <SlotText className="text-[3.25rem] font-semibold leading-none tracking-tight" value={placar.total} {...props} />
        </div>

        <div className="flex items-center gap-3">
          <p className="text-apoio text-muted-foreground">
            <SlotText value={placar.pedidos} spins={0} /> pedidos
          </p>
          <button
            type="button"
            onClick={vender}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-control)] border border-border bg-card px-3 text-apoio font-medium text-foreground [transition:background-color_var(--dur-fast)_var(--ease-out)] hover:bg-muted focus-visible:outline-none focus-visible:[box-shadow:var(--focus)] [&_svg]:size-3.5"
          >
            <Plus aria-hidden="true" />
            Nova venda
          </button>
        </div>
      </div>
    </div>
  );
}
