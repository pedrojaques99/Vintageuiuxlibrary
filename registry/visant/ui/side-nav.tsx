"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * SideNav — a navegação lateral de aplicação: colapsa, agrupa, lembra.
 *
 * ── Por que não se chama `sidebar`, e por que não é o `nav-drawer` esticado ─
 *
 * O nome não é `sidebar` de propósito. O shadcn publica um `sidebar` próprio, e
 * dois itens com o mesmo nome escrevem no mesmo `components/ui/sidebar.tsx`: o
 * segundo `add` apaga o primeiro, em silêncio, num projeto que já usava o outro.
 * `side-nav` também é mais honesto sobre o que a peça é — ela é NAVEGAÇÃO, com
 * landmark, `aria-current` e grupos; não é um painel lateral genérico.
 *
 * E ela não é o `@visant/nav-drawer` com outra pele. A gaveta é um DIÁLOGO: ela
 * cobre a página, prende o foco, fecha no `Escape` e devolve o foco ao gatilho —
 * é isso que um menu mobile precisa ser, e é isso que o Radix Dialog entrega
 * pronto. Esta aqui é o oposto: mora no layout, nunca cobre nada, não prende
 * foco nenhum e é a única coisa da tela que **continua igual entre as rotas**.
 * Esticar a gaveta produziria um diálogo permanentemente aberto, com trava de
 * rolagem na página inteira. São duas peças porque são dois papéis.
 *
 * O que as duas compartilham, e isso sim é de propósito: a mesma anatomia de
 * item (rótulo + `meta` à direita), o mesmo par `data-active`/`aria-current`, o
 * mesmo `asChild` por clonagem pro `<Link>` do projeto continuar sendo a âncora
 * de verdade, e o mesmo foco — `--focus`, nunca o anel do navegador.
 *
 * ── As quatro decisões que se paga caro pra descobrir ──────────────────────
 *
 * 1. **O estado é lido DEPOIS de montar.** `localStorage` não existe em SSR, e
 *    ler no `useState` inicial entregaria um HTML colapsado sobre uma hidratação
 *    expandida — o React reclama e a barra pisca de largura no primeiro quadro.
 *    Aqui o primeiro render é sempre o `defaultCollapsed`, e o valor guardado
 *    chega num efeito. Mesma regra do banco de mídia da vitrine.
 * 2. **O rótulo não sai do DOM quando colapsa.** Ele vira `sr-only`. Um ícone
 *    sozinho não tem nome acessível, e a barra colapsada viraria uma coluna de
 *    sete desenhos sem nome nenhum pra quem navega por leitor de tela. De quebra
 *    o `title` cobre o ponteiro, que também não adivinha ícone.
 * 3. **O atalho ignora campo de texto.** Sem essa guarda, `Ctrl/⌘ + B` dentro de
 *    um editor de texto do app colapsa a navegação em vez de negritar — e o
 *    defeito só aparece no dia em que o app ganha um editor.
 * 4. **Seta não navega aqui.** Uma lista de links dentro de um landmark de
 *    navegação é percorrida com Tab, e é o que o leitor de tela já anuncia. O
 *    tabindex rotativo do `@visant/rail` existe porque um trilho horizontal de
 *    vinte cards viraria vinte paradas de Tab antes do conteúdo; a barra lateral
 *    é a navegação, e as paradas dela são o ponto. Sequestrar ↑/↓ aqui só
 *    quebraria a rolagem de uma barra com muitos itens.
 *
 * A peça continua sem saber qual rota está ativa: `active` entra por prop. Ela
 * não importa o router de ninguém.
 */

interface SideNavCtx {
  collapsed: boolean;
  alternar: () => void;
  /** Id do `<nav>`, pro `aria-controls` do gatilho apontar pra algum lugar. */
  navId: string;
}

const Ctx = React.createContext<SideNavCtx | null>(null);

function useSideNav(quem: string) {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error(`<${quem}> precisa estar dentro de <SideNav>.`);
  return ctx;
}

