"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Os knobs dosam o
 * quanto do duotone cobre a foto, o contraste e o brilho.
 */

import { ShaderDuotone } from "../../../registry/visant/ui/shader-duotone";
import type { DemoProps } from "../catalog";

export default function ShaderDuotoneDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderDuotone
        src="/media/cena-produto.webp"
        alt="Caixa e diamante em duas cores"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
