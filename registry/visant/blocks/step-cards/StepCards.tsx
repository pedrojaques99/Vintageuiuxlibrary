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
 * fica inteiro e acende o fio de cima na cor da marca, e os demais perdem
 * opacidade. É a diferença entre a fileira ter um foco e a fileira ter um card
 * piscando.
 *
 * ── 5. Sem caixa em volta ──────────────────────────────────────────────────
 *
 * A versão anterior era card com borda, fundo, sombra, selo em pílula no
 * número e borda de marca no ativo: quatro molduras pra dizer "passo". Lia
 * como template. Agora o passo é a arte (com cantos e altura fixa, sem faixa
 * cinza sobrando embaixo), um fio de percurso e o texto. O fio é a única
 * moldura, e ele faz trabalho: liga os passos numa linha só e marca onde você
 * está.
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
    <ol className={cn("grid grid-cols-1 gap-x-6 gap-y-10", COLS[columns], className)} {...props}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const ativo = marcado && i === active;
        const deitado = orphan && last;

        return (
          <li
            key={i}
            data-active={ativo ? "" : undefined}
            className={cn(
              "flex flex-col gap-5",
              deitado && "sm:col-span-full lg:flex-row lg:items-center lg:gap-8",
              // Sem `active` a fileira é a de sempre: nem transição, nem recuo.
              marcado && [
                "transition-opacity [transition-duration:var(--dur-base,240ms)]",
                "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
                "motion-reduce:transition-none",
                // O ponteiro devolve o passo recuado: recuo é hierarquia, não
                // porta trancada.
                !ativo && "opacity-50 hover:opacity-100",
              ],
            )}
          >
            {step.visual ? (
              <div
                className={cn(
                  "relative isolate shrink-0 overflow-hidden rounded-[var(--r-surface,1rem)] bg-[var(--muted)]",
                  // Altura FIXA e a arte preenchendo: com `min-height` a foto de
                  // proporção menor deixava uma faixa cinza embaixo do visual.
                  "[&>*]:size-full [&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover",
                  deitado && "order-last lg:w-1/2",
                )}
                style={{ height: visualHeight }}
              >
                {step.visual}
              </div>
            ) : null}

            <div className={cn("flex flex-col gap-3", deitado && "lg:w-1/2")}>
              {/* O fio de percurso: liga os passos e acende no atual. */}
              <span aria-hidden="true" className="relative block h-px w-full bg-[var(--border)]">
                <span
                  className={cn(
                    "absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 origin-left bg-[var(--brand,var(--foreground))]",
                    "transition-transform [transition-duration:var(--dur-slow,300ms)] [transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
                    "motion-reduce:transition-none",
                    ativo ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </span>

              <div className="flex items-baseline gap-3 pt-1">
                {/* O <ol> já numera para quem ouve; este é só o eco visual. */}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-[13px] font-medium tabular-nums text-[var(--muted-foreground)]"
                >
                  {step.label ?? String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-balance [font-family:var(--font-display,inherit)] text-[1.1875rem] font-medium leading-[1.25] tracking-[-0.01em] text-[var(--foreground)]">
                  {step.title}
                </h3>
              </div>

              {step.description ? (
                <p className="max-w-[44ch] text-pretty text-[14px] leading-[1.6] text-[var(--muted-foreground)]">
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
