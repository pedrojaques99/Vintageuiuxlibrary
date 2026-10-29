"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Passar o mouse por cima
 * abre a lupa; os knobs trocam célula, ângulo e forma do ponto.
 */

import { ShaderHalftone } from "../../../registry/visant/ui/shader-halftone";
import type { DemoProps } from "../catalog";

export default function ShaderHalftoneDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderHalftone
        src="/media/cena-produto.webp"
        alt="Caixa e diamante em retícula"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
