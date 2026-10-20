"use client";

/**
 * Um widget de caixa do dia: puxa pra baixo e entra a venda nova. O atraso
 * simulado é o que deixa o anel girar o bastante pra ser visto.
 */

import * as React from "react";

import { PullToRefresh } from "../../../registry/visant/ui/pull-to-refresh";
import type { DemoProps } from "../catalog";

const VENDAS = [
  { quem: "Ana Lúcia", valor: 89.9 },
  { quem: "Bruno Takeda", valor: 240 },
  { quem: "Café Barão", valor: 1320.5 },
  { quem: "Joana Prado", valor: 56 },
  { quem: "Marcos Vidal", valor: 410 },
];

const real = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PullToRefreshDemo({ props }: DemoProps) {
  const [n, setN] = React.useState(2);
  const lista = VENDAS.slice(0, n).reverse();
  const total = 4870 + VENDAS.slice(0, n).reduce((s, v) => s + v.valor, 0);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <PullToRefresh
        label="Caixa de hoje"
        className="w-[320px] max-w-full"
        {...props}
        onRefresh={() =>
          new Promise<void>((ok) =>
            setTimeout(() => {
              setN((v) => (v >= VENDAS.length ? 2 : v + 1));
              ok();
            }, 1100),
          )
        }
      >
        <div className="flex flex-col gap-4 p-5 pt-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm text-muted-foreground">Caixa de hoje</p>
            <p className="text-2xl font-semibold tabular-nums">{real(total)}</p>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {lista.map((v) => (
              <li key={v.quem} className="flex justify-between py-2 text-sm">
                <span>{v.quem}</span>
                <span className="tabular-nums text-muted-foreground">{real(v.valor)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Puxa pra baixo pra atualizar.</p>
        </div>
      </PullToRefresh>
    </div>
  );
}
