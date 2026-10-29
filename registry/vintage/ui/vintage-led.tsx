"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface VintageLedProps {
  color?: "green" | "red" | "yellow" | "orange" | string;
  active?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  /**
   * Quanto o LED está aceso, de 0 a 1. É o que separa "ligado" de "no talo":
   * um indicador de nível precisa clarear com o sinal, não só acender.
   */
  intensity?: number;
  className?: string;
}

const presetColors: Record<string, { on: string; off: string }> = {
  green: { on: "var(--vintage-meter-green)", off: "#1a3a1a" },
  red: { on: "var(--vintage-meter-red)", off: "#3a1a1a" },
  yellow: { on: "var(--vintage-meter-yellow)", off: "#3a3a1a" },
  orange: { on: "var(--vintage-accent)", off: "#3a2a1a" },
};

const sizeMap = {
  sm: { w: 8, h: 8 },
  md: { w: 12, h: 12 },
  lg: { w: 16, h: 16 },
};

/**
 * O piscar mora aqui, e não emprestado do `vintage-tv-frame`.
 *
 * A animação usada antes (`vtv-rec-blink`) só existe quando o frame de TV está
 * na página: quem instalasse o LED sozinho — o caso normal — ganhava um `pulse`
 * que não pulsava. Mesma técnica do vizinho, keyframes próprios, e com o
 * respeito a `prefers-reduced-motion` escrito junto em vez de esquecido.
 */
const STYLE_ID = "vintage-led-keyframes";

function injectKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
@keyframes vled-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}
.vled-pulse { animation: vled-pulse 1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .vled-pulse { animation: none; }
}
`;
  document.head.appendChild(style);
}

export function VintageLed({
  color = "green",
  active = false,
  label,
  size = "md",
  pulse = false,
  intensity = 1,
  className,
}: VintageLedProps) {
  useEffect(injectKeyframes, []);

  const preset = presetColors[color];
  const onColor = preset ? preset.on : color;
  const offColor = preset ? preset.off : `color-mix(in srgb, ${color} 20%, #1a1a1a)`;
  const s = sizeMap[size];
  const i = Math.max(0, Math.min(1, intensity));
  const brilho = active
    ? `color-mix(in srgb, ${onColor} ${Math.round(35 + i * 65)}%, ${offColor})`
    : offColor;

  // Aro cromado em volta da lente: é ele que diz "peça montada no painel" e
  // não "bolinha de cor". Um terço do diâmetro da lente, de cada lado.
  const aro = Math.max(2, Math.round(s.w * 0.28));

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-1.5", className)}
    >
      <div
        className="rounded-full"
        style={{
          padding: aro,
          background:
            "linear-gradient(180deg, var(--vintage-metal-mid), var(--vintage-metal-dark))",
          boxShadow: "0 1px 1px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.35)",
        }}
      >
        <div
          className={cn("relative rounded-full", active && pulse && "vled-pulse")}
          style={{
            width: s.w,
            height: s.h,
            // Lente: o reflexo da lâmpada da sala fica em cima, sempre, aceso
            // ou não. O que muda com o estado é a cor por trás do vidro.
            background: `radial-gradient(circle at 50% 30%, rgba(255,255,255,${active ? 0.55 : 0.18}) 0%, transparent 38%), ${brilho}`,
            boxShadow: active
              ? `inset 0 -1px 2px rgba(0,0,0,0.35), 0 0 ${s.w * i}px ${onColor}, 0 0 ${s.w * 2 * i}px color-mix(in srgb, ${onColor} 55%, transparent)`
              : "inset 0 1px 2px rgba(0,0,0,0.7)",
            transition:
              "background var(--dur-fast,160ms) var(--ease-out,ease), box-shadow var(--dur-fast,160ms) var(--ease-out,ease)",
          }}
        />
      </div>
      {label && (
        <span
          className="font-vintage-mono font-semibold tracking-[0.16em] uppercase"
          style={{
            fontSize: Math.max(9, s.w * 0.65),
            color: active ? "var(--vintage-label)" : "var(--vintage-text-muted)",
            textShadow: "0 -1px 0 rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06)",
            transition: "color var(--dur-fast,160ms) var(--ease-out,ease)",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
