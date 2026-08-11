"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * FilterMenu — o menu de facetas atrás de um gatilho, com contagem.
 *
 * Colhido de uma tela de demandas onde o menu sabia demais: conhecia o tipo
 * `FilterState`, a tabela de prioridades 0–4 em português e um `dateFilter.range`
 * com quatro janelas fixas. Funcionava num produto e em nenhum outro.
 *
 * Aqui o menu não sabe o que é status, prioridade ou período — só sabe desenhar
 * **grupos de opções**. O domínio entra por `groups`, e por isso a mesma peça
 * serve uma loja, um CRM e um board.
 *
 * ── Decisões que não são cosméticas ─────────────────────────────────────────
 *
 * 1. **O contador conta GRUPOS, não opções.** Três status marcados são um eixo
 *    de filtragem, não três. Contar opções faz o selo dizer "7" e não informar
 *    nada sobre o quanto a lista foi estreitada.
 * 2. **`mode: "single"` vira `RadioGroup` de verdade**, não um checkbox que se
 *    comporta como rádio. Um período é excludente; anunciá-lo como caixa de
 *    marcar faz o leitor de tela prometer múltipla escolha que a UI não cumpre.
 * 3. **`dot` é cor do DADO, não do componente.** A bolinha do status vem da API
 *    e entra por `style`. Nenhum hexadecimal mora neste arquivo — é o que deixa
 *    o menu passar no portão de cor do registry e trocar de marca sem tocar aqui.
 * 4. **"Limpar" só existe quando há o que limpar.** Uma ação permanentemente
 *    desabilitada é ruído que ensina a ignorar aquele canto do menu.
 *
 * Estado vazio: sem `groups` com opções, o menu abre dizendo que não há filtro —
 * em vez de uma caixa vazia que parece bug.
 */

export interface FilterOption {
  id: string;
  label: string;
  /** Cor vinda do dado (status, etiqueta). Renderiza uma bolinha antes do rótulo. */
  dot?: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  /** `multi` (padrão) marca várias; `single` é excludente. */
  mode?: "multi" | "single";
  options: FilterOption[];
}

export interface FilterMenuProps {
  groups: FilterGroup[];
  /** Por chave de grupo, os `id` marcados. Em `single`, use array de um item. */
  selected: Record<string, string[]>;
  onToggle: (groupKey: string, optionId: string) => void;
  onClear?: () => void;
  label?: string;
  clearLabel?: string;
  emptyLabel?: string;
  align?: "start" | "center" | "end";
  className?: string;
}

const itemClass = cn(
  "relative flex cursor-pointer select-none items-center gap-2 rounded-[var(--r-control,0.375rem)]",
  "py-1.5 pl-7 pr-2 text-sm outline-none",
  "text-[var(--popover-foreground,var(--foreground))]",
  "data-[highlighted]:bg-[var(--accent,var(--muted))]",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
);

function Tick() {
  return (
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenu.ItemIndicator>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="M2 6.5l2.5 2.5L10 3.5" />
        </svg>
      </DropdownMenu.ItemIndicator>
    </span>
  );
}

function Dot({ color }: { color?: string }) {
  if (!color) return null;
  // Cor do dado, não do componente. Ver o bloco de decisões.
  return (
    <span
      aria-hidden="true"
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

export function FilterMenu({
  groups,
  selected,
  onToggle,
  onClear,
  label = "Filtros",
  clearLabel = "Limpar filtros",
  emptyLabel = "Nada para filtrar aqui.",
  align = "end",
  className,
}: FilterMenuProps) {
  // Grupos, não opções: três status marcados são UM eixo de filtragem.
  const activeGroups = groups.filter((g) => (selected[g.key]?.length ?? 0) > 0).length;
  const usable = groups.filter((g) => g.options.length > 0);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "inline-flex h-[var(--control-h,2.25rem)] shrink-0 items-center gap-2",
          "rounded-[var(--r-control,0.5rem)] border border-[var(--border)] px-3",
          "text-sm font-medium text-[var(--foreground)]",
          "transition-[background-color,border-color]",
          "[transition-duration:var(--dur-fast,160ms)]",
          "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
          "hover:bg-[var(--muted)]",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          className,
        )}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="h-3.5 w-3.5"
        >
          <path d="M2 4h12M4.5 8h7M7 12h2" />
        </svg>
        <span>{label}</span>
        {activeGroups > 0 ? (
          <span
            className={cn(
              "ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5",
              "bg-[var(--foreground)] text-[11px] font-bold tabular-nums text-[var(--background)]",
            )}
          >
            {activeGroups}
          </span>
        ) : null}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            "z-50 max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))]",
            "w-60 overflow-y-auto p-1",
            "rounded-[var(--r-surface,0.625rem)] border border-[var(--border)]",
            "bg-[var(--popover,var(--background))] text-[var(--popover-foreground,var(--foreground))]",
            "[box-shadow:var(--e-overlay,0_12px_32px_-12px_rgb(0_0_0/0.35))]",
          )}
        >
          {usable.length === 0 ? (
            // Estado vazio nomeado: caixa em branco parece defeito.
            <p className="px-2 py-6 text-center text-sm text-[var(--muted-foreground)]">
              {emptyLabel}
            </p>
          ) : null}

          {usable.map((group, index) => {
            const marked = selected[group.key] ?? [];
            return (
              <React.Fragment key={group.key}>
                {index > 0 ? (
                  <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
                ) : null}
                <DropdownMenu.Label className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                  {group.label}
                </DropdownMenu.Label>

                {group.mode === "single" ? (
                  <DropdownMenu.RadioGroup
                    value={marked[0] ?? ""}
                    onValueChange={(id) => onToggle(group.key, id)}
                  >
                    {group.options.map((option) => (
                      <DropdownMenu.RadioItem
                        key={option.id}
                        value={option.id}
                        onSelect={(event) => event.preventDefault()}
                        className={itemClass}
                      >
                        <Tick />
                        <Dot color={option.dot} />
                        <span className="min-w-0 truncate">{option.label}</span>
                      </DropdownMenu.RadioItem>
                    ))}
                  </DropdownMenu.RadioGroup>
                ) : (
                  group.options.map((option) => (
                    <DropdownMenu.CheckboxItem
                      key={option.id}
                      checked={marked.includes(option.id)}
                      // Sem isto o menu fecha a cada marcação, e marcar três
                      // status vira três aberturas.
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={() => onToggle(group.key, option.id)}
                      className={itemClass}
                    >
                      <Tick />
                      <Dot color={option.dot} />
                      <span className="min-w-0 truncate">{option.label}</span>
                    </DropdownMenu.CheckboxItem>
                  ))
                )}
              </React.Fragment>
            );
          })}

          {/* Ação permanentemente desabilitada ensina a ignorar o canto do menu. */}
          {onClear && activeGroups > 0 ? (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
              <DropdownMenu.Item
                onSelect={() => onClear()}
                className={cn(itemClass, "pl-2 text-[var(--destructive)]")}
              >
                {clearLabel}
              </DropdownMenu.Item>
            </>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
