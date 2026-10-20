"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Os knobs trocam o jogo de
 * caracteres, a célula e o contraste.
 */

import { ShaderAscii } from "../../../registry/visant/ui/shader-ascii";
import type { DemoProps } from "../catalog";

export default function ShaderAsciiDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderAscii
        src="/media/cena-terra.webp"
        alt="Globo em caracteres"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
