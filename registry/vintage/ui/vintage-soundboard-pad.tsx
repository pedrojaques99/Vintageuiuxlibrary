"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface VintageSoundboardPadProps {
  label?: string;
  icon?: string;
  color?: string;
  active?: boolean;
  size?: number;
  onTrigger?: () => void;
  onRelease?: () => void;
  className?: string;
}

export function VintageSoundboardPad({
  label = "PAD",
  icon,
  color = "var(--vintage-accent)",
  active: controlledActive,
  size = 96,
  onTrigger,
  onRelease,
  className,
}: VintageSoundboardPadProps) {
  const [internalActive, setInternalActive] = useState(false);
  const isActive =
    controlledActive !== undefined ? controlledActive : internalActive;

  const handleDown = useCallback(() => {
    if (controlledActive === undefined) setInternalActive(true);
    onTrigger?.();
  }, [controlledActive, onTrigger]);

  const handleUp = useCallback(() => {
    if (controlledActive === undefined) setInternalActive(false);
    onRelease?.();
  }, [controlledActive, onRelease]);

  return (
    <button
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer select-none transition-transform active:scale-95",
        className
      )}
      style={{
        width: size,
        height: size,
        background: isActive
          ? `linear-gradient(135deg, ${color}, ${color}cc)`
          : "var(--vintage-surface-2)",
        border: `2px solid ${isActive ? color : "var(--vintage-border)"}`,
        boxShadow: isActive
          ? `0 0 20px ${color}40, inset 0 1px 0 rgba(255,255,255,0.1)`
          : "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.3)",
      }}
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onMouseLeave={() => {
        if (controlledActive === undefined) setInternalActive(false);
      }}
      onTouchStart={handleDown}
      onTouchEnd={handleUp}
    >
      {/* Glow ring when active */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: `inset 0 0 15px ${color}30`,
          }}
        />
      )}

      {/* Icon / Emoji */}
      {icon && (
        <span
          className="leading-none"
          style={{
            fontSize: size * 0.3,
            filter: isActive ? "brightness(1.2)" : "none",
          }}
        >
          {icon}
        </span>
      )}

      {/* Label */}
      <span
        className="font-bold uppercase tracking-wider truncate max-w-[90%]"
        style={{
          fontSize: Math.max(9, size * 0.1),
          color: isActive ? "rgba(255,255,255,0.95)" : "var(--vintage-text-muted)",
          fontFamily: "var(--font-vintage-mono, monospace)",
        }}
      >
        {label}
      </span>

      {/* Active dot indicator */}
      <div
        className="absolute bottom-1.5 rounded-full transition-colors"
        style={{
          width: 6,
          height: 6,
          background: isActive ? color : "var(--vintage-surface-3a)",
          boxShadow: isActive ? `0 0 6px ${color}` : "none",
        }}
      />
    </button>
  );
}
