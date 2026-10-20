"use client";

/**
 * Um retrato do acervo dentro do card, com legenda embaixo — a cena em que a
 * peça vende: uma foto que pede pra ser pega na mão.
 *
 * A caixa tem medida própria (`w-64` e proporção 4/5) porque o card não tem
 * altura sem conteúdo; quem consome decide o tamanho, a peça só inclina.
 */

import { Media } from "../media";
import { TiltCard } from "../../../registry/visant/ui/tilt-card";
import type { DemoProps } from "../catalog";

export default function TiltCardDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TiltCard className="w-64" {...props}>
        <Media papel="retrato" indice={2} ratio="4/5" className="w-full" />
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <span className="text-sm font-medium text-foreground">Coleção outono</span>
          <span className="text-xs text-muted-foreground">passa o mouse</span>
        </div>
      </TiltCard>
    </div>
  );
}
