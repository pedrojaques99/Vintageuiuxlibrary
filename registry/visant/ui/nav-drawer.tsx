"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

/**
 * Nav Drawer — o menu mobile feito uma vez, direito.
 *
 * ── Por que isto é um item do registry ────────────────────────────────────
 *
 * Num audit real de site entregue, "Experience Design" tirou **2 de 4**, e a
 * causa foi uma só: o botão de menu no mobile abria uma `<div>` escrita à mão.
 * Sem foco preso, sem `Escape`, sem `aria-expanded`, com o corpo da página
 * rolando por baixo. É o mesmo defeito toda vez, em todo projeto, porque menu
 * mobile é a peça que se escreve às onze da noite antes do deploy.
 *
 * Nada disso se resolve com CSS bonito, e nada disso é original: o
 * **Radix Dialog** já entrega prisão de foco, retorno do foco ao gatilho,
 * `Escape`, trava de rolagem, `aria-modal` e o par `aria-expanded`/`aria-controls`
 * no gatilho. O trabalho da casa aqui é a superfície e a entrada — não
 * reimplementar acessibilidade que já existe testada.
 *
 * ── Por que a animação é CSS e não Framer Motion ──────────────────────────
 *
 * Saída animada num portal exige `forceMount` + `AnimatePresence` + estado
 * espelhado — três peças pra manter sincronizadas, e é exatamente aí que o
 * drawer some antes da hora ou fica preso aberto. O Radix expõe
 * `data-state="open|closed"` e **espera a animação CSS terminar** antes de
 * desmontar. Uma `@keyframes` faz o trabalho, sem estado nenhum. É o motivo de
 * a animação morar no bloco `css` do item: instalar sem ela é instalar um
 * drawer que aparece a seco.
 *
 * ── A entrada escalonada, e por que o índice não vem do consumidor ─────────
 *
 * Os itens sobem em cascata de ~45ms. O `--i` de cada um é escrito pelo
 * `NavDrawerList`, que embrulha cada filho num `<li>` — pedir `index` na prop
 * seria transferir pro consumidor uma contabilidade que quebra em silêncio no
 * dia em que alguém reordena o menu.
 *
 * O teto do escalonamento é deliberado: a partir do 8º item o atraso congela.
 * Um menu de 14 links com cascata linear leva 630ms pra terminar de aparecer, e
 * nessa altura já não é elegância, é a interface fazendo a pessoa esperar.
 *
 * ── O que a peça NÃO faz ──────────────────────────────────────────────────
 *
 * · **Não decide o breakpoint.** Onde o menu vira drawer é decisão da navbar do
 *   projeto (`md:hidden` no gatilho). Cravar aqui obrigaria fork no primeiro
 *   cliente com menu curto.
 * · **Não sabe qual rota está ativa.** `active` entra por prop — a peça não
 *   importa o router de ninguém.
 * · **Não fecha sozinha ao navegar.** Em app com router de cliente, o clique no
 *   link não desmonta nada; use `NavDrawerClose asChild` em volta do link (o
 *   caminho normal) ou controle `open` por fora.
 */

export interface NavDrawerContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Dialog.Content>, "title"> {
  /** De onde o painel entra. `right` é o padrão do polegar destro. */
  side?: "right" | "left" | "top";
  /**
   * Obrigatório: é o nome do diálogo pro leitor de tela. Fica invisível a menos
   * que `showTitle`. Sem ele o Radix reclama no console — e com razão, porque um
   * diálogo sem nome é um buraco na navegação por voz.
   */
  title: React.ReactNode;
  showTitle?: boolean;
  /** Rodapé do painel: idioma, telefone, redes. Fica colado embaixo. */
  footer?: React.ReactNode;
}

export const NavDrawer = Dialog.Root;
export const NavDrawerTrigger = Dialog.Trigger;
export const NavDrawerClose = Dialog.Close;
export const NavDrawerPortal = Dialog.Portal;

