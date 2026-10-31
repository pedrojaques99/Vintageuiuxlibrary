/**
 * The small hooks lab experiments share, so a finger works as well as a mouse.
 * Experiments may import `../hooks` (scripts/lab.mjs, `no-new-deps`).
 *
 *   useInView(ref)          → is the card on screen (IntersectionObserver)
 *   useCoarse()             → is the primary pointer a finger, `(pointer: coarse)`
 *   useIdle(ref, fn, ms)    → call fn every ms while on screen and untouched,
 *                             so a pointer experiment still looks alive with no
 *                             hover; returns `poke()` to call on any input.
 *   useTilt(fn)             → DeviceOrientation (gamma, degrees) after `enable()`,
 *                             which must run inside a tap (iOS asks permission).
 */

import * as React from "react";
import { useReducedMotion } from "motion/react";

export function useInView(ref: React.RefObject<Element | null>) {
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

const COARSE = "(pointer: coarse)";
export function useCoarse() {
  return React.useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(COARSE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(COARSE).matches,
    () => false,
  );
}

export function useIdle(ref: React.RefObject<Element | null>, fn: () => void, ms = 2600) {
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const last = React.useRef(0);
  const cb = React.useRef(fn);
  cb.current = fn;
  React.useEffect(() => {
    if (!inView || reduce) return; // off screen or reduced motion: nothing runs
    const t = window.setInterval(() => {
      if (performance.now() - last.current > ms) cb.current();
    }, ms);
    return () => window.clearInterval(t);
  }, [inView, reduce, ms]);
  return React.useCallback(() => {
    last.current = performance.now();
  }, []);
}

type OrientationCtor = { requestPermission?: () => Promise<"granted" | "denied"> };

export function useTilt(fn: (gamma: number) => void) {
  const [on, setOn] = React.useState(false);
  const cb = React.useRef(fn);
  cb.current = fn;
  React.useEffect(() => {
    if (!on) return;
    const h = (e: DeviceOrientationEvent) => e.gamma !== null && cb.current(e.gamma);
    window.addEventListener("deviceorientation", h);
    return () => window.removeEventListener("deviceorientation", h);
  }, [on]);
  /** Call from a pointerdown: iOS only grants the sensor inside a user gesture. */
  const enable = React.useCallback(() => {
    if (on || typeof DeviceOrientationEvent === "undefined") return;
    const ask = (DeviceOrientationEvent as unknown as OrientationCtor).requestPermission;
    if (!ask) return setOn(true);
    ask().then((r) => r === "granted" && setOn(true), () => {});
  }, [on]);
  return { on, enable };
}
