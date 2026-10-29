"use client";

/**
 * A demo do kanban mora sozinha porque ela é cara.
 *
 * O `@dnd-kit` são 185KB (60KB comprimidos) que serviam UM card do catálogo e
 * chegavam no primeiro carregamento, antes de qualquer pessoa rolar até ele.
 * Aqui o pedaço só é buscado quando o card entra na tela.
 *
 * Uma nota sobre o palco: o `FitStage` escala a demo com `transform` quando ela
 * não cabe, e o dnd-kit move o card em pixel de tela, sem saber da escala. Com
 * o board declarado em 1020 dentro da faixa cheia a escala é 1 e o arraste é
 * exato; abaixo disso (celular) o fantasma anda mais rápido que o board. É
 * limite do palco, não da peça — num app de verdade não há escala nenhuma.
 */

import * as React from "react";
import { CalendarDays } from "lucide-react";

import { Kanban } from "../../../registry/visant/blocks/kanban";
import type { KanbanItem } from "../../../registry/visant/blocks/kanban/types";

/*
 * Dois tamanhos do mesmo board, e o motivo de existirem dois.
 *
 * No card do catálogo o board tem 1020px declarados: três colunas de 320
 * (`--kanban-col-min`) mais as goteiras. Duas colunas cabiam em 760, mas com
 * duas colunas o gesto tem um destino só — e o que este item vende é escolher
 * ONDE o card cai, entre quais vizinhos. Já na sala da mesa de trabalho o board
 * É a tela, e ali entram as quatro. Mesma peça, mesmo arquivo, densidade
 * diferente.
 */
interface Tarefa {
  t: string;
  /** Pra quem é o trabalho. */
  cliente: string;
  /** Iniciais de quem está com a tarefa. */
  quem: string;
  prazo: string;
}

const ENXUTO = {
  columns: [
    { id: "fila", data: { label: "Fila" } },
    { id: "fazendo", data: { label: "Fazendo" } },
    { id: "pronto", data: { label: "Pronto" } },
  ],
  items: [
    { id: "a", columnId: "fila", data: { t: "Naming da linha nova", cliente: "Casa Vinte", quem: "AR", prazo: "24 out" } },
    { id: "b", columnId: "fila", data: { t: "Tema escuro do app", cliente: "Oficina Bandeira", quem: "CD", prazo: "28 out" } },
    { id: "c", columnId: "fazendo", data: { t: "Landing de lançamento", cliente: "Casa Vinte", quem: "MA", prazo: "22 out" } },
    { id: "d", columnId: "fazendo", data: { t: "Embalagem da linha café", cliente: "Padaria Miolo", quem: "PJ", prazo: "30 out" } },
    { id: "e", columnId: "pronto", data: { t: "Rebrand completo", cliente: "Estúdio Ribalta", quem: "AR", prazo: "15 out" } },
  ],
};

const DENSO = {
  columns: [
    { id: "fila", data: { label: "Fila" } },
    { id: "fazendo", data: { label: "Fazendo" } },
    { id: "revisao", data: { label: "Revisão" } },
    { id: "pronto", data: { label: "Pronto" } },
  ],
  items: [
    ...ENXUTO.items.filter((it) => it.columnId !== "pronto"),
    { id: "f", columnId: "fila", data: { t: "Fotos do catálogo", cliente: "Ateliê Norte", quem: "MA", prazo: "02 nov" } },
    { id: "g", columnId: "revisao", data: { t: "Manual de marca v2", cliente: "Oficina Bandeira", quem: "CD", prazo: "21 out" } },
    { id: "h", columnId: "revisao", data: { t: "Cardápio impresso", cliente: "Padaria Miolo", quem: "PJ", prazo: "23 out" } },
    { id: "e", columnId: "pronto", data: { t: "Rebrand completo", cliente: "Estúdio Ribalta", quem: "AR", prazo: "15 out" } },
  ],
};

