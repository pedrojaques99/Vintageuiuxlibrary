"use client";

/**
 * A barra de tempo de um gerador de efeito: o LED e a primeira luz acendem na
 * cor da marca a cada compasso. Arraste o número, toque no tap no ritmo de uma
 * música, troque a divisão. Embaixo, o evento `beat` mostra o relógio andando.
 */

import * as React from "react";

import { definirTempoBar } from "../../../registry/visant/lib/tempo-bar";

definirTempoBar();

export default function TempoBarDemo() {
  const ref = React.useRef<HTMLElement>(null);
  const [beat, setBeat] = React.useState("");
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = (e: Event) => {
      const k = (e as CustomEvent<{ bar: number; beatInBar: number; step: number }>).detail;
      setBeat(`compasso ${k.bar + 1} · tempo ${k.beatInBar + 1} · passo ${k.step}`);
    };
    el.addEventListener("beat", on);
    return () => el.removeEventListener("beat", on);
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-[300px] max-w-full flex-col gap-3">
        {React.createElement("visant-tempo-bar", { ref, bpm: 128, div: 1 })}
        <p className="h-4 font-mono text-[11px] text-muted-foreground">{beat}</p>
      </div>
    </div>
  );
}
