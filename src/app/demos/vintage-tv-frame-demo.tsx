"use client";

/**
 * A TV com programa no ar, e o seletor de canal fazendo o que um seletor faz.
 *
 * A demo anterior punha a palavra "NO SIGNAL" dentro do tubo — uma moldura de
 * TV provando que sabe emoldurar texto. Agora o tubo toca um dos visualizadores
 * do `vintage-oscilloscope`, e trocar de canal troca o programa: é o mesmo
 * chassi mostrando que a tela é uma tela.
 *
 * O botão de força continua sendo o da peça: desligar apaga o tubo com a
 * animação de CRT e o canal para junto.
 */

import * as React from "react";

import { useStageActive } from "../stage";
import { VintageTvFrame } from "../../../registry/vintage/ui/vintage-tv-frame";
import type { VintageScopeMode } from "../../../registry/vintage/ui/vintage-oscilloscope";

const CANAIS: { n: string; modo: VintageScopeMode }[] = [
  { n: "02", modo: "scope" },
  { n: "05", modo: "rings" },
  { n: "07", modo: "grid" },
  { n: "11", modo: "wave" },
];

export default function VintageTvFrameDemo() {
  const ativo = useStageActive();
  const [canal, setCanal] = React.useState(1);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
      <div className="w-[300px]">
        <VintageTvFrame
          title="VISANT TV"
          width={300}
          showTimecode="00:12:34"
          program={CANAIS[canal].modo}
          programActive={ativo}
        />
      </div>

      <div className="flex gap-1.5">
        {CANAIS.map((c, i) => (
          <button
            key={c.n}
            type="button"
            onClick={() => setCanal(i)}
            aria-pressed={i === canal}
            className="rounded px-2.5 py-1 text-[10px] font-bold tabular-nums tracking-wider transition-colors"
            style={{
              fontFamily: "var(--font-vintage-mono, monospace)",
              border: "1px solid var(--vintage-border)",
              background:
                i === canal ? "var(--vintage-meter-green)" : "var(--vintage-surface-2)",
              color:
                i === canal ? "var(--vintage-surface-1)" : "var(--vintage-text-muted)",
            }}
          >
            CH {c.n}
          </button>
        ))}
      </div>
    </div>
  );
}
