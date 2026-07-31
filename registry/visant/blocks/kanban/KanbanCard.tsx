"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { KanbanItem, KanbanRenderCardArgs } from "./types";

/**
 * Card arrastável (useSortable). O card inteiro é a alça — a distância de
 * ativação do sensor (no <Kanban>) garante que um CLIQUE simples ainda passe
 * para o onClick do conteúdo; só vira arraste depois de mover alguns px.
 */
export function KanbanCard<T>({
  item,
  enabled,
  render,
  selectable = false,
  selected = false,
  onSelectToggle,
}: {
  item: KanbanItem<T>;
  enabled: boolean;
  render: (args: KanbanRenderCardArgs<T>) => React.ReactNode;
  /** Seleção múltipla ligada — habilita o shift/ctrl/cmd-clique de toggle. */
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !enabled });

  return (
    <div
      ref={setNodeRef}
      // O marquee (Kanban) acha os cards por este atributo pra calcular o hit-test.
      data-kanban-card-id={item.id}
      data-selected={selectable && selected ? "" : undefined}
      aria-selected={selectable ? selected : undefined}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      // Modifier-clique = toggle na seleção (não abre o card). Capture pra
      // interceptar ANTES do onClick do conteúdo (render do consumidor).
      onClickCapture={
        selectable
          ? (e) => {
              if (e.shiftKey || e.metaKey || e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                onSelectToggle?.(item.id);
              }
            }
          : undefined
      }
      className={cn(
        // `manipulation`, não `none`: o TouchSensor ativa por delay (150ms) e aí
        // preventDefault nos touchmove — `none` bloqueava o pan nativo que os
        // scrolls mobile (coluna interna + rail snap-x) precisam quando o gesto
        // começa em cima de um card, ou seja, quase sempre.
        "kanban-card touch-manipulation",
        enabled && "cursor-grab active:cursor-grabbing",
        // A origem "esvazia" enquanto o overlay viaja — coesão do movimento.
        isDragging && "opacity-40"
      )}
      {...(enabled ? attributes : {})}
      {...(enabled ? listeners : {})}
    >
      {render({ item, dragging: isDragging, selected: selectable ? selected : undefined })}
    </div>
  );
}
