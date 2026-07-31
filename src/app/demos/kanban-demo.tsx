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

export default function KanbanDemo() {
  const columns = React.useMemo(
    () => [
      { id: "fila", data: { label: "Fila" } },
      { id: "fazendo", data: { label: "Fazendo" } },
    ],
    [],
  );
  const [items, setItems] = React.useState<KanbanItem<{ t: string }>[]>([
    { id: "a", columnId: "fila", data: { t: "Colher marquee" } },
    { id: "b", columnId: "fila", data: { t: "Tema Kastrup" } },
    { id: "c", columnId: "fazendo", data: { t: "Brand selector" } },
  ]);

  return (
    <div className="h-full w-full overflow-auto p-2 text-rotulo">
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
