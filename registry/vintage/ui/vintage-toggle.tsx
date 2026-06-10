"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

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

  const handleClick = () => {
    const positions: TogglePosition[] = ["up", "middle", "down"];
    const next =
      positions[(positions.indexOf(position) + 1) % positions.length];
    if (controlledPos === undefined) setInternalPos(next);
    onChange?.(next);
  };

  const toggleY = position === "up" ? 25 : position === "down" ? 75 : 50;
  const activeColor =
    accent || "var(--vintage-value)";

  return (
    <div className={cn("relative inline-block select-none", className)}>
      <div
        onClick={handleClick}
        className="cursor-pointer relative w-[100px] h-[250px]"
        style={{ transition: "filter 0.15s" }}
        title={`${title}: ${position.toUpperCase()}\nclick to cycle`}
      >
        {/* Housing */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--vintage-metal-dark)] via-[var(--vintage-metal-light)] to-[var(--vintage-metal-mid)] rounded-lg shadow-lg">
          <div className="absolute left-1/2 top-[30px] bottom-[30px] w-[40px] -ml-[20px] bg-gradient-to-b from-[var(--vintage-metal-channel-light)] via-white to-[var(--vintage-metal-channel-dark)] rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]" />
          <div className="absolute left-1/2 top-[60px] bottom-[60px] w-[2px] -ml-px bg-[var(--vintage-toggle-track)] shadow-[inset_2px_2px_2px_rgba(0,0,0,0.4)]" />
        </div>

        {/* Labels with active highlight */}
        {labels.map((lbl, i) => {
          const isActive =
            (i === 0 && position === "up") ||
            (i === 1 && position === "middle") ||
            (i === 2 && position === "down");
          return (
            <div
              key={i}
              className="absolute left-[-50px] text-xl font-vintage-body font-bold"
              style={{
                top: `${20 + i * 90}px`,
                color: isActive
                  ? activeColor
                  : "var(--vintage-text-dim)",
                transition: "color 0.2s",
              }}
            >
              {lbl}
            </div>
          );
        })}

        {/* Handle */}
        <div
          className="absolute left-1/2 w-[50px] h-[50px] -ml-[25px]"
          style={{
            top: `${toggleY}%`,
            transform: "translateY(-50%)",
            transition: "top 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-b from-[var(--vintage-metal-channel-light)] via-white to-[var(--vintage-metal-channel-dark)] shadow-[0_4px_8px_rgba(0,0,0,0.4)]" />
          <div className="absolute inset-2 rounded-full bg-white opacity-30" />
        </div>

        {/* Title */}
        <div className="absolute left-1/2 -top-[35px] -translate-x-1/2 text-[var(--vintage-text-dim)] text-xl font-vintage-body font-bold whitespace-nowrap">
          {title}
        </div>
      </div>
      <div
        className="text-center mt-4 text-sm font-vintage-mono font-bold tracking-wider uppercase"
        style={{ color: activeColor, transition: "color 0.2s" }}
      >
        {position}
      </div>
    </div>
  );
}
