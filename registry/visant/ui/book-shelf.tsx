"use client";

/**
 * Book Shelf — os itens como objetos soltos, sem card.
 *
 * ┌─ POR QUE SEM MOLDURA ─────────────────────────────────────────────────────┐
 * │ O card existe pra dar borda a uma imagem que não tem silhueta própria: uma │
 * │ thumb 16:9 sem moldura sangra no fundo e o trilho vira mancha. O livro 3D  │
 * │ TEM silhueta — lombada, espessura, quina iluminada — e a moldura passa a   │
 * │ competir com ela. Duas caixas em volta do mesmo objeto, e a de fora, que   │
 * │ não significa nada, é a que o olho vê primeiro.                            │
 * │                                                                            │
 * │ É a diferença entre vitrine e ESTANTE. Vitrine emoldura; estante mostra o  │
 * │ objeto e some.                                                             │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * O rótulo entra só no hover pela mesma razão: com o nome sempre impresso
 * embaixo, o olho lê a LISTA e não a prateleira, e o trabalho de fazer o objeto
 * ter cara vira legenda de tabela. Numa estante real você reconhece a lombada e
 * só chega perto pra ler.
 *
 * Isso é decisão de VITRINE, não de acesso: o mesmo rótulo aparece no
 * `:focus-within` pra quem navega por teclado, e o link continua nomeado pelo
 * título mesmo com o texto invisível — nome acessível não depende de opacidade.
 *
 * ── A aposta que esta peça faz, e quando ela está errada ───────────────────
 *
 * Item COM arte não tem título legível em repouso: só a lombada, pequena. Isso
 * é fiel a uma estante, e é uma aposta — se o catálogo vende por reconhecimento
 * de NOME e não de capa, o rótulo tem que ser fixo, e aí esta peça é a errada.
 * No toque não existe hover: lá o rótulo só aparece durante o arraste.
 */

import * as React from "react";

import { Book3D } from "@/components/ui/book-3d";
import { cn } from "@/lib/utils";

export interface ShelfItem {
  /** Chave ESTÁVEL da arte derivada e da palheta: slug > id. */
  seed: string;
  title: string;
  /** A capa. Sem ela, o livro sai com a capa desenhada — nunca caixa cinza. */
  art?: string | null;
  pages?: number | null;
  /** Cor curada da arte. Ver `artColor` em `book-3d`. */
  artColor?: string | null;
  /** Uma linha de contexto, no hover, embaixo do título. */
  note?: string;
  href?: string;
}

function Piece({ item }: { item: ShelfItem }) {
  const { seed, title, art, pages, artColor, note, href } = item;

  const object = (
    <>
      <Book3D seed={seed} title={title} art={art} pages={pages} artColor={artColor} />

      {/* O rótulo NÃO empurra layout: `absolute` sobre o pé do objeto. Se
          ocupasse espaço, cada item reservaria altura pra um texto que quase
          nunca está lá, e a prateleira ficaria com buracos regulares entre as
          fileiras — o mesmo defeito que a moldura, por outro caminho.

          O VÉU não é enfeite. Sem ele o nome cai em cima da capa e some: contra
          o título grande da capa desenhada, ou contra o que a arte tiver ali
          embaixo — e arte de catálogo é imprevisível por natureza. Ele começa
          no meio da caixa pra o gradiente ter onde morrer; véu curto vira faixa
          com borda visível. */}
      <div className="book-shelf-label pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end px-2 pb-2 pt-16 text-center">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{title}</p>
        {note && (
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{note}</p>
        )}
      </div>
    </>
  );

  return (
    <article className="group relative min-w-0">
      {href ? (
        <>
          {object}
          {/* O alvo é a peça inteira e quem anuncia o link é o TÍTULO. O
              `sr-only` carrega o nome acessível porque o rótulo visível vive em
              `opacity: 0` na maior parte do tempo, e nome que some no hover não
              é nome. */}
          <a
            href={href}
            className="absolute inset-0 outline-none focus-visible:[box-shadow:var(--focus)]"
            style={{ borderRadius: "var(--r-surface, 4px)" }}
          >
            <span className="sr-only">{title}</span>
          </a>
        </>
      ) : (
        object
      )}
    </article>
  );
}

export interface BookShelfProps {
  items: ShelfItem[];
  /** Classes de grade. O default é uma estante confortável em três larguras. */
  columns?: string;
  className?: string;
  /** O que mostrar quando não há nada. Estante vazia sem isto é uma área morta
   *  que parece carregamento travado. */
  empty?: React.ReactNode;
}

export function BookShelf({
  items,
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  className,
  empty,
}: BookShelfProps) {
  if (!items.length) return <>{empty ?? null}</>;

  return (
    /**
     * `gap-x` menor que `gap-y`: numa estante os livros ficam PRÓXIMOS na
     * horizontal — é isso que faz ler como fileira — e as prateleiras são bem
     * separadas na vertical. Espaçamento igual nos dois eixos devolve a grade de
     * ícones, que é o que a peça está tentando não ser.
     */
    <div className={cn("grid gap-x-2 gap-y-8", columns, className)}>
      {items.map((it) => (
        <Piece key={it.seed} item={it} />
      ))}
    </div>
  );
}
