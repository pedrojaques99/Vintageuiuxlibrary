"use client";

/**
 * Uma revelação por vez, grande, e as setas trocam.
 *
 * O report pediu "UM POR VEZ". A galeria anterior punha as quatro variações
 * lado a lado, cada uma numa coluna de ~140px com nome e nota em cima: a frase
 * ficava pequena demais pra se ver a linha subindo, e o olho lia rótulo.
 *
 * Agora a frase ocupa o palco. Trocar a variação remonta a peça e a revelação
 * acontece na hora; clicar no nome repete. O nome entre as setas é o valor da
 * prop, que é o que se digita.
 *
 * · **A mesma frase em todas.** Trocar o texto junto faria comparar texto.
 * · **Medida de ~26rem.** A peça revela POR LINHA; numa faixa larga a frase
 *   caberia numa linha só e a cascata teria um elemento.
 * · **`immediate`.** Num palco que já nasce visível, um gatilho de rolagem nunca
 *   dispara.
 */

import * as React from "react";

import { LineReveal, type LineRevealVariant } from "../../../registry/visant/ui/line-reveal";
import type { DemoProps } from "../catalog";
import { Trocador, useUmPorVez } from "./um-por-vez";

const FRASE = "A quebra de linha é do navegador. O corte, do desenho.";

const VARIACOES: readonly LineRevealVariant[] = ["mask", "blur", "curtain", "rise"];

export default function LineRevealDemo({ props }: DemoProps) {
  const { variant: _v, ...resto } = (props ?? {}) as { variant?: LineRevealVariant } & Record<string, unknown>;
  const { atual, rodada, passo, repetir } = useUmPorVez(VARIACOES, _v);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-6">
      <div className="w-full max-w-[26rem]">
        {/* `key`: cada troca remonta o split. Remontar é a única forma honesta
            de repetir uma entrada que, por contrato, acontece uma vez só. */}
        <LineReveal
          key={`${atual}-${rodada}`}
          as="h3"
          immediate
          className="text-[clamp(1.6rem,1.2rem+1.6vw,2.25rem)] font-medium leading-[1.12] tracking-[-0.02em]"
          {...resto}
          variant={atual}
        >
          {FRASE}
        </LineReveal>
      </div>

      <Trocador nome={atual} onPasso={passo} onRepetir={repetir} />
    </div>
  );
}
