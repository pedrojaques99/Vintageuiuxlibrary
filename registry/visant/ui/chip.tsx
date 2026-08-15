"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Chip — pastilha de filtro.
 *
 * Colhida do concept Hockey Direct. É o gesto que o comprador de loja grande já
 * tem no dedo: nada de inventar controle novo numa superfície de compra.
 *
 * Duas coisas que parecem detalhe e não são:
 *
 * 1. **`aria-pressed`, não `aria-selected`.** Um filtro é um botão de dois
 *    estados, não um item de lista selecionado. O leitor de tela anuncia
 *    "pressionado", que é a verdade.
 * 2. **`count` nunca renderiza zero.** Zero não é informação — um filtro que
 *    mostra "(0)" ocupa espaço para dizer que não serve. Ele some.
 *
 * O `icon` existe para o caso em que o dado da loja cabe dentro do controle:
 * no Hockey Direct é a curva do bow desenhada em SVG, herdando `currentColor`,
 * então ela acompanha o estado sem uma linha de CSS a mais.
 *
 * ── O que faltava: a pastilha não tinha anatomia ───────────────────────────
 *
 * Ela era uma caixa que trocava de cor. Três buracos, e os três aparecem no
 * primeiro minuto de uso:
 *
 * 1. **Ligado e desligado tinham o mesmo peso.** Invertia fundo e texto em
 *    `--foreground`, que é a mesma tinta do texto de qualquer lugar da página:
 *    o estado ligado lia como "hover que ficou". Agora o ligado é a MARCA
 *    (`--brand`), a única tinta da tela que só aparece quando algo está
 *    escolhido — e o par `--brand-foreground` vem junto, então o contraste é o
 *    do tema e não uma aposta.
 * 2. **Ligar não era um evento.** A troca era instantânea e sem gesto. Agora
 *    entra a marca de conferido, e ela ENTRA: a coluna de grade vai de `0fr` a
 *    `1fr`, então a pastilha ganha largura enquanto o traço aparece. É a
 *    técnica padrão de animar largura desconhecida sem `max-width` chutado, e
 *    é o único movimento da peça — quem pediu `prefers-reduced-motion` recebe
 *    o mesmo estado final, sem a transição.
 * 3. **Não sabia sumir de leve nem receber foco.** Facetas vazias ficam
 *    `disabled` numa barra de filtro de verdade (contagem zero é comum quando
 *    dois eixos se cruzam), e o anel de foco não existia — o teclado atravessava
 *    a barra às cegas. O anel é `outline`, não `box-shadow`, porque `shadow-[var(…)]`
 *    morre no valor inicial de `--tw-shadow` (ver `scripts/css-tokens-check.mjs`).
 *
 * O espaçamento interno é margem por parte, e não `gap` do flex, exatamente por
 * causa da marca: um filho de largura zero ainda consome uma goteira, e a
 * pastilha desligada nasceria com 8px de vão à esquerda sem nada dentro.
 */

export interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  pressed?: boolean;
  count?: number;
  icon?: React.ReactNode;
  /** `sm` para barra densa (linha de facetas), `md` para a barra principal. */
  size?: "sm" | "md";
  /**
   * A marca de conferido que cresce quando liga.
   *
   * Desligue em pastilha que é escolha ÚNICA dentro de um grupo (um segmentado
   * disfarçado): ali a cor cheia já é a resposta e o traço vira redundância que
   * mexe na largura de todo mundo a cada troca.
   */
  mark?: boolean;
}

export function Chip({
  pressed = false,
  count,
  icon,
  size = "md",
  mark = true,
  children,
  className,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? "on" : "off"}
      className={cn(
        "inline-flex items-center whitespace-nowrap border font-semibold",
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-2 text-[13px]",
        "border-[var(--border)] text-[var(--foreground)]",
        "transition-[background-color,color,border-color,transform]",
        "[transition-duration:var(--dur-press,120ms)]",
        "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
        "hover:border-[var(--foreground)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--brand,var(--foreground))]",
        "active:scale-[0.97] motion-reduce:active:scale-100",
        "disabled:pointer-events-none disabled:opacity-40",
        pressed &&
          "border-[var(--brand,var(--foreground))] bg-[var(--brand,var(--foreground))] text-[var(--brand-foreground,var(--background))]",
        className,
      )}
      {...props}
    >
      {mark ? (
        <span
          aria-hidden="true"
          className={cn(
            "grid transition-[grid-template-columns,opacity]",
            "[transition-duration:var(--dur-fast,160ms)]",
            "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
            "motion-reduce:transition-none",
            pressed ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0",
          )}
        >
          <span className="overflow-hidden">
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1.5 block"
            >
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          </span>
        </span>
      ) : null}

      {icon ? (
        <span className={cn("shrink-0 [&_svg]:overflow-visible", size === "sm" ? "mr-1.5" : "mr-2")}>
          {icon}
        </span>
      ) : null}

      <span>{children}</span>

      {/* Zero não é informação. */}
      {typeof count === "number" && count > 0 ? (
        // Fio antes da contagem: ela é outro campo, não a continuação do nome.
        // `border-current` com opacidade herda o estado — no ligado o fio é da
        // cor do texto sobre a marca, sem uma segunda regra pro caso invertido.
        <span
          className={cn(
            "ml-2 border-l border-current/25 pl-2 tabular-nums",
            pressed ? "opacity-80" : "opacity-55",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
