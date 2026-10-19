"use client";

/**
 * A marca condensando da fumaça, em ciclo.
 *
 * No site a condensação vem do scroll (o rodapé chega e a tinta assenta). Num
 * card de vitrine não há o que rolar, então a demo usa a prop `progress` e
 * dirige o mesmo caminho por tempo.
 *
 * O conteúdo é `<text>` vivo e um traço, não um path de logo: o filtro desloca
 * qualquer coisa que pinte, e a vitrine não tem marca de cliente para mostrar.
 * Passe o mouse rápido sobre a marca assentada para agitar a tinta.
 */

import * as React from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";

import { InkWordmark } from "../../../registry/visant/ui/ink-wordmark";
import type { DemoProps } from "../catalog";

export default function InkWordmarkDemo({ props }: DemoProps) {
  const progresso = useMotionValue(0);
  const reduce = useReducedMotion();

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
    <div className="grid h-full w-full place-items-center overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card px-6">
      <InkWordmark
        progress={progresso}
        viewBox="0 0 1000 300"
        aria-label="Visant"
        className="w-full text-foreground"
        {...props}
      >
        <text
          x="500"
          y="190"
          textAnchor="middle"
          fontSize="210"
          fontWeight={600}
          letterSpacing="-8"
          style={{ fontFamily: "var(--font-display, inherit)" }}
        >
          Visant
        </text>
        <path
          d="M150 250 C 330 214, 520 290, 850 236"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
        />
      </InkWordmark>
    </div>
  );
}
