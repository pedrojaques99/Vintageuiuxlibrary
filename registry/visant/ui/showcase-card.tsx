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
    <article className={cn("group relative flex flex-col gap-5", className)} {...props}>
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-[var(--r-surface,1rem)] bg-[var(--muted)]",
          "[&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover",
          "[&_img]:transition-transform [&_video]:transition-transform",
          "[&_img]:duration-[var(--dur-slow,600ms)] [&_video]:duration-[var(--dur-slow,600ms)]",
          "[&_img]:ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
          "group-hover:[&_img]:scale-[1.03] group-hover:[&_video]:scale-[1.03]",
          // Quem prefere menos movimento não paga o zoom.
          "motion-reduce:group-hover:[&_img]:scale-100 motion-reduce:group-hover:[&_video]:scale-100",
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
              "group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
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
        <h3 className="text-balance [font-family:var(--font-display,inherit)] text-[clamp(1.25rem,1.05rem+0.8vw,1.75rem)] font-medium leading-[1.15] tracking-[-0.015em]">
          {href ? (
            <a
              href={href}
              className={cn(
                "text-[var(--foreground)] no-underline outline-none",
                // O card inteiro é o alvo, mas o foco desenha no título.
                "after:absolute after:inset-0 after:content-['']",
                "focus-visible:underline focus-visible:decoration-[var(--brand)] focus-visible:decoration-2 focus-visible:underline-offset-4",
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
