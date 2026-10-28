"use client";

/**
 * Uma coluna de parâmetros de efeito, onde o fader mora. É web component: o
 * mesmo `<visant-fader>` roda numa página sem framework. Arraste o trilho ou o
 * NOME na horizontal; duplo clique volta pro padrão.
 */

import * as React from "react";

import { definirFader } from "../../../registry/visant/lib/fader";

definirFader();

const PARAMS = [
  { label: "pulso", value: 40, def: 25 },
  { label: "flash", value: 45, def: 10 },
  { label: "tremor", value: 20, def: 0 },
  { label: "grão", value: 18, def: 18 },
];

export default function FaderDemo() {
  const [read, setRead] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = (e: Event) => {
      const t = e.target as HTMLElement;
      setRead(`${t.getAttribute("label")} → ${(e as CustomEvent<{ value: number }>).detail.value}`);
    };
    el.addEventListener("valuechange", on);
    return () => el.removeEventListener("valuechange", on);
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div ref={ref} className="flex w-[280px] max-w-full flex-col gap-1">
        {PARAMS.map((p) =>
          React.createElement("visant-fader", { key: p.label, label: p.label, min: 0, max: 100, value: p.value, default: p.def }),
        )}
        <p className="mt-3 h-4 font-mono text-[11px] text-muted-foreground">{read}</p>
      </div>
    </div>
  );
}
