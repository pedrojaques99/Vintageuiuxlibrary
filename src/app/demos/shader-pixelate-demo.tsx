"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Passar o mouse por
 * cima abre a janela nítida; o knob troca o tamanho do bloco.
 */

import { ShaderPixelate } from "../../../registry/visant/ui/shader-pixelate";
import type { DemoProps } from "../catalog";

export default function ShaderPixelateDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderPixelate
        src="/media/cena-produto.webp"
        alt="Caixa e diamante em blocos de cor"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
