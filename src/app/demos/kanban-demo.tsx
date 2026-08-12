"use client";

/**
 * A demo do kanban mora sozinha porque ela é cara.
 *
 * O `@dnd-kit` são 185KB (60KB comprimidos) que serviam UM card do catálogo e
 * chegavam no primeiro carregamento, antes de qualquer pessoa rolar até ele.
 * Aqui o pedaço só é buscado quando o card entra na tela.
 */

import * as React from "react";
import { Kanban } from "../../../registry/visant/blocks/kanban";
import type { KanbanItem } from "../../../registry/visant/blocks/kanban/types";

/*
 * Dois tamanhos do mesmo board, e o motivo de existirem dois.
 *
 * No card do catálogo o board tem 760px declarados e precisa caber inteiro:
 * duas colunas e três cartões é o que mostra o gesto sem virar uma barra de
 * rolagem. Já na sala da mesa de trabalho o board É a tela — duas colunas
 * quase vazias ali leem como app sem uso, e o que se está vendendo é
 * justamente o app cheio. Mesma peça, mesmo arquivo, densidade diferente.
 */
const ENXUTO = {
  columns: [
    { id: "fila", data: { label: "Fila" } },
    { id: "fazendo", data: { label: "Fazendo" } },
  ],
  items: [
    { id: "a", columnId: "fila", data: { t: "Colher marquee" } },
    { id: "b", columnId: "fila", data: { t: "Tema Kastrup" } },
    { id: "c", columnId: "fazendo", data: { t: "Brand selector" } },
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
    { id: "a", columnId: "fila", data: { t: "Colher marquee" } },
    { id: "b", columnId: "fila", data: { t: "Tema Kastrup" } },
    { id: "c", columnId: "fila", data: { t: "Naming da linha nova" } },
    { id: "d", columnId: "fazendo", data: { t: "Brand selector" } },
    { id: "e", columnId: "fazendo", data: { t: "Landing Casa Vinte" } },
    { id: "f", columnId: "revisao", data: { t: "Embalagem Bandeira" } },
    { id: "g", columnId: "revisao", data: { t: "Manual de marca v2" } },
    { id: "h", columnId: "pronto", data: { t: "Rebrand Ribalta" } },
  ],
};

export default function KanbanDemo({ denso = false }: { denso?: boolean }) {
  const base = denso ? DENSO : ENXUTO;
  const columns = React.useMemo(() => base.columns, [base]);
  const [items, setItems] = React.useState<KanbanItem<{ t: string }>[]>(
    base.items as KanbanItem<{ t: string }>[],
  );

  // `overflow-hidden`, e não `auto`: a barra de rolagem que aparecia aqui dentro
  // era o palco declarando largura menor que o board. Quem conserta isso é o
  // `preview.w` do catálogo, não uma barra que esconde coluna.
  return (
    <div
      className={`h-full w-full p-2 text-rotulo ${
        // No board denso a rolagem horizontal é o comportamento CERTO: board de
        // verdade tem mais coluna do que tela, e cortar a quarta a faca some com
        // ela. No card do catálogo continua `hidden` — lá a barra seria o palco
        // declarando largura menor que a peça, que é defeito.
        denso ? "overflow-x-auto" : "overflow-hidden"
      }`}
    >
      <Kanban
        columns={columns}
        items={items}
        onMove={({ itemId, toColumnId }) =>
          setItems((prev) =>
            prev.map((it) => (it.id === itemId ? { ...it, columnId: toColumnId } : it)),
          )
        }
        renderColumnHeader={(c) => (
          <span className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
            {(c.data as { label: string }).label}
          </span>
        )}
        renderCard={({ item, dragging }) => (
          <div
            className={`rounded-[var(--r-control,0.5rem)] border border-border bg-card px-2.5 py-2 ${
              dragging ? "opacity-40" : ""
            }`}
          >
            {item.data.t}
          </div>
        )}
      />
    </div>
  );
}
