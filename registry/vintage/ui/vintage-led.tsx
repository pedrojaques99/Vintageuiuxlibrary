"use client";

import { cn } from "@/lib/utils";

interface VintageLedProps {
  color?: "green" | "red" | "yellow" | "orange" | string;
  active?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
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

export function VintageLed({
  color = "green",
  active = false,
  label,
  size = "md",
  pulse = false,
  className,
}: VintageLedProps) {
  const preset = presetColors[color];
  const onColor = preset ? preset.on : color;
  const offColor = preset ? preset.off : `color-mix(in srgb, ${color} 20%, #1a1a1a)`;
  const s = sizeMap[size];

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-1", className)}
    >
      <div
        className="rounded-full border border-[var(--vintage-border)]"
        style={{
          width: s.w,
          height: s.h,
          background: active ? onColor : offColor,
          boxShadow: active
            ? `0 0 ${s.w}px ${onColor}, 0 0 ${s.w * 2}px ${onColor}`
            : "none",
          transition: "all 0.2s",
          animation:
            active && pulse ? "vtv-rec-blink 1s ease-in-out infinite" : "none",
        }}
      />
      {label && (
        <span
          className="font-vintage-mono tracking-wider uppercase"
          style={{
            fontSize: Math.max(7, s.w * 0.65),
            color: active
              ? "var(--vintage-text-muted)"
              : "var(--vintage-text-dim)",
            transition: "color 0.2s",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
