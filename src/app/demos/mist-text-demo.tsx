"use client";

/**
 * Título por letra e frase por palavra, com um botão que repete a entrada.
 *
 * ── Por que só o modo `view` aqui ──────────────────────────────────────────
 *
 * O modo `scroll` mede a rolagem da JANELA, e o palco da vitrine não rola: ele
 * desenharia a frase parada no piso de opacidade e mentiria que a peça está
 * quebrada. O modo que se pode mostrar honestamente num palco é o de entrada.
 *
 * O `key` remonta as duas linhas juntas: a entrada é, por contrato, uma vez só,
 * e remontar é a única forma de repeti-la sem inventar uma API de replay.
 */

import * as React from "react";

import { Chip } from "../../../registry/visant/ui/chip";
import { MistText } from "../../../registry/visant/ui/mist-text";
import type { DemoProps } from "../catalog";

export default function MistTextDemo(_: DemoProps) {
  const [n, setN] = React.useState(0);
  const [by, setBy] = React.useState<"word" | "letter">("letter");

  return (
    <div className="flex h-full w-full flex-col justify-center gap-6 px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Chip size="sm" mark={false} pressed={by === "letter"} onClick={() => setBy("letter")} className="alvo-toque">
          por letra
        </Chip>
        <Chip size="sm" mark={false} pressed={by === "word"} onClick={() => setBy("word")} className="alvo-toque">
          por palavra
        </Chip>
        <Chip size="sm" mark={false} onClick={() => setN((x) => x + 1)} className="alvo-toque">
          repetir
        </Chip>
      </div>

      <div key={`${n}-${by}`} className="flex max-w-[34rem] flex-col gap-3">
        <MistText
          as="h3"
          by={by}
          text="Sai da névoa."
          className="text-[2.6rem] font-medium leading-[1.05] tracking-[-0.03em]"
        />
        <MistText
          by="word"
          delay={0.35}
          text="Cada palavra assenta no lugar onde já estava, sem deslizar de lugar nenhum."
          className="text-[1.05rem] leading-[1.5] text-muted-foreground"
        />
      </div>
    </div>
  );
}
