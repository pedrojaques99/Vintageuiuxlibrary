"use client";

/**
 * Só o gatilho, no meio do palco. A peça é um botão que abre a caixa de
 * marcas; o que ela troca já está em volta (a vitrine inteira lê os tokens),
 * então uma amostra pintada do lado só repetia o argumento com mais texto.
 *
 * `shortcut={null}`: o cabeçalho da vitrine já escuta ⌘B, e dois ouvintes no
 * mesmo atalho abriam duas caixas.
 *
 * A caixa de comando abre em tela cheia mesmo saindo do ladrilho, e é assim
 * que tem que ser: ela é portalizada no `body`, igual ao que o `shadcn add`
 * entrega.
 */

import * as React from "react";

import { BrandSelector } from "../../../registry/visant/ui/brand-selector";
import type { DemoProps } from "../catalog";

export default function BrandSelectorDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <BrandSelector {...props} shortcut={null} />
    </div>
  );
}
