"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface VintageXYPadProps {
  size?: number;
  value?: { x: number; y: number };
  onChange?: (x: number, y: number) => void;
  labelX?: string;
  labelY?: string;
  color?: string;
  className?: string;
}

export function VintageXYPad({
  size = 160,
  value,
  onChange,
  labelX = "X",
  labelY = "Y",
  color = "var(--vintage-accent)",
  className,
}: VintageXYPadProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(value ?? { x: 0.5, y: 0.5 });
  const dragging = useRef(false);

  const currentPos = value ?? pos;

  const handlePointer = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const y = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
      if (!value) setPos({ x, y });
      onChange?.(x, y);
    },
    [onChange, value]
  );

  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    const move = (e: PointerEvent) => {
      if (dragging.current) handlePointer(e);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", move);
    };
  }, [handlePointer]);

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      {/* Pad */}
      <div
        ref={ref}
        className="relative rounded-lg cursor-crosshair touch-none"
        style={{
          width: size,
          height: size,
          background: "var(--vintage-surface-1)",
          border: "1px solid var(--vintage-border)",
          boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
        }}
        onPointerDown={(e) => {
          dragging.current = true;
          handlePointer(e);
        }}
      >
        {/* Grid lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${size} ${size}`}
        >
          {[0.25, 0.5, 0.75].map((t) => (
            <g key={t}>
              <line
                x1={t * size}
                y1={0}
                x2={t * size}
                y2={size}
                stroke="var(--vintage-border)"
                strokeWidth={0.5}
                opacity={t === 0.5 ? 0.5 : 0.2}
              />
              <line
                x1={0}
                y1={t * size}
                x2={size}
                y2={t * size}
                stroke="var(--vintage-border)"
                strokeWidth={0.5}
                opacity={t === 0.5 ? 0.5 : 0.2}
              />
            </g>
          ))}
        </svg>

        {/* Crosshair lines to cursor */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${currentPos.x * 100}%`,
            top: 0,
            bottom: 0,
            width: 1,
            background: color,
            opacity: 0.2,
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: `${(1 - currentPos.y) * 100}%`,
            left: 0,
            right: 0,
            height: 1,
            background: color,
            opacity: 0.2,
          }}
        />

        {/* Cursor dot */}
        <div
          className="absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${currentPos.x * 100}%`,
            top: `${(1 - currentPos.y) * 100}%`,
            width: 12,
            height: 12,
            background: color,
            boxShadow: `0 0 10px ${color}, 0 0 20px ${color}60`,
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 border-2 border-white/30"
          style={{
            left: `${currentPos.x * 100}%`,
            top: `${(1 - currentPos.y) * 100}%`,
            width: 20,
            height: 20,
          }}
        />
      </div>

      {/* Axis labels */}
      <div className="flex justify-between" style={{ width: size }}>
        <span
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{
            color: "var(--vintage-text-dim)",
            fontFamily: "var(--font-vintage-mono, monospace)",
          }}
        >
          {labelX}: {(currentPos.x * 100).toFixed(0)}%
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{
            color: "var(--vintage-text-dim)",
            fontFamily: "var(--font-vintage-mono, monospace)",
          }}
        >
          {labelY}: {(currentPos.y * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
