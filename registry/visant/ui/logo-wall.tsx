"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Marquee } from "@/components/ui/marquee";

/**
 * LogoWall — a faixa de "confiam na gente", com os logos NORMALIZADOS.
 *
 * ── Por que não é só um marquee com uns `<img>` dentro ──────────────────────
 *
 * O motor de faixa infinita já existe e é o `@visant/marquee`: GSAP, três modos
 * de scroll, emenda sem tranco, `prefers-reduced-motion`, pausa fora da tela.
 * Reescrever aquele loop aqui seria criar um segundo marquee pra manter. Esta
 * peça COMPÕE em cima dele e resolve o problema que ele não tem como resolver,
 * porque não é problema de movimento:
 *
 * **logo de cliente chega caótico.** Um vem em SVG vetorial preto, outro em PNG
 * colorido de 2000px, um é wordmark de 6:1 e o vizinho é monograma quadrado.
 * Jogados numa fileira com `height: 32px`, o monograma vira um selo enorme ao
 * lado de um wordmark que virou um fiapo — e a faixa que deveria dizer "estes
 * são os nossos clientes" diz "montaram isto às pressas".
 *
 * Três normalizações, e as três são obrigatórias juntas:
 *
 * 1. **Altura ÓPTICA, não altura de caixa.** Caixa de mesma altura não é peso de
 *    mesma altura: um monograma quadrado ocupa a altura inteira e um wordmark com
 *    ascendente e descendente ocupa metade dela. Por isso cada item aceita
 *    `scale` — um multiplicador de correção, tipicamente entre 0,8 e 1,25, que
 *    quem monta a faixa ajusta OLHANDO. Não existe algoritmo pra isto: é a mesma
 *    correção óptica que um tipógrafo faz num "O" pra ele parecer do tamanho do
 *    "H". O que a peça garante é que a correção seja UM número por logo, no lugar
 *    certo, em vez de um `className` diferente em cada `<img>`.
 * 2. **Teto de largura.** Sem ele o wordmark comprido come três vagas da faixa e
 *    o ritmo do gap morre. Com ele, o logo comprido encolhe pra caber e continua
 *    na mesma linha de base dos outros.
 * 3. **Dessaturação em repouso, cor no hover.** Em repouso a faixa tem que ler
 *    como uma TEXTURA de marcas, não como oito anúncios competindo pela atenção
 *    do olho no meio da sua página. A cor volta no hover, e o hover TAMBÉM para a
 *    faixa (é o `pauseOnHover` do marquee) — os dois gestos são um só: a pessoa
 *    aponta, a esteira freia, o logo acende.
 *
 * ── Cor, tema e a verdade sobre PNG ────────────────────────────────────────
 *
 * `finish="mono"` pinta o logo com `currentColor` e é o único acabamento
 * **seguro no tema escuro** — mas só funciona com SVG inline, porque é o único
 * formato que aceita ser recolorido. Logo de cliente em PNG preto simplesmente
 * some num fundo escuro, e nenhum filtro conserta isso sem estragar o logo
 * colorido do vizinho. A peça não finge que resolve: `grayscale` é o padrão
 * porque funciona com qualquer arquivo, e a saída certa pro tema escuro é pedir
 * o SVG ao cliente. Está escrito aqui pra não ser descoberto no deploy.
 *
 * ── O nome do cliente é conteúdo, o logo é desenho ─────────────────────────
 *
 * `name` é obrigatório e vai num `sr-only`; o slot do logo vai em `aria-hidden`.
 * A alternativa — confiar no `alt` do `<img>` — quebra no primeiro logo que
 * chegar como SVG inline, como `next/image` sem alt ou como componente do
 * projeto. Assim há exatamente UM nome acessível por item, venha o que vier no
 * slot. (A cópia que o marquee duplica pra fechar o loop já nasce `aria-hidden`,
 * então nada é anunciado duas vezes.)
 *
 * Requer `gsap` e o `@visant/marquee` quando `marquee` está ligado.
 */

export interface LogoWallItem {
  id: string;
  /** O nome do cliente. Obrigatório: é ele que o leitor de tela anuncia. */
  name: string;
  /** O logo, por slot: SVG inline, `<img>`, `next/image`, componente do projeto. */
  logo: React.ReactNode;
  /**
   * Correção óptica de tamanho. 1 é a altura base; 1,2 sobe 20%.
   *
   * Ajuste olhando, um logo por vez, e só depois de a faixa estar montada — a
   * correção certa depende dos vizinhos.
   */
  scale?: number;
  /** Vira link. Um logo clicável precisa ser âncora, não `div` com `onClick`. */
  href?: string;
}

