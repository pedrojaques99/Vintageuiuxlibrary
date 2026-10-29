"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Passar o mouse rápido agita a foto, que escorre e depois assenta; os knobs trocam o escorrer, os veios e a agitação.
 */

import { TexturaWarp } from "../../../registry/visant/ui/textura-warp";
import type { DemoProps } from "../catalog";

export default function TexturaWarpDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TexturaWarp
        src="/media/cena-produto.webp"
        alt="Caixa e diamante escorrendo em ruído"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
