"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. A falha corre
 * sozinha; passar o mouse rápido por cima piora o sinal.
 */

import { ShaderGlitch } from "../../../registry/visant/ui/shader-glitch";
import type { DemoProps } from "../catalog";

export default function ShaderGlitchDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderGlitch
        src="/media/cena-produto.webp"
        alt="Caixa e diamante com falha de sinal"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
