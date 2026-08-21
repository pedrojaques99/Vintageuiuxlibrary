"use client";

/**
 * Quatro tubos, quatro programas, um sinal só.
 *
 * O pedido era "mais visualizers"; mostrar um de cada vez esconderia justamente
 * o que mudou. Os quatro comem o MESMO buffer de amostras — é isso que deixa
 * ver que `scope`, `rings` e `grid` são leituras diferentes do mesmo sinal, e
 * não quatro animações decorativas rodando em paralelo.
 *
 * O programa é um loop de bateria falso (bumbo a cada quatro tempos, chimbau no
 * contratempo, um bordão de médio por baixo) porque a detecção de batida dos
 * modos portados reage a energia acima da média recente: sinal liso não
 * dispararia nada e a peça pareceria menos viva do que é.
 *
 * O relógio obedece ao `useStageActive`: card fora da tela, tubo congelado.
 */

import * as React from "react";

import { useStageActive } from "../stage";
import type { DemoProps } from "../catalog";
import {
  VintageOscilloscope,
  type VintageScopeMode,
} from "../../../registry/vintage/ui/vintage-oscilloscope";

const AMOSTRAS = 256;

const CANAIS: { modo: VintageScopeMode; cor: string }[] = [
  { modo: "scope", cor: "var(--vintage-meter-green)" },
  { modo: "rings", cor: "var(--vintage-accent)" },
  { modo: "grid", cor: "var(--vintage-meter-yellow)" },
  { modo: "wave", cor: "var(--vintage-value)" },
];

export default function VintageOscilloscopeDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const [dados, setDados] = React.useState(() => new Float32Array(AMOSTRAS));
  const passo = React.useRef(0);
  const fase = React.useRef(0);

  React.useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => {
      passo.current += 1;
      const s = passo.current;
      const bumbo = s % 8 === 0 ? 1 : Math.exp(-(s % 8) * 0.85);
      const chimbau = s % 2 === 1 ? 0.45 : 0.1;
      const d = new Float32Array(AMOSTRAS);
      for (let i = 0; i < AMOSTRAS; i++) {
        const p = (i / AMOSTRAS) * Math.PI * 2;
        fase.current += 0.0006;
        d[i] =
          Math.sin(p * 2 + fase.current * 40) * 0.62 * bumbo +
          Math.sin(p * 9 + fase.current * 90) * 0.16 +
          (Math.random() * 2 - 1) * 0.22 * chimbau;
      }
      setDados(d);
    }, 55);
    return () => clearInterval(id);
  }, [ativo]);

  return (
    <div className="grid h-full w-full grid-cols-2 place-items-center gap-3 p-4">
      {CANAIS.map((c) => (
        <VintageOscilloscope
          key={c.modo}
          data={dados}
          mode={c.modo}
          color={c.cor}
          width={250}
          height={132}
          active={ativo}
          {...props}
        />
      ))}
    </div>
  );
}
