"use client";

/**
 * Os dois primitivos da casca que mais se repetem.
 *
 * A casa tem três tipos de controle, e só três: a palavra (filtro, seção, aba),
 * o ícone (ação sem rótulo) e o comando (o destaque único, em `copy-command`).
 * Os dois primeiros moram aqui porque a grade, os kits e a ficha usam os
 * mesmos — e cada tela desenhando o seu foi como a vitrine chegou a ter chip,
 * pílula, segmentado e botão contornado fazendo a mesma coisa.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Uma palavra que liga e desliga: tom cheio quando ativa, tom de apoio quando
 * não. Sem fundo, sem borda. A contagem, quando há, vai colada no tom mais baixo.
 */
export function Aba({
  ativa,
  onClick,
  children,
  count,
  className,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={cn(
        "flex shrink-0 items-baseline gap-1.5 rounded-control py-1 text-casa-base transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
        ativa ? "text-casa-fg" : "text-casa-fg-2 hover:text-casa-fg",
        className,
      )}
    >
      {children}
      {count !== undefined ? (
        <span className="text-casa-sm tabular-nums text-casa-fg-3">{count}</span>
      ) : null}
    </button>
  );
}

/** Ação sem rótulo: o `title` diz o que faz, o tom diz o estado. */
export function Icone({
  rotulo,
  onClick,
  ativo,
  children,
  className,
}: {
  rotulo: string;
  onClick: () => void;
  ativo?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={ativo}
      className={cn("casa-icone alvo-toque", className)}
    >
      {children}
    </button>
  );
}
