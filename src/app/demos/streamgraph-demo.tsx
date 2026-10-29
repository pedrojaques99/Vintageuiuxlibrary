"use client";

/**
 * Pedidos de suporte por assunto, com dois períodos pra trocar.
 *
 * A troca de período é o que vende a peça: 12 semanas viram 26 e o fluxo
 * se refaz num morph, sem corte. Os números são de mentira, mas contam uma
 * história plausível: "Cobrança" incha no fim do trimestre e "Acesso" murcha
 * depois do login novo.
 */

import * as React from "react";

import { Streamgraph, type StreamgraphDatum, type StreamgraphSeries } from "../../../registry/visant/ui/streamgraph";
import type { DemoProps } from "../catalog";

const SERIES: StreamgraphSeries[] = [
  { key: "pedido", label: "Pedido" },
  { key: "cobranca", label: "Cobrança" },
  { key: "acesso", label: "Acesso" },
  { key: "entrega", label: "Entrega" },
  { key: "outros", label: "Outros" },
];

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul"];

/** Série determinística: servidor e cliente desenham igual. */
function semanas(n: number): StreamgraphDatum[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / Math.max(1, n - 1);
    // Semanas de verdade a partir de 5 de janeiro, em UTC pra não depender do fuso.
    const data = new Date(Date.UTC(2026, 0, 5 + i * 7));
    const mes = MESES[data.getUTCMonth()]!;
    const dia = data.getUTCDate();
    return {
      key: `s${i}`,
      label: `Semana de ${dia} de ${mes}.`,
      axisLabel: i % 4 === 0 ? `${dia} ${mes}` : undefined,
      values: {
        pedido: Math.round(42 + 14 * Math.sin(i * 0.55)),
        cobranca: Math.round(16 + 30 * t * t + 5 * Math.cos(i * 0.9)),
        acesso: Math.round(34 * (1 - t) + 6 + 4 * Math.sin(i * 1.3)),
        entrega: Math.round(18 + 9 * Math.sin(i * 0.35 + 1)),
        outros: Math.round(9 + 4 * Math.cos(i * 0.7)),
      },
    };
  });
}

const PERIODOS = { trimestre: semanas(12), semestre: semanas(26) };
type Periodo = keyof typeof PERIODOS;

const opcao =
  "h-7 rounded-[var(--r-pill)] px-3 text-apoio font-medium [transition:background-color_var(--dur-fast)_var(--ease-out),color_var(--dur-fast)_var(--ease-out)] focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]";

export default function StreamgraphDemo({ props }: DemoProps) {
  const [periodo, setPeriodo] = React.useState<Periodo>("trimestre");

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-[560px] max-w-full flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-corpo font-medium text-foreground">Pedidos de suporte</p>
          <div role="group" aria-label="Período" className="inline-flex gap-1 rounded-[var(--r-pill)] border border-border bg-muted p-0.5">
            {(["trimestre", "semestre"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={periodo === p}
                onClick={() => setPeriodo(p)}
                className={`${opcao} ${periodo === p ? "bg-card text-foreground [box-shadow:var(--e-raised)]" : "text-muted-foreground hover:text-foreground"}`}
              >
                {p === "trimestre" ? "12 semanas" : "26 semanas"}
              </button>
            ))}
          </div>
        </div>
        <Streamgraph
          label="Pedidos de suporte por assunto"
          unit="pedidos"
          categoryLabel="Semana"
          series={SERIES}
          data={PERIODOS[periodo]}
          height={200}
          {...props}
        />
      </div>
    </div>
  );
}
