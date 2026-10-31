/*
 * COMPASS: a needle that swings toward the pointer, the way a real one swings
 * toward north: past it, then back, then still.
 *
 * Two details carry it. The target angle is UNWRAPPED (the shortest turn from
 * where the needle is now), or crossing from 179° to −179° spins the needle a
 * full lap backwards. And the spring is underdamped on purpose: the overshoot is
 * the magnetism. Under reduced motion the needle just points.
 */
import * as React from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import type { LabMeta } from "../types";

export const meta: LabMeta = {
  id: "2026-10-29-compass",
  date: "2026-10-29",
  title: "Compass",
  label: "COMPASS",
  hint: "move the pointer around",
  formula: "θ = atan2(Δy, Δx) · k 120 c 7",
  rules: [
    "one-input",
    "one-metaphor",
    "mono-labels",
    "formula",
    "born-in-best-state",
    "no-new-deps",
    "tokens",
    "reduced-motion",
    "touch",
    "small",
    "only-transform",
  ],
  status: "candidate",
  tags: { input: "pointer", family: "mechanical", intensity: "subtle", response: "spring" },
  rationale: "backfill: anterior ao lab:next",
};

const TICKS = Array.from({ length: 36 }, (_, i) => i * 10);

export default function Compass() {
  const reduce = useReducedMotion();
  const dial = React.useRef<HTMLDivElement>(null);
  // Born pointing somewhere other than straight up: a resting needle reads as broken.
  const angle = useSpring(-62, { stiffness: 120, damping: 7 });
  const target = React.useRef(-62);

  const onMove = (e: React.PointerEvent) => {
    const r = dial.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < 6) return; // dead center has no direction
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // 0° = up
    const delta = ((deg - target.current + 540) % 360) - 180;
    target.current += delta;
    if (reduce) angle.jump(target.current);
    else angle.set(target.current);
  };

  return (
    <div
      className="grid h-full w-full touch-none select-none place-items-center"
      onPointerMove={onMove}
      onPointerDown={onMove}
    >
      <div
        ref={dial}
        className="relative aspect-square h-[78%] max-h-56 rounded-full bg-casa-tile-2"
      >
        {TICKS.map((t) => (
          <span
            key={t}
            aria-hidden
            style={{ transform: `rotate(${t}deg)` }}
            className="absolute inset-0 flex justify-center"
          >
            <span
              className={
                t % 90 === 0
                  ? "mt-2 h-3 w-px bg-casa-fg-2"
                  : "mt-2 h-1.5 w-px bg-casa-fg-3/60"
              }
            />
          </span>
        ))}
        <span className="absolute left-1/2 top-6 -translate-x-1/2 font-casa-mono text-casa-sm text-casa-fg-2">
          N
        </span>
        <motion.div
          aria-hidden
          style={{ rotate: angle }}
          className="absolute inset-[18%] flex flex-col items-center"
        >
          {/* The north half is the one that answers; the tail just balances it. */}
          <span className="h-1/2 w-1.5 bg-casa-fg [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
          <span className="h-1/2 w-1.5 bg-casa-fg-3 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
        </motion.div>
        <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-casa-bg ring-2 ring-casa-fg" />
      </div>
    </div>
  );
}