export interface SideNavProps extends React.HTMLAttributes<HTMLElement> {
  /** Estado inicial quando não há nada guardado. */
  defaultCollapsed?: boolean;
  /** Controle externo. Passando isto, a peça para de guardar sozinha. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Chave do `localStorage`. `false` desliga a persistência. */
  storageKey?: string | false;
  /**
   * A tecla do atalho, sempre com `Ctrl`/`⌘`. `false` desliga.
   *
   * `"b"` é o padrão porque é o que VS Code, Linear e o próprio shadcn usam pra
   * a mesma coisa — atalho de aplicação é convenção, não invenção.
   */
  shortcut?: string | false;
  /** Nome do landmark. Duas navegações na mesma tela precisam de nomes diferentes. */
  label?: string;
  /** Marca no topo. Slot, porque cada projeto tem o componente de logo dele. */
  brand?: React.ReactNode;
  /** Rodapé colado embaixo: conta, tema, versão. */
  footer?: React.ReactNode;
  /**
   * O gatilho de colapso no topo da própria barra.
   *
   * Ele mora AQUI dentro porque o contexto que carrega o estado mora aqui: um
   * `<SideNavToggle>` solto no header do app estaria fora do provider e
   * estouraria no primeiro render. Quem quer o gatilho no header do app usa o
   * par controlado (`collapsed` + `onCollapsedChange`) e desenha o botão dele —
   * é o mesmo trato do `nav-drawer`, que também não decide onde fica o gatilho.
   */
  toggle?: boolean;
  /** Largura aberta, em rem. */
  width?: number;
  /** Largura colapsada, em rem. Tem que caber um alvo de toque de 44px. */
  collapsedWidth?: number;
}

export function SideNav({
  defaultCollapsed = false,
  collapsed: collapsedProp,
  onCollapsedChange,
  storageKey = "visant:side-nav",
  shortcut = "b",
  label = "Navegação principal",
  brand,
  footer,
  toggle = true,
  width = 15,
  collapsedWidth = 3.75,
  className,
  style,
  children,
  ...props
}: SideNavProps) {
  const navId = React.useId();
  const controlado = collapsedProp !== undefined;
  const [interno, setInterno] = React.useState(defaultCollapsed);
  const collapsed = controlado ? collapsedProp : interno;

  // Ver a decisão 1: o valor guardado chega depois do primeiro render.
  React.useEffect(() => {
    if (controlado || !storageKey) return;
    try {
      const guardado = localStorage.getItem(storageKey);
      if (guardado === "1" || guardado === "0") setInterno(guardado === "1");
    } catch {
      /* modo privado, storage bloqueado: segue com o padrão */
    }
  }, [controlado, storageKey]);

  const definir = React.useCallback(
    (valor: boolean) => {
      onCollapsedChange?.(valor);
      if (controlado) return;
      setInterno(valor);
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, valor ? "1" : "0");
      } catch {
        /* idem */
      }
    },
    [controlado, onCollapsedChange, storageKey],
  );

  // `ref` e não dependência: o listener é registrado uma vez, e não quero
  // remontá-lo a cada troca de estado — atalho que se re-registra é atalho que
  // perde tecla no meio de um `keydown` repetido.
  const estado = React.useRef({ collapsed, definir });
  estado.current = { collapsed, definir };

  React.useEffect(() => {
    if (!shortcut) return;
    const alvo = shortcut.toLowerCase();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== alvo || !(e.metaKey || e.ctrlKey)) return;

      // Ver a decisão 3: dentro de campo de texto o atalho é de quem digita.
      const foco = document.activeElement as HTMLElement | null;
      if (
        foco &&
        (foco.isContentEditable ||
          foco.tagName === "INPUT" ||
          foco.tagName === "TEXTAREA" ||
          foco.tagName === "SELECT")
      ) {
        return;
      }

      e.preventDefault();
      estado.current.definir(!estado.current.collapsed);
    };

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [shortcut]);

  const valor = React.useMemo<SideNavCtx>(
    () => ({ collapsed, alternar: () => definir(!collapsed), navId }),
    [collapsed, definir, navId],
  );

  return (
    <Ctx.Provider value={valor}>
      <nav
        id={navId}
        aria-label={label}
        data-collapsed={collapsed ? "" : undefined}
        className={cn(
          "group/sidenav flex h-full flex-col gap-4 border-r border-[var(--border)]",
          "bg-[var(--card,var(--background))] py-4 text-[var(--foreground)]",
          // Só `width`, nunca `transition-all`: numa barra com trinta itens o
          // `all` arrasta cor, sombra e transform de cada um deles junto.
          "transition-[width] [transition-duration:var(--dur-base,220ms)]",
          "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
          "motion-reduce:transition-none",
          className,
        )}
        style={{ width: `${collapsed ? collapsedWidth : width}rem`, ...style }}
        {...props}
      >
        {brand || toggle ? (
          // Colapsada, a fileira vira coluna: 3,75rem não comportam marca e
          // gatilho lado a lado, e esconder a marca faria o único momento em que
          // a barra encolhe ser também o único em que a marca some da tela.
          <div
            className={cn(
              "flex min-h-9 items-center gap-2 px-3",
              "group-data-[collapsed]/sidenav:flex-col group-data-[collapsed]/sidenav:gap-3",
              "group-data-[collapsed]/sidenav:px-0",
            )}
          >
            {brand ? (
              <div className="min-w-0 flex-1 truncate group-data-[collapsed]/sidenav:flex-none">
                {brand}
              </div>
            ) : null}
            {toggle ? <SideNavToggle className="ml-auto group-data-[collapsed]/sidenav:ml-0" /> : null}
          </div>
        ) : null}

        {/*
         * `overflow-y-auto` + `overscroll-contain`: barra com muitos grupos rola
         * sozinha, e o `contain` impede que a rolagem vaze pro conteúdo do app
         * quando chega no fim — o efeito de corrente que denuncia painel mal
         * feito. `overflow-x-clip` e não `hidden` porque `hidden` criaria um
         * segundo contêiner de rolagem, e no meio da transição de largura o
         * rótulo ainda não cabe: sem o corte, aparece uma barra horizontal que
         * pisca a cada colapso.
         */}
        <div className="flex-1 overflow-y-auto overflow-x-clip overscroll-contain px-2">
          {children}
        </div>

        {footer ? (
          <div className="border-t border-[var(--border)] px-2 pt-3">{footer}</div>
        ) : null}
      </nav>
    </Ctx.Provider>
  );
}

