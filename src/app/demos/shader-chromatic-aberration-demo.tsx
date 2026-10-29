"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Passar o mouse aponta
 * a separação das cores; no centro ela some.
 */

import { ShaderChromaticAberration } from "../../../registry/visant/ui/shader-chromatic-aberration";
import type { DemoProps } from "../catalog";

export default function ShaderChromaticAberrationDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderChromaticAberration
        src="/media/cena-produto.webp"
        alt="Caixa e diamante com as cores fora do registro"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