export default function KanbanDemo({ denso = false }: { denso?: boolean }) {
  const base = denso ? DENSO : ENXUTO;
  const columns = React.useMemo(() => base.columns, [base]);
  const [items, setItems] = React.useState<KanbanItem<Tarefa>[]>(base.items as KanbanItem<Tarefa>[]);
  const contagem = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.columnId, (m.get(it.columnId) ?? 0) + 1);
    return m;
  }, [items]);

  // `overflow-hidden`, e não `auto`: a barra de rolagem que aparecia aqui dentro
  // era o palco declarando largura menor que o board. Quem conserta isso é o
  // `preview.w` do catálogo, não uma barra que esconde coluna.
  return (
    <div
      className={`h-full w-full p-3 ${
        // No board denso a rolagem horizontal é o comportamento CERTO: board de
        // verdade tem mais coluna do que tela, e cortar a quarta a faca some com
        // ela. No card do catálogo continua `hidden` — lá a barra seria o palco
        // declarando largura menor que a peça, que é defeito.
        denso ? "overflow-x-auto" : "overflow-hidden"
      }`}
    >
      <Kanban
        // Piso de coluna um pouco abaixo do padrão (320): com a faixa de fundo
        // e o respiro do palco, três colunas de 320 passavam da caixa e a
        // terceira saía cortada. `!` porque o kanban.css entra fora de camada.
        className="[--kanban-col-min:296px]!"
        columns={columns}
        items={items}
        /*
         * A ordem que o componente devolve TEM que ser aplicada. Aqui estava o
         * pulo mais feio do arraste, e ele nascia nesta demo, não no primitivo.
         *
         * Antes esta função só trocava o `columnId` e jogava fora o
         * `columnOrder`. Só que o Kanban ressincroniza a ordem dele com as props
         * assim que o gesto acaba — então soltar o card na segunda posição
         * mostrava ele indo pra segunda posição e, um frame depois, VOLTANDO pra
         * primeira, porque as props diziam que nada tinha mudado de ordem. E
         * isso acontecia embaixo do overlay ainda pousando: o card ia e voltava
         * enquanto o fantasma descia. Era esse o "motion pulando de flicker".
         *
         * Reordenar só os itens da coluna de destino, no lugar deles dentro do
         * array, mantém as outras colunas intactas — é a mesma coisa que um
         * backend faria ao gravar a ordem de uma coluna só.
         */
        onMove={({ itemId, toColumnId, columnOrder }) =>
          setItems((prev) => {
            const movido = prev.map((it) =>
              it.id === itemId ? { ...it, columnId: toColumnId } : it,
            );
            const posicao = new Map(columnOrder.map((id, i) => [id, i]));
            const daColuna = movido
              .filter((it) => it.columnId === toColumnId)
              .sort((x, y) => (posicao.get(x.id) ?? 0) - (posicao.get(y.id) ?? 0));
            let k = 0;
            return movido.map((it) => (it.columnId === toColumnId ? daColuna[k++]! : it));
          })
        }
        // A coluna é uma faixa de fundo levemente mais escura que o palco: é o
        // que separa "lugar onde o card mora" de "card", sem borda nenhuma.
        columnClassName="rounded-[var(--r-surface,1rem)] bg-[color-mix(in_oklab,var(--muted)_55%,transparent)] p-3"
        renderColumnHeader={(c) => (
          <div className="mb-3 flex items-baseline justify-between px-1">
            <span className="text-[13px] font-medium text-foreground">
              {(c.data as { label: string }).label}
            </span>
            <span className="text-[12px] tabular-nums text-muted-foreground">{contagem.get(c.id) ?? 0}</span>
          </div>
        )}
        // O `dragging` não pinta mais nada aqui. O `opacity-40` que ficava neste
        // cartão se multiplicava com o `opacity-40` que o KanbanCard já aplicava
        // no wrapper: 0.4 × 0.4 = 0.16 de opacidade real, medido no navegador. O
        // buraco de destino ficava invisível e arrastar virava chute. Quem
        // desenha o alvo agora é o componente (o slot tracejado); o cartão do
        // consumidor só precisa ser um cartão.
        // O card é óbvio porque é OBJETO: fundo de cartão, sombra baixa e
        // conteúdo em três níveis (o que, pra quem, quem e quando).
        renderCard={({ item }) => (
          <div className="flex flex-col gap-3 rounded-[var(--r-control,0.625rem)] border border-border bg-card px-3.5 py-3 [box-shadow:var(--e-flat)]">
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-medium leading-snug text-foreground">{item.data.t}</span>
              <span className="text-[12px] leading-snug text-muted-foreground">{item.data.cliente}</span>
            </div>
            <div className="flex items-center justify-between">
              <span
                aria-label={`Com ${item.data.quem}`}
                className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-semibold text-foreground"
              >
                {item.data.quem}
              </span>
              <span className="inline-flex items-center gap-1 text-[12px] tabular-nums text-muted-foreground">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {item.data.prazo}
              </span>
            </div>
          </div>
        )}
      />
    </div>
  );
}
