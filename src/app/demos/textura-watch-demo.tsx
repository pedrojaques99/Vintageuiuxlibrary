"use client";

/**
 * A peça sozinha e grande: é um fundo, e qualquer texto por cima competiria
 * com a textura. Passe o mouse: os ponteiros apontam para ele.
 */

import { TexturaWatch } from "../../../registry/visant/ui/textura-watch";
import type { DemoProps } from "../catalog";

export default function TexturaWatchDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TexturaWatch className="w-[560px] max-w-full rounded-[var(--r-surface)]" {...props} />
    </div>
  );
}
