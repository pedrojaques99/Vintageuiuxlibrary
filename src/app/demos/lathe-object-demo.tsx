"use client";

/**
 * Três perfis, a mesma peça: o argumento do item é que o objeto É o perfil.
 *
 * O difusor com varetas é o caso de origem (e o único que mostra o vento no
 * hover). A vela e o pote existem para provar que trocar a lista de pontos troca
 * o produto inteiro sem mexer em câmera: o enquadramento sai da caixa do objeto,
 * e um pote baixo não pode aparecer minúsculo no meio de um quadro feito para
 * uma garrafa alta.
 */

import * as React from "react";

import { Chip } from "../../../registry/visant/ui/chip";
import {
  DIFFUSER_PROFILE,
  LatheObject,
  type LatheProfile,
  type LatheSticks,
} from "../../../registry/visant/ui/lathe-object";
import type { DemoProps } from "../catalog";

const CASOS: { id: string; label: string; profile: LatheProfile; sticks?: LatheSticks }[] = [
  { id: "frasco", label: "Frasco com varetas, arraste para girar", profile: DIFFUSER_PROFILE, sticks: { count: 7, length: 3.2 } },
  {
    id: "copo",
    label: "Copo de vidro, arraste para girar",
    profile: [[0, 0], [0.9, 0], [1, 0.08], [1, 1.72], [0.97, 1.78], [0.9, 1.78], [0.9, 1.6], [0, 1.6]],
  },
  {
    id: "pote",
    label: "Pote com tampa, arraste para girar",
    profile: [[0, 0], [1.1, 0], [1.2, 0.1], [1.2, 0.9], [1.1, 1], [1.16, 1.04], [1.18, 1.3], [1.1, 1.38], [0, 1.4]],
  },
];

export default function LatheObjectDemo({ props }: DemoProps) {
  const [i, setI] = React.useState(0);
  const caso = CASOS[i];

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="min-h-0 flex-1">
        <LatheObject profile={caso.profile} sticks={caso.sticks} aria-label={caso.label} {...props} />
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {CASOS.map((c, n) => (
          <Chip key={c.id} className="alvo-toque" pressed={n === i} onClick={() => setI(n)}>
            {c.id}
          </Chip>
        ))}
      </div>
    </div>
  );
}
