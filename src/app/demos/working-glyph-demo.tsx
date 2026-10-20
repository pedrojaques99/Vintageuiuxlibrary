"use client";

/**
 * Os cinco ofícios do glifo numa fileira, cada um com o nome da variante embaixo.
 */

import { useStageActive } from "../stage";
import { WorkingGlyph, type WorkingGlyphVariant } from "../../../registry/visant/ui/working-glyph";

const OFICIOS: WorkingGlyphVariant[] = ["picareta", "martelo", "engrenagem", "pincel", "faisca"];

export default function WorkingGlyphDemo() {
  const ativo = useStageActive();
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-[480px] max-w-full items-end justify-between">
        {OFICIOS.map((v) => (
          <div key={v} className="flex flex-col items-center gap-4">
            <div className="grid size-12 place-items-center">
              {ativo ? <WorkingGlyph variant={v} size={30} framed={false} /> : null}
            </div>
            <span className="font-mono text-micro text-muted-foreground/70">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
