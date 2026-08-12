"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Measure Bar — nenhum número sem régua.
 *
 * A regra que a skill `visant-refine` põe em primeiro lugar, e que quase toda
 * dobra de prova quebra: **valor sem qualificador é trivia, e valor sem
 * evidência não tem contra o quê ser lido.** "R$450k" não diz nada; "R$450k, em
 * 14 meses, de uma meta de 600k" diz.
 *
 * Os quatro papéis, sempre nesta ordem visual, porque a ordem é o argumento:
 *
 * ```
 * valor  →  qualificador  →  evidência (a régua)  →  rótulo
 * ```
 *
 * ── A decisão que o componente força, e é o valor dele ─────────────────────
 *
 * `ratio` é **obrigatoriamente explícito ou ausente**. Não existe default 1, e
 * não existe régua derivada do valor. Se você não tem denominador honesto, a
 * régua não desenha — e é isso que está certo:
 *
 * · Um número com `+` ("200+ na comunidade") é **piso**, não proporção. Barra
 *   proporcional representaria mal o número por definição.
 * · Uma barra em zero afirma "zero de N", que é um fato — e afirmar um fato que
 *   ninguém mediu é pior que não desenhar nada.
 *
 * Por isso existe `state="unknown"`: a trilha vira tracejado em vez de sumir. A
 * ausência fica **desenhada**, e quem olha entende que o dado não chegou, em
 * vez de ler zero.
 *
 * A régua cresce de `scaleX(0)` na entrada, mas o estado de repouso — sem JS,
 * sem observer, sem hidratação — é a régua CHEIA. Esconder a evidência pra
 * sempre porque um script não rodou é o modo de falha caro.
 */

export interface MeasureBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** O número, já formatado. Combina com `@visant/count-up` como children. */
  value: React.ReactNode;
  /** O qualificador que transforma trivia em fato. "em 14 meses", "de 600k". */
  qualifier?: React.ReactNode;
  /** Nome do que está sendo medido. */
  label?: React.ReactNode;
  /**
   * 0–1. **Sem default de propósito.** Omitir não desenha régua; é a saída
   * honesta pra número que é piso, não proporção.
   */
  ratio?: number;
  /** `unknown` desenha a trilha tracejada: o dado não chegou, e isso se vê. */
  state?: "ok" | "unknown";
  align?: "start" | "center";
}

export function MeasureBar({
  value,
  qualifier,
  label,
  ratio,
  state = "ok",
  align = "start",
  className,
  ...props
}: MeasureBarProps) {
  const temRegua = state === "unknown" || typeof ratio === "number";
  const v = typeof ratio === "number" ? Math.max(0, Math.min(1, ratio)) : 0;

  return (
    <div
      className={cn(
        "measure-bar flex min-w-0 flex-col",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
      {...props}
    >
      <div className="text-[length:var(--text-titulo,1.75rem)] font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </div>

      {qualifier && (
        <div className="mt-1.5 font-[family-name:var(--font-sans)] text-[0.68rem] tracking-[0.04em] text-muted-foreground">
          {qualifier}
        </div>
      )}

      {temRegua && (
        <div
          className="measure-bar-track mt-3 h-[3px] w-full max-w-[88px] overflow-hidden rounded-[1px] bg-border"
          data-state={state}
          role={state === "ok" ? "img" : undefined}
          aria-label={state === "ok" ? `${Math.round(v * 100)}%` : undefined}
        >
          {state === "ok" && (
            <i
              className="measure-bar-fill block h-[3px] origin-left rounded-[1px] bg-muted-foreground"
              style={{ ["--v" as string]: v }}
            />
          )}
        </div>
      )}

      {label && (
        <div className="mt-2 text-[length:var(--text-rotulo,0.72rem)] uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </div>
      )}
    </div>
  );
}
