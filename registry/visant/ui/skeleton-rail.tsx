import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Skeleton Rail — os esqueletos da casa, com as MESMAS medidas do que substituem.
 *
 * ── Por que o item guarda cinco formatos e continua se chamando `skeleton-rail`
 *
 * O trilho era o único formato publicado, e um esqueleto só cobre o dia em que
 * a tela que carrega é um trilho. Toda tela real espera outras quatro coisas:
 * um bloco de texto, uma ficha de mídia, uma lista de linhas e um card solto.
 * Quem instalou o item e precisou de uma dessas escreveu `h-4 w-full bg-muted`
 * à mão — ou seja, exatamente a caixa duplicada que o item existe pra evitar,
 * e agora sem a única disciplina que importa aqui: bater a medida do original.
 *
 * O nome **não** muda. `skeleton-rail` já está instalado em projeto de cliente,
 * e renomear o item é apagar o arquivo de quem fez `add` mês passado. O nome
 * envelheceu; quebrar quem confiou nele é pior.
 *
 * Os cinco: `SkeletonRail` (o trilho), `SkeletonCard`, `SkeletonList`,
 * `SkeletonText` e `SkeletonMedia`. Todos falam a mesma língua de prop e todos
 * são montados sobre o mesmo bloco, então o pulso, a defasagem e o
 * comportamento sob `prefers-reduced-motion` são um só comportamento.
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

/* ── as duas peças que os cinco formatos compartilham ─────────────────────── */

/**
 * O bloco. Tudo aqui é feito dele.
 *
 * `delay` em vez de `animationDelay` solto: a defasagem é a única coisa que dá
 * direção à espera (ver a nota no fim), e concentrar a regra num lugar impede
 * que um formato novo esqueça dela e pulse fora do compasso dos outros.
 */
function Bloco({
  delay = 0,
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { delay?: number }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-muted", className)}
      style={{ animationDelay: `${delay}ms`, ...style }}
      {...props}
    />
  );
}

/**
 * A moldura que anuncia a espera — uma vez, e não uma por bloco.
 *
 * `label={false}` existe pro caso de a tela ter VÁRIOS esqueletos juntos: ali o
 * anúncio pertence ao container que embrulha todos, e cinco `role="status"`
 * empilhados fariam o leitor de tela recitar cinco vezes que algo está
 * carregando. Um esqueleto solto, que é o caso comum, anuncia sozinho.
 */
function Moldura({
  label,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { label: string | false }) {
  return (
    <section
      {...(label ? { role: "status", "aria-busy": true } : { "aria-hidden": true })}
      className={cn("min-w-0", className)}
      {...props}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      {children}
    </section>
  );
}

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
  /**
   * O que o leitor de tela ouve enquanto a lista não chegou. `false` cala a
   * peça — pra quando quem anuncia é o container que embrulha vários.
   *
   * `role="status"` no lugar de um `aria-hidden` seco: escondido de todo mundo,
   * o esqueleto deixava quem usa leitor de tela sem NENHUM sinal entre o clique
   * e a lista chegar — só silêncio, que se lê como travou. Os blocos visuais
   * seguem escondidos, porque eles são forma, não conteúdo.
   */
  label?: string | false;
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
    <Moldura
      label={label}
      className={className}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      {heading && (
        // Espelha `rail.tsx`: `mb-3 hidden justify-end gap-2 lg:flex` com dois
        // alvos de 40px. Mesmas classes, de propósito — é o que garante que a
        // troca não mexa um pixel quando o trilho entrar no lugar.
        <div aria-hidden="true" className="mb-3 hidden justify-end gap-2 lg:flex">
          <Bloco className="size-10" />
          <Bloco className="size-10" />
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
          /*
           * 90ms de defasagem por card: a fileira inteira pulsando no mesmo
           * quadro lê como um bloco só piscando, e não como uma lista chegando.
           * O atraso é o que dá direção à espera — e ele some junto com a
           * animação sob `prefers-reduced-motion`, sem deixar card nenhum
           * invisível, porque a cor de repouso do `animate-pulse` é a opacidade
           * cheia.
           */
          <SkeletonCard key={i} ratio={ratio} lines={2} delay={i * PASSO} label={false} />
        ))}
      </div>
    </Moldura>
  );
}

/** A defasagem entre um item e o vizinho. Uma só, pros cinco formatos. */
const PASSO = 90;

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Proporção da mídia, ex. `"4 / 3"`. `false` desenha um card sem mídia. */
  ratio?: string | false;
  /** Quantas linhas de texto abaixo da mídia. */
  lines?: number;
  delay?: number;
  label?: string | false;
}

/**
 * SkeletonCard — mídia em cima, título e apoio embaixo.
 *
 * As duas linhas são 14px e 12px, e não é gosto: são as alturas de linha de
 * `text-corpo` e `text-apoio` truncados numa linha, que é o que um card de
 * catálogo desenha. Um bloco de 16px aqui adiantaria 4px por linha, e o salto
 * apareceria multiplicado pelo número de cards da fileira.
 */