export const NavDrawerContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  NavDrawerContentProps
>(({ side = "right", title, showTitle = false, footer, className, children, ...props }, ref) => (
  <Dialog.Portal>
    {/*
     * O véu não é só escurecer: o `backdrop-blur` é o que separa o painel de uma
     * página de fundo claro, onde sombra sozinha não aparece. E ele é o alvo de
     * clique-fora — que o Radix já liga sem precisar de `onClick` aqui.
     */}
    <Dialog.Overlay className="nav-drawer-overlay fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[2px]" />
    <Dialog.Content
      ref={ref}
      data-side={side}
      className={cn(
        "nav-drawer-panel fixed z-50 flex flex-col gap-6 bg-card text-foreground",
        "[box-shadow:var(--e-modal,0_24px_64px_-24px_rgb(0_0_0/0.45))]",
        "outline-none focus-visible:[box-shadow:var(--focus)]",
        // `100dvh` e não `100vh`: no Safari do iPhone o `vh` conta a barra de
        // endereço que já sumiu, e o rodapé do painel fica atrás do polegar.
        side === "top"
          ? "inset-x-0 top-0 max-h-[85dvh] rounded-b-[var(--r-surface,0.875rem)] px-6 pb-8 pt-6"
          : cn(
              "inset-y-0 h-dvh w-[min(92vw,26rem)] px-7 pb-8 pt-6",
              side === "right"
                ? "right-0 rounded-l-[var(--r-surface,0.875rem)]"
                : "left-0 rounded-r-[var(--r-surface,0.875rem)]",
            ),
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <Dialog.Title
          className={cn(
            "text-[length:var(--text-rotulo,0.6875rem)] uppercase tracking-[0.14em] text-muted-foreground",
            !showTitle && "sr-only",
          )}
        >
          {title}
        </Dialog.Title>
        <Dialog.Close
          aria-label="Fechar menu"
          className={cn(
            "-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-[var(--r-control,0.5rem)]",
            "text-muted-foreground transition-colors [transition-duration:var(--dur-fast,140ms)]",
            "hover:bg-muted hover:text-foreground",
            "outline-none focus-visible:[box-shadow:var(--focus)]",
          )}
        >
          {/* Ícone desenhado, nunca um caractere: "×" muda de forma e de peso a
              cada fonte de marca, e some quando a fonte não carrega. */}
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none">
            <path
              d="M3.5 3.5l9 9M12.5 3.5l-9 9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </Dialog.Close>
      </div>

      {/*
       * `overflow-y-auto` + `overscroll-contain`: com o menu longo o painel rola
       * sozinho, e o `contain` impede que a rolagem "vaze" pra página atrás
       * quando chega no fim da lista — o efeito de corrente que denuncia
       * overlay mal feito no iOS.
       */}
      <div className="-mx-2 flex-1 overflow-y-auto overscroll-contain px-2">{children}</div>

      {footer && (
        <div className="border-t border-border pt-5 text-[length:var(--text-apoio,0.8125rem)] text-muted-foreground">
          {footer}
        </div>
      )}
    </Dialog.Content>
  </Dialog.Portal>
));
NavDrawerContent.displayName = "NavDrawerContent";

/** Embrulha cada filho num `<li>` e escreve o `--i` da cascata. Ver a nota. */
export function NavDrawerList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className={cn("nav-drawer-list flex flex-col", className)} {...props}>
      {React.Children.toArray(children)
        .filter(React.isValidElement)
        .map((child, i) => (
          <li
            key={(child as React.ReactElement).key ?? i}
            // Teto em 7: ver a nota sobre menu de 14 links.
            style={{ "--i": Math.min(i, 7) } as React.CSSProperties}
          >
            {child}
          </li>
        ))}
    </ul>
  );
}

export interface NavDrawerItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Marca a rota atual. A peça não descobre isso sozinha — ver a nota. */
  active?: boolean;
  /** Número/rótulo à direita: contagem, ano, "novo". Nunca decoração. */
  meta?: React.ReactNode;
  /** Renderiza no filho — `<Link>` do Next, `<NavLink>` do router. */
  asChild?: boolean;
}

