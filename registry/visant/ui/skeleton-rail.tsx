import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Skeleton Rail — o esqueleto do trilho, com as MESMAS medidas do trilho.
 *
 * ── A única coisa que um skeleton precisa acertar ──────────────────────────
 *
 * Ele existe pra evitar o salto de layout. Se as medidas dele divergirem do
 * componente real, ele deixa de evitar o salto e passa a **causar** um — que é
 * pior que não ter skeleton nenhum, porque agora o salto acontece depois de a
 * pessoa já ter começado a ler.
 *
 * Por isso `itemWidth`, `gap` e `ratio` são exatamente os nomes e os defaults do
 * `@visant/rail`, e a recomendação é passar os mesmos valores dos dois lados a
 * partir de uma constante do projeto. Skeleton com número escrito à mão diverge
 * do trilho no primeiro ajuste.
 *
 * ── As duas decisões pequenas ──────────────────────────────────────────────
 *
 * · `overflow-hidden`, não `auto`: skeleton não deve rolar de lado. Ele
 *   representa conteúdo que ainda não existe, e oferecer navegação por cima de
 *   nada é oferecer uma porta falsa.
 * · O bloco é `--muted`, e só. Nada de gradiente varrendo: shimmer é movimento
 *   contínuo numa tela onde a pessoa está esperando, e ele some sob
 *   `prefers-reduced-motion` deixando o esqueleto sem nenhum sinal de vida. O
 *   `animate-pulse` respira e sobrevive ao guard.
 *
 * O número de cards default é 5 porque é quanto cabe numa faixa larga: menos
 * deixa a linha visivelmente curta e denuncia que aquilo não é o conteúdo.
 */

export interface SkeletonRailProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Quantos cards fantasma. Default 5. */
  cards?: number;
  /** Os mesmos valores do `@visant/rail` que este esqueleto representa. */
  itemWidth?: number;
  gap?: number;
  /** Proporção da arte, ex. `"4 / 3"`. */
  ratio?: string;
  /** Desenha a barra de título acima da fileira. */
  heading?: boolean;
}

export function SkeletonRail({
  cards = 5,
  itemWidth = 240,
  gap = 20,
  ratio = "4 / 3",
  heading = true,
  className,
  ...props
}: SkeletonRailProps) {
  return (
    <section
      aria-hidden="true"
      className={cn("min-w-0", className)}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      {heading && <div className="mb-3 h-4 w-44 animate-pulse rounded bg-muted" />}
      <div className="flex overflow-hidden" style={{ gap }}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="shrink-0" style={{ width: itemWidth }}>
            <div className="animate-pulse rounded bg-muted" style={{ aspectRatio: ratio }} />
            <div className="mt-3 h-3.5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </section>
  );
}
