"use client";

/**
 * A marca no fim de um percurso — porque é o scroll que a condensa.
 *
 * Mostrada parada no meio do card, a peça seria só uma palavra borrada. Aqui o
 * card tem a própria rolagem (por isso o `container`): no topo a marca ainda é
 * fumaça, e ela assenta em tinta quando o fim do bloco encosta no fim da caixa.
 * O botão volta ao topo para ver de novo, já que o card não tem como "rolar a
 * página" da vitrine.
 *
 * O conteúdo é `<text>` vivo e um traço, não um path de logo: o filtro desloca
 * qualquer coisa que pinte, e a vitrine não tem marca de cliente para mostrar.
 * Passe o mouse rápido sobre a marca assentada para agitar a tinta.
 */

import * as React from "react";

import { InkWordmark } from "../../../registry/visant/ui/ink-wordmark";
import type { DemoProps } from "../catalog";

export default function InkWordmarkDemo({ props }: DemoProps) {
  const caixa = React.useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card">
      <div ref={caixa} className="relative h-full overflow-y-auto">
        <div className="flex h-[150%] flex-col justify-between p-5">
          <p className="font-mono text-apoio text-muted-foreground">role a caixa ↓</p>
          <InkWordmark
            container={caixa}
            viewBox="0 0 1000 300"
            aria-label="Visant"
            className="text-foreground"
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
      </div>
      <button
        type="button"
        onClick={() => caixa.current?.scrollTo({ top: 0, behavior: "smooth" })}
        className="absolute right-3 top-3 rounded-[var(--r-control,0.5rem)] px-2 py-1 font-mono text-apoio text-muted-foreground outline-none hover:text-[var(--brand)] focus-visible:[box-shadow:var(--focus)]"
      >
        de novo ↑
      </button>
    </div>
  );
}
