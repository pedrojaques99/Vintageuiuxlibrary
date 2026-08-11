"use client";

import * as React from "react";
import { Command } from "cmdk";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

/**
 * CommandSearch — a busca ⌘K: gatilho, diálogo, resultado assíncrono.
 *
 * Colhida de um painel onde ela era inseparável do produto: dava `fetch` em
 * `/api/admin/search`, carregava nove rotas `/admin?tab=…` cravadas no arquivo,
 * lia o estado da sidebar e navegava com o router do Next. Servia a um app.
 *
 * Aqui o componente **não busca e não navega**. Ele recebe `onSearch` e chama
 * `onSelect`. É o que permite a mesma peça atender uma API REST, um índice local
 * e um banco vetorial sem tocar neste arquivo — e é o que a faz rodar fora do Next.
 *
 * ── A corrida que a versão original tinha ───────────────────────────────────
 * Duas buscas em voo voltam fora de ordem: "cli" demora 400ms, "cliente" volta em
 * 80ms, e a resposta de "cli" aterrissa **depois** — a lista mostra o resultado da
 * consulta antiga com o texto novo no campo. Ninguém reporta isso como bug; as
 * pessoas concluem que a busca "é ruim".
 *
 * O `seq` resolve: cada disparo carimba um número, e só a resposta do **último**
 * pode escrever no estado. O `AbortController` não bastaria sozinho, porque quem
 * implementa `onSearch` pode nem usar `fetch`.
 *
 * ── Outras decisões ─────────────────────────────────────────────────────────
 * - **Debounce antes do disparo**, não depois: a tecla não pode custar uma volta
 *   de rede.
 * - **`minChars` existe porque uma letra não é uma consulta.** Abaixo do mínimo o
 *   diálogo mostra os atalhos, que é a coisa útil a fazer com a busca vazia.
 * - **Erro é um estado**, não um `console.error`. Sem isso a lista fica em branco
 *   e parece "nada encontrado" — a pessoa reescreve a busca contra um servidor fora.
 * - **`shouldFilter={false}`**: quem filtra é quem tem o índice. Filtrar de novo
 *   aqui esconderia resultado que o servidor achou por sinônimo ou por typo.
 * - O gatilho tem `aria-label` mesmo quando mostra texto: recolhido, ele é só um
 *   ícone, e "button" não é nome acessível.
 */

export interface CommandSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  /** Rótulo curto de categoria. Aparece como selo à direita. */
  type?: string;
  icon?: React.ReactNode;
}

export interface CommandSearchProps {
  onSearch: (query: string, signal: AbortSignal) => Promise<CommandSearchResult[]>;
  onSelect: (result: CommandSearchResult) => void;
  /** Mostrados com a busca vazia — o "acesso rápido". */
  quickLinks?: CommandSearchResult[];
  minChars?: number;
  delay?: number;
  placeholder?: string;
  triggerLabel?: string;
  quickLinksLabel?: string;
  resultsLabel?: string;
  emptyLabel?: string;
  errorLabel?: string;
  /** Só o ícone, sem rótulo nem atalho. Para barras estreitas e sidebar recolhida. */
  compact?: boolean;
  /**
   * Tecla do atalho global, combinada com ⌘/Ctrl. `null` desliga o atalho e
   * deixa só o clique no gatilho.
   *
   * Existe porque o atalho é registrado no `document`: duas instâncias montadas
   * na mesma página disputam o ⌘K e as duas abrem. Acontece de verdade quando um
   * app tem busca no cabeçalho e busca dentro de um painel — e aconteceria nesta
   * própria vitrine, onde montar a demo roubaria o ⌘K de quem só está navegando.
   */
  shortcut?: string | null;
  className?: string;
}

function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" strokeLinecap="round" />
    </svg>
  );
}

