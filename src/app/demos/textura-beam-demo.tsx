"use client";

/**
 * A peça sozinha e grande: é um fundo, e qualquer texto por cima competiria
 * com a textura. Passe o mouse: o facho mira nele.
 */

import { TexturaBeam } from "../../../registry/visant/ui/textura-beam";
import type { DemoProps } from "../catalog";

export default function TexturaBeamDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TexturaBeam className="w-[560px] max-w-full rounded-[var(--r-surface)]" {...props} />
    </div>
  );
}
