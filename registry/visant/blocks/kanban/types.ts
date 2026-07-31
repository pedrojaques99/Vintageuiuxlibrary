/**
 * Kanban primitive — tipos públicos.
 *
 * Data-agnostic por design: o componente não conhece Linear, Supabase, auth ou
 * "membro". Recebe colunas + itens e emite `onMove`. Quem pluga dado é o
 * consumidor (neste app, o board do time; num projeto de cliente, o que for).
 */
import type { ReactNode } from "react";

export interface KanbanColumn<C = unknown> {
  /** Chave estável da coluna (ex.: um status). */
  id: string;
  /** Dado livre do consumidor (cor, label, contadores…) para o header. */
  data?: C;
  /** Coluna não aceita drops (arrastável PARA fora, mas não é alvo). */
  dropDisabled?: boolean;
}

export interface KanbanItem<T = unknown> {
  /** Id estável do card. */
  id: string;
  /** Coluna a que o card pertence. */
  columnId: string;
  /** Dado livre do consumidor, repassado ao `renderCard`. */
  data: T;
}

export interface KanbanMove {
  itemId: string;
  fromColumnId: string;
  toColumnId: string;
  /** Índice final dentro da coluna de destino. */
  toIndex: number;
  /** Ordem completa (ids) da coluna de destino após o move — pronta pra persistir. */
  columnOrder: string[];
}

export interface KanbanRenderCardArgs<T> {
  item: KanbanItem<T>;
  /** true no overlay de arraste (o card "fantasma" que segue o cursor). */
  overlay?: boolean;
  /** true no card original enquanto ele está sendo arrastado. */
  dragging?: boolean;
  /** true quando o card faz parte da seleção múltipla (ver `selectable`). */
  selected?: boolean;
}

export interface KanbanProps<T = unknown, C = unknown> {
  columns: KanbanColumn<C>[];
  items: KanbanItem<T>[];
  /** Slot obrigatório: o consumidor desenha o card (mantém o core de DnD genérico). */
  renderCard: (args: KanbanRenderCardArgs<T>) => ReactNode;
  /** Slot opcional do cabeçalho da coluna. */
  renderColumnHeader?: (column: KanbanColumn<C>) => ReactNode;
  /** Slot opcional do vazio da coluna. */
  renderColumnEmpty?: (column: KanbanColumn<C>) => ReactNode;
  /**
   * Disparado ao soltar: mover entre colunas E reordenar dentro da mesma. O
   * consumidor persiste (status + ordem) e/ou revalida.
   */
  onMove?: (move: KanbanMove) => void;
  /** DnD ligado. Off = board somente-leitura (ex.: board do cliente). */
  enabled?: boolean;
  /**
   * Liga a seleção múltipla: marquee "select by area" (arrastar sobre o vazio) +
   * shift/ctrl/cmd-clique num card. Só faz efeito com `enabled` (board editável).
   * O consumidor desenha a UI de batch a partir de `onSelectionChange`.
   */
  selectable?: boolean;
  /** Ids selecionados (controlado). Se omitido, o Kanban mantém a seleção interna. */
  selectedIds?: string[];
  /** Notifica a nova seleção — SSoT do consumidor + gatilho da barra de batch. */
  onSelectionChange?: (ids: string[]) => void;
  className?: string;
  /** Classe extra por coluna (largura, etc.). */
  columnClassName?: string;
}
