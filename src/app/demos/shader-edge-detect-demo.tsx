"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Os knobs trocam o
 * limiar, a força do traço e quanto da foto aparece por baixo.
 */

import { ShaderEdgeDetect } from "../../../registry/visant/ui/shader-edge-detect";
import type { DemoProps } from "../catalog";

export default function ShaderEdgeDetectDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderEdgeDetect
        src="/media/cena-produto.webp"
        alt="Contornos da caixa e do diamante"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
