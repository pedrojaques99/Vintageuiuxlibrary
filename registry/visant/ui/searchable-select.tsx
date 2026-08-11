"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { cn } from "@/lib/utils";

/**
 * SearchableSelect — combobox com busca, grupos e criação no lugar.
 *
 * ── Por que Popover + cmdk, e não um Select ─────────────────────────────────
 * A primeira versão era um Radix Select com um `<input>` enfiado no conteúdo. Não
 * dava para digitar: o Select é dono do typeahead por teclado e do foco itinerante,
 * e puxava o foco do campo a cada tecla. Dentro de um Dialog quebrava de vez.
 * Popover + cmdk é o padrão canônico e digita em qualquer lugar.
 *
 * ── `modal` no Popover não é opcional ───────────────────────────────────────
 * Quando este combobox vive dentro de um Dialog, o `PopoverContent` sai do DOM do
 * Dialog por portal — e o focus-trap do Dialog continua mandando, roubando o foco
 * de volta do campo de busca. `modal` pausa esse escopo enquanto o popover está
 * aberto. Fora de Dialog, é inofensivo. Tirar essa prop reintroduz um bug que só
 * aparece dentro de modal, que é o pior lugar para descobrir.
 *
 * ── A busca tem uma fonte de verdade só ─────────────────────────────────────
 * `shouldFilter={false}`: o cmdk não filtra, quem filtra é a função `matches`.
 * Precisa ser assim porque a busca casa contra três coisas — o rótulo, os
 * `keywords` **ocultos** da opção e o nome do grupo. Um cliente digita "Construir
 * Aí" e acha a tarefa cujo título não tem o nome do cliente. Deixar o cmdk filtrar
 * em paralelo criaria dois critérios discordando na mesma lista.
 *
 * ── `onCreate` fica no fim e aparece mesmo com resultados ───────────────────
 * "Achei parecido" não é "achei". O `+ Criar "…"` do Notion/Linear vive embaixo da
 * lista sempre que há texto. Quando a criação **falha**, `onCreate` devolve `null`
 * e o popover **fica aberto com o texto intacto** — refazer é uma tecla, não
 * redigitar tudo. O combobox não conhece rota nem mensagem de erro: quem chamou dá
 * o recado.
 *
 * Nenhuma string de interface é fixa: tudo é prop, porque o registry atravessa
 * marcas e idiomas.
 */

export interface SearchableOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /**
   * Termos que a busca considera mas que NÃO aparecem no rótulo — ex.: o nome do
   * cliente de uma tarefa. Deixa "grepar" por algo que está fora da tela.
   */
  keywords?: string;
}

export interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options?: SearchableOption[];
  groups?: Array<{ label: string; options: SearchableOption[] }>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  noResultsLabel?: string;
  /** Valor sentinela do item "nenhum". Trocável se colidir com um valor real. */
  noneValue?: string;
  /** Esconde o item "nenhum" — use quando toda opção real já é um valor válido. */
  hideEmptyOption?: boolean;
  /** Seleciona sozinho quando sobra exatamente uma opção. Para edição em célula. */
  autoSelect?: boolean;
  /** Cria de verdade a partir do texto buscado. `null` = falhou, popover fica aberto. */
  onCreate?: (label: string) => Promise<string | null>;
  /** Substantivo do que se cria: "task", "projeto", "cliente". */
  createEntityLabel?: string;
  createLabel?: string;
  creatingLabel?: string;
  /** "trailing" (padrão) é selo esmaecido; "leading" é para avatar e thumbnail. */
  iconPosition?: "leading" | "trailing";
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const itemClass = cn(
  "flex cursor-pointer select-none items-center gap-2 rounded-[var(--r-control,0.375rem)]",
  "px-2 py-1.5 text-sm outline-none",
  "data-[selected=true]:bg-[var(--accent,var(--muted))]",
  "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
);