/**
 * O gatilho de colapso.
 *
 * Fica fora do `<nav>` na maioria dos layouts (topo do app), e é por isso que
 * ele lê o estado do contexto em vez de receber por prop: um segundo estado pra
 * manter em sincronia é como o ícone acaba mentindo depois de um atalho de
 * teclado, que é justamente o caminho que não passa por clique.
 */
export const SideNavToggle = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function SideNavToggle({ className, ...props }, ref) {
  const { collapsed, alternar, navId } = useSideNav("SideNavToggle");

  return (
    <button
      ref={ref}
      type="button"
      onClick={alternar}
      aria-expanded={!collapsed}
      aria-controls={navId}
      aria-label={collapsed ? "Expandir a navegação" : "Recolher a navegação"}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[var(--r-control,0.5rem)]",
        "text-[var(--muted-foreground)] transition-colors [transition-duration:var(--dur-fast,140ms)]",
        "hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
        "outline-none focus-visible:[box-shadow:var(--focus)]",
        className,
      )}
      {...props}
    >
      {/* Desenhado, nunca um caractere: "«" muda de forma e de peso a cada fonte
          de marca, e some quando a fonte não carrega. */}
      <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
        <path
          d="M2.5 3v10M13.5 8H6m0 0 2.75-2.75M6 8l2.75 2.75"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          // Gira em vez de trocar de ícone: dois `<path>` alternando piscam no
          // meio da transição de largura, porque o SVG remonta.
          className={cn(
            "origin-center transition-transform [transition-duration:var(--dur-base,220ms)]",
            "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
            "motion-reduce:transition-none",
            !collapsed && "-scale-x-100",
          )}
        />
      </svg>
    </button>
  );
});

export interface SideNavGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** O nome do grupo. Colapsado, ele vira uma régua — ver a nota. */
  label?: React.ReactNode;
}

/**
 * O grupo, e o que acontece com o rótulo dele quando a barra fecha.
 *
 * "Projetos" em 3,75rem de largura sai cortado no meio da segunda sílaba, e um
 * rótulo cortado é pior que rótulo nenhum — ele parece defeito. Colapsado, o
 * rótulo vira `sr-only` e no lugar dele fica uma régua: a informação "aqui
 * começa outro conjunto" sobrevive, que é a única parte do rótulo que o desenho
 * precisa carregar naquela largura.
 *
 * `role="group"` + `aria-labelledby` e não uma `<section>`: seção dentro de
 * `<nav>` cria um segundo landmark aninhado, e o leitor de tela passa a anunciar
 * duas regiões onde existe uma.
 */
export function SideNavGroup({
  label,
  className,
  children,
  ...props
}: SideNavGroupProps) {
  const { collapsed } = useSideNav("SideNavGroup");
  const id = React.useId();

  return (
    <div
      role="group"
      aria-labelledby={label ? id : undefined}
      className={cn("py-2", className)}
      {...props}
    >
      {label ? (
        <>
          <p
            id={id}
            className={cn(
              "px-3 pb-1.5 text-[length:var(--text-rotulo,0.6875rem)] uppercase tracking-[0.14em]",
              "text-[var(--muted-foreground)]",
              collapsed && "sr-only",
            )}
          >
            {label}
          </p>
          {collapsed ? (
            <hr aria-hidden="true" className="mx-3 mb-2 border-t border-[var(--border)]" />
          ) : null}
        </>
      ) : null}
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}

export interface SideNavItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** O ícone. Obrigatório na prática: é tudo que sobra quando a barra fecha. */
  icon?: React.ReactNode;
  /** Marca a rota atual. A peça não descobre isso sozinha. */
  active?: boolean;
  /** Contagem, atalho, "novo". Some quando a barra fecha — não cabe. */
  meta?: React.ReactNode;
  /** Renderiza no filho — `<Link>` do Next, `<NavLink>` do router. */
  asChild?: boolean;
}