export function SkeletonCard({
  ratio = "4 / 3",
  lines = 2,
  delay = 0,
  label = "Carregando",
  className,
  ...props
}: SkeletonCardProps) {
  return (
    <Moldura label={label} className={className} {...(props as React.HTMLAttributes<HTMLElement>)}>
      {ratio ? <Bloco delay={delay} style={{ aspectRatio: ratio }} /> : null}
      {Array.from({ length: lines }).map((_, i) => (
        <Bloco
          key={i}
          delay={delay}
          className={cn(
            i === 0 ? "mt-3 h-3.5 w-3/4" : "mt-1.5 h-3",
            // A última linha sempre mais curta: parágrafo real quase nunca fecha
            // a linha final, e um bloco cheio até a borda lê como barra, não
            // como texto.
            i > 0 && (i === lines - 1 ? "w-1/2" : "w-full"),
          )}
        />
      ))}
    </Moldura>
  );
}

export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  /** Altura da linha em px. Use a MESMA `line-height` do texto que vai entrar. */
  lineHeight?: number;
  /** Respiro entre linhas em px. O resto da entrelinha, na prática. */
  gap?: number;
  delay?: number;
  label?: string | false;
}

/**
 * SkeletonText — o parágrafo que ainda não chegou.
 *
 * `lineHeight` + `gap` em vez de uma classe de altura: a soma dos dois é a
 * entrelinha do texto de verdade, e é a soma que precisa bater. Com `h-4 gap-2`
 * cravado, um parágrafo de seis linhas erra 24px — meia linha de diferença por
 * linha, que é exatamente o tamanho do salto que ninguém consegue explicar.
 */
export function SkeletonText({
  lines = 3,
  lineHeight = 14,
  gap = 8,
  delay = 0,
  label = "Carregando o texto",
  className,
  ...props
}: SkeletonTextProps) {
  return (
    <Moldura label={label} className={className} {...(props as React.HTMLAttributes<HTMLElement>)}>
      <div className="flex flex-col" style={{ gap: `${gap}px` }}>
        {Array.from({ length: lines }).map((_, i) => (
          <Bloco
            key={i}
            delay={delay + i * PASSO}
            className={i === lines - 1 && lines > 1 ? "w-[62%]" : "w-full"}
            style={{ height: `${lineHeight}px` }}
          />
        ))}
      </div>
    </Moldura>
  );
}

export interface SkeletonListProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  /** O quadrado à esquerda: avatar, capa, ícone. `false` tira. */
  thumb?: boolean;
  /** A coluna miúda da direita: valor, data, contagem. */
  meta?: boolean;
  /** Altura de cada linha em px. A mesma da linha real, sempre. */
  rowHeight?: number;
  delay?: number;
  label?: string | false;
}

/**
 * SkeletonList — a fileira vertical de registros.
 *
 * A altura da linha é prop e não conta interna: lista de e-mail, de pedido e de
 * membro do time têm alturas diferentes, e o esqueleto que assume 56px pra
 * todas volta a causar o salto que ele existe pra evitar. O `justify-between`
 * segura a coluna de meta na direita, como na linha real.
 */
export function SkeletonList({
  rows = 4,
  thumb = true,
  meta = true,
  rowHeight = 56,
  delay = 0,
  label = "Carregando a lista",
  className,
  ...props
}: SkeletonListProps) {
  return (
    <Moldura label={label} className={className} {...(props as React.HTMLAttributes<HTMLElement>)}>
      <div className="flex flex-col">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            // A régua entre as linhas fica no esqueleto também: ela é 1px de
            // layout, e 1px vezes vinte linhas é uma linha inteira de erro.
            className={cn(
              "flex min-w-0 items-center gap-3 border-b border-border",
              i === rows - 1 && "border-b-0",
            )}
            style={{ height: `${rowHeight}px` }}
          >
            {thumb ? <Bloco delay={delay + i * PASSO} className="size-9 shrink-0 rounded-full" /> : null}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Bloco delay={delay + i * PASSO} className="h-3.5 w-1/2" />
              <Bloco delay={delay + i * PASSO} className="h-3 w-1/3" />
            </div>
            {meta ? <Bloco delay={delay + i * PASSO} className="h-3 w-12 shrink-0" /> : null}
          </div>
        ))}
      </div>
    </Moldura>
  );
}

export interface SkeletonMediaProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: string;
  /** Cantos da mídia real. Passe o mesmo raio, senão a troca "estala". */
  radius?: string;
  delay?: number;
  label?: string | false;
}

/**
 * SkeletonMedia — o retângulo da foto, do vídeo, do mapa, do gráfico.
 *
 * É o formato mais simples e o mais fácil de errar: quase todo mundo escreve
 * `h-48` e a mídia real chega com proporção, não com altura. Aqui é
 * `aspect-ratio` por padrão, que é como a caixa da mídia se reserva de verdade
 * — a altura sai da largura que a coluna deu, em qualquer tela.
 */
export function SkeletonMedia({
  ratio = "16 / 9",
  radius = "var(--r-surface, 0.875rem)",
  delay = 0,
  label = "Carregando a mídia",
  className,
  ...props
}: SkeletonMediaProps) {
  return (
    <Moldura label={label} className={className} {...(props as React.HTMLAttributes<HTMLElement>)}>
      <Bloco delay={delay} className="w-full rounded-none" style={{ aspectRatio: ratio, borderRadius: radius }} />
    </Moldura>
  );
}
