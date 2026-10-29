"use client";

/**
 * Três réguas lado a lado, cada uma num estado: proporção medida, piso sem
 * denominador (sem régua, de propósito) e dado que não chegou (trilha
 * tracejada). É a mesma dobra de números que a página de venda usa.
 */

import { MeasureBar } from "../../../registry/visant/ui/measure-bar";
import type { DemoProps } from "../catalog";

export default function MeasureBarDemo({ props }: DemoProps) {
  return (
    <div className="grid h-full w-full grid-cols-3 content-center items-start gap-10 px-8">
      <MeasureBar label="Faturado" value="R$450k" qualifier="de uma meta de R$600k" ratio={0.75} {...props} />
      <MeasureBar label="Comunidade" value="200+" qualifier="piso, não proporção" />
      <MeasureBar label="Vendidos" value="sem dado" qualifier="a API não respondeu" state="unknown" />
    </div>
  );
}
