"use client";

/**
 * Um seletor de visão, que é onde a peça mora, e embaixo dele a escolha da
 * `animation`: o de baixo troca como o de cima anda. Os dois usam a animação
 * escolhida, então mexer em qualquer um já mostra a diferença.
 */

import * as React from "react";
import { Columns3, LayoutGrid, List } from "lucide-react";

import { SegmentedControl } from "../../../registry/visant/ui/segmented-control";
import type { DemoProps } from "../catalog";

type Animacao = "slide" | "spring" | "stretch" | "fade";

export default function SegmentedControlDemo({ props }: DemoProps) {
  const [visao, setVisao] = React.useState<"grade" | "lista" | "quadro">("grade");
  const [animacao, setAnimacao] = React.useState<Animacao>("stretch");

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-[300px] max-w-full flex-col items-stretch gap-4">
        <SegmentedControl
          value={visao}
          onChange={setVisao}
          aria-label="Visão"
          animation={animacao}
          {...props}
          options={[
            { value: "grade", label: "Grade", icon: LayoutGrid },
            { value: "lista", label: "Lista", icon: List },
            { value: "quadro", label: "Quadro", icon: Columns3 },
          ]}
        />
        <SegmentedControl
          value={animacao}
          onChange={setAnimacao}
          aria-label="Animação"
          size="sm"
          animation={animacao}
          className="mx-auto w-[260px] max-w-full"
          options={[
            { value: "slide", label: "Desliza" },
            { value: "spring", label: "Mola" },
            { value: "stretch", label: "Estica" },
            { value: "fade", label: "Funde" },
          ]}
        />
      </div>
    </div>
  );
}
