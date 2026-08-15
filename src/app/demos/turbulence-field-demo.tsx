"use client";

/**
 * O campo de turbulência não é um efeito — é um acabamento de superfície.
 *
 * Mostrado sozinho num retângulo vazio ele vira "ruído animado", que é a
 * descrição de um screensaver. Aqui ele faz o trabalho de verdade: uma faixa de
 * marca, com a assinatura em cima, ganhando textura na cor do tema.
 *
 * E os três presets ficam à vista porque `intensity`, `scale` e `speed` são o
 * item inteiro: o mesmo arquivo vai de névoa larga de fundo a grão fechado de
 * papel, e quem escolhe é quem instala. Sem os botões, o card mostraria uma das
 * três peças e esconderia as outras duas.
 */

import * as React from "react";

import { Chip } from "../../../registry/visant/ui/chip";
import { TurbulenceField } from "../../../registry/visant/ui/turbulence-field";

const PRESETS = [
  { id: "névoa", intensity: 0.24, scale: 0.55, speed: 20 },
  { id: "fumaça", intensity: 0.42, scale: 1, speed: 11 },
  { id: "grão", intensity: 0.3, scale: 3.4, speed: 26 },
] as const;

export default function TurbulenceFieldDemo() {
  const [i, setI] = React.useState(1);
  const p = PRESETS[i];

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="relative flex-1 overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card">
        <TurbulenceField intensity={p.intensity} scale={p.scale} speed={p.speed} />
        <div className="relative flex h-full flex-col items-center justify-center gap-2">
          <span className="text-[2.4rem] font-semibold leading-none tracking-[-0.04em]">
            Visant<sup className="text-[0.9rem] align-super">®</sup>
          </span>
          <span className="text-rotulo uppercase tracking-[0.28em] text-muted-foreground">
            branding studio
          </span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {PRESETS.map((preset, n) => (
          <Chip
            key={preset.id}
            className="alvo-toque"
            pressed={n === i}
            onClick={() => setI(n)}
          >
            {preset.id}
          </Chip>
        ))}
      </div>
    </div>
  );
}
