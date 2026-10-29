"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. A fita corre sozinha;
 * os knobs dosam cada defeito separado.
 */

import { ShaderVhs } from "../../../registry/visant/ui/shader-vhs";
import type { DemoProps } from "../catalog";

export default function ShaderVhsDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderVhs
        src="/media/cena-produto.webp"
        alt="Caixa e diamante tocados de fita VHS"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
