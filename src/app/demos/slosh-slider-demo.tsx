"use client";

/**
 * Um controle de volume, que é onde o peso da tinta faz sentido: arrastar
 * rápido e soltar mostra o balanço inteiro, e as setas mostram que o teclado
 * também chacoalha.
 */

import * as React from "react";

import { SloshSlider } from "../../../registry/visant/ui/slosh-slider";
import type { DemoProps } from "../catalog";

export default function SloshSliderDemo({ props }: DemoProps) {
  const [valor, setValor] = React.useState(40);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <SloshSlider
        label="Volume"
        value={valor}
        onValueChange={setValor}
        format={(v) => `${v}%`}
        className="max-w-[360px]"
        {...props}
      />
    </div>
  );
}
