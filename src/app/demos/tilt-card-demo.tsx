"use client";

/**
 * Um produto renderizado dentro do card, com nome e preço embaixo: a cena em
 * que a peça vende, a vitrine de loja onde o objeto pede pra ser pego na mão.
 * Render com fundo transparente, e não foto: o objeto solto sobre o `bg-muted`
 * deixa a inclinação e o brilho legíveis.
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
        <Media papel="cena" indice={3} ratio="4/5" className="w-full" />
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <span className="text-sm font-medium text-foreground">Troféu Ribalta</span>
          <span className="text-sm tabular-nums text-muted-foreground">R$ 489</span>
        </div>
      </TiltCard>
    </div>
  );
}
