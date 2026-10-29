/*
 * Template for `npm run lab:new`. Not shown on /lab: the page only globs files
 * that start with a date (`[0-9]*.tsx`), and this one starts with `_`.
 * The __PLACEHOLDERS__ are replaced by scripts/lab.mjs. Read lab/RULES.md first.
 */
import * as React from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import type { LabMeta } from "../types";

export const meta: LabMeta = {
  id: "__DATE__-__SLUG__",
  date: "__DATE__",
  title: "__TITLE__",
  label: "__LABEL__",
  hint: "__HINT__",
  formula: "x = Δx · k",
  rules: ["one-input", "one-metaphor", "mono-labels", "formula", "no-new-deps", "tokens", "reduced-motion", "touch", "small"],
  status: "candidate",
};

export default function Experiment() {
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 170, damping: 18 });
  const start = React.useRef<number | null>(null);

  // One input (__INPUT__). Pointer Events cover mouse, pen and finger.
  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = e.clientX;
  };
  const onMove = (e: React.PointerEvent) => {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    if (reduce) x.jump(dx);
    else x.set(dx);
  };
  const onUp = () => {
    start.current = null;
    if (reduce) x.jump(0);
    else x.set(0);
  };

  return (
    <div
      className="grid h-full w-full touch-none select-none place-items-center"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <motion.div style={{ x }} className="size-10 rounded-control bg-casa-fg" />
    </div>
  );
}
