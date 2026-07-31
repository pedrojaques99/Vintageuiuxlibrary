"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Rail — trilho horizontal com scroll-snap nativo.
 *
 * Colhido do concept Hockey Direct. Carrossel de produto é padrão de loja
 * grande, e aqui é CSS nativo: sem biblioteca, sem sequestro de rolagem,
 * arrasta no telefone de graça.
 *
 * O detalhe que faz a diferença comercial: **o item parcialmente visível na
 * borda é o que conta ao olho que a gama continua.** Por isso a largura de
 * coluna nunca fecha exata no viewport.
 *
 * As setas desabilitam nas pontas — um controle que não faz nada mente sobre
 * o estado da lista.
 */

export interface RailProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Largura mínima de cada item. */
  itemWidth?: number;
  gap?: number;
  /** Setas de navegação (só aparecem onde há ponteiro). */
  arrows?: boolean;
  label?: string;
}

export function Rail({
  children,
  itemWidth = 240,
  gap = 20,
  arrows = true,
  label = "Scrollable list",
  className,
  ...props
}: RailProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edge, setEdge] = React.useState({ start: true, end: false });

  const sync = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft < 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    });
  }, []);

  React.useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  const nudge = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)} {...props}>
      {arrows && (
        <div className="mb-3 hidden justify-end gap-2 lg:flex">
          <RailButton dir="prev" disabled={edge.start} onClick={() => nudge(-1)} />
          <RailButton dir="next" disabled={edge.end} onClick={() => nudge(1)} />
        </div>
      )}

      <div
        ref={ref}
        role="group"
        aria-label={label}
        onScroll={sync}
        className={cn(
          "grid grid-flow-col overflow-x-auto overscroll-x-contain pb-3",
          "[scroll-snap-type:x_proximity]",
          "[&>*]:min-w-0 [&>*]:[scroll-snap-align:start]",
          "[scrollbar-width:thin]",
        )}
        style={{
          gridAutoColumns: `minmax(${itemWidth}px, 1fr)`,
          gap: `${gap}px`,
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RailButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Scroll left" : "Scroll right"}
      className={cn(
        "inline-flex size-10 items-center justify-center border border-[var(--border)]",
        "transition-[background-color,border-color,color,transform]",
        "[transition-duration:var(--dur-press,120ms)]",
        "hover:border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)]",
        "active:scale-[0.94]",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}
