"use client";

/**
 * O pad ligado no tubo — que é a única prova de que um controle controla.
 *
 * O defeito relatado ("faz alterar algo") era da cena, não do gesto: o pad já
 * emitia `onChange`, mas o `onChange` caía no vazio e o que se via era um ponto
 * passeando numa caixa. Aqui X abre a frequência do traço e Y abre o halo do
 * fósforo — dois parâmetros num gesto só, que é a frase que vende a peça.
 *
 * O tubo é o `vintage-oscilloscope` de verdade, no modo `scope`, com o rastro
 * curto: rastro longo esconderia a mudança de frequência dentro do borrão.
 */

import * as React from "react";

import { useStageActive } from "../stage";
import { VintageXYPad } from "../../../registry/vintage/ui/vintage-xy-pad";
import { VintageOscilloscope } from "../../../registry/vintage/ui/vintage-oscilloscope";

export default function VintageXYPadDemo() {
  const ativo = useStageActive();
  const [xy, setXy] = React.useState({ x: 0.35, y: 0.6 });

  return (
    <div className="flex h-full w-full items-center justify-center gap-4 p-4">
      <VintageXYPad
        size={160}
        value={xy}
        onChange={(x, y) => setXy({ x, y })}
        labelX="FREQ"
        labelY="GLOW"
        color="var(--vintage-accent)"
      />
      <VintageOscilloscope
        mode="scope"
        width={280}
        height={160}
        active={ativo}
        color="var(--vintage-meter-green)"
        params={{
          freq: 1 + xy.x * 9,
          glow: xy.y * 26,
          trail: 0.28,
        }}
      />
    </div>
  );
}
