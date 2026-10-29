"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Passar o mouse levanta os ladrilhos perto do cursor; os knobs trocam lado, junta, força e alcance.
 */

import { TexturaTiles } from "../../../registry/visant/ui/textura-tiles";
import type { DemoProps } from "../catalog";

export default function TexturaTilesDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TexturaTiles
        src="/media/cena-produto.webp"
        alt="Caixa e diamante em ladrilhos"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
