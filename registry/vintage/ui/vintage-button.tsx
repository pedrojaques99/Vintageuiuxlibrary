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

export function VintageButton({
  label,
  active = false,
  accent,
  onClick,
  className,
}: VintageButtonProps) {
  const [pressed, setPressed] = useState(false);

  const accentColor = accent || "var(--vintage-accent)";
  const glowColor = accent
    ? `color-mix(in srgb, ${accent} 60%, transparent)`
    : "var(--vintage-accent-glow)";

  return (
    <button
      className={cn("relative group", className)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <div
        className="w-20 h-20 rounded-full"
        style={{
          background: pressed
            ? "linear-gradient(to bottom, var(--vintage-surface-3), var(--vintage-surface-2))"
            : "linear-gradient(to bottom, var(--vintage-surface-4), var(--vintage-surface-3))",
          boxShadow: pressed
            ? "inset 0 4px 8px rgba(0,0,0,0.8)"
            : "0 6px 0 var(--vintage-surface-2), 0 8px 12px rgba(0,0,0,0.5)",
          transform: pressed ? "translateY(2px)" : "translateY(0)",
          transition: "all 0.075s ease",
          outline: active
            ? `2px solid ${accentColor}`
            : "2px solid transparent",
          outlineOffset: 2,
        }}
      >
        <div
          className="absolute inset-2 rounded-full flex items-center justify-center"
          style={{
            background: active
              ? `linear-gradient(to bottom, ${accentColor}, color-mix(in srgb, ${accentColor} 70%, black))`
              : "linear-gradient(to bottom, var(--vintage-surface-3a), var(--vintage-surface-3))",
            boxShadow: active ? `0 0 20px ${glowColor}` : "none",
            transition: "all 0.2s ease",
          }}
        >
          <span
            className="text-xs font-vintage-display font-bold tracking-wider uppercase"
            style={{
              color: active ? "#fff" : "var(--vintage-text-muted)",
              transition: "color 0.2s",
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Active LED dot */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-1.5 h-1.5 rounded-full"
        style={{
          background: active ? accentColor : "transparent",
          boxShadow: active ? `0 0 10px ${glowColor}` : "none",
          transition: "all 0.2s",
        }}
      />
    </button>
  );
}
