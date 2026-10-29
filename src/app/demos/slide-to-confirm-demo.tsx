"use client";

/**
 * A peça onde ela costuma morar: o fim de um pagamento, com o valor escrito
 * logo acima. Sem moldura em volta, pra o trilho ser o que se vê. Confirmado,
 * "Desfazer" rearma o trilho pela prop `confirmed`.
 */

import * as React from "react";

import { SlideToConfirm } from "../../../registry/visant/ui/slide-to-confirm";
import type { DemoProps } from "../catalog";

export default function SlideToConfirmDemo({ props }: DemoProps) {
  const [feito, setFeito] = React.useState(false);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-[320px] max-w-full flex-col gap-3 text-foreground">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <p className="text-sm text-muted-foreground">Total do pedido</p>
          <p className="text-lg font-semibold tabular-nums">R$ 1.280,00</p>
        </div>
        <SlideToConfirm
          label="Deslize pra pagar"
          confirmedLabel="Pago"
          className="w-full"
          {...props}
          confirmed={feito}
          onConfirm={() => setFeito(true)}
        />
        <div className="flex h-6 items-center justify-center">
          {feito && (
            <button
              type="button"
              onClick={() => setFeito(false)}
              className="rounded-[var(--r-control)] px-2 py-0.5 text-sm text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:[box-shadow:var(--focus)]"
            >
              Desfazer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
