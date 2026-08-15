"use client";

/**
 * Seis pads que tocam de verdade.
 *
 * A demo anterior acendia o pad e pronto — o defeito relatado ("faz tocar
 * algo") era literalmente isso. Agora o gesto sai som pelo `sfx-bus` da casa.
 *
 * O interruptor de som fica na cena e não no componente por dois motivos: a
 * preferência é do documento inteiro (o bus a guarda em `localStorage`), e um
 * catálogo que começasse a estalar sem aviso enquanto a pessoa rola seria pior
 * do que um pad mudo. Quem chega com `prefers-reduced-motion` acha o
 * interruptor já desligado, que é o padrão do bus.
 */

import * as React from "react";

import { sfx, useSfxEnabled } from "../../lib/sfx-bus";
import { VintageSoundboardPad } from "../../../registry/vintage/ui/vintage-soundboard-pad";

const VOZES = [
  { label: "KICK", color: "var(--vintage-accent)" },
  { label: "SNARE", color: "var(--vintage-meter-yellow)" },
  { label: "HAT", color: "var(--vintage-meter-green)" },
  { label: "TOM", color: "var(--vintage-accent-deep)" },
  { label: "CLAP", color: "var(--vintage-value)" },
  { label: "RIDE", color: "var(--vintage-meter-orange)" },
];

export default function VintageSoundboardPadDemo() {
  const ligado = useSfxEnabled();
  const [ultimo, setUltimo] = React.useState<string | null>(null);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
      <div className="grid grid-cols-3 gap-2">
        {VOZES.map((v) => (
          <VintageSoundboardPad
            key={v.label}
            label={v.label}
            color={v.color}
            size={72}
            onTrigger={() => setUltimo(v.label)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => sfx.setEnabled(!ligado)}
          aria-pressed={!!ligado}
          data-sfx-silent=""
          className="rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
          style={{
            fontFamily: "var(--font-vintage-mono, monospace)",
            border: "1px solid var(--vintage-border)",
            background: ligado ? "var(--vintage-meter-green)" : "var(--vintage-surface-2)",
            color: ligado ? "var(--vintage-surface-1)" : "var(--vintage-text-muted)",
          }}
        >
          {ligado ? "som on" : "som off"}
        </button>

        <span
          className="text-[10px] font-bold uppercase tracking-wider tabular-nums"
          style={{
            color: "var(--vintage-text-muted)",
            fontFamily: "var(--font-vintage-mono, monospace)",
          }}
        >
          {ultimo ?? "—"}
        </span>
      </div>
    </div>
  );
}
