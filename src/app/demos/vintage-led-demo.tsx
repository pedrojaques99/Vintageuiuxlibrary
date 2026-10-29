"use client";

/**
 * O LED no papel dele: a resposta de um controle, não um controle.
 *
 * Sozinho o item é uma bolinha que acende. Aqui ele está onde vive num rack:
 * uma régua de nível de dez segmentos seguindo um programa que corre sozinho,
 * e duas lâmpadas de estado. O botão POWER manda na alimentação, então a
 * primeira coisa que a mão descobre é que todos eles obedecem a ele.
 *
 * Antes a cena montava uma chave e um EQ paramétrico inteiros só pra acender
 * quatro LEDs: três peças disputando o palco de uma. Agora a peça é o assunto.
 *
 * O relógio obedece ao `useStageActive`: card fora da tela, programa parado.
 */

import * as React from "react";

import { useStageActive } from "../stage";
import { VintageLed } from "../../../registry/vintage/ui/vintage-led";
import { VintageButton } from "../../../registry/vintage/ui/vintage-button";

const SEGMENTOS = 10;

/** Cor de cada segmento: sete verdes, dois amarelos, um vermelho. */
const corDe = (i: number) => (i >= 9 ? "red" : i >= 7 ? "yellow" : "green");

export default function VintageLedDemo() {
  const ativo = useStageActive();
  const [ligado, setLigado] = React.useState(true);
  const [nivel, setNivel] = React.useState(0.5);
  const t = React.useRef(0);

  React.useEffect(() => {
    if (!ativo || !ligado) return;
    const id = setInterval(() => {
      t.current += 1;
      // Frase musical, não ruído: duas senoides e um estalo esparso.
      const base = 0.5 + 0.25 * Math.sin(t.current * 0.21) + 0.12 * Math.sin(t.current * 0.53);
      const estalo = Math.random() < 0.07 ? 0.3 : 0;
      setNivel(Math.max(0, Math.min(1, base + estalo)));
    }, 110);
    return () => clearInterval(id);
  }, [ativo, ligado]);

  const acesos = ligado ? Math.round(nivel * SEGMENTOS) : 0;

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div
        className="flex items-center gap-5 rounded-[var(--r-control,10px)] px-4 py-3"
        style={{
          background: "linear-gradient(180deg, var(--vintage-surface-3), var(--vintage-surface-2))",
          border: "1px solid var(--vintage-surface-1)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 1px rgba(0,0,0,0.5), 0 10px 24px -8px rgba(0,0,0,0.6)",
        }}
      >
        <VintageButton label="POWER" active={ligado} onClick={() => setLigado((v) => !v)} />

        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            {Array.from({ length: SEGMENTOS }, (_, i) => (
              <VintageLed key={i} color={corDe(i)} size="md" active={i < acesos} />
            ))}
          </div>
          <div className="flex justify-between">
            <VintageLed color="green" size="lg" label="PWR" active={ligado} />
            <VintageLed
              color="yellow"
              size="lg"
              label="SIG"
              active={ligado && nivel > 0.15}
              intensity={nivel}
            />
            <VintageLed color="red" size="lg" label="CLIP" active={acesos >= SEGMENTOS} />
          </div>
        </div>
      </div>
    </div>
  );
}
