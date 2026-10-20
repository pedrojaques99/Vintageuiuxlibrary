"use client";

/**
 * Três perfis, a mesma peça: o argumento do item é que o objeto É o perfil.
 *
 * O difusor com varetas é o caso de origem (e o único que mostra o vento no
 * hover). A vela e o pote existem para provar que trocar a lista de pontos troca
 * o produto inteiro sem mexer em câmera: o enquadramento sai da caixa do objeto,
 * e um pote baixo não pode aparecer minúsculo no meio de um quadro feito para
 * uma garrafa alta.
 *
 * A troca era uma fileira de três chips com fundo, e a da vez acesa na cor da
 * marca: três botões disputando com o objeto, que é a única coisa que importa
 * no palco. Virou texto pequeno e apagado, com a escolha em `--foreground` e
 * um ponto embaixo. Continua sendo botão (foco, `aria-pressed`, alvo de toque),
 * só parou de gritar.
 */

import * as React from "react";

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
      <div className="flex justify-center gap-4 pb-1" role="group" aria-label="Objeto">
        {CASOS.map((c, n) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={n === i}
            onClick={() => setI(n)}
            className={[
              "alvo-toque relative px-1 pb-1.5 text-micro outline-none",
              "transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
              "focus-visible:rounded-[var(--r-control,0.375rem)] focus-visible:[box-shadow:var(--focus)]",
              n === i ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {c.id}
            <span
              aria-hidden
              className={[
                "absolute bottom-0 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground",
                "transition-opacity [transition-duration:var(--dur-fast)]",
                n === i ? "opacity-100" : "opacity-0",
              ].join(" ")}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
