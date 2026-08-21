"use client";

/**
 * Três lojas, o mesmo instante, três respostas.
 *
 * A demo antiga mostrava uma loja e uma linha de texto — ou seja, mostrava
 * exatamente a única coisa que a peça NÃO faz de especial. O trabalho dela é
 * invisível por definição: a hora sai do fuso da loja, não do relógio de quem
 * visita. Com uma loja só, esse trabalho não tem como aparecer; parece um
 * `if` escrito à mão.
 *
 * Lado a lado ele aparece sozinho. O relógio de cada linha é a prova: são três
 * horários diferentes no mesmo segundo, e o estado de cada loja obedece ao
 * horário DELA — inclusive o domingo em que Lisboa não abre e a resposta vira
 * "abre segunda".
 *
 * O relógio segue `useStageActive`: card fora da tela, ninguém contando.
 */

import * as React from "react";

import { StoreStatus, type StoreStatusLabels } from "../../../registry/visant/ui/store-status";
import { useStageActive } from "../stage";
import type { DemoProps } from "../catalog";

const PT: Partial<StoreStatusLabels> = {
  open: () => "Aberto agora",
  closed: () => "Fechado",
  closesIn: ({ horas, minutos }) =>
    `fecha em ${horas ? `${horas}h${String(minutos).padStart(2, "0")}` : `${minutos} min`}`,
  opensAt: ({ hora, dia, emDias }) =>
    emDias === 0
      ? `abre às ${hora}`
      : emDias === 1
        ? `abre amanhã às ${hora}`
        : `abre ${dia}, ${hora}`,
  hour: (h) => `${h}h`,
};

const LOJAS = [
  {
    cidade: "São Paulo",
    bairro: "Pinheiros",
    timeZone: "America/Sao_Paulo",
    openHour: 9,
    closeHour: 18,
    // Fecha domingo: é o caso que faz a peça responder "abre segunda" em vez
    // de "abre às 9h" num dia em que ninguém abre.
    openDays: [1, 2, 3, 4, 5, 6],
  },
  {
    cidade: "Lisboa",
    bairro: "Príncipe Real",
    timeZone: "Europe/Lisbon",
    openHour: 10,
    closeHour: 19,
    openDays: [1, 2, 3, 4, 5],
  },
  {
    cidade: "Tóquio",
    bairro: "Nakameguro",
    timeZone: "Asia/Tokyo",
    openHour: 11,
    closeHour: 20,
    openDays: undefined,
  },
] as const;

/** O relógio da loja, na hora dela. Um minuto de resolução, como a peça. */
function Relogio({ timeZone }: { timeZone: string }) {
  const ativo = useStageActive();
  const [agora, setAgora] = React.useState(() => new Date());

  React.useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(t);
  }, [ativo]);

  return (
    <span className="shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
      {new Intl.DateTimeFormat("pt-BR", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(agora)}
    </span>
  );
}

export default function StoreStatusDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-destaque font-semibold tracking-tight">Onde comprar</span>
        <span className="font-mono text-micro uppercase tracking-[0.14em] text-muted-foreground">
          hora local
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {LOJAS.map((l) => (
          <li key={l.cidade} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-corpo font-medium">{l.cidade}</span>
                <span className="truncate text-micro text-muted-foreground">{l.bairro}</span>
              </div>
              <StoreStatus
                timeZone={l.timeZone}
                openHour={l.openHour}
                closeHour={l.closeHour}
                openDays={l.openDays ? [...l.openDays] : undefined}
                locale="pt-BR"
                labels={PT}
                {...props}
              />
            </div>
            <Relogio timeZone={l.timeZone} />
          </li>
        ))}
      </ul>
    </div>
  );
}
