"use client";

/**
 * A miniatura da peça, para lista e busca.
 *
 * Uma linha só com nome e frase obrigava a pessoa a ler pra reconhecer o que já
 * reconheceria de relance — e a vitrine existe pra ser olhada. A miniatura é a
 * MESMA foto do acervo (`/shots/`, capturada na caixa do palco e sem fundo),
 * sobre o chão da marca escolhida: é a peça, em pequeno, e não um ícone que
 * represente a peça.
 *
 * Quem não tem superfície (hook, lib, tema, base) ganha o ícone do que é, num
 * quadrado da casa. Quadrado vazio leria como foto que não carregou.
 */

import * as React from "react";
import { Braces, Layers, Palette, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogItem } from "./catalog";
import { useFundoEscuro } from "./mosaic";

const ICONE_DO_TIPO: Partial<Record<CatalogItem["type"], typeof Braces>> = {
  hook: Braces,
  lib: Wrench,
  theme: Palette,
  base: Layers,
};

export function Miniatura({ item, className }: { item: CatalogItem; className?: string }) {
  const escuro = useFundoEscuro();
  const [falhou, setFalhou] = React.useState(false);
  const caixa = cn("relative shrink-0 overflow-hidden rounded-[6px]", className);

  if (!item.demo || falhou) {
    const Icone = ICONE_DO_TIPO[item.type] ?? Braces;
    return (
      <span aria-hidden className={cn(caixa, "grid place-items-center bg-casa-tile-2 text-casa-fg-3")}>
        <Icone className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span aria-hidden className={cn(caixa, "palco")}>
      <img
        src={`/shots/${item.name}-${escuro ? "escuro" : "claro"}.webp`}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setFalhou(true)}
        className="h-full w-full object-contain p-1"
      />
    </span>
  );
}
