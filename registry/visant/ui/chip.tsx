"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Chip — pastilha de filtro.
 *
 * Colhida do concept Hockey Direct. É o gesto que o comprador de loja grande já
 * tem no dedo: nada de inventar controle novo numa superfície de compra.
 *
 * Duas coisas que parecem detalhe e não são:
 *
 * 1. **`aria-pressed`, não `aria-selected`.** Um filtro é um botão de dois
 *    estados, não um item de lista selecionado. O leitor de tela anuncia
 *    "pressionado", que é a verdade.
 * 2. **`count` nunca renderiza zero.** Zero não é informação — um filtro que
 *    mostra "(0)" ocupa espaço para dizer que não serve. Ele some.
 *
 * O `icon` existe para o caso em que o dado da loja cabe dentro do controle:
 * no Hockey Direct é a curva do bow desenhada em SVG, herdando `currentColor`,
 * então ela acompanha o estado sem uma linha de CSS a mais.
 */

export interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  pressed?: boolean;
  count?: number;
  icon?: React.ReactNode;
}

export function Chip({
  pressed = false,
  count,
  icon,
  children,
  className,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap border px-3.5 py-2",
        "text-[13px] font-semibold",
        "border-[var(--border)] text-[var(--foreground)]",
        "transition-[background-color,color,border-color,transform]",
        "[transition-duration:var(--dur-press,120ms)]",
        "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
        "hover:border-[var(--foreground)]",
        "active:scale-[0.97]",
        pressed &&
          "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]",
        className,
      )}
      {...props}
    >
      {icon ? <span className="shrink-0 [&_svg]:overflow-visible">{icon}</span> : null}
      <span>{children}</span>
      {/* Zero não é informação. */}
      {typeof count === "number" && count > 0 ? (
        <span className="opacity-60 tabular-nums">{count}</span>
      ) : null}
    </button>
  );
}
