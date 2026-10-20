"use client";

/**
 * Agendar um envio: os rolos e três atalhos que movem os rolos, pra mostrar
 * que o valor de fora também viaja até o lugar.
 */

import * as React from "react";
import { Check } from "lucide-react";

import { DateReel } from "../../../registry/visant/ui/date-reel";
import type { DemoProps } from "../catalog";

const hoje = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const somar = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const proximaSegunda = (d: Date) => somar(d, (8 - d.getDay()) % 7 || 7);

const extenso = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function DateReelDemo({ props }: DemoProps) {
  const base = React.useMemo(hoje, []);
  const [data, setDataBruto] = React.useState(() => somar(base, 1));
  const [agendado, setAgendado] = React.useState(false);
  const setData = (d: Date) => {
    setDataBruto(d);
    setAgendado(false);
  };
  const atalhos = [
    { rotulo: "Hoje", data: base },
    { rotulo: "Amanhã", data: somar(base, 1) },
    { rotulo: "Segunda", data: proximaSegunda(base) },
  ];
  const texto = extenso.format(data);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex w-[380px] max-w-full flex-col gap-4 rounded-[var(--r-surface)] border border-border bg-card p-5 [box-shadow:var(--e-raised)]">
        <div>
          <p className="text-xs text-muted-foreground">Enviar depois</p>
          <p className="text-lg font-medium text-foreground" aria-live="polite">
            {texto.charAt(0).toUpperCase() + texto.slice(1)}
          </p>
        </div>
        <DateReel
          value={data}
          onValueChange={setData}
          minYear={base.getFullYear()}
          maxYear={base.getFullYear() + 3}
          label="Data do envio"
          {...props}
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {atalhos.map((a) => (
            <button
              key={a.rotulo}
              type="button"
              aria-pressed={a.data.getTime() === data.getTime()}
              onClick={() => setData(a.data)}
              className="h-8 rounded-[var(--r-pill)] border border-border bg-background px-2.5 text-sm text-foreground [font:inherit] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-muted aria-pressed:bg-muted focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]"
            >
              {a.rotulo}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAgendado(true)}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[var(--r-control)] bg-[var(--brand)] px-4 text-sm font-medium text-[var(--brand-foreground)] [font:inherit] focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]"
          >
            {agendado && <Check aria-hidden="true" className="size-4" />}
            {agendado ? "Agendado" : "Agendar"}
          </button>
        </div>
      </div>
    </div>
  );
}
