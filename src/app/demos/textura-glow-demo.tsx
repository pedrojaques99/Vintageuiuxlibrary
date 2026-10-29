"use client";

/**
 * A peça sozinha e grande: é um fundo, e qualquer texto por cima competiria
 * com a textura. Passe o mouse: o brilho vai atrás.
 */

import { TexturaGlow } from "../../../registry/visant/ui/textura-glow";
import type { DemoProps } from "../catalog";

export default function TexturaGlowDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TexturaGlow className="w-[560px] max-w-full rounded-[var(--r-surface)]" {...props} />
    </div>
  );
}
