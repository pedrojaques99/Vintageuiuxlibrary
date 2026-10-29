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
  /**
   * `cta` é o destaque único da tela (o comando de instalar); `line` mostra o
   * comando num campo neutro; `chip` é só o ícone, para uma linha de lista.
   */
  variant?: "cta" | "line" | "chip";
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { done, copy } = useCopy(text);
  const Icon = done ? Check : Copy;

  return (
    <button
      type="button"
      title={text}
      aria-label={done ? "Copiado" : `Copiar: ${text}`}
      onClick={(e) => {
        // Dentro de um card clicável, copiar não deve também abrir o item.
        e.stopPropagation();
        onClick?.(e);
        copy();
      }}
      className={cn(
        "alvo-toque group flex items-center text-left outline-none",
        "transition-[color,background-color,opacity] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
        variant === "cta" &&
          "h-10 w-full gap-3 rounded-control bg-casa-cta px-3.5 text-casa-cta-fg hover:opacity-90",
        variant === "line" &&
          "h-10 w-full gap-3 rounded-control bg-casa-tile-2 px-3.5 text-casa-fg-2 hover:text-casa-fg",
        // O `flex` da base (camada utilities) vence o `inline-grid` + `place-items`
        // do `.casa-icone` (camada components): sem o `justify-center` o ícone
        // encostava na esquerda do quadrado.
        variant === "chip" && "casa-icone shrink-0 justify-center",
        className,
      )}
    >
      {variant === "chip" ? null : (
        <code className="min-w-0 flex-1 truncate font-casa-mono text-casa-sm">{text}</code>
      )}
      <Icon className="h-4 w-4 shrink-0" />
    </button>
  );
}
