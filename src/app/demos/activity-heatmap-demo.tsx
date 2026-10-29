"use client";

/**
 * Seis meses de entregas de um estúdio, um quadrado por dia.
 *
 * O dado é gerado por semente fixa e termina numa data fixa: a vitrine
 * renderiza igual no servidor e no cliente, e a captura de tela não muda a
 * cada build. O ritmo imita trabalho de verdade (fim de semana fraco, uma
 * semana de férias parada, um mês de lançamento puxado), porque é a sequência
 * e o buraco que a peça existe pra mostrar.
 *
 * Clicar num dia (ou Enter nele) marca a seleção, e a linha embaixo diz qual é.
 */

import * as React from "react";

import { ActivityHeatmap, type ActivityDay } from "../../../registry/visant/ui/activity-heatmap";
import type { DemoProps } from "../catalog";

const FIM = Date.parse("2026-10-17T00:00:00Z");
const DIAS = 26 * 7;

function gerar(): ActivityDay[] {
  let s = 20261017;
  const r = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return Array.from({ length: DIAS }, (_, k) => {
    const t = FIM - (DIAS - 1 - k) * 86_400_000;
    const d = new Date(t);
    const fds = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const ferias = k >= 70 && k < 79;
    const lancamento = d.getUTCMonth() === 8;
    const base = ferias ? 0 : fds ? (r() < 0.75 ? 0 : 1) : 2 + r() * 5 + (lancamento ? 4 : 0);
    return { date: d.toISOString().slice(0, 10), count: Math.max(0, Math.round(base - (r() < 0.12 ? base : 0))) };
  });
}

const formato = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });

export default function ActivityHeatmapDemo({ props }: DemoProps) {
  const dias = React.useMemo(gerar, []);
  const [sel, setSel] = React.useState<string | null>(null);
  const escolhido = sel ? dias.find((d) => d.date === sel) : undefined;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="grid gap-3">
        <ActivityHeatmap
          days={dias}
          label="Entregas nos últimos seis meses"
          period="seis meses"
          unit={{ one: "entrega", other: "entregas" }}
          selectedDate={sel}
          onSelectDate={setSel}
          {...props}
        />
        <p className="m-0 h-5 text-apoio text-muted-foreground" aria-live="polite">
          {escolhido
            ? `${formato.format(Date.parse(`${escolhido.date}T00:00:00Z`))}: ${escolhido.count} ${escolhido.count === 1 ? "entrega" : "entregas"}`
            : "Toque num dia pra ver a conta."}
        </p>
      </div>
    </div>
  );
}
