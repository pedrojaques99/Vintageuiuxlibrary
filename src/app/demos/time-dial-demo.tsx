"use client";

/**
 * O mostrador marca a hora de São Paulo; a lista ao lado faz a conta de fuso
 * pra cada escritório e diz quem está no expediente. Fuso fixo, de propósito:
 * a demo mostra a peça, não uma tabela de horário de verão.
 */

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { TimeDial, formatDialTime } from "../../../registry/visant/ui/time-dial";
import type { DemoProps } from "../catalog";

const CASA = -3;
const CIDADES = [
  { nome: "São Paulo", fuso: -3 },
  { nome: "Nova York", fuso: -4 },
  { nome: "Lisboa", fuso: 1 },
  { nome: "Tóquio", fuso: 9 },
];
const EXPEDIENTE: [number, number] = [9 * 60, 18 * 60];

export default function TimeDialDemo({ props }: DemoProps) {
  const [min, setMin] = React.useState(17 * 60);

  const linhas = CIDADES.map((c) => {
    const dif = c.fuso - CASA;
    const bruto = min + dif * 60;
    const local = ((bruto % 1440) + 1440) % 1440;
    const dia = Math.floor(bruto / 1440);
    const quando = dia > 0 ? ", amanhã" : dia < 0 ? ", ontem" : "";
    return {
      ...c,
      local,
      trabalhando: local >= EXPEDIENTE[0] && local < EXPEDIENTE[1],
      nota: dif === 0 ? "Casa" : `${Math.abs(dif)} h ${dif > 0 ? "à frente" : "atrás"}${quando}`,
    };
  });
  const noExpediente = linhas.filter((l) => l.trabalhando).length;

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <TimeDial value={min} onValueChange={setMin} band={EXPEDIENTE} caption="São Paulo" label="Hora em São Paulo" {...props} />
        <div className="flex w-[220px] flex-col gap-1">
          <ul className="flex flex-col">
            {linhas.map((l) => (
              <li key={l.nome} className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
                {l.trabalhando ? (
                  <Sun aria-hidden="true" className="size-4 shrink-0 text-foreground" strokeWidth={1.75} />
                ) : (
                  <Moon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-foreground">{l.nome}</span>
                  <span className="block text-xs text-muted-foreground">{l.nota}</span>
                </span>
                <span className="text-base tabular-nums text-foreground">{formatDialTime(l.local)}</span>
              </li>
            ))}
          </ul>
          <p className="pt-1 text-xs text-muted-foreground" aria-live="polite">
            {noExpediente} de {CIDADES.length} escritórios no expediente
          </p>
        </div>
      </div>
    </div>
  );
}
