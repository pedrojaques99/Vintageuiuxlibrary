import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CtaSurface — a superfície de conversão no fim da dobra.
 *
 * Cinco referências de site de agência entraram aqui: a barra lime de uma linha,
 * o painel escuro com a marca em cima, o banner com avatares, o card estreito de
 * "ainda tem dúvida?" e o card de agendar call. **São a mesma peça.** O que muda
 * é a proporção (`variant`) e quem paga o contraste (`tone`) — não o desenho.
 *
 * Colher os cinco separados teria criado cinco CTAs quase iguais no registry, e
 * a correção de um deixaria os outros quatro para trás.
 *
 * Decisões que custam caro quando se erra:
 *
 * - **O tom decide a cor do botão, não o consumidor.** Numa superfície `brand` o
 *   botão precisa ser o fundo da página; numa `ink`, a cor da marca. Deixar isso
 *   a cargo de quem usa é como o CTA sai invisível em metade dos clientes. Por
 *   isso `CtaAction` lê `data-tone` do ancestral em vez de receber cor.
 * - **`backdrop` é conteúdo, não estilo.** Gradiente e foto das referências são
 *   da marca de cada um; entram por slot, atrás de uma camada de isolamento, e o
 *   componente continua sem cor própria.
 * - **`variant="bar"` empilha no celular.** A barra de uma linha só existe
 *   enquanto cabe; abaixo de `sm` ela vira duas linhas, senão o botão encolhe
 *   até virar alvo de toque impossível.
 */

type Tone = "brand" | "ink" | "surface";
type Variant = "bar" | "panel" | "card";

const TONE: Record<Tone, string> = {
  brand: "bg-[var(--brand)] text-[var(--brand-foreground)]",
  ink: "bg-[var(--foreground)] text-[var(--background)]",
  surface: "bg-[var(--muted)] text-[var(--foreground)]",
};

export interface CtaSurfaceProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  variant?: Variant;
  tone?: Tone;
  title: React.ReactNode;
  /** Linha de contexto. A barra ignora — de propósito: barra é uma frase só. */
  lead?: React.ReactNode;
  /** Botões. Use `CtaAction` para herdar o contraste do tom. */
  actions?: React.ReactNode;
  /** Marca, ícone ou pilha de avatares acima do título. */
  mark?: React.ReactNode;
  /** A linha miúda embaixo: prazo de resposta, "sem cartão", e afins. */
  footnote?: React.ReactNode;
  /** Camada decorativa atrás do conteúdo (gradiente, foto, ruído). */
  backdrop?: React.ReactNode;
}

export function CtaSurface({
  variant = "panel",
  tone = "brand",
  title,
  lead,
  actions,
  mark,
  footnote,
  backdrop,
  className,
  children,
  ...props
}: CtaSurfaceProps) {
  const bar = variant === "bar";
  const card = variant === "card";

  return (
    <section
      data-tone={tone}
      className={cn(
        "relative isolate overflow-hidden rounded-[var(--r-surface,1rem)]",
        TONE[tone],
        bar && "px-6 py-6 sm:px-9",
        variant === "panel" && "px-6 py-14 text-center sm:px-12 sm:py-20",
        card && "px-6 py-7",
        className,
      )}
      {...props}
    >
      {backdrop ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {backdrop}
        </div>
      ) : null}

      <div
        className={cn(
          bar && "flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between",
          variant === "panel" && "mx-auto flex max-w-[46rem] flex-col items-center gap-5",
          card && "flex flex-col items-start gap-4",
        )}
      >
        {/* A barra não tem altura para uma marca: ela é uma linha e um botão. */}
        {mark && !bar ? <div>{mark}</div> : null}

        <div className={cn(bar && "flex min-w-0 flex-col gap-1.5", variant === "panel" && "contents")}>
          <h2
            className={cn(
              "text-balance [font-family:var(--font-display,inherit)] font-medium tracking-[-0.02em]",
              bar && "text-[clamp(1.0625rem,0.95rem+0.5vw,1.375rem)] leading-[1.3]",
              variant === "panel" &&
                "text-[clamp(1.75rem,1.2rem+2.6vw,3rem)] leading-[1.08]",
              card && "text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] leading-[1.12]",
            )}
          >
            {title}
          </h2>

          {/* Barra é uma frase só: um lead ali empurra o botão para fora da linha. */}
          {lead && !bar ? (
            <p className="max-w-[62ch] text-pretty text-[15px] leading-[1.6] opacity-80">{lead}</p>
          ) : null}

          {/* Na barra o rodapé fica junto do texto — some seria perder informação. */}
          {footnote && bar ? (
            <p className="text-[13px] leading-[1.5] opacity-70">{footnote}</p>
          ) : null}
        </div>

        {children}

        {actions ? (
          <div
            className={cn(
              "flex flex-wrap items-center gap-3",
              bar && "shrink-0",
              variant === "panel" && "justify-center pt-3",
              card && "w-full [&>*]:w-full",
            )}
          >
            {actions}
          </div>
        ) : null}

        {footnote && !bar ? (
          <p className="text-[13px] leading-[1.5] opacity-70">{footnote}</p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * O botão da superfície. `variant="solid"` é o primário — e a cor dele é o
 * NEGATIVO do tom, resolvido por seletor de atributo, não por prop.
 */
export interface CtaActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "outline";
  /** Vira `<a>` quando presente. Um CTA que navega precisa ser link. */
  href?: string;
}

export function CtaAction({
  variant = "solid",
  href,
  className,
  children,
  ...props
}: CtaActionProps) {
  const Tag = (href ? "a" : "button") as "button";

  return (
    <Tag
      {...(href ? { href } : { type: "button" })}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-pill,9999px)]",
        "px-6 text-[15px] font-semibold no-underline",
        "min-h-[var(--control-h,2.75rem)] py-2.5",
        // Só transform, sombra e cor — nada de `transition-all`, que arrasta
        // layout junto e engasga.
        "transition-[transform,box-shadow,background-color,border-color,color]",
        "[transition-duration:var(--dur-fast,160ms)]",
        "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
        "focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
        // O toque responde antes da cor: `--dur-press` é mais curto que o hover
        // de propósito, porque afundar tem de parecer instantâneo.
        "active:scale-[0.98] active:[transition-duration:var(--dur-press,120ms)]",
        "motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        variant === "solid" && [
          // Em fundo de marca ou tinta, o sólido é o fundo da página.
          "bg-[var(--background)] text-[var(--foreground)]",
          // Em superfície neutra não há contraste a tomar emprestado: usa a marca.
          "[[data-tone=surface]_&]:bg-[var(--brand)] [[data-tone=surface]_&]:text-[var(--brand-foreground)]",
          // Levanta em vez de desbotar. `hover:opacity` num botão sólido lava o
          // texto e faz a peça parecer desabilitada bem na hora do convite.
          "hover:-translate-y-px hover:[box-shadow:var(--e-raised)]",
        ],
        variant === "outline" && [
          "border border-current bg-transparent",
          "hover:bg-current/10 hover:-translate-y-px",
        ],
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
