"use client";

/**
 * A peça sozinha e grande sobre uma foto do acervo. O grão corre sozinho;
 * os knobs trocam a força, o tamanho e o grão colorido.
 */

import { ShaderFilmGrain } from "../../../registry/visant/ui/shader-film-grain";
import type { DemoProps } from "../catalog";

export default function ShaderFilmGrainDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderFilmGrain
        src="/media/cena-produto.webp"
        alt="Caixa e diamante com grão de filme"
        className="w-[400px] max-w-full rounded-[var(--r-surface)]"
        {...props}
      />
    </div>
  );
}
