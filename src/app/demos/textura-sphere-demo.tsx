"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Passar o mouse leva uma bolha de vidro que amplia a foto; os knobs trocam o aumento e o raio.
 */

import { TexturaSphere } from "../../../registry/visant/ui/textura-sphere";
import type { DemoProps } from "../catalog";

export default function TexturaSphereDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TexturaSphere
        src="/media/cena-produto.webp"
        alt="Caixa e diamante sob uma bolha de vidro"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
