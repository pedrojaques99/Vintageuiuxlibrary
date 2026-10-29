"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx-bus";

type TogglePosition = "up" | "middle" | "down";

interface VintageToggleProps {
  labels?: [string, string, string];
  title?: string;
  position?: TogglePosition;
  accent?: string;
  onChange?: (position: TogglePosition) => void;
  className?: string;
}

export function VintageToggle({
  labels = ["U", "M", "D"],
  title = "TOGGLE",
  position: controlledPos,
  accent,
  onChange,
  className,
}: VintageToggleProps) {
  const [internalPos, setInternalPos] = useState<TogglePosition>("middle");
  const position = controlledPos ?? internalPos;

  const positions: TogglePosition[] = ["up", "middle", "down"];
  const indice = positions.indexOf(position);

  const ir = (next: TogglePosition) => {
    if (next === position) return;
    playSfx("toggle");
    if (controlledPos === undefined) setInternalPos(next);
    onChange?.(next);
  };

  const handleClick = () => ir(positions[(indice + 1) % positions.length]);

  /*
   * Teclado: a chave era só do mouse. Seta pra cima e pra baixo movem a
   * alavanca um degrau (como o dedo faria), Home/End vão aos extremos, e Enter
   * ou Espaço ciclam igual ao clique.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    let next: TogglePosition | null = null;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = positions[Math.max(0, indice - 1)];
    else if (e.key === "ArrowDown" || e.key === "ArrowRight") next = positions[Math.min(2, indice + 1)];
    else if (e.key === "Home") next = "up";
    else if (e.key === "End") next = "down";
    else if (e.key === "Enter" || e.key === " ") next = positions[(indice + 1) % positions.length];
    if (!next) return;
    e.preventDefault();
    e.stopPropagation();
    ir(next);
  };

  const activeColor = accent || "var(--vintage-light)";
  /** Paradas da alavanca no curso do trilho, em % da altura. */
  const PARADAS = [12, 50, 88];

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label={title}
      aria-valuemin={0}
      aria-valuemax={2}
      aria-valuenow={indice}
      aria-valuetext={labels[indice]}
      aria-orientation="vertical"
      title={`${title}: ${labels[indice]}
clique ou setas`}
      className={cn(
        "group relative inline-flex cursor-pointer select-none flex-col items-center gap-3 px-4 pt-3 pb-4 outline-none",
        "rounded-[var(--r-control,10px)]",
        className
      )}
      style={{
        // O mesmo painel do resto do kit: chapa escura, luz de cima.
        background: "linear-gradient(180deg, var(--vintage-surface-3), var(--vintage-surface-2))",
        border: "1px solid var(--vintage-surface-1)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 1px rgba(0,0,0,0.5), 0 10px 24px -8px rgba(0,0,0,0.6)",
      }}
    >
      {/* Anel de foco num filho: o relevo mora no `box-shadow` inline, que
          venceria qualquer classe de foco no próprio elemento. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[inherit] group-focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--vintage-value))]"
      />
      <span
        className="font-vintage-mono text-[10px] font-semibold uppercase tracking-[0.18em] whitespace-nowrap"
        style={{
          color: "var(--vintage-text-muted)",
          textShadow: "0 -1px 0 rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {title}
      </span>

      <div className="flex items-stretch gap-3">
        {/* O rasgo na chapa, com a alavanca dentro. */}
        <div
          className="relative h-[132px] w-[26px] rounded-full"
          style={{
            background: "var(--vintage-surface-1)",
            boxShadow: "inset 0 2px 5px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="absolute left-1/2 top-0 h-[34px] w-[34px] -ml-[17px] rounded-[8px]"
            style={{
              top: `${PARADAS[indice]}%`,
              transform: "translateY(-50%)",
              // Mola: passa um pouco da parada e volta, como a trava de uma
              // chave de verdade. Curta (200ms) porque responde a um gesto.
              transition: "top var(--dur-base,200ms) cubic-bezier(0.34, 1.56, 0.64, 1)",
              background:
                "linear-gradient(180deg, var(--vintage-metal-channel-light) 0%, var(--vintage-metal-mid) 48%, var(--vintage-metal-light) 52%, var(--vintage-metal-channel-dark) 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.6), 0 0 0 1px rgba(0,0,0,0.55), 0 4px 6px rgba(0,0,0,0.55)",
            }}
          >
            {/* Frisos de pega. */}
            <div
              className="absolute inset-x-[7px] top-1/2 h-[10px] -translate-y-1/2"
              style={{
                background:
                  "repeating-linear-gradient(180deg, rgba(0,0,0,0.35) 0 1px, rgba(255,255,255,0.35) 1px 2px, transparent 2px 4px)",
              }}
            />
          </div>
        </div>

        {/* Rótulos serigrafados, um por parada. O da posição atual acende. */}
        <div className="relative h-[132px] w-8">
          {labels.map((lbl, i) => (
            <span
              key={i}
              className="absolute left-0 -translate-y-1/2 font-vintage-mono text-[10px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap"
              style={{
                top: `${PARADAS[i]}%`,
                color: i === indice ? "var(--vintage-value)" : "var(--vintage-text-muted)",
                textShadow:
                  i === indice
                    ? `0 0 6px color-mix(in srgb, ${activeColor} 45%, transparent)`
                    : "0 -1px 0 rgba(0,0,0,0.55)",
                transition: "color var(--dur-fast,160ms) var(--ease-out,ease)",
              }}
            >
              {lbl}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
