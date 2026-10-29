"use client";

/**
 * A marca condensando da fumaça, em ciclo.
 *
 * No site a condensação vem do scroll (o rodapé chega e a tinta assenta). Num
 * card de vitrine não há o que rolar, então a demo usa a prop `progress` e
 * dirige o mesmo caminho por tempo.
 *
 * A marca é escrita pela prop `text`: VISANT® em Manrope Bold maiúscula, que é
 * a assinatura da casa. A cada volta à fumaça ela assenta numa voz diferente
 * (display com traço de pincel, mono espaçado), e é assim que a demo mostra as
 * opções sem um rótulo explicando: a troca acontece dentro da fumaça.
 * Passe o mouse rápido sobre a marca assentada para agitar a tinta.
 */

import * as React from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";

import { InkWordmark } from "../../../registry/visant/ui/ink-wordmark";
import type { DemoProps } from "../catalog";

type Voz = Pick<
  React.ComponentProps<typeof InkWordmark>,
  "text" | "mark" | "font" | "weight" | "textCase" | "tracking" | "underline"
>;

const VOZES: Voz[] = [
  { text: "Visant", mark: "®", font: "manrope", weight: 700, textCase: "upper", tracking: -0.02 },
  { text: "Visant", font: "display", weight: 600, textCase: "as-is", tracking: -0.04, underline: true },
  { text: "Visant", mark: "™", font: "mono", weight: 500, textCase: "lower", tracking: 0.04 },
];

export default function InkWordmarkDemo({ props }: DemoProps) {
  const progresso = useMotionValue(0);
  const reduce = useReducedMotion();
  const [voz, setVoz] = React.useState(0);

  React.useEffect(() => {
    if (reduce) {
      progresso.set(1);
      return;
    }
    let vivo = true;
    let atual: ReturnType<typeof animate> | undefined;
    const ciclo = async () => {
      while (vivo) {
        atual = animate(progresso, 1, { duration: 2.8, ease: [0.23, 1, 0.32, 1] });
        await atual;
        await new Promise((r) => setTimeout(r, 2600));
        if (!vivo) break;
        atual = animate(progresso, 0, { duration: 1.6, ease: [0.77, 0, 0.175, 1] });
        await atual;
        if (!vivo) break;
        // A troca de voz mora aqui, com a marca ainda em fumaça.
        setVoz((v) => (v + 1) % VOZES.length);
        await new Promise((r) => setTimeout(r, 500));
      }
    };
    ciclo();
    return () => {
      vivo = false;
      atual?.stop();
    };
  }, [progresso, reduce]);

  return (
    <div className="grid h-full w-full place-items-center overflow-hidden px-8">
      <InkWordmark
        progress={progresso}
        aria-label="Visant"
        className="w-full max-w-[34rem] text-foreground"
        {...VOZES[voz]}
        {...props}
      />
    </div>
  );
}
