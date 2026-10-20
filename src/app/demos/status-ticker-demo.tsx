"use client";

/**
 * As quatro esperas do ticker lado a lado, rodando no mesmo instante.
 *
 * O nome em cima de cada uma é o valor de `variant`: é o que a pessoa escolhe e
 * copia, e nada além disso. `etapas` fica sozinha na coluna da direita porque é
 * a única que cresce pra baixo.
 */

import { useStageActive } from "../stage";
import { StatusTicker, type StatusTickerVariant } from "../../../registry/visant/ui/status-ticker";

const PASSOS = ["Lendo", "Desenhando", "Refinando", "Exportando"];

function Opcao({ variant }: { variant: StatusTickerVariant }) {
  const ativo = useStageActive();
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <span className="font-mono text-micro text-muted-foreground/70">{variant}</span>
      <div className="min-h-[1.5rem]">
        {ativo ? <StatusTicker variant={variant} steps={variant === "etapas" ? PASSOS : undefined} /> : null}
      </div>
    </div>
  );
}

export default function StatusTickerDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="grid w-[520px] max-w-full grid-cols-2 gap-x-12 gap-y-8">
        <div className="flex flex-col gap-8">
          <Opcao variant="linha" />
          <Opcao variant="barra" />
          <Opcao variant="pulso" />
        </div>
        <Opcao variant="etapas" />
      </div>
    </div>
  );
}
