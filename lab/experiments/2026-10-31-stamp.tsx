/*
 * STAMP: a rubber stamp. Holding it down soaks the pad, letting go leaves the
 * impression, and the longer the hold, the darker the ink.
 *
 * The charge c is just hold time clamped to 1. While held, the pad darkens with
 * c so you can see the ink build; on release the stamp lifts and the new
 * impression lands with that density, at a slightly different angle each time,
 * because nobody stamps straight twice. Under reduced motion the stamp doesn't
 * travel; the impression simply appears.
 */
import * as React from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { LabMeta } from "../types";

export const meta: LabMeta = {
  id: "2026-10-31-stamp",
  date: "2026-10-31",
  title: "Stamp",
  label: "STAMP",
  hint: "hold to ink · let go to stamp",
  hintTouch: "segure pra entintar · solte",
  formula: "c = min(t / 700ms, 1) · ink = 0.25 + 0.75c · θ = (37n mod 9) − 4° · k 500 c 28",
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
  tags: { input: "press", family: "ink-print", intensity: "bold", response: "spring" },
  rationale: "backfill: anterior ao lab:next",
};

const FULL = 700; // ms of hold for a fully inked stamp
const HOVER = -80; // px the stamp rests above the paper
const BORN = 0.7; // first impression: already inked, already a little crooked

const ink = (c: number) => 0.25 + 0.75 * c;
const angle = (n: number) => ((37 * n) % 9) - 4;

export default function Stamp() {
  const reduce = useReducedMotion();
  const y = useSpring(HOVER, { stiffness: 500, damping: 28 });
  const pad = useMotionValue(ink(BORN));
  const print = useMotionValue(ink(BORN));
  const [n, setN] = React.useState(1);
  const held = React.useRef<number | null>(null);
  const raf = React.useRef(0);

  const charge = () =>
    held.current === null ? 0 : Math.min((performance.now() - held.current) / FULL, 1);
  const move = (v: number) => (reduce ? y.jump(v) : y.set(v));

  // While held, the pad darkens frame by frame: the ink you are about to leave.
  const soak = () => {
    pad.set(ink(charge()));
    raf.current = requestAnimationFrame(soak);
  };
  React.useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    held.current = performance.now();
    pad.set(ink(0));
    move(0);
    raf.current = requestAnimationFrame(soak);
  };
  const onUp = () => {
    if (held.current === null) return;
    cancelAnimationFrame(raf.current);
    const c = charge();
    held.current = null;
    print.set(ink(c));
    setN((k) => k + 1);
    move(HOVER);
  };

  return (
    <div
      className="grid h-full w-full cursor-pointer touch-none select-none place-items-center [-webkit-touch-callout:none]"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* Sits low in the card so the raised stamp has room above the paper. */}
      <div className="relative translate-y-10">
        {/* The paper: the last impression, keyed so each stamp is a new print. */}
        <motion.span
          key={n}
          style={{ opacity: print, rotate: angle(n) }}
          className="block rounded-control border-2 border-casa-fg px-4 py-1.5 font-casa-mono text-2xl font-medium uppercase tracking-[0.18em] text-casa-fg"
        >
          kept
        </motion.span>
        {/* The stamp: knob, neck, block, rubber pad. Down, it covers the print. */}
        <motion.div
          aria-hidden
          style={{ y }}
          className="pointer-events-none absolute inset-x-[-6px] bottom-[-4px] flex flex-col items-center"
        >
          <div className="size-7 rounded-full bg-casa-fg-3" />
          <div className="h-3 w-3 bg-casa-fg-3" />
          <div className="h-10 w-full rounded-t-control bg-casa-fg-2" />
          <motion.div
            style={{ opacity: pad }}
            className="h-2 w-full rounded-b-control bg-casa-fg"
          />
        </motion.div>
      </div>
    </div>
  );
}
