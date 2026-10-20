"use client";

/**
 * A peça onde ela costuma morar: o rodapé de um pagamento, com o valor escrito
 * logo acima. "Desfazer" rearma o trilho pela prop `confirmed`.
 */

import * as React from "react";

import { SlideToConfirm } from "../../../registry/visant/ui/slide-to-confirm";
import type { DemoProps } from "../catalog";

export default function SlideToConfirmDemo({ props }: DemoProps) {
  const [feito, setFeito] = React.useState(false);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-[340px] max-w-full flex-col gap-4 rounded-[var(--r-surface)] border border-border bg-card p-5 text-foreground">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted-foreground">Pix pra Estúdio Ribalta</p>
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
        <p className="flex h-5 items-center justify-between text-sm text-muted-foreground">
          {feito ? "Pagamento enviado." : "Solte antes do fim pra desistir."}
          {feito && (
            <button
              type="button"
              onClick={() => setFeito(false)}
              className="rounded-[var(--r-control)] px-2 py-0.5 text-sm text-muted-foreground underline-offset-4 outline-none [font:inherit] hover:underline focus-visible:[box-shadow:var(--focus)]"
            >
              Desfazer
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
