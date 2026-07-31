"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./KanbanCard";
import type { KanbanColumn as Col, KanbanItem, KanbanRenderCardArgs } from "./types";

/**
 * Coluna droppable + SortableContext. Também aceita drop quando vazia (o
 * useDroppable no corpo inteiro), senão colunas sem card não seriam alvo.
 */
export function KanbanColumn<T, C>({
  column,
  items,
  enabled,
  isOver,
  render,
  renderHeader,
  renderEmpty,
  className,
  selectable = false,
  selectedIds,
  onSelectToggle,
}: {
  column: Col<C>;
  items: KanbanItem<T>[];
  enabled: boolean;
  isOver: boolean;
  render: (args: KanbanRenderCardArgs<T>) => React.ReactNode;
  renderHeader?: (column: Col<C>) => React.ReactNode;
  renderEmpty?: (column: Col<C>) => React.ReactNode;
  className?: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectToggle?: (id: string) => void;
}) {
  const droppable = enabled && !column.dropDisabled;
  const { setNodeRef } = useDroppable({ id: column.id, disabled: !droppable });

  return (
    <div
      className={cn(
        "kanban-column flex flex-col",
        isOver && droppable && "is-drop-target",
        className
      )}
    >
      {renderHeader?.(column)}
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="kanban-column-body flex-1">
          {items.length === 0
            ? renderEmpty?.(column)
            : items.map((item) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  enabled={enabled}
                  render={render}
                  selectable={selectable}
                  selected={selectedIds?.has(item.id) ?? false}
                  onSelectToggle={onSelectToggle}
                />
              ))}
        </div>
      </SortableContext>
    </div>
  );
}
