"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface VintageButtonProps {
  label: string;
  active?: boolean;
  accent?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Botão de painel: capa de baquelite num poço do painel, lâmpada-piloto em cima.
 *
 * Antes a capa inteira virava laranja quando ativa — um disco de cor chapada
 * que não existe em equipamento nenhum e brigava com o resto do kit, onde o
 * aceso é sempre uma lâmpada pequena. Aqui o estado mora onde mora num rack:
 * no LED acima da capa, e na capa que fica travada um pouco mais funda.
 *
 * Três alturas, uma luz só (de cima): solta, travada (ativa) e apertada.
 */
export function VintageButton({
  label,
  active = false,
  accent,
  onClick,
  className,
}: VintageButtonProps) {
  const [pressed, setPressed] = useState(false);

  const lamp = accent || "var(--vintage-light)";
  // Curso da capa em px: solta, travada, apertada.
  const curso = pressed ? 3 : active ? 1.5 : 0;

  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "group relative inline-flex flex-col items-center gap-2 rounded-[var(--r-control,10px)] p-1.5 outline-none select-none",
        "focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--vintage-value))]",
        className
      )}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") setPressed(true);
      }}
      onKeyUp={() => setPressed(false)}
      onBlur={() => setPressed(false)}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      {/* Lâmpada-piloto: lente no aro, halo só quando acesa. */}
      <span
        aria-hidden
        className="block h-2 w-2 rounded-full"
        style={{
          background: active
            ? `radial-gradient(circle at 50% 35%, color-mix(in srgb, ${lamp} 40%, white) 0%, ${lamp} 45%, color-mix(in srgb, ${lamp} 70%, black) 100%)`
            : "radial-gradient(circle at 50% 35%, var(--vintage-surface-4) 0%, var(--vintage-surface-2) 100%)",
          boxShadow: active
            ? `0 0 0 1px rgba(0,0,0,0.6), 0 0 8px color-mix(in srgb, ${lamp} 70%, transparent)`
            : "0 0 0 1px rgba(0,0,0,0.6), inset 0 1px 1px rgba(0,0,0,0.6)",
          transition:
            "background var(--dur-fast,160ms) var(--ease-out,ease), box-shadow var(--dur-fast,160ms) var(--ease-out,ease)",
        }}
      />

      {/* O poço no painel: a capa mora dentro dele. */}
      <span
        className="relative block h-16 w-16 rounded-full"
        style={{
          background: "var(--vintage-surface-1)",
          boxShadow:
            "inset 0 2px 4px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <span
          className="absolute inset-[5px] flex items-center justify-center rounded-full"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 15%, var(--vintage-surface-4) 0%, var(--vintage-surface-3) 45%, var(--vintage-surface-2) 100%)",
            // A borda de baixo da capa é o que a faz parecer alta. Ela some
            // conforme a capa afunda — é isso que o olho lê como curso.
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), 0 ${4 - curso}px 0 var(--vintage-surface-1), 0 ${6 - curso}px ${8 - curso * 2}px rgba(0,0,0,0.55)`,
            transform: `translateY(${curso}px)`,
            transition:
              "transform var(--dur-press,120ms) var(--ease-out,ease), box-shadow var(--dur-press,120ms) var(--ease-out,ease)",
          }}
        >
          <span
            className="font-vintage-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{
              color: active ? "var(--vintage-label)" : "var(--vintage-text-muted)",
              textShadow: "0 -1px 0 rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06)",
              transition: "color var(--dur-fast,160ms) var(--ease-out,ease)",
            }}
          >
            {label}
          </span>
        </span>
      </span>
    </button>
  );
}
