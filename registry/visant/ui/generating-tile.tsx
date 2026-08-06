"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { StatusTicker } from "@/components/ui/status-ticker";
import { TurbulenceField } from "@/components/ui/turbulence-field";
import { WorkingGlyph } from "@/components/ui/working-glyph";

/**
 * A superfície canônica de "isto está sendo gerado".
 *
 * Compõe as três peças (névoa + glifo + ticker) numa só, porque a alternativa
 * já foi testada e falhou: quatro telas do mesmo produto montaram esse mesmo
 * card por conta própria, cada uma com um espaçamento e um conjunto de verbos
 * diferente. Estado de espera é onde a inconsistência mais aparece, justamente
 * porque o usuário fica olhando.
 *
 * Não sabe de onde vem o dado: `isLoading` e `steps` entram por prop, e o
 * conteúdo pronto entra como `children`. Sem `fetch`, sem i18n embutido — os
 * verbos são a voz de cada marca.
 *
 * Variantes:
 *  - `tile`    → tile com aspect-ratio próprio (grades de resultado, chat)
 *  - `inline`  → coluna compacta; a moldura é do pai (nós de canvas)
 *  - `overlay` → painel flutuante sobre backdrop (editor, studio)
 */
type Variant = "tile" | "inline" | "overlay";
type Aspect = "1/1" | "16/9" | "4/3";

const ASPECT: Record<Aspect, string> = {
  "1/1": "aspect-square",
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
};

export function GeneratingTile({
  isLoading,
  variant = "tile",
  aspectRatio,
  steps,
  onCancel,
  showFrame = true,
  intensity = 0.18,
  children,
  className,
}: {
  isLoading: boolean;
  variant?: Variant;
  aspectRatio?: Aspect;
  /** Verbos rotativos do ticker. A voz da marca entra aqui. */
  steps?: readonly string[];
  /** Cancelar discreto — só faz sentido em `overlay`. */
  onCancel?: () => void;
  /** false quando o pai já dá a moldura/aspecto. */
  showFrame?: boolean;
  /** Opacidade da névoa (0–1). */
  intensity?: number;
  /** Renderizado quando `isLoading` é false (o resultado). */
  children?: React.ReactNode;
  className?: string;
}) {
  if (!isLoading) return <>{children ?? null}</>;

  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-background/40" />
        <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[var(--r-surface)] border border-border bg-card/80 p-6 backdrop-blur-xl">
          <TurbulenceField intensity={intensity} />
          <WorkingGlyph size={28} className="relative z-10" />
          <StatusTicker steps={steps} className="relative z-10" />
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="relative z-10 mt-1 rounded-[var(--r-control)] border border-border px-3 py-1 font-mono text-[10px] text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] ease-[var(--ease-out)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden",
          className,
        )}
      >
        <TurbulenceField intensity={intensity} />
        <WorkingGlyph className="relative z-10" />
        <StatusTicker steps={steps} className="relative z-10 justify-center" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--r-surface)]",
        showFrame && "border border-border bg-card",
        aspectRatio && ASPECT[aspectRatio],
        className,
      )}
    >
      <TurbulenceField intensity={intensity} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <WorkingGlyph />
      </div>
      {/* ticker ancorado embaixo: o glifo fica no centro óptico, o texto não briga */}
      <div className="absolute bottom-4 left-1/2 w-[85%] max-w-[240px] -translate-x-1/2">
        <StatusTicker steps={steps} />
      </div>
    </div>
  );
}
