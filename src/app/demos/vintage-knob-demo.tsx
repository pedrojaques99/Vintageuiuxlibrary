"use client";

/**
 * Quatro knobs mexendo em UMA coisa só: a curva do equalizador logo acima.
 *
 * Um knob sozinho no card não prova nada — ele gira e mostra o próprio número,
 * que é o mesmo que um input de texto faria. O que a peça vende é o gesto de
 * bancada: a mão anda pela fileira e o desenho do som muda. Por isso a saída
 * fica na cena, grande, e os controles ficam embaixo dela.
 *
 * Sem relógio: quem move a curva é o usuário, então não há nada a parar quando
 * o card sai da tela.
 */

import * as React from "react";

import { VintageKnob } from "../../../registry/vintage/ui/vintage-knob";

const BANDAS = [
  { rotulo: "LOW", centro: 0.1 },
  { rotulo: "MID", centro: 0.42 },
  { rotulo: "HIGH", centro: 0.8 },
];

const L = 280;
const A = 92;
const PONTOS = 56;

/** ±12 dB nas pontas do curso, 0 dB no meio — a escala de um EQ de canal. */
const emDb = (v: number) => ((v - 5) / 5) * 12;

export default function VintageKnobDemo() {
  const [ganhos, setGanhos] = React.useState([5, 5, 5]);
  const [nivel, setNivel] = React.useState(5);

  const set = (i: number) => (v: number) =>
    setGanhos((p) => p.map((g, j) => (j === i ? v : g)));

  const caminho = React.useMemo(() => {
    const dbPorPonto = Array.from({ length: PONTOS }, (_, i) => {
      const x = i / (PONTOS - 1);
      const soma = BANDAS.reduce((acc, b, j) => {
        // Sino largo por banda: é o que faz duas bandas vizinhas se somarem no
        // meio, como num EQ de verdade, em vez de desenharem degraus.
        const d = (x - b.centro) / 0.26;
        return acc + emDb(ganhos[j]) * Math.exp(-d * d);
      }, 0);
      return soma + emDb(nivel) * 0.35;
    });

    return dbPorPonto
      .map((db, i) => {
        const x = (i / (PONTOS - 1)) * L;
        const y = A / 2 - (db / 18) * (A / 2 - 6);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [ganhos, nivel]);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="rounded-xl border-2 border-[var(--vintage-surface-4)] bg-gradient-to-b from-[var(--vintage-surface-3)] to-[var(--vintage-surface-2)] p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_4px_8px_rgba(0,0,0,0.3)]">
        <div className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface-1)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.7)]">
          <svg viewBox={`0 0 ${L} ${A}`} width={L} height={A} fill="none">
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1="0"
                y1={A * f}
                x2={L}
                y2={A * f}
                stroke="var(--vintage-grid)"
                strokeWidth="1"
                opacity={f === 0.5 ? 0.35 : 0.12}
              />
            ))}
            <path
              d={caminho}
              stroke="var(--vintage-value)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 3px var(--vintage-value))"
            />
          </svg>
        </div>

        <div className="mt-2 flex items-start justify-center gap-2">
          {BANDAS.map((b, i) => (
            <VintageKnob
              key={b.rotulo}
              label={b.rotulo}
              size={58}
              value={ganhos[i]}
              onChange={set(i)}
              fmt={(v) => `${emDb(v) >= 0 ? "+" : ""}${emDb(v).toFixed(1)}`}
            />
          ))}
          <VintageKnob
            label="LEVEL"
            size={58}
            value={nivel}
            onChange={setNivel}
          />
        </div>
      </div>
    </div>
  );
}