// `forwardRef` não é zelo: `<NavDrawerClose asChild>` em volta do item é o uso
// normal (fechar ao navegar), e o `Slot` do Radix passa uma ref. Sem encaminhar,
// o React avisa no console de todo projeto que usar a peça do jeito certo.
export const NavDrawerItem = React.forwardRef<HTMLAnchorElement, NavDrawerItemProps>(function NavDrawerItem(
  { active = false, meta, asChild = false, className, children, ...props },
  ref,
) {
  /*
   * `asChild` aqui não pode ser o `Slot` puro: o Slot funde props no filho mas
   * mantém os filhos DELE, e a peça precisa reparentar — o texto do link tem que
   * entrar dentro do `<span>` que carrega a régua. Com Slot, o `<Link>` do Next
   * viria com dois filhos (rótulo e meta) e estouraria no `Children.only`.
   * Clonar é o que faz o `<Link>` continuar sendo a âncora de verdade, com o
   * prefetch e o roteamento dele, e ainda assim receber a anatomia daqui.
   */
  const label = (
    <>
      {/*
       * O rótulo anda 6px no hover e a régua cresce por baixo. O deslocamento é
       * do SPAN e não do `<a>`: mover a âncora inteira move junto o alvo de
       * clique, e o item foge do cursor no instante em que a pessoa mira.
       */}
      <span className="nav-drawer-label relative inline-block">
        {asChild && React.isValidElement(children)
          ? (children as React.ReactElement<{ children?: React.ReactNode }>).props.children
          : children}
        <span
          aria-hidden="true"
          className="nav-drawer-rule absolute -bottom-0.5 left-0 block h-px w-full origin-left bg-[var(--brand,currentColor)]"
        />
      </span>
      {meta && (
        <span className="text-[length:var(--text-rotulo,0.6875rem)] tabular-nums tracking-[0.1em] text-muted-foreground">
          {meta}
        </span>
      )}
    </>
  );

  const shared = {
    ref,
    "data-active": active || undefined,
    className: cn(
      "nav-drawer-item group/nav relative flex items-baseline justify-between gap-4 py-3",
      "text-[length:var(--text-titulo,1.375rem)] font-medium tracking-[-0.02em]",
      "text-muted-foreground transition-colors [transition-duration:var(--dur-fast,140ms)]",
      "hover:text-foreground data-[active]:text-foreground",
      "outline-none focus-visible:[box-shadow:var(--focus)] focus-visible:rounded-[var(--r-control,0.5rem)]",
      className,
    ),
    ...props,
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(
      child,
      { ...shared, className: cn(shared.className, child.props.className as string) },
      label,
    );
  }

  return <a {...shared}>{label}</a>;
});

/**
 * O gatilho desenhado: dois traços que viram X quando o painel abre.
 *
 * Lê o `data-state` que o próprio `Dialog.Trigger` escreve, então não existe um
 * segundo estado pra manter em sincronia — o defeito clássico é o ícone ficar em
 * X depois de fechar por `Escape`, porque quem fechou não foi o clique.
 *
 * Use dentro de `<NavDrawerTrigger asChild>`.
 */
export const NavDrawerBurger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }
>(({ label = "Menu", className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-label={label}
    className={cn(
      "nav-drawer-burger group/burger grid size-11 place-items-center rounded-[var(--r-control,0.5rem)]",
      "text-foreground transition-colors [transition-duration:var(--dur-fast,140ms)] hover:bg-muted",
      "outline-none focus-visible:[box-shadow:var(--focus)]",
      className,
    )}
    {...props}
  >
    <span aria-hidden="true" className="relative block h-[10px] w-[22px]">
      <span className="burger-bar absolute left-0 top-0 block h-[1.5px] w-full rounded-full bg-current" />
      <span className="burger-bar absolute bottom-0 left-0 block h-[1.5px] w-full rounded-full bg-current" />
    </span>
  </button>
));
NavDrawerBurger.displayName = "NavDrawerBurger";
