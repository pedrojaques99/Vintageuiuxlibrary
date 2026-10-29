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
 * opções há nem se elas dão a volta. A legenda técnica de cada caso ("com
 * arte · 240 páginas") saiu do palco: era a demo explicando a si mesma, e a
 * diferença entre os casos se vê no próprio livro.
 */

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Book3D } from "../../../registry/visant/ui/book-3d";
import type { DemoProps } from "../catalog";

interface Caso {
  seed: string;
  title: string;
  art?: string;
  pages: number;
}

const CASOS: Caso[] = [
  {
    seed: "atlas-da-oficina",
    title: "Atlas da Oficina",
    art: "/media/video-composicao.webp",
    pages: 240,
  },
  {
    seed: "compendio-de-processos",
    title: "Compêndio",
    art: "/media/textura-bruma.webp",
    pages: 900,
  },
  {
    seed: "o-metodo-do-lote",
    title: "O método do lote",
    pages: 180,
  },
  {
    seed: "arquetipo-sem-astrologia",
    title: "Arquétipo sem astrologia de marca",
    pages: 40,
  },
];

export default function Book3DDemo({ props }: DemoProps) {
  const [n, setN] = React.useState(0);
  const caso = CASOS[n];
  const passo = (d: number) => setN((v) => (v + d + CASOS.length) % CASOS.length);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3">
      <div className="w-full max-w-[288px]">
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

      <div className="flex items-center gap-1 text-muted-foreground">
        <Seta dir={-1} onClick={() => passo(-1)} />
        <span className="min-w-10 text-center font-mono text-micro tabular-nums">
          {n + 1}/{CASOS.length}
        </span>
        <Seta dir={1} onClick={() => passo(1)} />
      </div>
    </div>
  );
}

function Seta({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  const Icone = dir < 0 ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir < 0 ? "Livro anterior" : "Próximo livro"}
      className="alvo-toque grid size-8 place-items-center rounded-[var(--r-pill,9999px)] outline-none transition-[color,background-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:bg-muted hover:text-foreground focus-visible:[box-shadow:var(--focus)]"
    >
      <Icone className="size-4" aria-hidden />
    </button>
  );
}
