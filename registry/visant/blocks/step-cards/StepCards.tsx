import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StepCards — "como funciona" em passos numerados, com o visual por slot.
 *
 * Duas referências viraram este bloco: os três cards de gradiente
 * (assinar/pedir/receber) e os quatro passos com mini-telas do produto dentro.
 * O que elas têm em comum e o que separa uma da outra:
 *
 * - **Comum:** número, título, uma frase, e uma área grande de visual em cima.
 * - **Diferente:** a arte. Numa é gradiente de marca, na outra é screenshot do
 *   app. Por isso `visual` é slot e o componente não desenha nada lá dentro —
 *   um bloco que embute a arte de um cliente só serve para aquele cliente.
 *
 * Decisões:
 *
 * 1. **É `<ol>`, não uma grade de `<div>`.** A ordem é a informação. Quem navega
 *    por leitor de tela ouve "lista de 4 itens" e sabe que existe uma sequência.
 * 2. **O número é `aria-hidden`.** O `<ol>` já numera; o "01" na tela é o eco
 *    visual disso, e anunciar os dois faz "um, um, envie seu pedido".
 * 3. **`columns` aceita o passo órfão.** Quatro passos em três colunas deixam um
 *    sozinho na segunda linha — a referência resolve deitando o último
 *    (`wideLast`), e é isso que a prop faz.
 */

export interface Step {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A arte do passo: mockup, gradiente, ilustração. Vem do projeto. */
  visual?: React.ReactNode;
  /** Sobrescreve o número impresso. Útil quando o passo 0 existe. */
  label?: string;
}

export interface StepCardsProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: Step[];
  columns?: 2 | 3 | 4;
  /** O último passo ocupa a linha inteira quando sobrar sozinho. */
  wideLast?: boolean;
  /** Altura da área de visual. Abaixo de ~180px o mockup não se lê. */
  visualHeight?: number;
}

const COLS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function StepCards({
  steps,
  columns = 3,
  wideLast = false,
  visualHeight = 240,
  className,
  ...props
}: StepCardsProps) {
  const orphan = wideLast && steps.length % columns === 1;

  return (
    <ol className={cn("grid grid-cols-1 gap-5", COLS[columns], className)} {...props}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;

        return (
          <li
            key={i}
            className={cn(
              "flex flex-col overflow-hidden rounded-[var(--r-surface,1rem)] border border-[var(--border)] bg-[var(--card,var(--background))]",
              "shadow-[var(--e-flat,none)]",
              orphan && last && "sm:col-span-full lg:flex-row lg:items-center",
            )}
          >
            {step.visual ? (
              <div
                className={cn(
                  "relative isolate overflow-hidden bg-[var(--muted)]",
                  orphan && last && "order-last lg:w-1/2 lg:self-stretch",
                )}
                style={{ minHeight: visualHeight }}
              >
                {step.visual}
              </div>
            ) : null}

            <div
              className={cn(
                "flex flex-col gap-2 p-[var(--pad-card,1.5rem)]",
                orphan && last && "lg:w-1/2",
              )}
            >
              <div className="flex items-baseline gap-2.5">
                {/* O <ol> já numera para quem ouve; este é só o eco visual. */}
                <span
                  aria-hidden="true"
                  className="text-[13px] font-semibold tabular-nums text-[var(--brand)]"
                >
                  {step.label ?? String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-balance [font-family:var(--font-display,inherit)] text-[1.125rem] font-medium leading-[1.25] tracking-[-0.01em]">
                  {step.title}
                </h3>
              </div>

              {step.description ? (
                <p className="max-w-[52ch] text-pretty text-[14px] leading-[1.6] text-[var(--muted-foreground)]">
                  {step.description}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
