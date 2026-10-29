"use client";

/**
 * A peça sozinha e grande: é um fundo, e qualquer texto por cima competiria
 * com a textura. Passe o mouse: as pupilas seguem, e de vez em quando alguém pisca.
 */

import { TexturaGaze } from "../../../registry/visant/ui/textura-gaze";
import type { DemoProps } from "../catalog";

export default function TexturaGazeDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TexturaGaze className="w-[560px] max-w-full rounded-[var(--r-surface)]" {...props} />
    </div>
  );
}
