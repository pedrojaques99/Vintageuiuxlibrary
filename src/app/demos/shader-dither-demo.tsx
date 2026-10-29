"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Os knobs trocam o
 * tamanho do pixel, quantos tons e o contraste antes de pontilhar.
 */

import { ShaderDither } from "../../../registry/visant/ui/shader-dither";
import type { DemoProps } from "../catalog";

export default function ShaderDitherDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderDither
        src="/media/cena-produto.webp"
        alt="Caixa e diamante em poucos tons pontilhados"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
