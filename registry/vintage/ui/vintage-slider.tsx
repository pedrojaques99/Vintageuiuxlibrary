"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface VintageSliderProps {
  label?: string;
  min?: number;
  max?: number;
  value?: number;
  accent?: string;
  fmt?: (v: number) => string;
  onChange?: (value: number) => void;
  className?: string;
}

export function VintageSlider({
  label = "GAIN",
  min = 0,
  max = 10,
  value = 5,
  accent,
  fmt,
  onChange,
  className,
}: VintageSliderProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const valRef = useRef(currentValue);
  valRef.current = currentValue;

  useEffect(() => {
    if (value !== valRef.current) setCurrentValue(value);
  }, [value]);

  const update = useCallback(
    (clientX: number, fine: boolean) => {
      const r = trackRef.current?.getBoundingClientRect();
      if (!r) return;
      const raw = (clientX - r.left) / r.width;
      const pct = Math.max(0, Math.min(1, raw));
      const v = min + pct * (max - min);
      const snapped = fine
        ? Math.round(v * 100) / 100
        : Math.round(v * 10) / 10;
      setCurrentValue(snapped);
      onChange?.(snapped);
    },
    [min, max, onChange]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => update(e.clientX, e.shiftKey);
    const onUp = () => setDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, update]);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const step = e.shiftKey ? (max - min) * 0.002 : (max - min) * 0.01;
    const dir = e.deltaY < 0 ? 1 : -1;
    const next = Math.max(min, Math.min(max, currentValue + dir * step));
    setCurrentValue(next);
    onChange?.(next);
  };

  const handleDoubleClick = () => {
    const mid = (min + max) / 2;
    setCurrentValue(mid);
    onChange?.(mid);
  };

  const percentage = ((currentValue - min) / (max - min)) * 100;

  return (
    <div
      className={cn(
        "relative w-[220px] bg-gradient-to-b from-[var(--vintage-surface-3)] to-[var(--vintage-surface-2)] rounded-lg border-2 border-[var(--vintage-surface-4)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_4px_8px_rgba(0,0,0,0.3)] p-4",
        className
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      title={`${label}: ${fmt ? fmt(currentValue) : currentValue.toFixed(2)}\ndrag · shift=fine · scroll · dbl-click=reset`}
      style={{
        opacity: hover || dragging ? 1 : 0.9,
        transition: "opacity 0.15s",
      }}
    >
      <div className="text-center text-[var(--vintage-label)] text-xs font-vintage-mono tracking-widest mb-5 opacity-80">
        {label}
      </div>

      <div
        ref={trackRef}
        className="relative h-8 mb-3 cursor-pointer"
        onMouseDown={(e) => {
          setDragging(true);
          update(e.clientX, e.shiftKey);
        }}
      >
        <div className="absolute inset-0 bg-[var(--vintage-surface-2)] rounded border border-[var(--vintage-border)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--vintage-meter-green)] via-[var(--vintage-meter-yellow)] to-[var(--vintage-meter-red)] rounded transition-[width] duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-10 rounded pointer-events-none transition-[left] duration-75"
          style={{
            left: `calc(${percentage}% - 6px)`,
            background:
              "linear-gradient(to bottom, var(--vintage-metal-light), var(--vintage-metal-dark))",
            border: "2px solid var(--vintage-text-muted)",
            boxShadow: dragging
              ? "0 0 8px rgba(255,215,0,0.3), 0 4px 8px rgba(0,0,0,0.4)"
              : "0 4px 8px rgba(0,0,0,0.4)",
          }}
        />
      </div>

      <div className="flex justify-between text-[9px] font-vintage-mono">
        <span className="text-[var(--vintage-text-muted)]">{min}</span>
        <span style={{ color: accent || "var(--vintage-label)" }}>
          {fmt ? fmt(currentValue) : currentValue.toFixed(1)}
        </span>
        <span className="text-[var(--vintage-text-muted)]">{max}</span>
      </div>
    </div>
  );
}
