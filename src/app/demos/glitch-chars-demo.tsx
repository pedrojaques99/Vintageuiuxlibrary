"use client";

/**
 * Um painel de exportação no meio do trabalho: cada linha usa um sotaque do
 * ruído e a de cima decodifica até virar a palavra. Os knobs pilotam a linha
 * grande; as de baixo mostram os outros presets no papel deles, ao lado de um
 * status, que é onde a peça mora.
 */

import { GlitchChars } from "../../../registry/visant/ui/glitch-chars";
import type { DemoProps } from "../catalog";

const LINHAS = [
  { preset: "braille", length: 2, texto: "Lendo a marca" },
  { preset: "blocos", length: 3, texto: "Exportando camadas" },
  { preset: "hex", length: 4, texto: "Assinando o arquivo" },
] as const;

export default function GlitchCharsDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-[340px] max-w-full flex-col gap-5 px-4">
        <GlitchChars
          text="RENDERIZADO"
          className="text-[length:var(--text-titulo,1.5rem)] font-semibold tracking-[0.08em] text-foreground"
          {...props}
        />
        <ul className="flex flex-col gap-2.5 border-t border-border pt-4">
          {LINHAS.map((l) => (
            <li key={l.preset} className="flex items-baseline gap-3 text-apoio">
              <GlitchChars
                preset={l.preset}
                length={l.length}
                className="w-[4ch] shrink-0 text-muted-foreground"
              />
              <span className="truncate text-foreground">{l.texto}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
