"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. O knob troca quantos
 * tons sobram por canal.
 */

import { ShaderPosterize } from "../../../registry/visant/ui/shader-posterize";
import type { DemoProps } from "../catalog";

export default function ShaderPosterizeDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderPosterize
        src="/media/cena-produto.webp"
        alt="Caixa e diamante posterizados"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
