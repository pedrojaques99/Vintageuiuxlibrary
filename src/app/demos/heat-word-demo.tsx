"use client";

/**
 * A peça sozinha, sem moldura: o gesto é passear o mouse por cima, e qualquer
 * texto ao lado competiria com o rastro de calor. Os knobs trocam forma,
 * palavra e o comportamento do calor.
 */

import { HeatWord } from "../../../registry/visant/ui/heat-word";
import type { DemoProps } from "../catalog";

export default function HeatWordDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <HeatWord className="w-[480px] max-w-full" {...props} />
    </div>
  );
}
