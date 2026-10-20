import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SectionIntro — a abertura de dobra: rótulo, título e uma linha de contexto.
 *
 * Colhida de quatro referências de site de agência que repetiam o mesmo arranjo
 * com medidas diferentes. O que sempre saía torto quando cada dobra escrevia o
 * seu:
 *
 * 1. **Medida de linha.** Título e subtítulo pedem larguras DIFERENTES. Título
 *    grande quebra bonito em ~14 palavras; o subtítulo em ~65 caracteres. Uma
 *    `max-w` só para os dois deixa o subtítulo comprido demais ou o título
 *    apertado. Aqui são duas medidas, expostas em `titleWidth`/`leadWidth`.
 * 2. **`text-balance` no título, `text-pretty` no lead.** O título é curto e
 *    quer linhas de peso igual; o parágrafo só quer evitar órfã.
 * 3. **O rótulo é decoração.** Ele repete a navegação ("Serviços", "Benefícios")
 *    e não acrescenta nada para quem ouve a página — vai com `aria-hidden`.
 * 4. **Quatro composições por `layout`.** Centrada, dividida (título de um lado,
 *    contexto do outro), com índice de seção e editorial. A mesma anatomia de
 *    rótulo, título e contexto, arrumada dos jeitos que as referências
 *    repetiam. `align` continua valendo para quem já usava.
 *
 * As composições novas quebram pela largura do CONTAINER (`flex-wrap` com base
 * mínima), não da janela: abertura de dobra mora em coluna de qualquer largura,
 * e media query de viewport mente dentro de uma coluna de 700px.
 *
 * O nível do heading é `h2` por padrão porque isto é dobra, não topo de página.
 * Trocar por prop, nunca por CSS.
 */

export type SectionIntroLayout = "center" | "start" | "split" | "index" | "editorial";

export interface SectionIntroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** O texto do rótulo. Some quando ausente. */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** A linha de contexto abaixo do título. */
  lead?: React.ReactNode;
  /** Atalho antigo para `layout="center"` ou `layout="start"`. */
  align?: "center" | "start";
  /**
   * A composição da abertura:
   * · `center`: tudo no eixo, rótulo em pílula. O padrão.
   * · `start`: a mesma pilha, alinhada à esquerda.
   * · `split`: título à esquerda, contexto e ações à direita. Empilha sozinho
   *   quando o container aperta.
   * · `index`: o número da seção em corpo grande ao lado do título.
   * · `editorial`: fio de ponta a ponta com o rótulo em cima, título largo e o
   *   contexto recuado à direita, como abertura de capítulo.
   * Ausente, vale o `align`.
   */
  layout?: SectionIntroLayout;
  /** O número da seção ("01"), usado em `index` e `editorial`. */
  index?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  /** Medida do título, em ch. Título mais longo pede mais. */
  titleWidth?: number;
  /** Medida do parágrafo, em ch. Acima de ~70 o olho perde a volta da linha. */
  leadWidth?: number;
  /** Ações abaixo do lead — botão, link, o que o projeto quiser. */
  actions?: React.ReactNode;
}

const TITULO = cn(
  "text-balance [font-family:var(--font-display,inherit)] font-medium tracking-[-0.02em]",
  "text-[clamp(2rem,1.35rem+3.1vw,3.75rem)] leading-[1.06] text-[var(--foreground)]",
);
const LEAD = "text-pretty text-[15px] leading-[1.65] text-[var(--muted-foreground)]";
const ROTULO = "text-[13px] font-medium text-[var(--muted-foreground)]";

export function SectionIntro({
  eyebrow,
  title,
  lead,
  align = "center",
  layout,
  index,
  as: Heading = "h2",
  titleWidth = 20,
  leadWidth = 62,
  actions,
  className,
  ...props
}: SectionIntroProps) {
  const modo: SectionIntroLayout = layout ?? align;

  const contexto = lead ? (
    <p className={LEAD} style={{ maxWidth: `${leadWidth}ch` }}>
      {lead}
    </p>
  ) : null;
  const acoes = actions ? (
    <div className={cn("flex flex-wrap gap-3", modo === "center" && "justify-center")}>{actions}</div>
  ) : null;
  // Fora da pilha centrada o rótulo é texto, não pílula: ao lado de um fio ou
  // de um número grande, a pílula vira um terceiro elemento disputando o olho.
  const rotulo = eyebrow ? (
    <span aria-hidden="true" className={ROTULO}>
      {eyebrow}
    </span>
  ) : null;

  if (modo === "split") {
    return (
      <div
        className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-6", className)}
        {...props}
      >
        <div className="flex min-w-0 flex-[1_1_19rem] flex-col gap-4">
          {rotulo}
          <Heading className={TITULO} style={{ maxWidth: `${titleWidth}ch` }}>
            {title}
          </Heading>
        </div>
        {contexto || acoes ? (
          <div className="flex min-w-0 flex-[0_1_19rem] flex-col gap-5">
            {contexto}
            {acoes}
          </div>
        ) : null}
      </div>
    );
  }

  if (modo === "index") {
    return (
      <div className={cn("flex flex-wrap items-start gap-x-10 gap-y-4", className)} {...props}>
        {index != null ? (
          <span
            aria-hidden="true"
            className={cn(
              "shrink-0 [font-family:var(--font-display,inherit)] font-medium tabular-nums leading-[0.9]",
              "text-[clamp(3rem,2.2rem+3.6vw,5.5rem)] tracking-[-0.04em] text-[var(--muted-foreground)]",
            )}
          >
            {index}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-4">
          {rotulo}
          <Heading className={TITULO} style={{ maxWidth: `${titleWidth}ch` }}>
            {title}
          </Heading>
          {contexto}
          {acoes}
        </div>
      </div>
    );
  }

  if (modo === "editorial") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        {/* O fio é a moldura inteira da abertura: uma linha, sem caixa. */}
        <div className="flex items-baseline justify-between gap-4 border-t border-[var(--border)] pt-3">
          {rotulo ?? <span />}
          {index != null ? (
            <span aria-hidden="true" className={cn(ROTULO, "tabular-nums")}>
              {index}
            </span>
          ) : null}
        </div>
        <Heading className={TITULO} style={{ maxWidth: `${Math.max(titleWidth, 24)}ch` }}>
          {title}
        </Heading>
        {contexto || acoes ? (
          <div
            className="flex flex-col gap-5 self-end"
            style={{ maxWidth: `min(100%, ${Math.min(leadWidth, 46)}ch)` }}
          >
            {contexto}
            {acoes}
          </div>
        ) : null}
      </div>
    );
  }

  const centered = modo === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        centered ? "items-center text-center" : "items-start text-left",
        className,
      )}
      {...props}
    >
      {eyebrow ? (
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex items-center rounded-[var(--r-pill,9999px)] border border-[var(--border)]",
            "px-3.5 py-1.5 text-[13px] font-medium text-[var(--muted-foreground)]",
          )}
        >
          {eyebrow}
        </span>
      ) : null}

      <Heading className={TITULO} style={{ maxWidth: `${titleWidth}ch` }}>
        {title}
      </Heading>
      {contexto}
      {acoes}
    </div>
  );
}
