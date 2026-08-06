"use client";

/**
 * O botão de copiar comando — um só, em duas roupas.
 *
 * Existiam três implementações desta mesma coisa (card do catálogo, ficha de
 * foco, studio de marca), cada uma com seu próprio `setTimeout` de confirmação e
 * seu próprio jeito de escrever "copiado". Divergiam no detalhe que mais importa:
 * quanto tempo o check fica na tela. Agora é um componente com `variant`.
 */

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Quanto tempo o "copiado" permanece. Curto o bastante para não virar estado. */
const CONFIRM_MS = 1400;

export function useCopy(text: string) {
  const [done, setDone] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const copy = React.useCallback(() => {
    void navigator.clipboard.writeText(text);
    setDone(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), CONFIRM_MS);
  }, [text]);

  return { done, copy };
}

export function CopyCommand({
  text,
  variant = "line",
  className,
  onClick,
}: {
  text: string;
  /** `line` mostra o comando inteiro; `chip` só o gesto, para dentro de um card. */
  variant?: "line" | "chip";
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { done, copy } = useCopy(text);
  const Icon = done ? Check : Copy;

  return (
    <button
      type="button"
      title={text}
      aria-label={`Copiar: ${text}`}
      onClick={(e) => {
        // Dentro de um card clicável, copiar não deve também abrir o item.
        e.stopPropagation();
        onClick?.(e);
        copy();
      }}
      className={cn(
        "group flex items-center gap-2 rounded-[var(--r-control,0.5rem)] border border-border text-left",
        "transition-[color,background-color,border-color,transform] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
        "active:scale-[0.98] active:[transition-duration:var(--dur-press)] motion-reduce:active:scale-100",
        "hover:border-[var(--brand)]",
        // Confirmar é uma mudança de ESTADO, não um ícone que troca sozinho: a
        // borda acende junto para o "copiado" ser visto sem olhar para o ícone.
        done && "border-[var(--brand)]",
        variant === "line"
          ? "w-full bg-card px-3 py-2"
          : "shrink-0 px-2 py-1 font-mono text-micro text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {variant === "line" ? (
        <code className="min-w-0 flex-1 truncate font-mono text-rotulo text-muted-foreground">
          {text}
        </code>
      ) : null}
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          variant === "chip" && "h-3 w-3",
          done ? "text-[var(--brand)]" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      {variant === "chip" ? <span>{done ? "copiado" : "add"}</span> : null}
    </button>
  );
}
