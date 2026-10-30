/*
 * RATCHET: scrolling winds a toothed wheel that only turns one way, the pawl
 * riding up each tooth's slope and falling off its steep face.
 *
 * Only forward travel counts: scrolling back up leaves the wheel where it is,
 * so winding is down, back, down again, like a socket wrench. The wheel tracks
 * the scroll 1:1; the click lives in the pawl, a stiff underdamped spring that
 * drops when a tooth passes. Under reduced motion the pawl just lands.
 */
import * as React from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { LabMeta } from "../types";

export const meta: LabMeta = {
  id: "2026-10-30-ratchet",
  date: "2026-10-30",
  title: "Ratchet",
  label: "RATCHET",
  hint: "scroll down to wind",
  formula: "s += max(Δy, 0) · θ = s / 40 · 360/16 · pawl = min(frac(s/40)/0.9, 1) · 15° · k 700 c 14",
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
};

const TEETH = 16;
const STEP = 360 / TEETH;
const PITCH = 40; // px of forward scroll per tooth
const R_TIP = 44;
const R_ROOT = 36;
// Born mid-tooth: the pawl is already lifted, so the still frame reads as a mechanism.
const BORN = PITCH * 2.55;

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
};

// Each tooth: a steep face up to the tip, then a long slope down to the root.
const GEAR = Array.from({ length: TEETH }, (_, i) => {
  const a0 = -90 + i * STEP;
  return `L${polar(R_ROOT, a0)} L${polar(R_TIP, a0 + STEP * 0.1)}`;
})
  .join(" ")
  .replace(/^L/, "M")
  .concat(" Z");

export default function Ratchet() {
  const reduce = useReducedMotion();
  const wound = React.useRef(BORN);
  const last = React.useRef<number | null>(null);
  const wheel = useMotionValue((BORN / PITCH) * STEP);
  const pawl = useSpring(lift(BORN), { stiffness: 700, damping: 14 });

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    const dy = last.current === null ? 0 : y - last.current;
    last.current = y;
    if (dy <= 0) return; // the pawl holds: backwards does nothing
    wound.current += dy;
    wheel.set((wound.current / PITCH) * STEP);
    if (reduce) pawl.jump(lift(wound.current));
    else pawl.set(lift(wound.current));
  };

  return (
    <div className="relative h-full w-full select-none">
      {/* The input: a native scroller, so wheel, trackpad and finger all work and
          the page takes over at either end. */}
      <div
        onScroll={onScroll}
        className="absolute inset-0 touch-pan-y overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div aria-hidden className="h-[2400px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <svg
          viewBox="-56 -60 112 112"
          aria-hidden
          className="aspect-square h-[78%] max-h-56 overflow-visible"
        >
          <motion.g style={{ rotate: wheel, originX: 0.5, originY: 0.5 }}>
            {/* Invisible ring: makes the fill-box exactly centred on the axle. */}
            <circle r={R_TIP} fill="none" />
            <path d={GEAR} className="fill-casa-fg-3" />
            <circle r={14} className="fill-casa-bg" />
            <circle r={5} className="fill-casa-fg-3" />
          </motion.g>
          {/* Pivot sits up-right; the tip rests on the tooth under 12 o'clock.
              Origin is in fill-box fractions: (30,-46) in a 30×13 box from (0,-49). */}
          <motion.g style={{ rotate: pawl, originX: 1, originY: 3 / 13 }}>
            <path d="M30,-49 L30,-43 L0,-36 Z" className="fill-casa-fg" />
          </motion.g>
          <circle cx={30} cy={-46} r={3.5} className="fill-casa-fg" />
        </svg>
      </div>
    </div>
  );
}

/** How far the pawl rides up the current tooth, in degrees. */
function lift(s: number) {
  const f = (s % PITCH) / PITCH;
  return Math.min(f / 0.9, 1) * 15;
}
