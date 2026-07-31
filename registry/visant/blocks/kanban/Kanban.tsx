"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useSelectionContainer, boxesIntersect, type Box } from "@air/react-drag-to-select";
import { cn } from "@/lib/utils";
import { KanbanColumn } from "./KanbanColumn";
import type { KanbanItem, KanbanProps } from "./types";
import "./kanban.css";

/**
 * Kanban primitive — headless, data-agnostic, dirigido por design tokens.
 *
 * DnD robusto via dnd-kit (Pointer + Touch + Keyboard sensors, DragOverlay,
 * multi-container sortable): substitui o HTML5 drag nativo (sem touch, ghost
 * feio, casos de borda bugados). Reordena dentro da coluna E move entre colunas.
 *
 * Theming: lê só `--kanban-*` (com fallback pros tokens do design system) — troca
 * o arquivo de tokens da marca e o mesmo componente se veste. Ver kanban.css.
 *
 * Seleção múltipla (opt-in via `selectable`): marquee "select by area" (arrastar
 * sobre o vazio, via @air/react-drag-to-select) + shift/ctrl/cmd-clique. O marquee
 * não inicia sobre um card (é alça de drag) nem sobre controles. Emite
 * `onSelectionChange`; a UI de batch é do consumidor. Só ativa com `enabled`.
 *
 * Distribuição: registry estilo shadcn — copia `components/ui/kanban/*` pro
 * projeto do cliente e tematiza pelos tokens. Não conhece Linear/Supabase/auth.
 */
