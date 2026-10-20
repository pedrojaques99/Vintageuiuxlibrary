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
 * Os quatro papéis, nesta ordem visual: o rótulo nomeia, o valor manda, o
 * qualificador transforma o valor em fato e a régua prova.
 *
 * ```
 * rótulo  →  valor  →  qualificador  →  evidência (a régua)
 * ```
 *
 * A régua ocupa a largura da coluna e tem escala desenhada embaixo (de 10 em
 * 10%, com a metade marcada). Uma barrinha de 88px sem escala era lida como
 * enfeite, e a peça parecia simples demais pra prova que carrega.
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
      {label && (
        <div className="text-[length:var(--text-apoio,0.8125rem)] font-medium text-muted-foreground">
          {label}
        </div>
      )}

      <div className="mt-1 [font-family:var(--font-display,inherit)] text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
        {value}
      </div>

      {qualifier && (
        <div className="mt-2 text-pretty text-[length:var(--text-apoio,0.8125rem)] leading-[1.45] text-muted-foreground">
          {qualifier}
        </div>
      )}

      {temRegua && (
        // A régua de verdade: trilha, preenchimento e escala embaixo. Os traços
        // de 10 em 10 é que fazem a barra ser lida como medida e não como
        // enfeite; o maior marca a metade, onde o olho ancora a leitura.
        <div className="mt-4 w-full">
          <div
            className="measure-bar-track h-1.5 w-full overflow-hidden rounded-[var(--r-pill,9999px)] bg-[var(--muted)]"
            data-state={state}
            role={state === "ok" ? "img" : undefined}
            aria-label={state === "ok" ? `${Math.round(v * 100)}%` : undefined}
          >
            {state === "ok" && (
              <i
                className="measure-bar-fill block h-full origin-left rounded-[var(--r-pill,9999px)] bg-[var(--brand,var(--foreground))]"
                style={{ ["--v" as string]: v }}
              />
            )}
          </div>
          <div aria-hidden="true" className="mt-1.5 flex w-full items-start justify-between">
            {Array.from({ length: 11 }, (_, i) => (
              <span
                key={i}
                className={cn("w-px bg-[var(--border)]", i % 5 === 0 ? "h-2" : "h-1")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