export function SearchableSelect({
  value,
  onValueChange,
  options,
  groups,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyLabel = "Nenhum",
  noResultsLabel = "Nenhum resultado encontrado",
  noneValue = "__none__",
  hideEmptyOption = false,
  autoSelect = false,
  onCreate,
  createEntityLabel,
  createLabel = "Criar",
  creatingLabel = "Criando",
  iconPosition = "trailing",
  onOpenChange,
  disabled,
  className,
}: SearchableSelectProps) {
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const allOptions = React.useMemo<SearchableOption[]>(
    () => (groups ? groups.flatMap((g) => g.options) : options ?? []),
    [options, groups],
  );

  const selectedLabel = React.useMemo(() => {
    if (!value || value === noneValue) return "";
    return allOptions.find((o) => o.value === value)?.label ?? value;
  }, [allOptions, value, noneValue]);

  const filteredGroups = React.useMemo(() => {
    const needle = search.toLowerCase().trim();

    // Fonte única do que a busca enxerga: rótulo + keywords ocultos + nome do grupo.
    const matches = (opt: SearchableOption, extra?: string) =>
      `${opt.label} ${opt.keywords ?? ""} ${extra ?? ""}`.toLowerCase().includes(needle);

    if (groups) {
      if (!needle) return groups;
      return groups
        .map((group) => ({ ...group, options: group.options.filter((o) => matches(o, group.label)) }))
        .filter((group) => group.options.length > 0);
    }

    if (options) {
      if (!needle) return [{ label: "", options }];
      const hit = options.filter((o) => matches(o));
      return hit.length > 0 ? [{ label: "", options: hit }] : [];
    }

    return [];
  }, [options, groups, search]);

  const visibleCount = React.useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.options.length, 0),
    [filteredGroups],
  );

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) setSearch("");
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const select = React.useCallback(
    (v: string) => {
      onValueChange(v);
      handleOpenChange(false);
    },
    [onValueChange, handleOpenChange],
  );

  const handleCreate = React.useCallback(async () => {
    const label = search.trim();
    if (!label || !onCreate || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(label);
      // Falhou: popover aberto, texto intacto. Refazer é uma tecla.
      if (created) select(created);
    } finally {
      setCreating(false);
    }
  }, [search, onCreate, creating, select]);

  // Sobrou uma: escolhe sozinha. É o que faz a edição em célula ser uma digitada.
  React.useEffect(() => {
    if (!autoSelect || !open || visibleCount !== 1) return;
    const only = filteredGroups.find((g) => g.options.length > 0)?.options[0];
    if (only && only.value !== value) select(only.value);
  }, [filteredGroups, visibleCount, autoSelect, open, value, select]);

  const showCreate = Boolean(onCreate && search.trim());

  return (
    // `modal`: ver o bloco no topo. Não remova.
    <Popover.Root open={open} onOpenChange={handleOpenChange} modal>
      <Popover.Trigger
        disabled={disabled}
        aria-haspopup="listbox"
        className={cn(
          "flex h-[var(--control-h,2.5rem)] w-full items-center justify-between gap-2",
          "rounded-[var(--r-control,0.5rem)] border border-[var(--input,var(--border))]",
          "bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className={cn("line-clamp-1 text-left", !selectedLabel && "text-[var(--muted-foreground)]")}>
          {selectedLabel || placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 opacity-50"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className={cn(
            "z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden p-0",
            "rounded-[var(--r-surface,0.625rem)] border border-[var(--border)]",
            "bg-[var(--popover,var(--background))] text-[var(--popover-foreground,var(--foreground))]",
            "[box-shadow:var(--e-overlay,0_12px_32px_-12px_rgb(0_0_0/0.35))]",
          )}
        >
          {/* Quem filtra é `matches`, acima. Duas fontes discordariam. */}
          <Command shouldFilter={false}>
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-3">
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]"
              >
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5L14 14" strokeLinecap="round" />
              </svg>
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder={searchPlaceholder}
                className={cn(
                  "h-10 w-full bg-transparent text-sm outline-none",
                  "placeholder:text-[var(--muted-foreground)]",
                )}
              />
            </div>

            <Command.List className="max-h-[min(18.75rem,var(--radix-popover-content-available-height))] overflow-y-auto p-1">
              {!hideEmptyOption ? (
                <Command.Item value={noneValue} onSelect={() => select(noneValue)} className={cn(itemClass, "italic text-[var(--muted-foreground)]")}>
                  {emptyLabel}
                </Command.Item>
              ) : null}

              {filteredGroups.map((group, index) => (
                <Command.Group
                  key={group.label || index}
                  heading={group.label || undefined}
                  className={cn(
                    "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5",
                    "[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold",
                    "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em]",
                    "[&_[cmdk-group-heading]]:text-[var(--muted-foreground)]",
                  )}
                >
                  {group.options.map((option) => (
                    <Command.Item key={option.value} value={option.value} onSelect={() => select(option.value)} className={itemClass}>
                      {option.icon && iconPosition === "leading" ? (
                        <span className="flex shrink-0 items-center">{option.icon}</span>
                      ) : null}
                      <span className="min-w-0 truncate">{option.label}</span>
                      {option.icon && iconPosition === "trailing" ? (
                        <span className="ml-auto opacity-50">{option.icon}</span>
                      ) : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}

              {/* Vazio só é vazio quando não há saída oferecida abaixo. */}
              {visibleCount === 0 && !showCreate ? (
                <p className="px-2 py-6 text-center text-sm text-[var(--muted-foreground)]">
                  {noResultsLabel}
                </p>
              ) : null}

              {showCreate ? (
                <Command.Group>
                  <Command.Item
                    value={`__create__${search}`}
                    disabled={creating}
                    onSelect={handleCreate}
                    className={itemClass}
                  >
                    <span aria-hidden="true" className={cn("shrink-0 text-base leading-none", creating && "animate-pulse")}>
                      +
                    </span>
                    <span className="min-w-0 truncate">
                      {creating ? creatingLabel : createLabel}
                      {createEntityLabel ? ` ${createEntityLabel}` : ""} “{search.trim()}”
                    </span>
                  </Command.Item>
                </Command.Group>
              ) : null}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
