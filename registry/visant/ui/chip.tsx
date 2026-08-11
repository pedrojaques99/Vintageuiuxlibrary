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
 * ── `onRemove`: o segundo papel ─────────────────────────────────────────────
 * Uma tela de filtro tem dois chips, e o Linear mostra os dois lado a lado: o que
 * **liga e desliga** uma faceta (este, com `pressed`) e o que representa um filtro
 * **já aplicado** e some quando clicado.
 *
 * Eram dois componentes quase idênticos em dois repos. Aqui é uma prop, porque a
 * anatomia é a mesma e só a semântica muda:
 *
 * - com `onRemove`, o chip **perde o `aria-pressed`** — remover é ação, não estado
 *   de dois valores. Anunciar "pressionado" mentiria sobre o que o clique faz.
 * - o clique inteiro remove, não só o `×`. Um alvo de 10px reprova em toque, e o
 *   chip aplicado não tem outra ação para disputar o clique.
 * - o nome acessível vira "Remover filtro X" quando `children` é texto. Sem isso o
 *   leitor de tela anuncia só o rótulo, e "Urgente" não avisa que clicar apaga.
 *   Com `children` composto, passe `aria-label` na mão.
 *
 * Um filtro aplicado normalmente também quer `pressed`. A prop não é implícita de
 * propósito: quem monta a barra decide se o chip aplicado lê como preenchido.
 */

export interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  pressed?: boolean;
  count?: number;
  icon?: React.ReactNode;
  /** Torna o chip removível: renderiza o `×` e o clique inteiro remove. */
  onRemove?: () => void;
}

export function Chip({
  pressed = false,
  count,
  icon,
  onRemove,
  children,
  className,
  onClick,
  // Sai do `props` de propósito: o `{...props}` é espalhado DEPOIS dos atributos
  // no JSX, então um `aria-label` que ficasse lá dentro sobrescreveria o rótulo
  // calculado abaixo — com `undefined`, apagando o nome acessível do chip
  // removível justamente quando o consumidor não passou nenhum.
  "aria-label": ariaLabel,
  ...props
}: ChipProps) {
  const removable = typeof onRemove === "function";

  return (
    <button
      type="button"
      // Ação não é estado — ver o bloco acima.
      aria-pressed={removable ? undefined : pressed}
      aria-label={
        ariaLabel ??
        (removable && typeof children === "string" ? `Remover filtro ${children}` : undefined)
      }
      onClick={(event) => {
        onClick?.(event);
        // `preventDefault` no handler de fora cancela a remoção — é a válvula para
        // quem precisa confirmar antes de apagar.
        if (event.defaultPrevented) return;
        onRemove?.();
      }}
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap border px-3.5 py-2",
        "text-[13px] font-semibold",
        "border-[var(--border)] text-[var(--foreground)]",
        "transition-[background-color,color,border-color,transform]",
        "[transition-duration:var(--dur-press,120ms)]",
        "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
        // Foco visível é portão do registry, não enfeite.
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        "hover:border-[var(--foreground)]",
        "active:scale-[0.97]",
        pressed &&
          "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]",
        className,
      )}
      {...props}
    >
      {icon ? <span className="shrink-0 [&_svg]:overflow-visible">{icon}</span> : null}
      <span>{children}</span>
      {/* Zero não é informação. */}
      {typeof count === "number" && count > 0 ? (
        <span className="opacity-60 tabular-nums">{count}</span>
      ) : null}
      {removable ? (
        // `aria-hidden`: o nome acessível já está no botão. Anunciar o × de novo
        // faria o leitor de tela ler "Remover filtro Urgente, X".
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="h-2.5 w-2.5 shrink-0 opacity-70"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M2 2l8 8M10 2l-8 8" />
        </svg>
      ) : null}
    </button>
  );
}
