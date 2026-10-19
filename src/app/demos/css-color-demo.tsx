"use client";

/**
 * O que o shader enxerga quando lê um token.
 *
 * `css-color` não desenha nada, então a demo mostra a conversão: cada token da
 * marca, resolvido pelo navegador para sRGB 0..1, ao lado de uma amostra
 * pintada com o PRÓPRIO valor convertido (não com o token). Se as duas metades
 * de cada amostra batem, a conversão está certa, inclusive para oklch e
 * `color-mix`. Troque o tema da vitrine e os números relêem sozinhos, que é o
 * `onThemeChange` trabalhando.
 */

import * as React from "react";

import { onThemeChange, resolveCssColor, type RGB } from "../../../registry/visant/lib/css-color";
import type { DemoProps } from "../catalog";

const TOKENS = [
  "var(--brand)",
  "var(--foreground)",
  "var(--background)",
  "var(--muted-foreground)",
  "color-mix(in oklab, var(--brand) 50%, var(--foreground))",
];

const fmt = (c: RGB) => c.map((x) => x.toFixed(3)).join("  ");
const rgb = (c: RGB) => `rgb(${c.map((x) => Math.round(x * 255)).join(" ")})`;

export default function CssColorDemo(_: DemoProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [valores, setValores] = React.useState<RGB[]>([]);

  React.useEffect(() => {
    // lê a partir do palco: é lá que o tema da vitrine se aplica
    const ler = () => setValores(TOKENS.map((t) => resolveCssColor(t, ref.current ?? document.documentElement)));
    ler();
    // o tema pode morar no <html> ou num wrapper do palco: observa a cadeia toda
    const offs: Array<() => void> = [];
    for (let n: Element | null = ref.current; n; n = n.parentElement) offs.push(onThemeChange(ler, n));
    return () => offs.forEach((f) => f());
  }, []);

  return (
    <div ref={ref} className="flex h-full w-full flex-col justify-center gap-2 p-5">
      {TOKENS.map((t, i) => (
        <div key={t} className="grid grid-cols-[56px_1fr] items-center gap-4">
          <span className="flex h-9 overflow-hidden rounded-[var(--r-control,0.5rem)] border border-border">
            <span className="flex-1" style={{ background: t }} />
            <span className="flex-1" style={{ background: valores[i] ? rgb(valores[i]) : "transparent" }} />
          </span>
          <span className="flex min-w-0 flex-col">
            <code className="truncate font-mono text-apoio text-foreground">{t}</code>
            <span className="font-mono text-micro tabular-nums text-muted-foreground">{valores[i] ? fmt(valores[i]) : "…"}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
