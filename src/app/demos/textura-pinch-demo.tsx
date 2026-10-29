"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Passar o mouse belisca a foto e puxa a pele para o cursor; os knobs trocam força e raio.
 */

import { TexturaPinch } from "../../../registry/visant/ui/textura-pinch";
import type { DemoProps } from "../catalog";

export default function TexturaPinchDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TexturaPinch
        src="/media/cena-produto.webp"
        alt="Caixa e diamante beliscados pelo cursor"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
