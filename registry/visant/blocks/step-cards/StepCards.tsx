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
 *
 * ── 4. O passo em foco, e por que ele não é enfeite ────────────────────────
 *
 * Três cards idênticos numa fileira dizem "existem três passos" e param aí. O
 * que a peça precisa dizer é **onde você está** — numa página de "como
 * funciona" que acompanha a rolagem, num onboarding que marca o passo atual,
 * num carrossel que passa sozinho. Por isso existe `active`.
 *
 * O destaque é por **recuo dos outros**, não por brilho no escolhido: o ativo
 * fica como o card sempre foi (opaco, borda de marca, elevado) e os demais
 * perdem opacidade e um fio de escala. É a diferença entre a fileira ter um
 * foco e a fileira ter um card piscando.
 *
 * Duas guardas:
 * · **Sem `active`, nada muda.** Quem já usava o bloco recebe o mesmo pixel —
 *   inclusive o passo do meio, que não vira "o ativo" por acaso.
 * · **O ponteiro também promove.** Passar o mouse num passo recuado traz ele
 *   de volta, senão o recuo vira um card apagado que ninguém consegue ler.
 *   E `motion-reduce` corta a transição, não o estado: quem pediu menos
 *   movimento continua enxergando qual é o passo atual.
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
  /**
   * Índice do passo em foco. Os outros recuam. Sem valor, todos iguais.
   *
   * Quem manda é quem consome: rolagem, timer de carrossel ou clique. O bloco
   * não escolhe passo sozinho — passo atual é estado da página, não do card.
   */
  active?: number;
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
  active,
  className,
  ...props
}: StepCardsProps) {
  const orphan = wideLast && steps.length % columns === 1;
  const marcado = typeof active === "number";

  return (
    <ol className={cn("grid grid-cols-1 gap-5", COLS[columns], className)} {...props}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const ativo = marcado && i === active;

        return (
          <li
            key={i}
            data-active={ativo ? "" : undefined}
            className={cn(
              "group/passo flex flex-col overflow-hidden rounded-[var(--r-surface,1rem)] border border-[var(--border)] bg-[var(--card,var(--background))]",
              "[box-shadow:var(--e-flat)]",
              orphan && last && "sm:col-span-full lg:flex-row lg:items-center",
              // Sem `active` a fileira é a de sempre: nem transição, nem recuo.
              marcado && [
                "transition-[opacity,transform,border-color,box-shadow]",
                "[transition-duration:var(--dur-slow,300ms)]",
                "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
                "motion-reduce:transition-none",
                ativo
                  ? "border-[var(--brand)] [box-shadow:var(--e-raised)]"
                  : // O ponteiro devolve o passo recuado: recuo é hierarquia, não
                    // porta trancada.
                    "opacity-60 [transform:scale(0.975)] hover:opacity-100 hover:[transform:scale(1)]",
              ],
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
                {/* O <ol> já numera para quem ouve; este é só o eco visual.
                    No passo em foco ele vira selo: a marca entra no número e
                    não numa faixa nova, que é onde a fileira ficaria barulhenta. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex shrink-0 items-center justify-center text-[13px] font-semibold tabular-nums",
                    ativo
                      ? "min-w-6 rounded-[var(--r-pill,9999px)] px-1.5 py-0.5 bg-[var(--brand)] text-[var(--brand-foreground)]"
                      : "text-[var(--accent-ink,var(--foreground))]",
                  )}
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
