"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useKnobDrag } from "@/hooks/use-knob-drag";

interface VintageLargeKnobProps {
  label?: string;
  min?: number;
  max?: number;
  value?: number;
  log?: boolean;
  accent?: string;
  fmt?: (v: number) => string;
  onChange?: (value: number) => void;
  className?: string;
}

function LargeKnobTicks() {
  const ticks = Array.from({ length: 27 }, (_, i) => {
    const angle = -135 + (i / 26) * 270;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 9 === 0;
    const outerR = 210;
    const innerR = isMajor ? 190 : 197;
    const cx = 221,
      cy = 221;

    return (
      <line
        key={i}
        x1={cx + Math.cos(rad) * innerR}
        y1={cy + Math.sin(rad) * innerR}
        x2={cx + Math.cos(rad) * outerR}
        y2={cy + Math.sin(rad) * outerR}
        stroke="var(--vintage-text-dim)"
        strokeWidth={isMajor ? "8" : "3"}
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg
      viewBox="0 0 442 442"
      className="absolute inset-[-19%] w-[138%] h-[138%]"
      fill="none"
    >
      {ticks}
    </svg>
  );
}

function LargeKnobBody({ rotation }: { rotation: number }) {
  return (
    <div
      className="absolute inset-0 transition-transform duration-75"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <svg viewBox="0 0 318 318" className="w-full h-full" fill="none">
        <defs>
          <radialGradient id="lk-outer" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#4a4a4a" />
            <stop offset="0.7" stopColor="#2a2a2a" />
            <stop offset="1" stopColor="#1a1a1a" />
          </radialGradient>
        </defs>

        <circle cx="159" cy="159" r="159" fill="url(#lk-outer)" />
        <circle cx="159" cy="159" r="145" fill="#323336" fillOpacity="0.96" />

        <foreignObject x="20" y="20" width="278" height="278">
          {/* Sem `xmlns` no div: sobra do export do Figma. Dentro de um SVG
              inline o conteúdo do foreignObject já é parseado como HTML, e o
              atributo só existia para o React reclamar e o tsc barrar. */}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background:
                "conic-gradient(from 90deg, #969AA0 0deg, #5D636C 9deg, #555B69 22deg, #DFDFDF 41deg, #71798A 63deg, #A9ABB3 83deg, #CBD2D6 120deg, #FFFFFF 149deg, #5E646A 186deg, #8E959D 219deg, #FFFFFF 245deg, #7E8691 269deg, #575D6B 284deg, #6C747F 301deg, #F1F1F3 337deg, #979AA3 349deg, #B1B3B9 356deg, #969AA0 360deg)",
              opacity: 0.85,
            }}
          />
        </foreignObject>

        <circle
          cx="159"
          cy="159"
          r="130"
          fill="transparent"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="8"
        />

        <circle cx="159" cy="30" r="10" fill="var(--vintage-text-dim)">
          <title>marker</title>
        </circle>
      </svg>
    </div>
  );
}

export function VintageLargeKnob({
  label = "VOLUME",
  min = 0,
  max = 10,
  value = 5,
  log = false,
  accent = "var(--vintage-value)",
  fmt,
  onChange,
  className,
}: VintageLargeKnobProps) {
  const [hover, setHover] = useState(false);
  const {
    currentValue,
    rotation,
    isDragging,
    handleMouseDown,
    handleDoubleClick,
    handleWheel,
  } = useKnobDrag({ min, max, value, sensitivity: 0.015, log, onChange });

  return (
    <div
      className={cn("relative inline-block select-none", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`${label}: ${fmt ? fmt(currentValue) : currentValue.toFixed(2)}\ndrag ↕ · shift=fine · scroll · dbl-click=reset`}
    >
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          opacity: hover || isDragging ? 1 : 0.9,
          transition: "opacity 0.15s, filter 0.2s",
          filter: hover
            ? `drop-shadow(0 0 12px color-mix(in srgb, ${accent} 20%, transparent))`
            : "none",
        }}
      >
        <div className="relative w-[318px] h-[318px]">
          <LargeKnobTicks />
          <LargeKnobBody rotation={rotation} />
        </div>
      </div>
      <div className="text-center mt-6 space-y-2">
        <div
          className="text-3xl font-vintage-display font-black tracking-widest uppercase"
          style={{
            color: hover
              ? "var(--vintage-label)"
              : "var(--vintage-value)",
            transition: "color 0.15s",
          }}
        >
          {label}
        </div>
        <div
          className="text-xl font-vintage-mono font-bold tracking-widest"
          style={{ color: accent }}
        >
          {fmt ? fmt(currentValue) : currentValue.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
