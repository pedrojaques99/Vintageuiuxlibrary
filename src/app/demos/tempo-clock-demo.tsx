"use client";

/**
 * O relógio sem interface: um quadrado que soca no envelope de cada passo.
 * Quem desenha pergunta `tick(now)` dentro do próprio laço de quadros.
 */

import * as React from "react";

import { createTempoClock, type TempoDivision } from "../../../registry/visant/lib/tempo-clock";

export default function TempoClockDemo() {
  const box = React.useRef<HTMLDivElement>(null);
  const [div, setDiv] = React.useState<TempoDivision>(1);
  const clock = React.useMemo(() => createTempoClock({ bpm: 128 }), []);
  React.useEffect(() => {
    clock.div = div;
  }, [clock, div]);
  React.useEffect(() => {
    clock.restart(performance.now());
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const k = clock.tick(now);
      if (box.current) box.current.style.transform = `scale(${1 + k.env * 0.35})`;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [clock]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
      <div ref={box} className="size-16 rounded-[3px] border-2 border-foreground" />
      <div className="flex gap-1 font-mono text-[11px]">
        {([1, 2, 4] as TempoDivision[]).map((d) => (
          <button
            key={d}
            onClick={() => setDiv(d)}
            className={`rounded-md px-3 py-1.5 ${d === div ? "bg-muted text-foreground" : "text-muted-foreground"}`}
          >
            {d === 1 ? "1/4" : d === 2 ? "1/8" : "1/16"}
          </button>
        ))}
      </div>
    </div>
  );
}
