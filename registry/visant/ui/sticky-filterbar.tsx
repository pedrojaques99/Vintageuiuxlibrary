"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StickyFilterbar — barra de filtro que gruda e condensa.
 *
 * Colhida do concept Hockey Direct. É utilidade antes de ser efeito: com a
 * barra alta grudada, sobra menos grade na tela — e a grade é o que o comprador
 * veio ver. Cada pixel da barra é um pixel a menos de produto.
 *
 * ── O gotcha que custou caro ────────────────────────────────────────────────
 * A altura do cabeçalho **não pode ser chutada**. Ela muda com o viewport: no
 * Hockey Direct mediu 123px no desktop e **163px a 390px**, porque a busca
 * desce de linha. Um número fixo no CSS deixa a barra escondida atrás do header
 * em um dos dois casos.
 *
 * Por isso o componente MEDE o header e publica em `--header-h`, com
 * `ResizeObserver` e `document.fonts.ready` — a altura muda de novo quando a
 * fonte carrega.
 *
 * As linhas marcadas `collapsible` somem quando a barra está grudada. Mantenha
 * ali o que é refinamento e deixe fora o que é o filtro principal: o usuário
 * precisa continuar enxergando o eixo pelo qual está navegando.
 *
 * ── O que faltava (por que parecia barata) ──────────────────────────────────
 * A barra grudava e não CONTAVA nada. Grudada e solta eram quase o mesmo
 * desenho — uma sombra de 0.5 de opacidade que ninguém vê — então o momento em
 * que ela passa a flutuar sobre a lista simplesmente não aparecia. E o que ela
 * governa (a grade que rola por baixo) não tinha leitura nenhuma: a pessoa
 * filtra, rola, e perde a noção de onde está na lista que acabou de filtrar.
 *
 * Duas coisas entram, as duas de graça em pixel:
 *
 * 1. **O estado grudado é visível**: o respiro vertical fecha e a sombra ganha
 *    peso de verdade. Grudar é um evento; evento tem desenho.
 * 2. **Um fio de progresso no pé da barra**, mostrando quanto da região que ela
 *    governa já passou. Só aparece grudada — solta, a régua seria ruído.
 *
 * ── O que este componente NÃO faz (de propósito) ────────────────────────────
 * O fio é escrito direto no DOM por `ref`, dentro do mesmo listener de scroll
 * que já existia, e só como `transform`. Nada de `setState` por quadro de
 * rolagem, e principalmente nada que mude a ALTURA de coisa alguma: este item
 * já foi a origem de um loop de `ResizeObserver` que inchava a página para
 * sempre (o caso está escrito em `src/styles/tailwind.css` da vitrine). A
 * regra que ficou é medir uma coisa só, o cabeçalho, e escrever só em
 * `--header-h`. `transform` não entra em layout, então não realimenta o
 * observador.
 *
 * O colapso das linhas `collapsible` continua seco, sem transição. `display`
 * não transiciona, e animar altura para disfarçar é exatamente o tipo de coisa
 * que reabre o loop acima. Colapso instantâneo durante o scroll ninguém lê como
 * corte; ninguém lê porque está rolando.
 */

export interface StickyFilterbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Seletor do cabeçalho grudado a medir. */
  headerSelector?: string;
  /**
   * Desliga o fio de progresso. Aditivo: ligado por padrão, e some sozinho
   * quando a região governada não rola o bastante para haver progresso.
   */
  hideProgress?: boolean;
  children: React.ReactNode;
}

