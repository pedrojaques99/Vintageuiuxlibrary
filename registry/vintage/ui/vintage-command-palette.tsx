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
    list.map((item, i) => {
      const globalIndex = filtered.indexOf(item);
      return (
        <div
          key={item.id}
          onClick={() => handleSelect(item.id)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
            globalIndex === selectedIndex
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
        </div>
      );
    });

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh]",
        className
      )}
      style={{
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[480px] max-h-[70vh] flex flex-col overflow-hidden rounded-2xl border border-[var(--vintage-border)]"
        style={{
          background:
            "linear-gradient(160deg, var(--vintage-surface-2), var(--vintage-surface-1))",
          boxShadow:
            "0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05)",
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
            className="flex-1 bg-transparent border-none outline-none text-[var(--vintage-label)] text-base"
            style={{ fontFamily: "var(--font-vintage-body)" }}
          />
          <kbd className="text-xs text-[var(--vintage-text-dim)] bg-[var(--vintage-surface-3)] px-1.5 py-0.5 rounded border border-[var(--vintage-border)]">
            ESC
          </kbd>
        </div>

        {/* Items */}
        <div className="overflow-y-auto flex-1 min-h-0 p-2">
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
                  <div key={group.label}>
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
