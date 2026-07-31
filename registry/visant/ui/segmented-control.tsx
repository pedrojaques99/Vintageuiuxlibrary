"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label?: string;
  icon?: LucideIcon;
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** "fill" = itens crescem igualmente (com label); "compact" = botões de ícone. */
  variant?: "fill" | "compact";
  className?: string;
  "aria-label"?: string;
}

/**
 * Apple-like segmented control (trilho + pill ativo). Fonte única reusada pelo
 * ViewModeToggle e pelo painel de preferências (densidade / visão padrão).
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  variant = "fill",
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex items-center gap-1 rounded-xl bg-muted/50 p-1", className)}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            aria-label={opt.ariaLabel || opt.label}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-[color,background-color,box-shadow] active:scale-[0.97]",
              variant === "fill" ? "flex-1 px-3 py-1.5" : "h-7 w-8",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {opt.label && <span className="whitespace-nowrap">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
