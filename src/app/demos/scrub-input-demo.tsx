"use client";

/**
 * A coluna de parâmetros de um painel de edição, que é onde a peça mora: três
 * campos em linha, com ar entre eles. A régua da marca só acende sob o
 * ponteiro, no foco e no arrasto. Arraste o rótulo ou o número na horizontal;
 * duplo clique no número digita o valor exato.
 */

import * as React from "react";

import { ScrubInput } from "../../../registry/visant/ui/scrub-input";
import type { DemoProps } from "../catalog";

export default function ScrubInputDemo({ props }: DemoProps) {
  const [opacidade, setOpacidade] = React.useState(64);
  const [angulo, setAngulo] = React.useState(45);
  const [raio, setRaio] = React.useState(12);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-[260px] max-w-full flex-col gap-2.5">
        <ScrubInput
          label="Opacidade"
          kind="percent"
          layout="row"
          value={opacidade}
          min={0}
          max={100}
          {...props}
          onChange={setOpacidade}
        />
        <ScrubInput label="Ângulo" kind="angle" layout="row" value={angulo} min={0} max={360} {...props} onChange={setAngulo} />
        <ScrubInput label="Raio" kind="px" layout="row" value={raio} min={0} max={64} {...props} onChange={setRaio} />
      </div>
    </div>
  );
}
