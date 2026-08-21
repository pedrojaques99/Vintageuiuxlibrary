"use client";

/**
 * O mosaico com acervo suficiente pra se explicar, e com o scroll que ele foi
 * feito pra aguentar.
 *
 * A demo antiga tinha seis imagens numa caixa que não rolava. Com seis peças,
 * masonry e grade comum desenham a mesma coisa — a malha não tem como errar —
 * e a promessa central da peça ficava invisível, porque ela só existe no
 * momento em que uma página NOVA chega: **round-robin por índice não reordena
 * o que já está na tela.** Sem anexar página, não havia o que provar.
 *
 * Aqui o card é a janela: `overflow-y-auto` próprio, sentinela no fim e uma
 * página de doze a cada chegada. O número no canto de cada peça é o índice de
 * entrada — é o que deixa a promessa VERIFICÁVEL: role, carregue mais, e
 * confira que o 7 continua na mesma coluna e na mesma altura de antes.
 *
 * O acervo real tem 19 arquivos; a partir daí a geração continua com as mesmas
 * fotos em proporções diferentes. É de propósito: o que quebra um masonry é a
 * mistura de proporções, então repetir com recorte novo testa mais a malha do
 * que repetir idêntico.
 *
 * A sentinela só dispara com o palco ativo — card fora da tela não busca
 * página, senão a vitrine inteira carregaria acervo em segundo plano.
 */

import * as React from "react";

import { MasonryGallery } from "../../../registry/visant/ui/masonry-gallery";
import { Media, proporcao, type Papel } from "../media";
import { useStageActive } from "../stage";
import type { DemoProps } from "../catalog";

const PAPEIS: Papel[] = ["cena", "retrato", "textura"];
/** Proporções de recorte para a segunda volta no acervo. */
const RECORTES = ["4/5", "1/1", "3/4", "4/3", "5/7"];
const PAGINA = 12;
/** Teto de memória: infinito de verdade num card de catálogo é vazamento. */
const TETO = 120;
/** Quantas peças o acervo tem antes de começar a repetir. */
const ACERVO = 19;

interface Peca {
  id: number;
  papel: Papel;
  indice: number;
  ratio: string;
}

const criar = (n: number): Peca => {
  const papel = PAPEIS[n % PAPEIS.length];
  return {
    id: n,
    papel,
    indice: n,
    ratio: n < ACERVO ? proporcao(papel, n) : RECORTES[n % RECORTES.length],
  };
};

export default function MasonryGalleryDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const [pecas, setPecas] = React.useState<Peca[]>(() =>
    Array.from({ length: PAGINA * 2 }, (_, i) => criar(i)),
  );
  const scroller = React.useRef<HTMLDivElement>(null);
  const sentinela = React.useRef<HTMLDivElement>(null);

  const fim = pecas.length >= TETO;

  React.useEffect(() => {
    if (!ativo || fim) return;
    const alvo = sentinela.current;
    const raiz = scroller.current;
    if (!alvo || !raiz || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        // Anexar, nunca remontar: a lista nova é a antiga MAIS a página. É o
        // que o round-robin da peça precisa para manter cada item na coluna
        // em que entrou.
        setPecas((atual) =>
          atual.length >= TETO
            ? atual
            : [...atual, ...Array.from({ length: PAGINA }, (_, i) => criar(atual.length + i))],
        );
      },
      // Margem curta: com 240px a sentinela continuava intersectando DEPOIS da
      // página anexada e o feed carregava três páginas de uma vez, sem gesto.
      { root: raiz, rootMargin: "120px" },
    );
    io.observe(alvo);
    return () => io.disconnect();
  }, [ativo, fim, pecas.length]);

  return (
    <div ref={scroller} className="h-full w-full overflow-y-auto p-3">
      <MasonryGallery
        items={pecas}
        cols={5}
        gap={10}
        getKey={(p) => p.id}
        renderItem={(p) => (
          <figure className="relative">
            <Media
              papel={p.papel}
              indice={p.indice}
              ratio={p.ratio}
              className="rounded-[var(--r-control,0.5rem)] border border-border"
            />
            <figcaption className="absolute bottom-1.5 left-1.5 rounded-[var(--r-pill,9999px)] bg-background/85 px-1.5 font-mono text-micro tabular-nums text-muted-foreground">
              {String(p.id + 1).padStart(2, "0")}
            </figcaption>
          </figure>
        )}
        {...props}
      />

      {/* A sentinela tem altura: um alvo de 0px nunca intersecta com folga em
          alguns navegadores, e o feed morre no primeiro fundo de página. */}
      <div ref={sentinela} className="h-10" aria-hidden="true" />
    </div>
  );
}
