/*
 * LEVEL: a word filled with liquid that stays level while the word tilts.
 *
 * The trick is that the liquid is not a shape, it is the text's background: a
 * hard-stop gradient clipped to the glyphs. Rotating the word by θ rotates the
 * gradient too, so the gradient angle is counter-rotated by a LAGGING copy of θ.
 * At rest the two agree and the surface is flat; while they disagree, the
 * surface leans, which reads as slosh. One underdamped spring is the whole fluid.
 *
 * On a phone the first tap also asks for the gyroscope (iOS shows its permission
 * prompt then); granted, tilting the PHONE tilts the word. Drag keeps working
 * either way, and it is the fallback when there is no sensor or no permission.
 */
import * as React from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useCoarse, useTilt } from "../hooks";
import type { LabMeta } from "../types";

export const meta: LabMeta = {
  id: "2026-10-29-level",
  date: "2026-10-29",
  title: "Level",
  label: "LEVEL",
  hint: "drag sideways to tilt",
  hintTouch: "arraste ou incline o celular",
  formula: "θ = Δx/4 (±28°) · surface = 180° − θlag",
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
  tags: { input: "drag", family: "fluid", intensity: "medium", response: "spring" },
  rationale: "backfill: anterior ao lab:next",
};

const MAX = 28;
const FILL = 54; // % of the glyph box that is liquid

export default function Level() {
  const reduce = useReducedMotion();
  // Born tilted a little: the screenshot already shows liquid, not an empty word.
  const tilt = useSpring(-8, { stiffness: 260, damping: 26 });
  // The liquid follows the glass late and overshoots: that lag IS the slosh.
  const lag = useSpring(tilt, { stiffness: 90, damping: 6 });
  const drag = React.useRef<{ x: number; from: number } | null>(null);

  // Reduced motion: the surface is simply level, no slosh.
  const surface = reduce ? tilt : lag;
  const background = useTransform(
    surface,
    (l) =>
      `linear-gradient(${180 - l}deg, transparent ${FILL}%, var(--casa-fg) ${FILL}%)`,
  );

  const set = (v: number) => (reduce ? tilt.jump(v) : tilt.set(v));
  const clamp = (v: number) => Math.max(-MAX, Math.min(MAX, v));
  const coarse = useCoarse();
  // The phone's roll (gamma) IS the tilt, unless a finger is dragging.
  const sensor = React.useRef<number | null>(null);
  const gyro = useTilt((g) => {
    sensor.current = clamp(g);
    if (!drag.current) set(sensor.current);
  });
  const onDown = (e: React.PointerEvent) => {
    if (coarse) gyro.enable();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, from: tilt.get() };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const next = drag.current.from + (e.clientX - drag.current.x) / 4;
    set(clamp(next));
  };
  const onUp = () => {
    drag.current = null;
    set(sensor.current ?? -8);
  };

  return (
    <div
      className="grid h-full w-full cursor-grab touch-none select-none place-items-center active:cursor-grabbing"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <motion.span
        aria-label="flow"
        style={{
          rotate: tilt,
          backgroundImage: background,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextStroke: "1.5px var(--casa-fg-3)",
        }}
        className="px-2 font-casa text-[clamp(4rem,14vw,6.5rem)] font-medium leading-none tracking-[-0.04em] text-transparent"
      >
        flow
      </motion.span>
    </div>
  );
}
