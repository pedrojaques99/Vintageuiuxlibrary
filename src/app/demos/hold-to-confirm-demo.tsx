"use client";

/**
 * A peça na cena em que ela substitui um diálogo: uma linha de configuração
 * cuja consequência já está escrita do lado. "Desfazer" rearma o botão pela
 * prop `confirmed`, que é o caminho real depois de um desfazer.
 */

import * as React from "react";

import { HoldToConfirm } from "../../../registry/visant/ui/hold-to-confirm";
import type { DemoProps } from "../catalog";

export default function HoldToConfirmDemo({ props }: DemoProps) {
  const [feito, setFeito] = React.useState(false);
  const [segurando, setSegurando] = React.useState(false);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-[360px] max-w-full flex-col gap-4 rounded-[var(--r-surface)] border border-border bg-card p-5 text-foreground">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Projeto Ribalta</p>
          <p className="text-sm text-muted-foreground">
            {feito ? "Apagado. Dá pra desfazer agora." : "Apaga os 48 arquivos e o histórico."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HoldToConfirm
            label="Segure pra apagar"
            confirmedLabel="Apagado"
            {...props}
            confirmed={feito}
            onConfirm={() => setFeito(true)}
            onHoldChange={setSegurando}
          />
          {feito ? (
            <button
              type="button"
              onClick={() => setFeito(false)}
              className="rounded-[var(--r-control)] px-2 py-1 text-sm text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:[box-shadow:var(--focus)]"
            >
              Desfazer
            </button>
          ) : (
            <span aria-hidden="true" className="text-sm text-muted-foreground">
              {segurando ? "Continua segurando" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
