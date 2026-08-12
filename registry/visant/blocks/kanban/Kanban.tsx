"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
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
/*
 * O pouso do card — o imã, e o fim do pulo ao soltar.
 *
 * O `DragOverlay` estava sem configuração, então rodava o padrão da lib: 250ms
 * de `ease`, e um efeito colateral que zera a opacidade do card de origem
 * durante a viagem e a devolve de uma vez no fim. Dois problemas nisso:
 *
 * 1. O tempo e a curva vinham de dentro do node_modules. Um encaixe é uma
 *    aterrissagem: `--dur-base` e `--ease-out`, que é como tudo o mais nesta
 *    casa desacelera ao chegar.
 * 2. O card de destino voltava do nada pro opaco no frame em que o overlay
 *    sumia. Aqui trocamos a opacidade crua pela classe `is-landing`: o buraco
 *    continua desenhado durante a viagem inteira e o conteúdo ACENDE por
 *    transição quando a classe sai (kanban.css). O overlay termina de pousar e
 *    o card aparece por baixo dele no mesmo movimento, em vez de os dois
 *    trocarem de lugar num piscar.
 *
 * O tempo e a curva são LIDOS do CSS em vez de escritos aqui. A drop animation
 * é WAAPI, e a Web Animations API não aceita `var(--ease-out)` — mas ela aceita
 * a string que a variável guarda. Então a fonte da verdade continua sendo o
 * arquivo de tokens: quem trocar `--dur-base` na marca troca também o pouso do
 * card, sem abrir este arquivo.
 *
 * Quem pediu menos movimento recebe duração zero: o dnd-kit pula a animação
 * (`if (!duration) return`) e o card simplesmente ESTÁ no destino. O resultado
 * acontece, só não há percurso — e essa é a única forma de alcançar isto, já
 * que o guard global de `prefers-reduced-motion` só enxerga transição CSS.
 */
// Sem anotar `: DropAnimation`: aquele tipo é uma união que inclui a forma
// "função", e por ela o `duration` some — e o guard de pouso abaixo precisa ler
// essa duração. O objeto inferido continua sendo aceito pelo DragOverlay.
function readDropAnimation() {
  const css = typeof window === "undefined" ? null : getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) =>
    (css?.getPropertyValue(name).trim() || "") || fallback;

  const raw = token("--dur-base", "200ms");
  const ms = raw.endsWith("ms") ? parseFloat(raw) : parseFloat(raw) * 1000;
  const reduzido =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    duration: reduzido ? 0 : Number.isFinite(ms) ? ms : 200,
    easing: token("--ease-out", "cubic-bezier(0.23, 1, 0.32, 1)"),
    sideEffects: defaultDropAnimationSideEffects({
      className: { active: "is-landing" },
    }),
  };
}

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

  // Uma vez por board: a config precisa ser a MESMA referência entre renders,
  // senão o dnd-kit refaz o handler de pouso no meio do gesto e a animação sai
  // pela metade. `[]` de propósito.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dropAnimation = useMemo(readDropAnimation, []);

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

  /*
   * A ressincronização espera o card POUSAR.
   *
   * O efeito abaixo devolve a ordem das props assim que o gesto acaba — e o
   * gesto acaba no instante do `mouseup`, enquanto o overlay ainda tem a viagem
   * inteira pela frente. Um consumidor que aplique o `onMove` com qualquer
   * diferença (o caso comum: guardar a coluna e ignorar o `columnOrder`) fazia o
   * card SALTAR de volta debaixo do overlay que ainda estava descendo. Ir e
   * voltar num piscar, com o fantasma ainda no ar.
   *
   * Segurar a ressincronização pela duração do pouso resolve pra todo mundo, e
   * não só pra quem escreve o consumidor certo: o card encosta no lugar, e só
   * então a verdade das props volta a mandar. Se ela discordar, a correção
   * aparece — mas aparece sozinha, à vista, e não escondida sob uma animação.
   */
  const [pousando, setPousando] = useState(false);
  const pousoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aguardaPouso = useCallback(() => {
    if (pousoRef.current) clearTimeout(pousoRef.current);
    setPousando(true);
    pousoRef.current = setTimeout(() => setPousando(false), dropAnimation.duration ?? 0);
  }, [dropAnimation.duration]);
  useEffect(() => () => void (pousoRef.current && clearTimeout(pousoRef.current)), []);

  useEffect(() => {
    if (!activeId && !pousando) setOrdered(fromProps);
  }, [fromProps, activeId, pousando]);

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
    aguardaPouso();
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
    aguardaPouso();
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
      <DragOverlay dropAnimation={dropAnimation}>
        {activeItem ? (
          <div className="kanban-card-overlay">
            {renderCard({ item: activeItem, overlay: true })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
