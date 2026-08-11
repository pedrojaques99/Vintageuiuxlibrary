"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";

/**
 * FilterBar — o esqueleto de uma barra de filtro: controles em cima, filtros
 * aplicados embaixo.
 *
 * Colhido de uma barra que só servia ao produto de origem: recebia o objeto
 * `FilterState` inteiro, montava os chips lendo `statuses`/`priorities`/`labels`
 * e traduzia prioridade para português na mão. Trocar de domínio era reescrever.
 *
 * Aqui a barra **não sabe o que é um filtro**. Ela recebe chips já formados e
 * slots para os controles. Quem sabe de status e prioridade é a tela; quem sabe
 * de layout, foco e resumo é este arquivo. É a divisão que faz a peça viajar.
 *
 * ── Por que os controles são slots e não props de dados ─────────────────────
 * A tentação é receber `statuses`, `sortOptions`, `viewModes` e renderizar tudo.
 * Aí o primeiro cliente que precisa de um seletor de data no meio da fila força
 * uma prop nova, e em seis meses a barra tem doze props booleanas de arranjo.
 * Slot é a única API que não cresce: `<FilterBar filters={<FilterMenu …/>} />`.
 *
 * ── Detalhes que decidem se a barra é útil ──────────────────────────────────
 *
 * 1. **A contagem só aparece quando filtra.** "48 de 48" é uma linha de texto
 *    para dizer que nada aconteceu. Some quando os números batem.
 * 2. **A contagem é `aria-live="polite"`.** Filtrar é uma mudança que acontece
 *    longe do foco — sem isso, quem usa leitor de tela digita na busca e não
 *    recebe nenhum sinal de que a lista encolheu.
 * 3. **A segunda linha só existe com chips.** Reservar altura para uma fila
 *    vazia faz o conteúdo pular quando o primeiro filtro entra; renderizar
 *    condicionalmente empurra uma vez só, quando há motivo.
 * 4. **A busca ocupa a sobra.** É o controle que recebe texto de tamanho
 *    imprevisível; os outros têm largura de rótulo.
 *
 * Compõe com `sticky-filterbar`, que resolve grudar e condensar e não sabe
 * montar nada: `<StickyFilterbar><FilterBar … /></StickyFilterbar>`.
 */

export interface FilterBarChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Filtros já aplicados. Já vêm formatados: a barra não traduz domínio. */
  chips?: FilterBarChip[];
  search?: React.ReactNode;
  filters?: React.ReactNode;
  sort?: React.ReactNode;
  view?: React.ReactNode;
  extras?: React.ReactNode;
  filteredCount?: number;
  totalCount?: number;
  onClearAll?: () => void;
  clearAllLabel?: string;
  /** `(filtrados, total) => texto`. Trocável para plural, idioma ou substantivo. */
  countLabel?: (filtered: number, total: number) => string;
}

export function FilterBar({
  chips = [],
  search,
  filters,
  sort,
  view,
  extras,
  filteredCount,
  totalCount,
  onClearAll,
  clearAllLabel = "Limpar tudo",
  countLabel = (filtered, total) => `${filtered} de ${total}`,
  className,
  ...props
}: FilterBarProps) {
  // "48 de 48" é ruído: só informa quando os números divergem.
  const showCount =
    typeof filteredCount === "number" &&
    typeof totalCount === "number" &&
    filteredCount !== totalCount;

  const hasChips = chips.length > 0;

  return (
    <div className={cn("flex w-full flex-col gap-2", className)} {...props}>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* A busca recebe texto de tamanho imprevisível — fica com a sobra. */}
        {search ? <div className="min-w-0 flex-1">{search}</div> : null}
        {filters}
        {sort}
        {view}
        {extras}
      </div>

      {hasChips || showCount ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <Chip key={chip.key} pressed onRemove={chip.onRemove} className="px-2.5 py-1 text-xs">
              {chip.label}
            </Chip>
          ))}

          {hasChips && onClearAll ? (
            <button
              type="button"
              onClick={onClearAll}
              className={cn(
                "px-1.5 py-1 text-xs font-semibold text-[var(--muted-foreground)] underline-offset-4",
                "hover:text-[var(--foreground)] hover:underline",
                "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                "rounded-[var(--r-control,0.375rem)]",
              )}
            >
              {clearAllLabel}
            </button>
          ) : null}

          {showCount ? (
            // Filtrar muda a lista longe do foco. Sem `aria-live`, quem usa
            // leitor de tela digita e não recebe sinal nenhum de que encolheu.
            <span
              aria-live="polite"
              className="ml-auto shrink-0 text-xs tabular-nums text-[var(--muted-foreground)]"
            >
              {countLabel(filteredCount as number, totalCount as number)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
