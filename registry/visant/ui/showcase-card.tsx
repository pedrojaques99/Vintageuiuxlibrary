import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ShowcaseCard — o card de serviço: mídia, título e o que está incluso.
 *
 * A referência mostra três desses lado a lado, e o detalhe que faz a grade
 * funcionar não é o card, é o que ele NÃO faz:
 *
 * 1. **A lista de tags não é clicável.** Parece chip de filtro e não é — é a
 *    lista do que está incluso. Renderizar como `<button>` promete um filtro que
 *    não existe; aqui é `<ul>` de `<li>`, e quem quiser filtro usa `@visant/chip`.
 * 2. **Um alvo de clique só.** O selo de seta é `aria-hidden`: ele repete o link
 *    do título. Dois links para o mesmo destino fazem o leitor de tela anunciar
 *    a mesma coisa duas vezes, e o `::after` do título já cobre o card inteiro.
 * 3. **A mídia entra por slot.** Foto, vídeo ou `next/image` — o componente não
 *    escolhe por você e não faz `fetch`.
 *
 * Sem `href` o card vira estático (vitrine sem destino), e o selo some junto.
 *
 * ── O card mede a si mesmo, não a janela ───────────────────────────────────
 *
 * O título usava `clamp(..., 0.8vw, ...)`. `vw` é a largura da JANELA, então o
 * mesmo card de 360px saía com título de 20px num celular e de 28px num desktop
 * — medido: 360px de card, 20px de tipo a 390 de viewport, 28px a 1440. Card é
 * peça de grade: numa coluna de 300px do desktop ele ganhava o tipo do herói, e
 * num herói de 900px ganhava o tipo da coluna. Com `@container` + `cqi` a régua
 * passa a ser a largura do PRÓPRIO card, que é a única que o desenho conhece.
 */

export interface ShowcaseCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  href?: string;
  /** A imagem ou vídeo do topo. Recebe o recorte e a proporção daqui. */
  media?: React.ReactNode;
  /** Proporção da mídia. Card de site pede paisagem; de app, quadrado. */
  ratio?: string;
  /** O que está incluso. Texto, não controle. */
  tags?: React.ReactNode[];
  /** Linha de contexto entre título e tags. */
  description?: React.ReactNode;
}

export function ShowcaseCard({
  title,
  href,
  media,
  ratio = "4 / 3",
  tags,
  description,
  className,
  ...props
}: ShowcaseCardProps) {
  // `relative` no article não é enfeite: é a âncora do `::after` do título, que
  // é o que faz o card inteiro virar alvo de clique sem um segundo link.
  return (
    <article
      className={cn("group @container relative flex flex-col gap-5", className)}
      {...props}
    >
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-[var(--r-surface,1rem)] bg-[var(--muted)]",
          "[&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover",
          "[&_img]:transition-transform [&_video]:transition-transform",
          "[&_img]:[transition-duration:var(--dur-slow)] [&_video]:[transition-duration:var(--dur-slow)]",
          "[&_img]:ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
          "group-hover:[&_img]:scale-[1.03] group-hover:[&_video]:scale-[1.03]",
          // Quem prefere menos movimento não paga o zoom.
          "motion-reduce:group-hover:[&_img]:scale-100 motion-reduce:group-hover:[&_video]:scale-100",
          // O foco de teclado desenha NA PLACA, não só no título: o alvo de
          // clique é o card inteiro, então é o card que precisa acender.
          "transition-shadow [transition-duration:var(--dur-fast,160ms)]",
          "group-focus-within:[box-shadow:var(--focus)]",
        )}
        style={{ aspectRatio: ratio }}
      >
        {media}

        {href ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute right-3 top-3 grid size-9 place-items-center rounded-[var(--r-pill,9999px)]",
              "bg-[var(--brand)] text-[var(--brand-foreground)]",
              "transition-transform [transition-duration:var(--dur-fast,180ms)]",
              "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
              // Teclado recebe o mesmo aceno que o mouse — o selo é a única
              // pista de que o card leva a algum lugar.
              "group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
              "group-focus-within:-translate-y-0.5 group-focus-within:translate-x-0.5",
              "motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0",
            )}
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {/* `cqi` = 1% da largura do card. Ver a nota do cabeçalho: com `vw` o
            título lia a janela e mentia em toda grade de mais de uma coluna. */}
        <h3 className="text-balance [font-family:var(--font-display,inherit)] text-[clamp(1.25rem,0.95rem+2.6cqi,1.75rem)] font-medium leading-[1.15] tracking-[-0.015em]">
          {href ? (
            <a
              href={href}
              className={cn(
                "text-[var(--foreground)] no-underline outline-none",
                // O card inteiro é o alvo de clique — daí o `::after`. O foco
                // acende a placa (acima), e não também aqui: dois sinais para o
                // mesmo evento é ruído, não reforço.
                "after:absolute after:inset-0 after:content-['']",
              )}
            >
              {title}
            </a>
          ) : (
            title
          )}
        </h3>

        {description ? (
          <p className="max-w-[54ch] text-pretty text-[14px] leading-[1.6] text-[var(--muted-foreground)]">
            {description}
          </p>
        ) : null}

        {tags?.length ? (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-[var(--r-pill,9999px)] bg-[var(--muted)] px-3.5 py-1.5",
                  "text-[13px] leading-none text-[var(--muted-foreground)]",
                )}
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
