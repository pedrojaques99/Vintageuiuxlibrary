"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface VintageMeterProps {
  label?: string;
  value?: number;
  min?: number;
  max?: number;
  className?: string;
}

export function VintageMeter({
  label = "LEVEL",
  value = 0,
  min = 0,
  max = 10,
  className,
}: VintageMeterProps) {
  const needleRef = useRef<SVGGElement>(null);
  const targetRef = useRef(value);
  const currentRef = useRef(value);
  const rafRef = useRef<number>(0);

  targetRef.current = value;

  useEffect(() => {
    let running = true;
    function animate() {
      if (!running) return;
      const diff = targetRef.current - currentRef.current;
      // Attack fast, decay slow (analog meter inertia)
      const speed = diff > 0 ? 0.25 : 0.08;
      currentRef.current += diff * speed;

      const normalized =
        (currentRef.current - min) / (max - min);
      const rotation = -45 + normalized * 90;

      if (needleRef.current) {
        needleRef.current.setAttribute(
          "transform",
          `rotate(${rotation} 70 65)`
        );
      }

      rafRef.current = requestAnimationFrame(animate);
    }
    animate();
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [min, max]);

  const normalized = (value - min) / (max - min);
  const isClipping = normalized > 0.85;

  return (
    <div
      className={cn(
        "relative w-[180px] h-[140px] bg-gradient-to-b from-[var(--vintage-surface-3)] to-[var(--vintage-surface-2)] rounded-lg border-2 border-[var(--vintage-surface-4)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_4px_8px_rgba(0,0,0,0.3)]",
        className
      )}
    >
      <div className="absolute top-3 left-0 right-0 text-center text-[var(--vintage-label)] text-xs font-vintage-mono tracking-widest opacity-80">
        {label}
      </div>

      <div className="absolute top-[45px] left-1/2 -translate-x-1/2 w-[140px] h-[70px]">
        <svg viewBox="0 0 140 70" className="w-full h-full">
          <defs>
            <linearGradient
              id="vm-grad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="var(--vintage-meter-green)" />
              <stop offset="60%" stopColor="var(--vintage-meter-yellow)" />
              <stop offset="85%" stopColor="var(--vintage-meter-orange)" />
              <stop offset="100%" stopColor="var(--vintage-meter-red)" />
            </linearGradient>
            <filter id="vm-needle-glow">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="2"
                floodColor="var(--vintage-needle)"
                floodOpacity="0.6"
              />
            </filter>
          </defs>

          <path
            d="M 10 65 A 60 60 0 0 1 130 65"
            fill="none"
            stroke="url(#vm-grad)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {Array.from({ length: 11 }, (_, i) => {
            const angle = -45 + (i / 10) * 90;
            const rad = (angle * Math.PI) / 180;
            const isMajor = i % 5 === 0;
            const x1 = 70 + Math.cos(rad) * 50;
            const y1 = 65 - Math.sin(rad) * 50;
            const x2 = 70 + Math.cos(rad) * (isMajor ? 42 : 45);
            const y2 = 65 - Math.sin(rad) * (isMajor ? 42 : 45);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--vintage-text-muted)"
                strokeWidth={isMajor ? "2" : "1"}
              />
            );
          })}

          {[0, 5, 10].map((num) => {
            const angle = -45 + (num / 10) * 90;
            const rad = (angle * Math.PI) / 180;
            const x = 70 + Math.cos(rad) * 35;
            const y = 65 - Math.sin(rad) * 35;

            return (
              <text
                key={num}
                x={x}
                y={y + 2}
                textAnchor="middle"
                fill="var(--vintage-text-dim)"
                fontSize="8"
                fontFamily="var(--font-vintage-mono)"
              >
                {num}
              </text>
            );
          })}

          {/* Needle — animated via ref, not React state */}
          <g ref={needleRef} transform="rotate(-45 70 65)">
            <line
              x1="70"
              y1="65"
              x2="70"
              y2="20"
              stroke="var(--vintage-needle)"
              strokeWidth="2"
              strokeLinecap="round"
              filter="url(#vm-needle-glow)"
            />
            <circle
              cx="70"
              cy="65"
              r="4"
              fill="var(--vintage-border)"
              stroke="var(--vintage-text-dim)"
              strokeWidth="1"
            />
          </g>

          {/* Clip indicator */}
          {isClipping && (
            <circle
              cx="130"
              cy="65"
              r="3"
              fill="var(--vintage-meter-red)"
              opacity={0.9}
            >
              <animate
                attributeName="opacity"
                values="0.9;0.3;0.9"
                dur="0.5s"
                repeatCount="indefinite"
              />
            </circle>
          )}
        </svg>
      </div>

      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
        {[-10, -5, 0, 5, 10].map((db) => (
          <span
            key={db}
            className="text-[8px] text-[var(--vintage-text-muted)] font-vintage-mono"
          >
            {db > 0 ? "+" : ""}
            {db}
          </span>
        ))}
      </div>
    </div>
  );
}
