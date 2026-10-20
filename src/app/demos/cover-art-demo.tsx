"use client";

/**
 * Uma capa por vez, em tamanho de capa, e as setas trocam a variação.
 *
 * ── Por que as três lado a lado estavam erradas ────────────────────────────
 *
 * A versão anterior desenhava as três famílias juntas em caixas de 160px de
 * largura. É o pior tamanho possível para esta peça, e por um motivo que está
 * escrito no próprio componente: a capa se mede pela CAIXA que a recebe
 * (`cqmin`), então numa caixa de 160×213 o título cai no piso do `clamp`, a
 * janela do wireframe fica com três fios e a rampa tonal — que é a coisa que a
 * peça de fato entrega — some numa área de miniatura. O card do catálogo
 * mostrava três provas em miniatura de uma peça cujo argumento é "isto
 * substitui a foto que você não tem".
 *
 * Agora é uma só, a 280px de largura em 3/4 — a medida em que uma capa de
 * catálogo real aparece —, e as setas percorrem as variações. O que se perde é
 * a comparação simultânea; o que se ganha é ver a capa.
 *
 * ── A lista tem seis entradas, não três ────────────────────────────────────
 *
 * Três famílias × duas sementes. A segunda semente é o que prova o argumento
 * inteiro: `book` com "Marca em 9 etapas" e `book` com "O método do lote" são
 * a mesma família e capas visivelmente diferentes, porque o hash muda o tom, o
 * ângulo e a posição do título. Com uma semente por família a peça pareceria
 * ter três desenhos fixos.
 *
 * O contador `n/6` existe porque duas setas sem contador não dizem quantas
 * opções há nem se elas dão a volta.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { CoverArt } from "../../../registry/visant/ui/cover-art";
import type { CoverFamily } from "../../../registry/visant/lib/cover-look";
import type { DemoProps } from "../catalog";

interface Capa {
  titulo: string;
  familia: CoverFamily;
}

const CAPAS: Capa[] = [
  { titulo: "Marca em 9 etapas", familia: "book" },
  { titulo: "O método do lote", familia: "book" },
  { titulo: "Brand Machine", familia: "app" },
  { titulo: "Vault de Marca", familia: "app" },
  { titulo: "Live de outubro", familia: "plate" },
  { titulo: "Imersão de dois dias", familia: "plate" },
];

function Seta({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Capa anterior" : "Próxima capa"}
      className="alvo-toque inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--r-control,0.5rem)] border border-border text-muted-foreground outline-none transition-[color,border-color,transform] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--brand)] hover:text-foreground focus-visible:border-[var(--brand)] focus-visible:text-foreground focus-visible:[box-shadow:var(--focus)] active:scale-[0.94] active:[transition-duration:var(--dur-press)] motion-reduce:active:scale-100"
    >
      {dir === "prev" ? <ChevronLeft className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
    </button>
  );
}

export default function CoverArtDemo({ props }: DemoProps) {
  const [i, setI] = React.useState(0);
  const capa = CAPAS[i];
  const anda = (d: 1 | -1) => setI((v) => (v + d + CAPAS.length) % CAPAS.length);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3.5 px-4">
      <div className="relative aspect-[3/4] w-[280px] overflow-hidden rounded-[var(--r-control,0.5rem)] border border-border">
        {/* `key`: a capa é determinística e não anima — trocar a semente é
            trocar o desenho inteiro, e sem `key` o React reaproveitaria os nós
            de uma família dentro de outra. */}
        <CoverArt key={i} title={capa.titulo} seed={capa.titulo} family={capa.familia} {...props} />
      </div>

      <div className="flex w-[280px] items-center gap-2">
        <Seta dir="prev" onClick={() => anda(-1)} />
        <Seta dir="next" onClick={() => anda(1)} />
        <span className="min-w-0 truncate font-mono text-rotulo uppercase tracking-[0.12em] text-foreground">
          {capa.familia}
        </span>
        <span className="ml-auto shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
          {i + 1}/{CAPAS.length}
        </span>
      </div>
    </div>
  );
}
