"use client";

/**
 * A peça sozinha e grande: é um fundo, e qualquer texto por cima competiria
 * com a textura. Passe o mouse: a correnteza desvia.
 */

import { TexturaCurrent } from "../../../registry/visant/ui/textura-current";
import type { DemoProps } from "../catalog";

export default function TexturaCurrentDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TexturaCurrent className="w-[560px] max-w-full rounded-[var(--r-surface)]" {...props} />
    </div>
  );
}
