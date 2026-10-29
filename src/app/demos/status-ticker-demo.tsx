"use client";

/**
 * Uma espera por vez, grande, com o seletor quieto embaixo.
 *
 * As quatro lado a lado espremiam cada uma e nenhuma aparecia (e a linha com o
 * cronômetro vazava a 360px). O nome no seletor é o valor de `variant`: é o que
 * a pessoa escolhe e copia.
 */

import { useStageActive } from "../stage";
import { StatusTicker, type StatusTickerVariant } from "../../../registry/visant/ui/status-ticker";
import type { DemoProps } from "../catalog";
import { Trocador, useUmPorVez } from "./um-por-vez";

const VARIACOES: StatusTickerVariant[] = ["linha", "barra", "etapas", "pulso"];
const PASSOS = ["Lendo", "Desenhando", "Refinando", "Exportando"];

export default function StatusTickerDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const { variant: _v } = (props ?? {}) as { variant?: StatusTickerVariant };
  const { atual, rodada, passo, repetir } = useUmPorVez(VARIACOES, _v);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex w-[360px] max-w-full items-center">
        {ativo ? (
          <StatusTicker
            key={`${atual}-${rodada}`}
            variant={atual}
            steps={atual === "etapas" ? PASSOS : undefined}
            className="w-full"
          />
        ) : null}
      </div>
      <Trocador nome={atual} onPasso={passo} onRepetir={repetir} />
    </div>
  );
}
