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
 * ── E era exatamente isso que este arquivo fazia ───────────────────────────
 *
 * Medido no navegador, com os mesmos props que a sala "Mesa de trabalho" passa
 * pros dois lados (`itemWidth={170} gap={14}`, cinco cards):
 *
 * | container | card do trilho | card do esqueleto | Δ largura | Δ altura |
 * |---|---|---|---|---|
 * | 600px  | 170px   | 170px | 0     | **51px** |
 * | 900px  | 170px   | 170px | 0     | **51px** |
 * | 1200px | 228,8px | 170px | 58,8  | **80px** |
 * | 1600px | 308,8px | 170px | 138,8 | **140px** |
 *
 * Duas causas, as duas de estrutura e nenhuma de estilo:
 *
 * 1. **`flex` + `shrink-0` + largura fixa contra `grid` + `minmax(w, 1fr)`.** O
 *    trilho ESTICA os itens quando sobra largura no container; o esqueleto
 *    mantinha os 170px crus. Até caber justo os dois coincidem por acidente, e a
 *    partir daí divergem — e a divergência CRESCE com a tela, que é o pior tipo
 *    de bug: some no notebook de quem desenvolve e explode no monitor do cliente.
 * 2. **A barra de título não representava nada.** O trilho não tem título: ele
 *    tem uma fileira de controle com dois botões de 40px, `mb-3` embaixo, e
 *    `pb-3` no scroller. O esqueleto desenhava uma barra de 16px e nenhum `pb`.
 *    Por isso a altura errava 51px **mesmo quando a largura acertava**.
 *
 * A regra que fica: esqueleto não se desenha "parecido", se desenha com o mesmo
 * sistema de layout do original. Aqui é o mesmo `grid grid-flow-col` com o mesmo
 * `gridAutoColumns`, copiado de propósito e não por coincidência.
 *
 * ── As decisões pequenas que continuam valendo ─────────────────────────────
 *
 * · **Skeleton não rola de lado** — oferecer navegação por cima de nada é uma
 *   porta falsa. Isso era feito com `overflow-hidden`, e custava os últimos 15px
 *   de erro: quando a fileira transborda, o trilho real reserva a calha da barra
 *   de rolagem (`overflow-x-auto` + `scrollbar-width: thin`) e o esqueleto não
 *   reservava nada. A porta continua fechada, agora por `pointer-events-none`
 *   num scroller sem nada focável dentro — ninguém rola, e a calha existe nas
 *   mesmas larguras em que o trilho tem uma. Fechar a porta pelo comportamento,
 *   e não pela caixa, é o que deixa a medida bater.
 * · O bloco é `--muted`, e só. Nada de gradiente varrendo: shimmer é movimento
 *   contínuo numa tela onde a pessoa já está esperando.
 * · O `animate-pulse` **não** sobrevive a `prefers-reduced-motion` — o guard da
 *   casa zera `animation-duration` pra tudo. O comentário antigo aqui afirmava o
 *   contrário. Está certo assim: quem pediu menos movimento recebe o esqueleto
 *   parado, que continua dizendo o formato do que vem. O que não pode é a peça
 *   AFIRMAR uma coisa que o CSS do projeto desmente.
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
  /**
   * Reserva a fileira de controle que o `@visant/rail` desenha acima do trilho
   * (as duas setas, a partir de `lg`). Antes isto desenhava uma barra de título
   * — que o trilho não tem — e era metade do salto de altura.
   */
  heading?: boolean;
  /** O que o leitor de tela ouve enquanto a lista não chegou. */
  label?: string;
}

export function SkeletonRail({
  cards = 5,
  itemWidth = 240,
  gap = 20,
  ratio = "4 / 3",
  heading = true,
  label = "Carregando a lista",
  className,
  ...props
}: SkeletonRailProps) {
  return (
    <section
      /*
       * `role="status"` no lugar de um `aria-hidden` seco.
       *
       * Escondido de todo mundo, o esqueleto deixava quem usa leitor de tela sem
       * NENHUM sinal entre o clique e a lista chegar — só silêncio, que se lê
       * como travou. Agora a espera é anunciada uma vez, e os blocos visuais
       * seguem escondidos: eles são forma, não conteúdo, e ninguém precisa ouvir
       * "imagem, imagem, imagem" cinco vezes.
       */
      role="status"
      aria-busy="true"
      className={cn("min-w-0", className)}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      <span className="sr-only">{label}</span>

      {heading && (
        // Espelha `rail.tsx`: `mb-3 hidden justify-end gap-2 lg:flex` com dois
        // alvos de 40px. Mesmas classes, de propósito — é o que garante que a
        // troca não mexa um pixel quando o trilho entrar no lugar.
        <div aria-hidden="true" className="mb-3 hidden justify-end gap-2 lg:flex">
          <div className="size-10 animate-pulse rounded bg-muted" />
          <div className="size-10 animate-pulse rounded bg-muted" />
        </div>
      )}

      <div
        aria-hidden="true"
        // Cópia literal do scroller do trilho — `grid grid-flow-col`,
        // `gridAutoColumns`, `pb-3`, `overflow-x-auto`, `scrollbar-width: thin`
        // — porque é a cópia literal que faz a medida bater em toda largura. O
        // `pointer-events-none` é o que mantém a porta fechada. Ver a nota.
        className="pointer-events-none grid grid-flow-col overflow-x-auto pb-3 [scrollbar-width:thin]"
        style={{
          gridAutoColumns: `minmax(${itemWidth}px, 1fr)`,
          gap: `${gap}px`,
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="min-w-0">
            <div
              className="animate-pulse rounded bg-muted"
              style={{
                aspectRatio: ratio,
                /*
                 * 90ms de defasagem por card: a fileira inteira pulsando no
                 * mesmo quadro lê como um bloco só piscando, e não como uma
                 * lista chegando. O atraso é o que dá direção à espera — e ele
                 * some junto com a animação sob `prefers-reduced-motion`, sem
                 * deixar card nenhum invisível, porque a cor de repouso do
                 * `animate-pulse` é a opacidade cheia.
                 */
                animationDelay: `${i * 90}ms`,
              }}
            />
            <div
              className="mt-3 h-3.5 w-3/4 animate-pulse rounded bg-muted"
              style={{ animationDelay: `${i * 90}ms` }}
            />
            <div
              className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-muted"
              style={{ animationDelay: `${i * 90}ms` }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
