"use client";

/**
 * A peça sozinha e grande: é um fundo, e qualquer texto por cima competiria
 * com os fios. Passar o mouse rápido acende a onda.
 */

import { ShaderNeon } from "../../../registry/visant/ui/shader-neon";
import type { DemoProps } from "../catalog";

export default function ShaderNeonDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderNeon className="w-[560px] max-w-full rounded-[var(--r-surface)]" {...props} />
    </div>
  );
}
