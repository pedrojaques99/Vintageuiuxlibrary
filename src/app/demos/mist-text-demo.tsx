"use client";

/**
 * Uma transição por vez: o título por letra e a frase por palavra entram
 * juntos, e as setas trocam o `variant`.
 *
 * O report pediu opções de transição "conforme o que já tem na casa"; elas
 * viraram a prop `variant` da peça (`mist`, `rise`, `mask`, `drift`,
 * `settle`). Trocar remonta as duas linhas e a entrada acontece na hora;
 * clicar no nome repete. Os chips de "por letra / por palavra / repetir" saíram:
 * o título já mostra a letra e a frase já mostra a palavra.
 *
 * ── Por que só o modo `view` aqui ──────────────────────────────────────────
 *
 * O modo `scroll` mede a rolagem da JANELA, e o palco da vitrine não rola: ele
 * desenharia a frase parada no piso de opacidade e mentiria que a peça está
 * quebrada.
 */

import * as React from "react";

import { MistText, type MistTextVariant } from "../../../registry/visant/ui/mist-text";
import type { DemoProps } from "../catalog";
import { Trocador, useUmPorVez } from "./um-por-vez";

const VARIANTES: readonly MistTextVariant[] = ["mist", "rise", "mask", "drift", "settle"];

export default function MistTextDemo({ props }: DemoProps) {
  const { variant: _v } = (props ?? {}) as { variant?: MistTextVariant };
  const { atual, rodada, passo, repetir } = useUmPorVez(VARIANTES, _v);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-6">
      <div key={`${atual}-${rodada}`} className="flex w-full max-w-[30rem] flex-col items-center gap-3 text-center">
        <MistText
          as="h3"
          by="letter"
          variant={atual}
          text="Sai da névoa."
          className="text-[2.6rem] font-medium leading-[1.05] tracking-[-0.03em]"
        />
        <MistText
          by="word"
          delay={0.35}
          variant={atual}
          text="Cada palavra assenta no lugar onde já estava."
          className="text-[1.05rem] leading-[1.5] text-muted-foreground"
        />
      </div>

      <Trocador nome={atual} onPasso={passo} onRepetir={repetir} />
    </div>
  );
}
