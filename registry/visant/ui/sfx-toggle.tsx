"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { sfx, useSfxEnabled } from "@/lib/sfx-bus";

/**
 * O botão que liga e desliga o som da casa.
 *
 * Dois estados, **um** ícone. As ondas recolhem PARA o alto-falante em vez de
 * sumir: o movimento diz qual estado é qual sem precisar de um segundo desenho,
 * e sem precisar da palavra "mudo" ao lado. Trocar de ícone entre dois estados
 * é a saída fácil e a que menos comunica — o olho perde a continuidade e tem
 * que reconhecer um símbolo novo.
 *
 * ── O estado nulo é desenhado, e é o detalhe que costuma faltar ────────────
 *
 * A preferência mora no `localStorage`, que o servidor não enxerga. Qualquer
 * chute no HTML é um estado errado piscando na tela até a hidratação corrigir —
 * e num toggle, estado errado piscando lê como o botão tendo sido apertado
 * sozinho. Aqui o rótulo nasce vazio (o botão ocupa o espaço, invisível) e só
 * aparece quando o bus responde. Reserva o layout sem afirmar nada.
 *
 * `data-sfx-silent` impede que a fiação do bus toque o `press` neste botão: ele
 * toca o próprio som ao ligar, e dois sons no mesmo clique lêem como bug.
 */
export interface SfxToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Rótulos, porque texto é voz de marca e não pertence ao componente. */
  labels?: { on: string; off: string };
}

export function SfxToggle({ labels, className, ...props }: SfxToggleProps) {
  const on = useSfxEnabled();
  const rotulos = labels ?? { on: "Desligar o som", off: "Ligar o som" };

  return (
    <button
      type="button"
      data-sfx-silent
      data-state={on === null ? "unknown" : on ? "on" : "off"}
      aria-pressed={on ?? false}
      aria-label={on ? rotulos.on : rotulos.off}
      // Invisível, não ausente: desmontar até hidratar faria a barra saltar.
      style={on === null ? { visibility: "hidden" } : undefined}
      onClick={() => sfx.setEnabled(!sfx.isEnabled())}
      className={cn(
        "sfx-toggle inline-flex size-[34px] flex-none items-center justify-center rounded-[var(--r-control)]",
        "border border-transparent bg-transparent p-0 text-muted-foreground",
        // `[transition-duration:…]` e não `duration-[…]`: a utility de duração
        // do Tailwind não aceita `var()` como valor arbitrário e não gera regra
        // nenhuma — falha silenciosa que o check:css-tokens pegou.
        "transition-[color,border-color,transform] [transition-duration:var(--dur-base,240ms)] ease-[var(--ease-out)]",
        "active:scale-[0.92]",
        "hover:text-foreground hover:border-border",
        "data-[state=on]:text-foreground",
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="block size-[17px]">
        <path
          d="M4 9v6h3.5L13 19V5L7.5 9H4Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <g className="sfx-wave">
          <path
            d="M16.2 9.2a4 4 0 0 1 0 5.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M18.9 6.6a7.7 7.7 0 0 1 0 10.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </button>
  );
}