export function CommandSearch({
  onSearch,
  onSelect,
  quickLinks = [],
  minChars = 2,
  delay = 300,
  placeholder = "O que você está procurando?",
  triggerLabel = "Buscar",
  quickLinksLabel = "Acesso rápido",
  resultsLabel = "Resultados",
  emptyLabel = "Nenhum resultado encontrado.",
  errorLabel = "Não foi possível buscar agora.",
  compact = false,
  shortcut = "k",
  className,
}: CommandSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<CommandSearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const debounced = useDebounce(query, delay);
  const seq = React.useRef(0);

  React.useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === shortcut.toLowerCase() && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcut]);

  React.useEffect(() => {
    if (!open) return;

    const needle = debounced.trim();
    if (needle.length < minChars) {
      // Sobe o carimbo: uma resposta em voo da consulta anterior não pode
      // repovoar a lista depois que a pessoa apagou o texto.
      seq.current += 1;
      setResults([]);
      setLoading(false);
      setFailed(false);
      return;
    }

    const mine = ++seq.current;
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);

    onSearch(needle, controller.signal)
      .then((found) => {
        if (mine !== seq.current) return; // chegou tarde: manda a antiga embora.
        setResults(found);
      })
      .catch((error) => {
        if (mine !== seq.current || controller.signal.aborted) return;
        // Erro é estado. Em branco a pessoa acha que não existe o que ela procura.
        setFailed(true);
        setResults([]);
        // Sem guarda de ambiente: o registry atravessa Vite, Next e RSC, e cada
        // um expõe `process`/`import.meta.env` de um jeito. Falha de busca é rara
        // o bastante para o log valer em produção também.
        console.error(error);
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });

    return () => controller.abort();
  }, [debounced, open, minChars, onSearch]);

  const choose = (result: CommandSearchResult) => {
    setOpen(false);
    setQuery("");
    onSelect(result);
  };

  const showQuick = query.trim().length < minChars && quickLinks.length > 0;

  const row = (result: CommandSearchResult) => (
    <Command.Item
      key={`${result.type ?? "r"}-${result.id}`}
      value={`${result.id} ${result.title} ${result.subtitle ?? ""}`}
      onSelect={() => choose(result)}
      className={cn(
        "flex cursor-pointer select-none items-center justify-between gap-3",
        "rounded-[var(--r-control,0.375rem)] px-2 py-2 text-sm outline-none",
        "data-[selected=true]:bg-[var(--accent,var(--muted))]",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {result.icon ? <span className="shrink-0 opacity-70">{result.icon}</span> : null}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{result.title}</span>
          {result.subtitle ? (
            <span className="truncate text-xs text-[var(--muted-foreground)]">{result.subtitle}</span>
          ) : null}
        </span>
      </span>
      {result.type ? (
        <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide opacity-60">
          {result.type}
        </span>
      ) : null}
    </Command.Item>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Recolhido este botão é só um ícone: sem nome acessível ele se anuncia
        // como "button" no leitor de tela e no Tab.
        aria-label={shortcut ? `${triggerLabel} (Ctrl+${shortcut.toUpperCase()})` : triggerLabel}
        className={cn(
          "group flex h-[var(--control-h,2.25rem)] items-center",
          "rounded-[var(--r-control,0.5rem)] border border-[var(--border)]",
          "text-[var(--muted-foreground)]",
          "transition-[background-color,border-color,color]",
          "[transition-duration:var(--dur-fast,160ms)]",
          "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
          "hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          compact ? "w-9 justify-center" : "w-full gap-2.5 px-3 text-sm",
          className,
        )}
      >
        <SearchGlyph className="h-3.5 w-3.5 shrink-0" />
        {!compact ? (
          <>
            <span className="truncate">{triggerLabel}</span>
            {/* Anunciar um atalho desligado é pior que não anunciar nenhum. */}
            {shortcut ? (
              <kbd className="pointer-events-none ml-auto hidden select-none items-center gap-0.5 rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] font-bold opacity-70 sm:flex">
                ⌘{shortcut.toUpperCase()}
              </kbd>
            ) : null}
          </>
        ) : null}
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label={triggerLabel}
        // Quem filtra é quem tem o índice — ver o bloco no topo.
        shouldFilter={false}
        className={cn(
          "fixed left-1/2 top-[15vh] z-50 w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2",
          "overflow-hidden rounded-[var(--r-surface,0.75rem)] border border-[var(--border)]",
          "bg-[var(--popover,var(--background))] text-[var(--popover-foreground,var(--foreground))]",
          "[box-shadow:var(--e-modal,0_24px_64px_-16px_rgb(0_0_0/0.45))]",
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4">
          <SearchGlyph className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder={placeholder}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
          />
          {loading ? (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)] motion-reduce:animate-none"
            />
          ) : null}
        </div>

        <Command.List className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
          {showQuick ? (
            <Command.Group
              heading={quickLinksLabel}
              className={cn(
                "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5",
                "[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold",
                "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em]",
                "[&_[cmdk-group-heading]]:text-[var(--muted-foreground)]",
              )}
            >
              {quickLinks.map(row)}
            </Command.Group>
          ) : null}

          {results.length > 0 ? (
            <Command.Group
              heading={resultsLabel}
              className={cn(
                "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5",
                "[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold",
                "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em]",
                "[&_[cmdk-group-heading]]:text-[var(--muted-foreground)]",
              )}
            >
              {results.map(row)}
            </Command.Group>
          ) : null}

          {failed ? (
            <p className="px-2 py-8 text-center text-sm text-[var(--destructive)]">{errorLabel}</p>
          ) : null}

          {!failed && !loading && !showQuick && results.length === 0 && query.trim().length >= minChars ? (
            <p className="px-2 py-8 text-center text-sm text-[var(--muted-foreground)]">{emptyLabel}</p>
          ) : null}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
