"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Passar o mouse leva a
 * linha do comparador; à esquerda dela, o antes em vizinho mais próximo.
 */

import { ShaderUpscale } from "../../../registry/visant/ui/shader-upscale";
import type { DemoProps } from "../catalog";

export default function ShaderUpscaleDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderUpscale
        src="/media/cena-produto.webp"
        alt="Caixa e diamante ampliados de uma versão pequena"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
