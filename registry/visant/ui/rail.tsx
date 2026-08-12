"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Rail — trilho horizontal com scroll-snap nativo.
 *
 * Colhido do concept Hockey Direct. Carrossel de produto é padrão de loja
 * grande, e aqui é CSS nativo: sem biblioteca, sem sequestro de rolagem,
 * arrasta no telefone de graça.
 *
 * O detalhe que faz a diferença comercial: **o item parcialmente visível na
 * borda é o que conta ao olho que a gama continua.** Por isso a largura de
 * coluna nunca fecha exata no viewport.
 *
 * As setas desabilitam nas pontas — um controle que não faz nada mente sobre
 * o estado da lista.
 *
 * O trilho é **uma** parada de Tab: dentro dele, ←/→ e Home/End andam pelos
 * itens. Sem isso, três trilhos numa página viram vinte e uma paradas de
 * teclado antes do primeiro campo útil. Ver a nota no `ancorar()`.
 */

export interface RailProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Largura mínima de cada item. */
  itemWidth?: number;
  gap?: number;
  /** Setas de navegação (só aparecem onde há ponteiro). */
  arrows?: boolean;
  label?: string;
}

export function Rail({
  children,
  itemWidth = 240,
  gap = 20,
  arrows = true,
  label = "Scrollable list",
  className,
  ...props
}: RailProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edge, setEdge] = React.useState({ start: true, end: false });

  const sync = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft < 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    });
  }, []);

  React.useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  const nudge = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  /**
   * ── Tabindex rotativo: o trilho é UMA parada de Tab ────────────────────────
   *
   * Medido antes de existir, numa tela com três trilhos: eram **21 paradas de
   * Tab** até o campo de busca, 17 delas cards. Quem navega por teclado tinha
   * que atravessar três trilhos inteiros pra chegar no que queria — a forma
   * clássica de carrossel quebrar acessibilidade sem quebrar nada visível.
   *
   * O padrão certo pra lista horizontal é o de widget composto: Tab entra e sai
   * do trilho, ←/→ andam por dentro, Home/End vão pras pontas. Aqui o alcance é
   * feito por **DOM e não por prop injetada**, de propósito: assim vale pra
   * QUALQUER foco dentro do item — inclusive um botão secundário no card, que
   * uma prop no link não alcançaria.
   */
  const itens = React.useCallback(
    () => Array.from((ref.current?.children ?? []) as HTMLCollectionOf<HTMLElement>),
    [],
  );
  const focaveisDe = (item: HTMLElement) =>
    Array.from(item.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]"));

  /** Só o item ativo é alcançável por Tab; o resto responde a seta. */
  const ancorar = React.useCallback(
    (ativo: number) => {
      itens().forEach((item, i) => {
        focaveisDe(item).forEach((f) => {
          if (i === ativo) f.removeAttribute("tabindex");
          else f.setAttribute("tabindex", "-1");
        });
      });
    },
    [itens],
  );

  React.useEffect(() => {
    ancorar(0);
  }, [ancorar, children]);

  const irPara = (i: number) => {
    const lista = itens();
    const alvo = lista[Math.max(0, Math.min(i, lista.length - 1))];
    if (!alvo) return;
    ancorar(lista.indexOf(alvo));
    focaveisDe(alvo)[0]?.focus();
  };

  const teclado = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const lista = itens();
    const atual = lista.findIndex((it) => it.contains(document.activeElement));
    if (atual === -1) return;
    const passo =
      e.key === "ArrowRight" ? atual + 1
      : e.key === "ArrowLeft" ? atual - 1
      : e.key === "Home" ? 0
      : e.key === "End" ? lista.length - 1
      : null;
    if (passo === null) return;
    e.preventDefault();
    irPara(passo);
  };

  /**
   * Focar por dentro de um item que não era o ativo passa a âncora pra ele. Sem
   * isto, sair do trilho e voltar com Tab jogaria o foco no primeiro item de
   * novo, perdendo o lugar de quem estava lendo.
   */
  const aoFocar = (e: React.FocusEvent<HTMLDivElement>) => {
    const lista = itens();
    const i = lista.findIndex((it) => it.contains(e.target as Node));
    if (i > 0) ancorar(i);
  };

  return (
    <div className={cn("relative", className)} {...props}>
      {arrows && (
        <div className="mb-3 hidden justify-end gap-2 lg:flex">
          <RailButton dir="prev" disabled={edge.start} onClick={() => nudge(-1)} />
          <RailButton dir="next" disabled={edge.end} onClick={() => nudge(1)} />
        </div>
      )}

      <div
        ref={ref}
        role="group"
        aria-label={label}
        onScroll={sync}
        onKeyDown={teclado}
        onFocus={aoFocar}
        className={cn(
          "grid grid-flow-col overflow-x-auto overscroll-x-contain pb-3",
          "[scroll-snap-type:x_proximity]",
          "[&>*]:min-w-0 [&>*]:[scroll-snap-align:start]",
          "[scrollbar-width:thin]",
        )}
        style={{
          gridAutoColumns: `minmax(${itemWidth}px, 1fr)`,
          gap: `${gap}px`,
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RailButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      /* `tabIndex={-1}` de propósito. As setas são afordância de PONTEIRO: pra
         teclado, ←/→ e Home/End já fazem o mesmo e fazem melhor, porque movem o
         foco junto em vez de rolar deixando o cursor fora da tela. Mantê-las na
         ordem de Tab adicionava duas paradas por trilho cuja única função era
         duplicar uma tecla que já funciona. Nenhum conteúdo fica inalcançável:
         todos os itens seguem acessíveis por dentro do trilho. */
      tabIndex={-1}
      aria-label={dir === "prev" ? "Scroll left" : "Scroll right"}
      className={cn(
        "inline-flex size-10 items-center justify-center border border-[var(--border)]",
        "transition-[background-color,border-color,color,transform]",
        "[transition-duration:var(--dur-press,120ms)]",
        "hover:border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)]",
        "active:scale-[0.94]",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}
