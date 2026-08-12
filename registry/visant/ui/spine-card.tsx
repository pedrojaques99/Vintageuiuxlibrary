"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Spine Card — o retângulo que lê como objeto.
 *
 * Colhido da estante do `visantismo`, onde a mesma anatomia aparece duas vezes
 * (`.product-card` na estante de e-books e `.piece-card` na galeria de peças).
 * Um card de catálogo comum é um retângulo a prumo com uma imagem dentro; este
 * é um **objeto na prateleira**, e as quatro decisões abaixo são o que separa
 * uma coisa da outra — nenhuma delas é ilustração.
 *
 * ── 1. A lombada ───────────────────────────────────────────────────────────
 *
 * Uma faixa de luz de 12px na borda esquerda, com um vinco. É ela que faz o
 * objeto ler como livro sem uma linha de desenho. Fica **sobre** a capa e sobre
 * o texto, porque numa capa real a lombada atravessa os dois.
 *
 * ── 2. O tombo ─────────────────────────────────────────────────────────────
 *
 * Fila de retângulos perfeitamente a prumo lê como grade. A inclinação é o que
 * faz virar objeto — e ela vem com `transform-origin: bottom`, senão o card
 * gira no centro e parece flutuando em vez de apoiado.
 *
 * O ângulo é uma **variável**, e existe uma só regra de `transform`. Na origem,
 * cada `:nth-child` reescrevia o transform inteiro, e aí o `:hover` precisava de
 * um seletor inflado só pra ganhar a queda de braço de especificidade. Com a
 * variável, o hover troca um valor e vence pela ordem — que é como cascata deve
 * funcionar.
 *
 * A alternância entre três ângulos existe porque livro nenhum numa estante fica
 * exatamente no ângulo do vizinho: repetir o mesmo em todos devolve o ar de
 * grade que a inclinação foi corrigir.
 *
 * ── 3. O gesto de pegar ────────────────────────────────────────────────────
 *
 * No hover ele **endireita e sobe**. Não é "um card que reage": é o gesto de
 * tirar o livro da prateleira, e é por isso que o alvo é o objeto inteiro.
 *
 * ── 4. O duotone, e a cor como ponteiro ────────────────────────────────────
 *
 * Em repouso a capa é duotone; a cor cheia é recompensa da atenção. Numa página
 * quase monocromática, três capas em cor plena são três paletas brigando e a
 * estante perde o conjunto. Mono, elas voltam a ser objetos da MESMA estante, e
 * **quem ganha cor é o que a pessoa está olhando** — cor vira ponteiro, não
 * ruído. `sepia` + `hue-rotate` é duotone de um filtro só: sem camada extra no
 * DOM, sem segunda cópia da imagem.
 *
 * Duas guardas que sempre faltam nesse padrão:
 * · `:focus-visible` junto com `:hover`, senão a capa em cor é informação que
 *   só existe pra quem usa mouse.
 * · `@media (hover: none)`: sem hover não existe "o que a pessoa está olhando",
 *   e o mono viraria um estado permanente do qual ninguém pode sair. No toque a
 *   capa nasce em cor.
 *
 * A imagem entra por **slot** (`cover`), não por `src`: cada app tem o seu
 * componente de imagem otimizada, e um item que impõe `<img>` cru obriga o
 * consumidor a abrir mão dele.
 *
 * ── 5. Por que as quatro decisões acima moram AQUI, e não num bloco de CSS ──
 *
 * Elas moravam. O item do registry trazia um `css` com `.spine-card`,
 * `.spine-card::before` e o filtro do duotone — e bloco de `css` do registry só
 * existe depois que alguém roda o `shadcn add`. Na vitrine, que importa o arquivo
 * direto, nada disso chegava: medido no navegador, `transform` voltava `none` e
 * `::before` voltava `content: none`. Ou seja, a peça inteira que este cabeçalho
 * descreve renderizava como um retângulo com borda — sem lombada, sem tombo, sem
 * duotone, e sem largura própria. Era esse o "tamanho quebrado".
 *
 * Agora a anatomia é do componente. As classes `.spine-card` e
 * `.spine-card-cover` continuam no lugar, então o CSS do registry segue casando
 * em quem instalou; as utilitárias ganham dele por camada e repetem o mesmo
 * valor, então o desenho é um só nos dois caminhos.
 *
 * ── 6. A régua é o card, não a janela ──────────────────────────────────────
 *
 * `@container` + `cqi`: numa estante de 150px, 24px de respiro de cada lado
 * comiam um terço da linha e o título quebrava em duas. O respiro e o corpo do
 * título agora saem da largura do próprio objeto — um card largo respira, um
 * card estreito aperta, sem media query e sem prop nova.
 */

