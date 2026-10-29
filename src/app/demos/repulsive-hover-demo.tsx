"use client";

/**
 * Uma galeria de papéis, não de componentes.
 *
 * O report pediu "juntar numa galeria de interativos hover". A galeria existe —
 * mas de UM gesto em três papéis, e vale explicar a escolha.
 *
 * O registry tem outras peças de hover (`gleam`, `magnetic-cta`), e juntá-las
 * aqui é a evolução natural deste card. Não foi feito agora porque esses dois
 * arquivos estão sendo mexidos em paralelo por outra frente: uma demo que importa
 * componente em obra troca um card fraco por um card quebrado.
 *
 * O que sobra ainda responde à queixa de fundo, que era "um selo que foge do
 * cursor num quadro vazio não é caso de uso". Três papéis, mesma peça, três
 * calibragens — e é a calibragem que ensina o item:
 *
 * · **selo** — força alta, raio curto: o gesto declarado, que a pessoa persegue.
 * · **campo** — força baixa em muitas instâncias: vira física de superfície, e é
 *   o uso que mais paga num hero.
 * · **peça** — força baixa e raio largo numa foto: a esquiva que ninguém nota
 *   conscientemente, que é o teto de bom gosto do efeito.
 */

import * as React from "react";

import { Media } from "../media";
import { RepulsiveHover } from "../../../registry/visant/ui/repulsive-hover";

const CAMPO = Array.from({ length: 24 }, (_, i) => i);

function Celula({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative grid flex-1 place-items-center overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card p-4">
        {children}
      </div>
      <span className="text-center text-rotulo uppercase tracking-[0.14em] text-muted-foreground">
        {rotulo}
      </span>
    </div>
  );
}

export default function RepulsiveHoverDemo() {
  return (
    <div className="grid h-full w-full grid-cols-3 gap-3">
      <Celula rotulo="selo">
        <RepulsiveHover strength={16} radius={120}>
          <span
            className="inline-block rounded-[var(--r-pill,9999px)] px-4 py-2 text-corpo font-medium"
            style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}
          >
            tente clicar
          </span>
        </RepulsiveHover>
      </Celula>

      <Celula rotulo="campo">
        {/* Cada ponto é uma instância: o efeito só vira física de superfície
            quando há muitos, e é aí que o raio curto importa. */}
        <div className="grid grid-cols-6 gap-2.5">
          {CAMPO.map((i) => (
            <RepulsiveHover key={i} strength={7} radius={78}>
              <span className="block size-1.5 rounded-full bg-foreground/45" />
            </RepulsiveHover>
          ))}
        </div>
      </Celula>

      <Celula rotulo="peça">
        <RepulsiveHover strength={9} radius={190}>
          <Media
            papel="retrato"
            indice={2}
            ratio="4/5"
            className="w-[104px] rounded-[var(--r-control,0.5rem)] border border-border [box-shadow:var(--e-raised)]"
          />
        </RepulsiveHover>
      </Celula>
    </div>
  );
}
