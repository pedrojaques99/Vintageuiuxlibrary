"use client";

/**
 * Três faders no habitat deles: uma coluna de parâmetros, no modo `dense`.
 *
 * Um fader sozinho num palco largo não mostra nem o que a peça é boa em fazer —
 * empilhar — nem o defeito que foi consertado, que só aparece quando há mais de
 * um controle na tela: antes, arrastar um fader repintava os vizinhos e o punho
 * andava atrás do cursor. Aqui a mão desce a coluna e cada punho gruda no dedo.
 */

import * as React from "react";

import { VintageSlider } from "../../../registry/vintage/ui/vintage-slider";
import type { DemoProps } from "../catalog";

const CANAIS = [
  { rotulo: "GAIN", inicial: 6.4 },
  { rotulo: "TONE", inicial: 4.2 },
  { rotulo: "MIX", inicial: 7.8 },
];

export default function VintageSliderDemo({ props }: DemoProps) {
  const [valores, setValores] = React.useState(CANAIS.map((c) => c.inicial));

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-col gap-2">
        {CANAIS.map((c, i) => (
          <VintageSlider
            key={c.rotulo}
            label={c.rotulo}
            dense
            value={valores[i]}
            onChange={(v) =>
              setValores((p) => p.map((x, j) => (j === i ? v : x)))
            }
            {...props}
          />
        ))}
      </div>
    </div>
  );
}