// `title` aqui é o título do objeto (ReactNode), não a tooltip nativa do DOM.
export interface SpineCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A arte. Slot, pra caber `next/image`, `<img>` ou uma capa desenhada. */
  cover?: React.ReactNode;
  title: React.ReactNode;
  /** A ação, à direita do título na mesma linha de base. Uma, não três. */
  action?: React.ReactNode;
  href?: string;
  /** Grau do tombo. Passe o índice do item e ele alterna sozinho. */
  index?: number;
  /** Desliga o duotone quando a arte já nasce na cor certa. */
  fullColor?: boolean;
}

const TOMBOS = ["-5deg", "-2deg", "-7deg"];

export function SpineCard({
  cover,
  title,
  action,
  href,
  index = 0,
  fullColor = false,
  className,
  ...props
}: SpineCardProps) {
  const Tag = (href ? "a" : "article") as React.ElementType;

  return (
    <Tag
      {...(href ? { href } : {})}
      data-full-color={fullColor ? "" : undefined}
      // O ângulo do item entra como `--tilt-base`, e o `--tilt` que o transform
      // lê é uma utilitária. Se o ângulo viesse direto em `--tilt`, o estilo
      // inline venceria o `:hover` sempre — inline ganha de qualquer folha — e o
      // card nunca endireitaria.
      style={{ ["--tilt-base" as string]: TOMBOS[index % TOMBOS.length] }}
      className={cn(
        "spine-card group @container relative flex w-full min-w-0 flex-col",
        "border border-border bg-card text-inherit no-underline",
        // ── o tombo, e o gesto de pegar
        "[--tilt:var(--tilt-base,-5deg)] [--lift:0px]",
        "[transform:rotate(var(--tilt))_translateY(var(--lift))] [transform-origin:bottom_center]",
        "transition-[transform,border-color] [transition-duration:var(--dur-slow,700ms)]",
        "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
        "hover:[--tilt:0deg] hover:[--lift:-10px]",
        "focus-visible:[--tilt:0deg] focus-visible:[--lift:-10px]",
        // Sem hover não existe "o que a pessoa está olhando": no toque o objeto
        // nasce a prumo, senão o tombo vira defeito permanente.
        "[@media(hover:none)]:[--tilt:0deg]",
        "motion-reduce:transition-none",
        // ── a lombada: 12px de luz com vinco, POR CIMA da capa e do texto
        "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-[1]",
        "before:w-3 before:border-r before:border-border before:content-['']",
        "before:[background:linear-gradient(90deg,color-mix(in_oklch,var(--foreground)_7%,transparent),transparent)]",
        className,
      )}
      {...props}
    >
      {cover && (
        <div
          className={cn(
            "spine-card-cover border-b border-border",
            "[&_:is(img,svg,video)]:block [&_:is(img,svg,video)]:h-auto [&_:is(img,svg,video)]:w-full",
            "[&_:is(img,svg,video)]:object-cover [&_:is(img,svg,video)]:transition-[filter]",
            "[&_:is(img,svg,video)]:[transition-duration:var(--dur-slow,700ms)]",
            // ── o duotone, e a cor como ponteiro
            !fullColor && [
              "[&_:is(img,svg,video)]:[filter:grayscale(1)_sepia(0.5)_hue-rotate(155deg)_saturate(1.3)_brightness(0.92)_contrast(1.06)]",
              "group-hover:[&_:is(img,svg,video)]:[filter:none]",
              "group-focus-visible:[&_:is(img,svg,video)]:[filter:none]",
              "[@media(hover:none)]:[&_:is(img,svg,video)]:[filter:none]",
            ],
          )}
        >
          {cover}
        </div>
      )}

      {/* Título e ação, e nada mais. O corpo tinha kicker, parágrafo de três
          linhas e rodapé com gancho — e três blocos de texto embaixo de uma capa
          fazem o objeto parar de ler como livro e voltar a ler como card de
          blog. O que a peça é fica na capa e no título; o resto é o trabalho da
          página de destino. */}
      {/* `min-w-0` no título e `flex-wrap` na linha: uma coluna de flex nasce
          com `min-width: auto`, então o título recusava encolher e empurrava a
          ação 13px pra fora do card num viewport de 360px. Pego pelo teste de
          peça-sozinha-no-celular, não na grade — na grade o palco escala e a
          media query continua lendo o viewport grande. */}
      {/* O respiro sai da largura do card (`cqi`), e a esquerda ganha um degrau
          a mais porque os 12px da lombada passam por cima do texto. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-[clamp(0.75rem,6cqi,1.5rem)] pb-[clamp(0.75rem,6cqi,1.5rem)] pl-[clamp(1rem,7.5cqi,1.75rem)] pt-[clamp(0.85rem,5.5cqi,1.375rem)]">
        <h3 className="m-0 min-w-0 text-[clamp(0.9rem,5.5cqi,1.05rem)] font-semibold leading-[1.3]">
          {title}
        </h3>
        {action && (
          <span className="shrink-0 text-[0.78rem] tracking-[0.04em] text-muted-foreground">
            {action}
          </span>
        )}
      </div>
    </Tag>
  );
}
