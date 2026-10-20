"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Os knobs trocam o modo da
 * tinta, a célula e o quanto o registro escorrega.
 */

import { ShaderRiso } from "../../../registry/visant/ui/shader-riso";
import type { DemoProps } from "../catalog";

export default function ShaderRisoDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderRiso
        src="/media/cena-radio.webp"
        alt="Rádio impresso em risografia"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