/*
 * `forwardRef` não é zelo: `asChild` com o `<Link>` do Next é o uso normal, e
 * clonar sem encaminhar a ref avisa no console de todo projeto que usa a peça
 * do jeito certo.
 *
 * E `asChild` aqui é clonagem, não `Slot`: o Slot funde props no filho mas
 * mantém os filhos DELE, e a peça precisa reparentar — o rótulo tem que entrar
 * dentro do `<span>` que sabe virar `sr-only`, e o ícone tem que ficar fora
 * dele. Com Slot, o `<Link>` chegaria com três filhos e o texto seria o único
 * a sobreviver. Mesma solução do `@visant/nav-drawer`.
 */
export const SideNavItem = React.forwardRef<HTMLAnchorElement, SideNavItemProps>(
  function SideNavItem(
    { icon, active = false, meta, asChild = false, className, children, ...props },
    ref,
  ) {
    const { collapsed } = useSideNav("SideNavItem");

    const rotulo =
      asChild && React.isValidElement(children)
        ? (children as React.ReactElement<{ children?: React.ReactNode }>).props.children
        : children;

    const conteudo = (
      <>
        <span
          aria-hidden="true"
          className={cn(
            "grid size-5 shrink-0 place-items-center",
            "[&_svg]:size-[1.125rem]",
            // Sem ícone e com a barra fechada não sobraria NADA visível: as duas
            // primeiras letras do rótulo são o mínimo que ainda distingue um
            // item do outro. Feio de propósito — é um lembrete de que a barra
            // colapsável pede ícone.
            !icon &&
              "font-mono text-[length:var(--text-micro,0.6875rem)] uppercase tracking-tight",
          )}
        >
          {icon ?? (typeof rotulo === "string" ? rotulo.slice(0, 2) : null)}
        </span>

        {/* Ver a decisão 2: vira `sr-only`, nunca sai do DOM. */}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left",
            collapsed && "sr-only",
          )}
        >
          {rotulo}
        </span>

        {meta && !collapsed ? (
          <span className="shrink-0 text-[length:var(--text-micro,0.6875rem)] tabular-nums tracking-[0.08em] text-[var(--muted-foreground)]">
            {meta}
          </span>
        ) : null}
      </>
    );

    const comum = {
      ref,
      "data-active": active || undefined,
      // `data-active` pinta; `aria-current` INFORMA. Sem ele o leitor de tela lê
      // sete links iguais e a pessoa não descobre em qual tela está — que é a
      // pergunta que uma navegação existe pra responder.
      "aria-current": active ? ("page" as const) : undefined,
      // O ponteiro também não adivinha ícone. Só quando fechada: aberta, o
      // tooltip nativo repetiria o rótulo que já está na tela.
      title: collapsed && typeof rotulo === "string" ? rotulo : undefined,
      className: cn(
        "relative flex w-full items-center gap-3 rounded-[var(--r-control,0.5rem)] px-3 py-2",
        "text-[length:var(--text-corpo,0.875rem)] no-underline",
        "text-[var(--muted-foreground)]",
        "transition-colors [transition-duration:var(--dur-fast,140ms)]",
        "hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
        "data-[active]:bg-[var(--muted)] data-[active]:font-medium data-[active]:text-[var(--foreground)]",
        "outline-none focus-visible:[box-shadow:var(--focus)]",
        collapsed && "justify-center px-0",
        className,
      ),
      ...props,
    };

    const marca = active ? (
      // A régua da rota ativa: 2px na borda esquerda, na cor da marca. É o que
      // sobrevive quando a barra fecha — o fundo `muted` sozinho fica fraco
      // demais numa coluna de 3,75rem cheia de ícones.
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-[var(--brand,currentColor)]"
      />
    ) : null;

    if (asChild && React.isValidElement(children)) {
      const filho = children as React.ReactElement<Record<string, unknown>>;
      return (
        <li>
          {React.cloneElement(
            filho,
            {
              ...comum,
              className: cn(comum.className, filho.props.className as string),
            },
            <>
              {marca}
              {conteudo}
            </>,
          )}
        </li>
      );
    }

    return (
      <li>
        <a {...comum}>
          {marca}
          {conteudo}
        </a>
      </li>
    );
  },
);
