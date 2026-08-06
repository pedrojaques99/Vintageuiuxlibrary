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
 *
 * O nível do heading é `h2` por padrão porque isto é dobra, não topo de página.
 * Trocar por prop, nunca por CSS.
 */

export interface SectionIntroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** O texto da pílula. Some quando ausente. */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** A linha de contexto abaixo do título. */
  lead?: React.ReactNode;
  align?: "center" | "start";
  as?: "h1" | "h2" | "h3";
  /** Medida do título, em ch. Título mais longo pede mais. */
  titleWidth?: number;
  /** Medida do parágrafo, em ch. Acima de ~70 o olho perde a volta da linha. */
  leadWidth?: number;
  /** Ações abaixo do lead — botão, link, o que o projeto quiser. */
  actions?: React.ReactNode;
}

export function SectionIntro({
  eyebrow,
  title,
  lead,
  align = "center",
  as: Heading = "h2",
  titleWidth = 20,
  leadWidth = 62,
  actions,
  className,
  ...props
}: SectionIntroProps) {
  const centered = align === "center";

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

      <Heading
        className={cn(
          "text-balance [font-family:var(--font-display,inherit)] font-medium tracking-[-0.02em]",
          "text-[clamp(2rem,1.35rem+3.1vw,3.75rem)] leading-[1.06] text-[var(--foreground)]",
        )}
        style={{ maxWidth: `${titleWidth}ch` }}
      >
        {title}
      </Heading>

      {lead ? (
        <p
          className="text-pretty text-[15px] leading-[1.65] text-[var(--muted-foreground)]"
          style={{ maxWidth: `${leadWidth}ch` }}
        >
          {lead}
        </p>
      ) : null}

      {actions ? (
        <div className={cn("flex flex-wrap gap-3", centered && "justify-center")}>{actions}</div>
      ) : null}
    </div>
  );
}
