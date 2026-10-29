"use client";

/**
 * A peça sozinha e grande: é um fundo, e qualquer texto por cima competiria
 * com a textura. Passe o mouse: os pilares sobem perto dele.
 */

import { TexturaPillars } from "../../../registry/visant/ui/textura-pillars";
import type { DemoProps } from "../catalog";

export default function TexturaPillarsDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TexturaPillars className="w-[560px] max-w-full rounded-[var(--r-surface)]" {...props} />
    </div>
  );
}
