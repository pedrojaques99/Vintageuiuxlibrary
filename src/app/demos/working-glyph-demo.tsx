"use client";

/**
 * Um ofício por vez, grande, com o seletor quieto embaixo. O nome no seletor é
 * o valor de `variant`.
 */

import { useStageActive } from "../stage";
import { WorkingGlyph, type WorkingGlyphVariant } from "../../../registry/visant/ui/working-glyph";
import type { DemoProps } from "../catalog";
import { Trocador, useUmPorVez } from "./um-por-vez";

const OFICIOS: WorkingGlyphVariant[] = ["picareta", "martelo", "engrenagem", "pincel", "faisca"];

export default function WorkingGlyphDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const { variant: _v } = (props ?? {}) as { variant?: WorkingGlyphVariant };
  const { atual, rodada, passo, repetir } = useUmPorVez(OFICIOS, _v);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
      <div className="grid size-24 place-items-center">
        {ativo ? <WorkingGlyph key={`${atual}-${rodada}`} variant={atual} size={56} framed={false} /> : null}
      </div>
      <Trocador nome={atual} onPasso={passo} onRepetir={repetir} />
    </div>
  );
}