export function StickyFilterbar({
  headerSelector = "header",
  hideProgress = false,
  children,
  className,
  ...props
}: StickyFilterbarProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const fio = React.useRef<HTMLSpanElement>(null);
  const [condensed, setCondensed] = React.useState(false);

  // Mede o header e publica a altura real como custom property.
  React.useEffect(() => {
    const header = document.querySelector<HTMLElement>(headerSelector);
    if (!header) return;

    const apply = () => {
      const h = Math.round(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(header);
    // A altura muda quando a fonte troca de fallback para a real.
    document.fonts?.ready.then(apply).catch(() => {});
    return () => ro.disconnect();
  }, [headerSelector]);

  /**
   * Condensa exatamente onde encosta — não num número solto, que produziria uma
   * piscada no meio do scroll.
   *
   * A linha onde a barra encosta era lida como `--header-h` puro, o que só vale
   * quando quem rola é a PÁGINA. Dentro de um contêiner com rolagem própria
   * (uma demo, um painel, um modal com lista) a barra grudava de verdade — o
   * CSS faz isso sozinho — e o componente nunca percebia: nem condensava, nem
   * media progresso. Agora a linha sai de onde ela realmente está: o `top`
   * computado da própria barra (o browser já resolveu o `var()` ali) somado ao
   * topo do contêiner que rola. Sem contêiner, o topo é 0 e a conta é
   * idêntica à antiga — o comportamento na página não muda.
   */
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /** O ancestral que realmente rola, ou `null` quando é a página. */
    const rolante = (): HTMLElement | null => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const oy = getComputedStyle(p).overflowY;
        if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
      }
      return null;
    };

    const onScroll = () => {
      const box = el.getBoundingClientRect();
      const caixa = rolante();
      const topo = caixa ? caixa.getBoundingClientRect().top : 0;
      const grude = topo + (parseFloat(getComputedStyle(el).top) || 0);
      setCondensed(box.top <= grude + 1);

      // Quanto da região governada já passou. A região é o pai da barra: é
      // dentro dele que a barra gruda, então é ele que a barra "cobre".
      //
      // Dois casos, e confundir os dois deixa o fio parado:
      //
      // • Quando o pai É o contêiner que rola, o retângulo dele não sai do
      //   lugar — quem anda é o conteúdo por dentro. Aí a medida é `scrollTop`
      //   sobre o percurso rolável.
      // • Quando quem rola é a página, o pai sobe junto com a rolagem. Aí a
      //   medida é a distância que a barra grudada ganhou do topo da região.
      //
      // Escrito direto no nó, sem estado: um `setState` por quadro de rolagem
      // renderizaria a barra inteira dezenas de vezes por segundo.
      const linha = fio.current;
      const regiao = el.parentElement;
      if (!linha || !regiao) return;

      let percurso: number;
      let andado: number;
      if (regiao === caixa) {
        percurso = regiao.scrollHeight - regiao.clientHeight;
        andado = regiao.scrollTop;
      } else {
        const r = regiao.getBoundingClientRect();
        percurso = r.height - box.height;
        andado = box.top - r.top;
      }
      const p = percurso > 8 ? Math.min(1, Math.max(0, andado / percurso)) : 0;
      linha.style.transform = `scaleX(${p})`;
    };

    onScroll();
    // `capture` no documento, e não `scroll` na window: evento de rolagem não
    // borbulha, então um contêiner interno que rola nunca chegaria na window —
    // era esse o motivo de a barra ficar muda fora da rolagem de página.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-condensed={condensed || undefined}
      className={cn(
        "sticky z-30 border-b border-[var(--border)] bg-[var(--background)]",
        "[top:var(--header-h,0px)]",
        // Só cor e sombra transicionam. `transform` do fio fica de fora porque
        // ele acompanha a rolagem — transição ali viraria atraso.
        "transition-[box-shadow,border-color] [transition-duration:var(--dur-base,200ms)] [transition-timing-function:var(--ease-out,ease)]",
        // Grudada, a barra deixa de ser parte do fluxo e passa a flutuar sobre
        // a lista. A sombra antiga era transparente demais para dizer isso — e
        // a cor crua `rgb(0 0 0/.5)` também não era token de casa nenhuma.
        condensed
          ? "[box-shadow:0_10px_20px_-16px_color-mix(in_oklab,var(--foreground)_60%,transparent)]"
          : "[box-shadow:0_0_0_0_transparent]",
        // Grudada o respiro fecha: cada pixel da barra é um pixel a menos de
        // produto na tela.
        "[&[data-condensed]_[data-collapsible]]:hidden",
        "[&[data-condensed]_[data-filter-row]]:py-1.5",
        className,
      )}
      {...props}
    >
      {children}

      {/*
       * O fio. Fora do fluxo e `pointer-events-none`: ele não pode empurrar
       * layout nem roubar clique de chip nenhum. `origin-left` + `scaleX` para
       * o percurso ser `transform` puro.
       */}
      {hideProgress ? null : (
        <span
          ref={fio}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-[-1px] h-[2px] origin-left bg-[var(--brand)]",
            "transition-opacity [transition-duration:var(--dur-fast,160ms)] [transition-timing-function:var(--ease-out,ease)]",
            condensed ? "opacity-100" : "opacity-0",
          )}
          style={{ transform: "scaleX(0)" }}
        />
      )}
    </div>
  );
}

/**
 * Uma linha da barra. `collapsible` some quando grudada — use nas facetas
 * secundárias, nunca no eixo principal.
 */
export function FilterRow({
  label,
  collapsible = false,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label?: string; collapsible?: boolean }) {
  return (
    <div
      data-filter-row=""
      {...(collapsible ? { "data-collapsible": "" } : {})}
      // O `py` é o que a barra grudada fecha (regra em StickyFilterbar). Sem o
      // marcador `data-filter-row` a barra não tinha como alcançar a linha, e
      // grudar não mudava altura nenhuma.
      // Sem transição no `py` de propósito: animar padding é animar layout, e
      // aqui isso significaria recalcular a altura da barra a cada quadro de
      // rolagem — o vizinho exato do defeito que já inchou esta página. Troca
      // seca, e durante o scroll ninguém lê a troca como corte.
      className={cn("flex items-center gap-4 py-2", className)}
      {...props}
    >
      {label ? (
        <p className="w-14 shrink-0 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
          {label}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
