"use client";

/**
 * Uma dobra por vez, grande, e as setas trocam a variante.
 *
 * ── O que o report acusou ──────────────────────────────────────────────────
 *
 * "MT CONFUSA A APRESENTAÇÃO, UM POR VEZ, INTERATIVO, MENOS LABEL, MAIS
 * VISUAL". A versão anterior era uma grade de oito ladrilhos, cada um com
 * desenho, nome e glosa, e dois chips de modo em cima. Era a demo explicando o
 * movimento em vez de mostrar: oito entradas de 14px em ladrilhos de 120px não
 * se veem, e o olho lia rótulo em vez de movimento.
 *
 * Agora é uma dobra de verdade, com título grande, ocupando o palco. Trocar a
 * variante remonta a dobra e a entrada acontece na hora; clicar no nome repete.
 * Enquanto o palco está em tela, a mesma variante volta a entrar sozinha a cada
 * poucos segundos, porque uma peça de movimento parada depois do primeiro
 * segundo parece quebrada. Fora da tela (`useStageActive`) e sob
 * `prefers-reduced-motion` não há loop: ali a dobra já nasce no estado final.
 *
 * O texto secundário usa opacidade, não `text-muted-foreground`: no `invert` o
 * fundo vira a cor do texto, e um cinza fixo sumiria nele.
 */

import * as React from "react";

import { Fold, FoldPart, type FoldVariant } from "../../../registry/visant/lib/fold-motion";
import { useStageActive } from "../stage";
import type { DemoProps } from "../catalog";
import { Trocador, useUmPorVez } from "./um-por-vez";

const VARIANTES: readonly FoldVariant[] = [
  "rise",
  "drift-l",
  "drift-r",
  "mask",
  "settle",
  "climax",
  "invert",
  "mist",
];

/** Entrada mais longa (`climax`, 1,1s) + tempo de olhar. */
const CICLO = 3200;

const usaMovimento = () =>
  typeof window === "undefined" ||
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function FoldMotionDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const { variant: _v, ...resto } = (props ?? {}) as { variant?: FoldVariant } & Record<string, unknown>;
  const { atual, rodada, passo, repetir } = useUmPorVez(VARIANTES, _v);

  React.useEffect(() => {
    if (!ativo || !usaMovimento()) return;
    const id = window.setTimeout(repetir, CICLO);
    return () => window.clearTimeout(id);
  }, [ativo, rodada, repetir]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
      {/* A `key` é a rodada: remontar é o único jeito honesto de rever uma
          entrada que, por contrato, acontece uma vez só. */}
      <Fold
        key={`${atual}-${rodada}`}
        as="div"
        {...resto}
        variant={atual}
        className="flex w-full max-w-[34rem] flex-1 flex-col justify-center rounded-[var(--r-surface,0.875rem)] px-8 py-6"
      >
        <FoldPart className="flex flex-col gap-3">
          <h3 className="text-[clamp(1.75rem,1.2rem+2vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.03em]">
            A dobra que pede atenção entra diferente.
          </h3>
          <p className="max-w-[28rem] text-[1rem] leading-[1.5] opacity-60">
            As de respiro ficam quietas pra esta ser ouvida.
          </p>
        </FoldPart>
      </Fold>

      <Trocador nome={atual} onPasso={passo} onRepetir={repetir} />
    </div>
  );
}
