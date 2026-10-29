"use client";

/**
 * O medidor numa cena de cota: espaço do plano, com as três faixas nomeadas.
 *
 * Os dois botões existem pra mostrar a regra que a peça defende: a cor e o nome
 * da faixa trocam quando a contagem CRUZA o limite. Subindo de 80 pra 95, o
 * "Quase cheio" vira "Lotado" no meio da mola, não no clique.
 */

import * as React from "react";
import { Minus, Plus } from "lucide-react";

import { Gauge } from "../../../registry/visant/ui/gauge";
import type { DemoProps } from "../catalog";

const TOTAL = 500;
const FAIXAS = [
  { from: 0, label: "Tranquilo" },
  { from: 70, label: "Quase cheio" },
  { from: 90, label: "Lotado", alert: true },
];

const botao =
  "inline-flex size-9 items-center justify-center rounded-[var(--r-control)] border border-border bg-card text-foreground [transition:background-color_var(--dur-fast)_var(--ease-out)] hover:bg-muted focus-visible:outline-none focus-visible:[box-shadow:var(--focus)] disabled:opacity-40";

export default function GaugeDemo({ props }: DemoProps) {
  const [pct, setPct] = React.useState(72);
  const usado = Math.round((pct / 100) * TOTAL);

  return (
    <div className="flex h-full w-full items-center justify-center gap-6">
      <button type="button" className={botao} aria-label="Liberar espaço" disabled={pct <= 0} onClick={() => setPct((p) => Math.max(0, p - 12))}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <Gauge
        className="w-44"
        label="Espaço do plano"
        value={pct}
        detail={`${usado} de ${TOTAL} GB`}
        bands={FAIXAS}
        {...props}
      />
      <button type="button" className={botao} aria-label="Ocupar espaço" disabled={pct >= 100} onClick={() => setPct((p) => Math.min(100, p + 12))}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
