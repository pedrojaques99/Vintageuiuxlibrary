"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. Passar o mouse torce a foto em redemoinho; ao sair ele se desfaz. Os knobs trocam o giro e o raio.
 */

import { TexturaTwist } from "../../../registry/visant/ui/textura-twist";
import type { DemoProps } from "../catalog";

export default function TexturaTwistDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <TexturaTwist
        src="/media/cena-produto.webp"
        alt="Caixa e diamante torcidos em redemoinho"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
