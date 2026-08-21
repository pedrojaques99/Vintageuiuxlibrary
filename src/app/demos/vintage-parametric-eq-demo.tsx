"use client";

/**
 * O EQ mostrando o que ele é: uma curva, não seis faders.
 *
 * A cena arranca com bandas fora do plano de propósito — um EQ desenhado em
 * linha reta é indistinguível de um EQ que não faz nada, e a primeira coisa que
 * a peça tem a dizer é que o ganho de uma banda vaza pras vizinhas.
 *
 * Nada de relógio aqui: a curva só se mexe quando a mão mexe, e é isso que ela
 * tem pra provar.
 */

import * as React from "react";

import { VintageParametricEQ } from "../../../registry/vintage/ui/vintage-parametric-eq";
import type { DemoProps } from "../catalog";

export default function VintageParametricEqDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <VintageParametricEQ width={500} height={210} {...props} />
    </div>
  );
}
