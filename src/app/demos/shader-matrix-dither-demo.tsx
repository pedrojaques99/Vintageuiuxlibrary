"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Os knobs trocam a
 * matriz de Bayer, o viés do limiar e o tamanho do ponto.
 */

import { ShaderMatrixDither } from "../../../registry/visant/ui/shader-matrix-dither";
import type { DemoProps } from "../catalog";

export default function ShaderMatrixDitherDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderMatrixDither
        src="/media/cena-produto.webp"
        alt="Caixa e diamante pontilhados em 1 bit"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
