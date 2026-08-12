"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  label: string;
  icon?: string;
  group?: string;
  active?: boolean;
  description?: string;
}

export interface CommandGroup {
  label: string;
  ids: string[];
}

/**
 * VintageCommandPalette — a paleta de comandos no vocabulário do painel.
 *
 * O que estava quebrado, e por quê ("mt pequeno e não dá pra clicar"):
 *
 * 1. **A linha era um `<div onClick>`.** Div não recebe foco, não responde a
 *    Enter, não aparece pro leitor de tela e não tem estado pressionado. A
 *    navegação por seta existia, mas quem tentasse chegar na lista pelo Tab
 *    caía direto no fim do documento. Agora cada linha é `<button>` dentro de um
 *    `listbox`, com `aria-selected` seguindo a seta.
 * 2. **A linha tinha ~40px de altura.** O piso de alvo de toque é 44. Quarenta
 *    px é o tamanho em que o dedo erra a linha vizinha — e errar comando é pior
 *    do que não achar.
 * 3. **O painel tinha 480px CRAVADOS.** Num celular de 390 ele sangrava 45px de
 *    cada lado: metade do rótulo e o selo de ON/OFF ficavam fora da tela. Agora
 *    é `min(480px, 100vw - 2rem)`.
 * 4. **A seta andava mas a lista não.** Descer além da dobra selecionava um item
 *    invisível. O item selecionado agora se traz pra vista.
 *
 * O `backdrop-blur` fica: isto é diálogo modal, que é a exceção da regra.
 */
interface VintageCommandPaletteProps {
  items: CommandItem[];
  groups?: CommandGroup[];
  onSelect: (id: string) => void;
  onClose: () => void;
  placeholder?: string;
  className?: string;
}

export function VintageCommandPalette({
  items,
  groups,
  onSelect,
  onClose,
  placeholder = "Search...",
  className,
}: VintageCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const q = query.toLowerCase();
  const filtered = items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.icon?.includes(q) ||
      item.description?.toLowerCase().includes(q)
  );

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex].id);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const renderItems = (list: CommandItem[]) =>
    list.map((item) => {
      const globalIndex = filtered.indexOf(item);
      const selecionado = globalIndex === selectedIndex;
      return (
        <button
          key={item.id}
          id={`vcp-${item.id}`}
          type="button"
          role="option"
          aria-selected={selecionado}
          // Fora do Tab de propósito: quem manda na lista é a seta, e o foco
          // fica no campo de busca. Botão tabulável aqui tiraria o foco do
          // input e a seta pararia de funcionar no meio da navegação.
          tabIndex={-1}
          // A linha selecionada se traz pra vista: sem isto a seta descia além
          // da dobra e a pessoa escolhia um comando que não estava na tela.
          ref={(el) => {
            if (el && selecionado) el.scrollIntoView({ block: "nearest" });
          }}
          onClick={() => handleSelect(item.id)}
          className={cn(
            // `min-h-11` = 44px, o piso de alvo de toque. Antes eram ~40px de
            // `py-2.5`, que é onde o dedo acerta a linha de cima.
            "flex w-full min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-left",
            "cursor-pointer transition-colors",
            "[transition-duration:var(--dur-fast,160ms)]",
            selecionado
              ? "bg-[var(--vintage-surface-3)]"
              : "hover:bg-[var(--vintage-surface-2)]",
            item.active && "bg-[var(--vintage-accent)]/10"
          )}
        >
          {item.icon && (
            <span className="text-lg w-7 text-center shrink-0">
              {item.icon}
            </span>
          )}
          <span
            className={cn(
              "flex-1 text-sm",
              item.active
                ? "text-[var(--vintage-value)] font-semibold"
                : "text-[var(--vintage-text-muted)]"
            )}
          >
            {item.label}
          </span>
          {item.active !== undefined && (
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                item.active
                  ? "bg-[var(--vintage-meter-green)]/15 text-[var(--vintage-meter-green)]"
                  : "bg-[var(--vintage-surface-3)] text-[var(--vintage-text-dim)]"
              )}
            >
              {item.active ? "ON" : "OFF"}
            </span>
          )}
        </button>
      );
    });

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-start justify-center",
        // `10vh` de topo num celular deitado é quase toda a tela; o piso de 2rem
        // é o que mantém a paleta acima da dobra em qualquer altura.
        "px-4 pb-4 pt-[max(2rem,10vh)]",
        className
      )}
      style={{
        // Token, não `rgba` cru: o véu tem de escurecer o painel da casa, e o
        // painel muda de tom por tema.
        background: "color-mix(in srgb, var(--vintage-surface-1) 82%, transparent)",
        // Exceção declarada à regra do backdrop-blur: isto é diálogo modal, que
        // é justamente onde o desfoque paga o próprio custo de composição.
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        onMouseDown={(e) => e.stopPropagation()}
        // Largura natural de 480, teto na tela: era `w-[480px]` cravado e num
        // celular de 390 o painel sangrava 45px de cada lado.
        className="flex max-h-[70vh] w-[min(480px,100%)] flex-col overflow-hidden rounded-2xl border border-[var(--vintage-border)]"
        style={{
          background:
            "linear-gradient(160deg, var(--vintage-surface-2), var(--vintage-surface-1))",
          boxShadow:
            "0 40px 120px color-mix(in srgb, var(--vintage-surface-1) 90%, transparent), 0 0 0 1px color-mix(in srgb, var(--vintage-label) 8%, transparent)",
        }}
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--vintage-border)]">
          <svg
            className="w-5 h-5 text-[var(--vintage-text-dim)] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-expanded
            aria-controls="vcp-lista"
            aria-activedescendant={filtered[selectedIndex] ? `vcp-${filtered[selectedIndex].id}` : undefined}
            className="flex-1 bg-transparent border-none outline-none text-[var(--vintage-label)] text-base"
            style={{ fontFamily: "var(--font-vintage-body)" }}
          />
          <kbd className="text-xs text-[var(--vintage-text-dim)] bg-[var(--vintage-surface-3)] px-1.5 py-0.5 rounded border border-[var(--vintage-border)]">
            ESC
          </kbd>
        </div>

        {/* Items */}
        <div
          id="vcp-lista"
          role="listbox"
          aria-label="Comandos"
          className="overflow-y-auto flex-1 min-h-0 p-2"
        >
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-[var(--vintage-text-dim)]">
              No results found
            </div>
          )}

          {!q && groups
            ? groups.map((group) => {
                const groupItems = group.ids
                  .map((id) => filtered.find((item) => item.id === id))
                  .filter(Boolean) as CommandItem[];
                if (groupItems.length === 0) return null;
                return (
                  <div key={group.label} role="group" aria-label={group.label}>
                    <div
                      className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--vintage-text-dim)]"
                      style={{ fontFamily: "var(--font-vintage-mono)" }}
                    >
                      {group.label}
                    </div>
                    {renderItems(groupItems)}
                  </div>
                );
              })
            : renderItems(filtered)}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--vintage-border)] flex gap-4 flex-wrap">
          {[
            ["↑↓", "navigate"],
            ["↵", "select"],
            ["ESC", "close"],
          ].map(([key, label]) => (
            <span
              key={key}
              className="text-[10px] text-[var(--vintage-text-dim)]"
            >
              <kbd className="bg-[var(--vintage-surface-3)] border border-[var(--vintage-border)] rounded px-1 mr-1">
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
