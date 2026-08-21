"use client";

/**
 * Um livro por vez, em tamanho de livro, e as setas trocam o caso.
 *
 * Os quatro casos não são variação bonita: são os quatro jeitos de a peça
 * quebrar, na ordem em que quebraram na bancada.
 *
 * 1. **Com pintura, miolo médio** — o caso feliz, e o único que prova que o
 *    matiz da lombada saiu da ARTE e não de uma rampa fixa.
 * 2. **Com pintura, 900 páginas** — a lombada larga é onde o título aparece
 *    esticado se a textura for dimensionada pela largura da capa em vez do
 *    arco. Erro que o olho vê e não sabe nomear.
 * 3. **Sem arte, título curto** — a degradação: capa desenhada da mesma semente
 *    que o `cover-art` usaria no card 2D.
 * 4. **Sem arte, título longo** — prova a quebra de linha. A versão que
 *    encolhia até caber numa linha deixava este caso ilegível.
 *
 * O contador `n/4` existe porque duas setas sem contador não dizem quantas
 * opções há nem se elas dão a volta.
 */

import * as React from "react";

import { Book3D } from "../../../registry/visant/ui/book-3d";
import type { DemoProps } from "../catalog";

interface Caso {
  seed: string;
  title: string;
  art?: string;
  pages: number;
  legenda: string;
}

const CASOS: Caso[] = [
  {
    seed: "atlas-da-oficina",
    title: "Atlas da Oficina",
    art: "/media/retrato-02.webp",
    pages: 240,
    legenda: "com arte · 240 páginas",
  },
  {
    seed: "compendio-de-processos",
    title: "Compêndio",
    art: "/media/retrato-04.webp",
    pages: 900,
    legenda: "com arte · 900 páginas, lombada larga",
  },
  {
    seed: "o-metodo-do-lote",
    title: "O método do lote",
    pages: 180,
    legenda: "sem arte · capa desenhada",
  },
  {
    seed: "arquetipo-sem-astrologia",
    title: "Arquétipo sem astrologia de marca",
    pages: 40,
    legenda: "sem arte · título longo, miolo mínimo",
  },
];

export default function Book3DDemo({ props }: DemoProps) {
  const [n, setN] = React.useState(0);
  const caso = CASOS[n];
  const passo = (d: number) => setN((v) => (v + d + CASOS.length) % CASOS.length);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-2">
      <div className="w-full max-w-[260px]">
        {/* `key` no caso: trocar de livro REMONTA a peça, e é isso que se quer
            ver. Sem remontar, a textura antiga continuaria na GPU e a demo
            esconderia justamente o caminho que o `dispose()` conserta. */}
        <Book3D
          key={caso.seed}
          seed={caso.seed}
          title={caso.title}
          art={caso.art}
          pages={caso.pages}
          {...props}
        />
      </div>

      <div className="flex items-center gap-3 font-mono text-apoio text-muted-foreground">
        <button
          type="button"
          onClick={() => passo(-1)}
          aria-label="Caso anterior"
          className="rounded-[var(--r-control)] px-2 py-1 outline-none hover:text-[var(--brand)] focus-visible:[box-shadow:var(--focus)]"
        >
          ←
        </button>
        <span className="tabular-nums">
          {n + 1}/{CASOS.length}
        </span>
        <button
          type="button"
          onClick={() => passo(1)}
          aria-label="Próximo caso"
          className="rounded-[var(--r-control)] px-2 py-1 outline-none hover:text-[var(--brand)] focus-visible:[box-shadow:var(--focus)]"
        >
          →
        </button>
      </div>

      <p className="text-center font-mono text-apoio text-muted-foreground">{caso.legenda}</p>
    </div>
  );
}