export function Kanban<T = unknown, C = unknown>({
  columns,
  items,
  renderCard,
  renderColumnHeader,
  renderColumnEmpty,
  onMove,
  enabled = true,
  selectable = false,
  selectedIds,
  onSelectionChange,
  className,
  columnClassName,
}: KanbanProps<T, C>) {
  const itemById = useMemo(() => {
    const m = new Map<string, KanbanItem<T>>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const colMeta = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);

  // Ordem vinda das props (a fonte da verdade do consumidor).
  const fromProps = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const c of columns) map[c.id] = [];
    for (const it of items) (map[it.columnId] ??= []).push(it.id);
    return map;
  }, [columns, items]);

  // Cópia de trabalho — mutável durante o arraste pro card "seguir" pra coluna
  // nova ao vivo; ressincroniza com as props quando não está arrastando.
  const [ordered, setOrdered] = useState<Record<string, string[]>>(fromProps);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const fromColumnRef = useRef<string | null>(null);
  // Índice de origem congelado no dragStart: comparar com fromProps atual dava
  // falso-positivo/negativo se um refetch (realtime) chegasse durante o drag.
  const fromIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!activeId) setOrdered(fromProps);
  }, [fromProps, activeId]);

  const sensors = useSensors(
    // MouseSensor, NÃO PointerSensor: Pointer Events incluem touch — com
    // `distance: 6`, qualquer pan de 6px no dedo virava drag IMEDIATO, sem
    // delay (o TouchSensor abaixo nem chegava a decidir). Mouse: um CLIQUE
    // (abrir o card) só vira arraste depois de mover alguns px.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: long-press deliberado (250ms parado) inicia o drag; mover o dedo
    // além da tolerância durante a espera = é scroll, cancela o drag.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Seleção múltipla (opt-in via `selectable`, só faz efeito com `enabled`) --
  const selectionActive = enabled && selectable;
  const controlled = selectedIds != null;
  const [internalSel, setInternalSel] = useState<string[]>([]);
  const selection = controlled ? selectedIds! : internalSel;
  const selSet = useMemo(() => new Set(selection), [selection]);
  // Espelho sempre-atual da seleção pros callbacks do marquee (que não re-assinam).
  const selSetRef = useRef(selSet);
  selSetRef.current = selSet;

  const commitSelection = useCallback(
    (next: string[]) => {
      if (!controlled) setInternalSel(next);
      onSelectionChange?.(next);
    },
    [controlled, onSelectionChange]
  );

  const toggleSelect = useCallback(
    (id: string) => {
      const next = new Set(selSetRef.current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      commitSelection([...next]);
    },
    [commitSelection]
  );

  // Callback ref (via state) — o marquee precisa do elemento no render pra ancorar
  // os listeners (mousedown/move) só no board, não no document inteiro.
  const [boardEl, setBoardEl] = useState<HTMLDivElement | null>(null);
  // Base congelada no início do gesto: seleção pré-existente se aditivo (shift),
  // senão vazia. O marquee soma os hits a essa base.
  const marqueeBaseRef = useRef<Set<string>>(new Set());

  // Hit-test: quais cards (por data-kanban-card-id) intersectam a caixa do marquee.
  // A lib entrega a `box` em coords RELATIVAS ao container (`.kanban-root`), então
  // convertemos os rects dos cards (viewport) subtraindo o rect do board.
  const hitsInBox = useCallback(
    (box: Box): string[] => {
      if (!boardEl) return [];
      const base = boardEl.getBoundingClientRect();
      const hits: string[] = [];
      boardEl.querySelectorAll<HTMLElement>("[data-kanban-card-id]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const rel = {
          left: r.left - base.left,
          top: r.top - base.top,
          width: r.width,
          height: r.height,
        };
        if (boxesIntersect(box, rel)) {
          const id = el.dataset.kanbanCardId;
          if (id) hits.push(id);
        }
      });
      return hits;
    },
    [boardEl]
  );

  const { DragSelection } = useSelectionContainer<HTMLDivElement>({
    isEnabled: selectionActive,
    eventsElement: boardEl,
    // Não iniciar sobre um card (é alça de drag do dnd-kit) nem sobre controles.
    shouldStartSelecting: (target) => {
      if (!(target instanceof Element)) return false;
      if (target.closest("[data-kanban-card-id]")) return false;
      return !target.closest(
        "button, a, input, textarea, select, [role='button'], [contenteditable='true']"
      );
    },
    onSelectionStart: (e) => {
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      marqueeBaseRef.current = additive ? new Set(selSetRef.current) : new Set();
      // Clique no vazio (sem aditivo) limpa a seleção — comportamento Finder/Linear.
      if (!additive && selSetRef.current.size) commitSelection([]);
    },
    onSelectionChange: (box) => {
      const next = new Set(marqueeBaseRef.current);
      for (const id of hitsInBox(box)) next.add(id);
      commitSelection([...next]);
    },
    selectionProps: {
      style: {
        // Cor completa via --kanban-accent (portável entre HSL e OKLCH); ver kanban.css.
        border: "1px solid var(--kanban-accent, oklch(0.62 0.02 240))",
        background: "color-mix(in oklch, var(--kanban-accent, oklch(0.62 0.02 240)) 12%, transparent)",
        borderRadius: "4px",
      },
    },
  });

  // Esc limpa a seleção.
  useEffect(() => {
    if (!selectionActive || selection.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") commitSelection([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectionActive, selection.length, commitSelection]);

  const columnOf = (id: string): string | undefined => {
    if (id in ordered) return id;
    return Object.keys(ordered).find((col) => ordered[col]!.includes(id));
  };

  const itemsOf = (colId: string): KanbanItem<T>[] =>
    (ordered[colId] ?? []).map((id) => itemById.get(id)).filter(Boolean) as KanbanItem<T>[];

  const activeItem = activeId ? itemById.get(activeId) ?? null : null;

  // Board somente-leitura: render simples sem DnD (ex.: board do cliente).
  if (!enabled) {
    return (
      <div className={cn("kanban-root flex", className)}>
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            items={(fromProps[col.id] ?? [])
              .map((id) => itemById.get(id))
              .filter(Boolean) as KanbanItem<T>[]}
            enabled={false}
            isOver={false}
            render={renderCard}
            renderHeader={renderColumnHeader}
            renderEmpty={renderColumnEmpty}
            className={columnClassName}
          />
        ))}
      </div>
    );
  }

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setActiveId(id);
    const col = columnOf(id) ?? null;
    fromColumnRef.current = col;
    fromIndexRef.current = col ? (ordered[col] ?? []).indexOf(id) : -1;
  };

  const handleDragOver = (e: DragOverEvent) => {
    const active = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) {
      setOverColumn(null);
      return;
    }
    const activeCol = columnOf(active);
    const overCol = columnOf(overId);
    if (!activeCol || !overCol) return;
    if (colMeta.get(overCol)?.dropDisabled) {
      setOverColumn(null);
      return;
    }
    setOverColumn(overCol);
    if (activeCol === overCol) return;

    // Cross-container: insere o card na coluna de destino ao vivo.
    setOrdered((prev) => {
      const activeItems = prev[activeCol] ?? [];
      const overItems = prev[overCol] ?? [];
      if (!activeItems.includes(active)) return prev;
      const overIndex = overId in prev ? overItems.length : overItems.indexOf(overId);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      return {
        ...prev,
        [activeCol]: activeItems.filter((id) => id !== active),
        [overCol]: [...overItems.slice(0, insertAt), active, ...overItems.slice(insertAt)],
      };
    });
  };

  // ESC / cancelamento de sensor dispara onDragCancel, NÃO onDragEnd. Sem este
  // handler o activeId nunca zerava: overlay preso, resync com as props
  // bloqueado e o card órfão na coluna errada até um remount.
  const handleDragCancel = () => {
    setActiveId(null);
    setOverColumn(null);
    fromColumnRef.current = null;
    fromIndexRef.current = -1;
    setOrdered(fromProps);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const active = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    const from = fromColumnRef.current;
    setActiveId(null);
    setOverColumn(null);
    fromColumnRef.current = null;

    if (!overId) {
      setOrdered(fromProps);
      return;
    }
    const activeCol = columnOf(active);
    const overCol = columnOf(overId) ?? activeCol;
    if (!activeCol || !overCol || colMeta.get(overCol)?.dropDisabled) {
      setOrdered(fromProps);
      return;
    }

    // Após o dragOver, o item já vive na coluna de destino; aqui só refinamos o
    // índice final (reorder dentro da coluna resolvida).
    const arr = ordered[activeCol] ?? [];
    const oldIndex = arr.indexOf(active);
    // Soltar sobre o corpo da coluna (gap/padding, não um card) mantém a posição
    // da prévia ao vivo — antes forçava o card pro FIM da coluna e persistia uma
    // ordem que o usuário não pediu.
    let newIndex = overId in ordered ? oldIndex : arr.indexOf(overId);
    if (newIndex < 0) newIndex = oldIndex;
    const finalArr =
      oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex
        ? arrayMove(arr, oldIndex, newIndex)
        : arr;
    const finalOrdered = { ...ordered, [activeCol]: finalArr };
    setOrdered(finalOrdered);

    const toIndex = finalArr.indexOf(active);
    const originalIndex = fromIndexRef.current;
    fromIndexRef.current = -1;
    // Só reporta mudança real (evita write fantasma ao soltar no mesmo lugar).
    if (from !== activeCol || toIndex !== originalIndex) {
      onMove?.({
        itemId: active,
        fromColumnId: from ?? activeCol,
        toColumnId: activeCol,
        toIndex,
        columnOrder: finalArr,
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* data-kanban-dragging: consumidores (via `:has()`) desligam scroll-snap
          durante o drag pra não brigar com o auto-scroll do dnd-kit. */}
      <div
        ref={setBoardEl}
        className={cn("kanban-root flex", selectionActive && "relative", className)}
        data-kanban-dragging={activeId ? "" : undefined}
      >
        {/* Retângulo do marquee — renderizado no topo do container dos cards. */}
        {selectionActive ? <DragSelection /> : null}
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            items={itemsOf(col.id)}
            enabled
            isOver={overColumn === col.id}
            render={renderCard}
            renderHeader={renderColumnHeader}
            renderEmpty={renderColumnEmpty}
            className={columnClassName}
            selectable={selectionActive}
            selectedIds={selSet}
            onSelectToggle={toggleSelect}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="kanban-card-overlay">
            {renderCard({ item: activeItem, overlay: true })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