export interface LogoWallProps extends React.HTMLAttributes<HTMLDivElement> {
  items: LogoWallItem[];
  /** Altura óptica base, em rem. É sobre ela que o `scale` de cada item age. */
  height?: number;
  /** Teto de largura de cada logo, em rem. Segura o wordmark comprido. */
  maxWidth?: number;
  /**
   * O acabamento em repouso.
   *
   * - `"grayscale"` (padrão): dessatura e apaga; a cor volta no hover. Serve
   *   qualquer arquivo.
   * - `"mono"`: pinta com `currentColor` — só SVG inline, e o único seguro no
   *   tema escuro. Ver a nota do cabeçalho.
   * - `"none"`: o logo como veio, sempre.
   */
  finish?: "grayscale" | "mono" | "none";
  /** Desligue pra uma grade parada. A normalização continua valendo. */
  marquee?: boolean;
  /** Segundos por volta. Faixa de logo pede lento: 60 a 90. */
  speed?: number;
  gap?: number;
  /** Some nas bordas em vez de ser cortada a faca. */
  fade?: boolean;
  reverse?: boolean;
  /** Sangra pra fora do container. Passe o mesmo respiro do pai. */
  bleed?: number | false;
  /**
   * O rótulo da faixa: "Confiam na gente", "Clientes desde 2019".
   *
   * Ele mora FORA da esteira, e não é preciosismo: dentro dela viraria conteúdo
   * do loop e andaria junto com os logos, reaparecendo a cada volta. Foi a
   * lição que a demo do marquee já tinha aprendido.
   */
  heading?: React.ReactNode;
  /** Nome da lista pro leitor de tela, quando não há `heading` visível. */
  label?: string;
}

export function LogoWall({
  items,
  height = 2,
  maxWidth = 9,
  finish = "grayscale",
  marquee = true,
  speed = 72,
  gap = 64,
  fade = true,
  reverse = false,
  bleed = false,
  heading,
  label = "Clientes",
  className,
  ...props
}: LogoWallProps) {
  const celulas = items.map((item) => (
    <Logo key={item.id} item={item} height={height} maxWidth={maxWidth} finish={finish} />
  ));

  return (
    <div className={cn("flex flex-col gap-5", className)} {...props}>
      {heading ? (
        <p className="text-center font-mono text-[length:var(--text-rotulo,0.6875rem)] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          {heading}
        </p>
      ) : null}

      {marquee ? (
        <Marquee
          items={celulas}
          speed={speed}
          gap={gap}
          fade={fade}
          reverse={reverse}
          bleed={bleed}
          // `"boost"` e não `"drive"`: a faixa de clientes tem que existir mesmo
          // com a página parada — ela é prova, e prova que só aparece quando a
          // pessoa rola é prova que metade das visitas não vê.
          scroll="boost"
          aria-label={label}
        />
      ) : (
        // Grade parada: `justify-center` e `gap` iguais aos da esteira, pra
        // trocar de modo não mudar o ritmo da fileira.
        <ul
          aria-label={label}
          className="flex flex-wrap items-center justify-center"
          style={{ gap: `${gap / 2}px ${gap}px` }}
        >
          {items.map((item) => (
            <li key={item.id}>
              <Logo item={item} height={height} maxWidth={maxWidth} finish={finish} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Logo({
  item,
  height,
  maxWidth,
  finish,
}: {
  item: LogoWallItem;
  height: number;
  maxWidth: number;
  finish: NonNullable<LogoWallProps["finish"]>;
}) {
  const Tag = (item.href ? "a" : "span") as "span";

  return (
    <Tag
      {...(item.href ? { href: item.href } : null)}
      className={cn(
        "group/logo inline-flex shrink-0 items-center justify-center no-underline",
        "outline-none focus-visible:[box-shadow:var(--focus)] focus-visible:rounded-[var(--r-control,0.5rem)]",
        // Só o que muda, nunca `transition-all`: filtro e opacidade arrastariam
        // layout junto se a lista fosse ampla demais.
        "transition-[filter,opacity,color] [transition-duration:var(--dur-fast,140ms)]",
        "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
        "motion-reduce:transition-none",
        finish === "grayscale" && [
          "grayscale opacity-55",
          "hover:grayscale-0 hover:opacity-100",
          "group-focus-visible/logo:grayscale-0 focus-visible:grayscale-0 focus-visible:opacity-100",
          // Onde não existe hover, o repouso dessaturado seria permanente — e aí
          // a faixa inteira ficaria cinza no celular, que é onde metade das
          // visitas acontece. Em ponteiro grosso a cor é o estado normal.
          "[@media(hover:none)]:grayscale-0 [@media(hover:none)]:opacity-100",
        ],
        finish === "mono" && [
          "text-[var(--muted-foreground)] opacity-90",
          "hover:text-[var(--foreground)] focus-visible:text-[var(--foreground)]",
          "[@media(hover:none)]:text-[var(--foreground)]",
          // `currentColor` é o que faz o `mono` funcionar, e só o SVG inline
          // obedece. `fill` e `stroke` juntos porque logo desenhado vem dos dois
          // jeitos, e o que estiver ausente simplesmente não é atingido.
          "[&_svg_[fill]:not([fill=none])]:fill-current [&_svg_[stroke]:not([stroke=none])]:stroke-current",
          "[&_svg]:fill-current",
        ],
      )}
      style={{
        // A altura é a óptica: base × correção do item. O teto de largura mora
        // aqui e não numa classe porque ele é número de quem monta a faixa.
        height: `${height * (item.scale ?? 1)}rem`,
        maxWidth: `${maxWidth}rem`,
      }}
    >
      {/*
       * O slot inteiro é decoração; o nome acessível vem do `sr-only` ao lado.
       * `object-contain` e não `cover`: logo cortado é logo errado, e o contrato
       * de marca de qualquer cliente proíbe.
       */}
      <span
        aria-hidden="true"
        className={cn(
          "flex h-full w-full items-center justify-center",
          "[&_img]:h-full [&_img]:w-auto [&_img]:max-w-full [&_img]:object-contain",
          "[&_svg]:h-full [&_svg]:w-auto [&_svg]:max-w-full",
        )}
      >
        {item.logo}
      </span>
      <span className="sr-only">{item.name}</span>
    </Tag>
  );
}
