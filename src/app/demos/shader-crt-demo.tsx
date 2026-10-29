"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. A faixa de luz desce
 * sozinha; os knobs trocam linha, vinheta e curva da tela.
 */

import { ShaderCrt } from "../../../registry/visant/ui/shader-crt";
import type { DemoProps } from "../catalog";

export default function ShaderCrtDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderCrt
        src="/media/cena-produto.webp"
        alt="Caixa e diamante num monitor de tubo"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
