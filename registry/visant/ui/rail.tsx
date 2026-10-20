"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Rail — trilho horizontal com scroll-snap nativo.
 *
 * Colhido de um concept de e-commerce. Carrossel de produto é padrão de loja
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
 *
 * ── O que faltava, e por que era a mesma falta três vezes ──────────────────
 *
 * O trilho sabia rolar e não sabia mais nada. Três buracos, todos de anatomia:
 *
 * 1. **Não sabia sangrar.** Trilho de vitrine encosta na borda — é o corte na
 *    borda que promete continuação. Quem quisesse isso tinha que escrever margem
 *    negativa à mão do lado de fora e, junto, perder o alinhamento do primeiro
 *    item com a coluna de texto. Que a falta é real está provado no vizinho: o
 *    `@visant/marquee` já carregava `width: 108%; marginLeft: -4%` cravado no
 *    código pra resolver a mesma coisa. Agora é `bleed`, e ele sangra a caixa
 *    SEM desalinhar o conteúdo, porque a sangria vira `padding` e
 *    `scroll-padding` de volta pra dentro.
 * 2. **O estado das pontas era calculado e escondido.** `edge` já sabia se havia
 *    mais lista de cada lado, e o único consumidor era o `disabled` das setas —
 *    que só existem a partir de `lg`. Abaixo disso a informação era computada a
 *    cada rolagem e jogada fora, e num telefone nada dizia que a lista continua.
 *    `fade` liga a máscara nas pontas, e ela lê o MESMO `edge`: some quando
 *    acaba de verdade, em vez de fingir corte permanente.
 * 3. **Não tinha cabeça.** Um trilho é uma lista, e lista sem nome nem contagem
 *    é uma fileira de retângulos. `heading` e `hint` dão o rótulo e o qualificador
 *    na mesma fileira das setas.
 *
 * As três entram como prop nova, e as três nascem desligadas: quem já usava o
 * trilho recebe o mesmo pixel de antes.
 *
 * ── E a ponta esmaecida ainda não dizia nada ───────────────────────────────
 *
 * `fade` conserta a mentira ("existe mais lista deste lado") mas para na
 * metáfora: o esmaecido promete continuação sem dizer QUANTA. Num trilho de 6
 * itens isso é gesto; num de 40, é a diferença entre arrastar e desistir — e
 * quem arrasta no telefone não tem seta pra contar por ela.
 *
 * `remainder` põe o número na própria ponta: `+7`, contando os itens que ainda
 * não couberam INTEIROS na vista, do mesmo `getBoundingClientRect` que já roda
 * a cada rolagem. Clicar nele anda um item, então a informação e o controle são
 * o mesmo alvo — e ele desaparece quando chega ao fim, como as setas.
 *
 * `progress` desenha a régua embaixo: largura do polegar = fatia visível da
 * lista, posição = onde se está. É a barra de rolagem que o navegador esconde
 * no telefone, redesenhada com o token da marca, e é o que responde "isso é
 * uma lista de seis ou de sessenta?" antes do primeiro gesto.
 *
 * ── E o trilho de DOIS itens ───────────────────────────────────────────────
 *
 * Tudo acima cuida da lista que transborda. A que não transborda ficava sem
 * dono, e o defeito foi medido no app que consome isto: faixa útil de 1116px,
 * dois cards de ~245px encostados à esquerda, **610px de vazio à direita** —
 * mais da metade da fileira. Não é bug de código: sem transbordo não há o que
 * rolar, então as setas somem e a máscara colapsa, exatamente como manda o
 * estado. O que sobra é uma fileira curta ancorada num canto de uma faixa
 * larga, e isso lê como conteúdo faltando, não como catálogo enxuto.
 *
 * `gridUpTo` é o limiar: com até N itens o trilho deixa de ser trilho e vira
 * grade de colunas iguais que dividem a faixa. É a mesma lista, com a forma que
 * a contagem pede — fileira quando há o que rolar, grade quando não há.
 *
 * Duas decisões que valem mais que o efeito:
 *
 * 1. **Quem decide é `Children.count`, não a medida.** O componente JÁ sabe se
 *    transborda (`sync`), mas só DEPOIS de montar no cliente — trocar de layout
 *    ali é um salto visível e, em SSR, HTML de servidor que não bate com o da
 *    hidratação. A contagem existe no primeiro render dos dois lados, então o
 *    servidor e o cliente pintam a mesma coisa e nada pisca.
 * 2. **A coluna tem TETO.** Grade que só divide a largura devolve, com dois
 *    itens numa faixa larga, dois pôsteres de ~550px; num card de proporção
 *    alta isso é meia dobra de altura pra dois itens, e o `sizes` do next/image
 *    que o consumidor declarou pra um card de 300 passa a servir imagem macia.
 *    O teto é 1,5× o `itemWidth`: enche a faixa quando dá, e quando não dá,
 *    para antes de virar outro problema.
 */

export interface RailProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Largura mínima de cada item. */
  itemWidth?: number;
  gap?: number;
  /** Setas de navegação (só aparecem onde há ponteiro). */
  arrows?: boolean;
  label?: string;
  /**
   * Quantos px o trilho sangra pra fora do container, de cada lado.
   *
   * Passe o mesmo respiro lateral do pai (`px-6` → `bleed={24}`) e a fileira
   * encosta na borda da tela enquanto o primeiro item continua alinhado com o
   * texto acima. `false` (padrão) é o trilho contido de sempre.
   */
  bleed?: number | false;
  /**
   * Esmaece as pontas onde a lista continua. Segue o estado real das bordas.
   *
   * É máscara no scroller, não faixa pintada por cima: o item cortado some
   * inteiro no fade, com título, legenda e o que mais houver embaixo da arte.
   */
  fade?: boolean;
  /**
   * O nome da lista, na fileira das setas.
   *
   * `heading` e não `title` de propósito: `title` já é atributo de HTML e vira
   * o tooltip nativo do navegador. Aceitar o mesmo nome pros dois faria quem
   * instala escrever um e receber o outro — e o tooltip sumiria sem explicação.
   */
  heading?: React.ReactNode;
  /** O qualificador ao lado do nome: "12 peças", "atualizado hoje". */
  hint?: React.ReactNode;
  /** `+N` na ponta que continua. Clicar anda um item. */
  remainder?: boolean;
  /** Régua embaixo: quanto da lista cabe na vista e onde ela está. */
  progress?: boolean;
  /**
   * Com até N itens, o trilho vira GRADE: colunas iguais dividindo a faixa, sem
   * rolagem, sem setas, sem máscara e sem tabindex rotativo (com três itens,
   * três paradas de Tab é a ordem natural — o defeito das 21 paradas era outro).
   *
   * Nasce desligado como toda prop nova daqui: quem já usava o trilho recebe o
   * mesmo pixel de antes. O app da casa liga em 3, que é onde a conta fecha lá:
   * quatro cards de 300 + gaps passam de 1116px e transbordam de verdade; três
   * cabem sobrando 184px mortos.
   */
  gridUpTo?: number | false;
}

export function Rail({
  children,
  itemWidth = 240,
  gap = 20,
  arrows = true,
  label = "Scrollable list",
  bleed = false,
  fade = false,
  heading,
  hint,
  remainder = false,
  progress = false,
  gridUpTo = false,
  className,
  ...props
}: RailProps) {
  const total = React.Children.count(children);
  const grade =
    typeof gridUpTo === "number" && total > 0 && total <= gridUpTo;

  const ref = React.useRef<HTMLDivElement>(null);
  const [edge, setEdge] = React.useState({ start: true, end: false });
  /**
   * O que a ponta e a régua mostram, medido no MESMO passo das bordas.
   *
   * Um estado só, e não três: `restam` e a régua mudam sempre junto com
   * `edge`, e três `setState` no mesmo `onScroll` seriam três renders por
   * quadro de rolagem pra desenhar uma informação que é uma só.
   */
  const [vista, setVista] = React.useState({ restam: 0, fatia: 1, pos: 0 });

  const sync = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft < 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    });

    const caixa = el.getBoundingClientRect();
    // "Falta" o item que ainda não coube INTEIRO. O card cortado na borda é a
    // promessa da peça; contá-lo como visto seria a conta mentindo pra manter
    // o número bonito. 1px de tolerância para o sub-pixel de layout.
    const restam = Array.from(el.children as HTMLCollectionOf<HTMLElement>).filter(
      (c) => c.getBoundingClientRect().right > caixa.right + 1,
    ).length;
    const rolavel = el.scrollWidth - el.clientWidth;
    setVista({
      restam,
      fatia: el.scrollWidth ? el.clientWidth / el.scrollWidth : 1,
      pos: rolavel > 0 ? el.scrollLeft / rolavel : 0,
    });
  }, []);

  /*
   * Quem avisa que as pontas mudaram é o SCROLLER, não a janela.
   *
   * Era `window.addEventListener("resize", sync)`, e o furo aparece assim:
   * estreite o container sem mexer na janela — painel que abre, sidebar que
   * colapsa, split que a pessoa arrasta, container query — e a lista passa a
   * transbordar sem que ninguém remeça. Medido: com o trilho já transbordando
   * (`scrollWidth > clientWidth`), a seta "próximo" continuava `disabled` e a
   * máscara continuava opaca dos dois lados. Ou seja, o controle mentia sobre o
   * estado da lista, que é exatamente o que a nota lá em cima promete não fazer.
   *
   * O `ResizeObserver` no scroller é o que passa a mandar. O listener de janela
   * FICA, e não por medo: `sync` é uma leitura de três números e um `setState`
   * que quase sempre devolve o mesmo estado, então o custo de mantê-lo é zero, e
   * ele é a rede pra ambiente onde o RO não entrega — aba em segundo plano
   * entrega as observações só quando volta a renderizar, e navegador antigo não
   * tem RO nenhum. Dois avisos redundantes de uma medida idempotente é barato;
   * um controle mentindo sobre a lista não é.
   */
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    window.addEventListener("resize", sync);
    const ro =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    ro?.observe(el);
    return () => {
      window.removeEventListener("resize", sync);
      ro?.disconnect();
    };
  }, [sync]);

  /**
   * Avança até o próximo ITEM, não por uma distância.
   *
   * Era `scrollBy(clientWidth * 0.8)`, e o defeito só aparece com encaixe
   * ligado: o navegador resolve rolagem programática por delta contra os
   * pontos de encaixe, e o resultado pode ser desfeito no mesmo quadro — no
   * app onde isto foi colhido, o botão devolvia o `scrollLeft` a 0 e parecia
   * morto. Com destino explícito o encaixe deixa de ser adversário e vira o
   * mecanismo: o alvo JÁ é um ponto de encaixe, então não há o que corrigir.
   *
   * A medida é por `getBoundingClientRect`, não por `offsetLeft`: este último
   * encadeia por `offsetParent`, que quase nunca é o scroller, e devolve
   * posição de layout cega à rolagem atual.
   *
   * De quebra o gesto melhora — a seta anda um item inteiro e nunca deixa meio
   * card na borda, que é o que uma fração de viewport fazia.
   */
  const nudge = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const itens = Array.from(el.children) as HTMLElement[];
    if (!itens.length) return;

    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const base = el.getBoundingClientRect().left + pad;
    // 4px de tolerância: sub-pixel de layout não é "outro item".
    const desvio = (c: HTMLElement) => c.getBoundingClientRect().left - base;
    const alvo =
      dir === 1
        ? itens.find((c) => desvio(c) > 4)
        : [...itens].reverse().find((c) => desvio(c) < -4);

    el.scrollTo({
      left: alvo ? el.scrollLeft + desvio(alvo) : dir === 1 ? el.scrollWidth : 0,
      behavior: "smooth",
    });
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
          // Em grade não há âncora: os itens estão todos na vista, então a
          // ordem de Tab natural é a certa — e é ela que devolve o tabindex a
          // quem já tinha sido marcado quando a mesma lista era fileira.
          if (grade || i === ativo) f.removeAttribute("tabindex");
          else f.setAttribute("tabindex", "-1");
        });
      });
    },
    [itens, grade],
  );

  React.useEffect(() => {
    ancorar(0);
    // Remedir as pontas quando a lista muda: sem isto um trilho que recebe
    // itens depois (filtro, fetch) fica com a seta "próximo" desabilitada
    // apontando pro estado da lista anterior — e agora que `fade` lê o mesmo
    // estado, o erro apareceria como uma ponta esmaecida sem lista embaixo.
    sync();
  }, [ancorar, children, sync]);

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

  /**
   * Arrastar com o mouse. No toque o navegador já arrasta sozinho; no mouse,
   * sem isto, o único jeito de andar era achar a barra ou segurar Shift. O
   * snap sai durante o gesto (com ele ligado o trilho briga com a mão e pula)
   * e volta no fim, que é quando ele assenta no card mais perto.
   *
   * A distância divide pela escala da caixa: dentro de um palco com
   * `transform: scale`, 100px de mouse não são 100px de rolagem.
   */
  const arrasto = React.useRef<{ x: number; inicio: number; escala: number; andou: boolean } | null>(null);
  const aoApertar = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || e.button !== 0) return;
    if (el.scrollWidth <= el.clientWidth) return;
    const escala = el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1;
    arrasto.current = { x: e.clientX, inicio: el.scrollLeft, escala: escala || 1, andou: false };
  };
  const aoMover = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrasto.current;
    const el = ref.current;
    if (!a || !el) return;
    const dx = (e.clientX - a.x) / a.escala;
    if (!a.andou) {
      if (Math.abs(dx) < 5) return;
      a.andou = true;
      el.setPointerCapture(e.pointerId);
      el.style.scrollSnapType = "none";
      // Marcador e não só `style.cursor`: o card por baixo é link e teria
      // `cursor: pointer` próprio, que ganharia do trilho no meio do arrasto.
      el.dataset.arrastando = "";
      el.style.userSelect = "none";
    }
    el.scrollLeft = a.inicio - dx;
  };
  const aoSoltar = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrasto.current;
    const el = ref.current;
    arrasto.current = null;
    if (!a?.andou || !el) return;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    delete el.dataset.arrastando;
    el.style.userSelect = "";
    // Devolver o snap com rolagem suave: sem isto o trilho pula seco pro card.
    const antes = el.scrollLeft;
    el.style.scrollSnapType = "";
    const depois = el.scrollLeft;
    if (antes !== depois) {
      el.scrollLeft = antes;
      el.scrollTo({ left: depois, behavior: "smooth" });
    }
    // O clique que vem junto do soltar não pode abrir o card que estava embaixo.
    const engolir = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    el.addEventListener("click", engolir, { capture: true, once: true });
    window.setTimeout(() => el.removeEventListener("click", engolir, { capture: true }), 0);
  };

  const temCabeca = Boolean(heading || hint);
  // Seta que não rola nada é controle mentindo sobre a lista — em grade não há
  // rolagem nenhuma, então ela não existe (não é a versão desabilitada dela).
  const mostrarSetas = arrows && !grade;
  const sangra = !grade && typeof bleed === "number" && bleed > 0 ? bleed : 0;

  /*
   * A máscara nasce do `edge`, não de "tem overflow".
   *
   * Uma faixa esmaecida fixa nas duas pontas mente duas vezes: promete lista no
   * começo quando já se está no começo, e continua prometendo depois do último
   * item. Aqui cada ponta só existe enquanto há lista daquele lado — o mesmo
   * estado que desabilita as setas, agora com um segundo consumidor.
   *
   * ── Por que a geometria virou variável, e não duas strings ──────────────
   *
   * Era um `useMemo` que trocava a string INTEIRA do gradiente a cada virada de
   * ponta. Duas consequências medidas no app que consome isto (trilho de 1440,
   * fade de 84px): a máscara reaparecia de estalo no primeiro pixel de rolagem,
   * porque `mask-image` não é propriedade animável — trocar a string é corte
   * seco; e quem quisesse suavizar não tinha onde pegar, o valor nascia e morria
   * dentro do componente.
   *
   * Agora a máscara fica SEMPRE ligada e o que muda é a largura de cada ponta,
   * publicada em `--rail-fade-ini` / `--rail-fade-fim`. Com `0px` o par de
   * paradas colapsa no mesmo ponto e não há fade nenhum — o primeiro item nasce
   * inteiro, que é o defeito óbvio de mascarar os dois lados sempre. E como as
   * duas larguras são custom properties, o app que as REGISTRA com
   * `@property { syntax: '<length>' }` ganha a transição de graça, sem que este
   * arquivo precise carregar CSS junto (o item do registry é só este .tsx).
   * Sem registro, o comportamento é o de hoje: troca imediata, nada quebra.
   */
  // Em grade não há ponta que continue: mascarar aqui apagaria metade de um
  // card que está inteiro na vista.
  const mascara = fade && !grade
    ? "linear-gradient(to right, transparent 0, black var(--rail-fade-ini), black calc(100% - var(--rail-fade-fim)), transparent 100%)"
    : undefined;

  return (
    <div className={cn("relative", className)} {...props}>
      {(mostrarSetas || temCabeca) && (
        <div
          className={cn(
            "mb-3 items-end gap-3",
            /* Sem cabeça o class string é EXATAMENTE o de antes — `hidden` até
               `lg`. Isso não é apego: abaixo de `lg` a fileira precisa continuar
               sem ocupar altura nem a margem de 12px, senão todo trilho já
               publicado ganha um degrau no celular e o `@visant/skeleton-rail`,
               que copia estas medidas pra não pular na troca, passa a errar. */
            temCabeca ? "flex justify-between" : "hidden justify-end lg:flex",
          )}
        >
          {temCabeca && (
            <div className="flex min-w-0 items-baseline gap-2">
              {heading && (
                <span className="truncate text-[length:var(--text-destaque,0.9375rem)] font-semibold tracking-tight text-foreground">
                  {heading}
                </span>
              )}
              {hint && (
                <span className="shrink-0 font-mono text-[length:var(--text-micro,0.625rem)] uppercase tracking-[0.14em] text-muted-foreground">
                  {hint}
                </span>
              )}
            </div>
          )}
          {mostrarSetas && (
            <div className={cn("gap-2", temCabeca ? "hidden lg:flex" : "flex")}>
              <RailButton dir="prev" disabled={edge.start} onClick={() => nudge(-1)} />
              <RailButton dir="next" disabled={edge.end} onClick={() => nudge(1)} />
            </div>
          )}
        </div>
      )}

      {/* A caixa de posicionamento é ESTA, não o container inteiro: com a
          cabeça ligada, `top-1/2` do container cairia no meio do conjunto
          "cabeçalho + trilho" e o `+N` flutuaria acima dos cards. */}
      <div className="relative">
        <div
          ref={ref}
          role="group"
          aria-label={label}
          onScroll={grade ? undefined : sync}
          onKeyDown={grade ? undefined : teclado}
          onFocus={grade ? undefined : aoFocar}
          onPointerDown={grade ? undefined : aoApertar}
          onPointerMove={grade ? undefined : aoMover}
          onPointerUp={grade ? undefined : aoSoltar}
          onPointerCancel={grade ? undefined : aoSoltar}
          // Link e imagem arrastam como arquivo por padrão, e o arrasto nativo
          // engole o gesto antes de o trilho ver o ponteiro andar.
          onDragStart={grade ? undefined : (e) => e.preventDefault()}
          className={cn(
            "grid pb-3 [&>*]:min-w-0",
            grade
              ? null
              : [
                  "grid-flow-col overflow-x-auto overscroll-x-contain",
                  // Mão aberta só quando há o que arrastar; fechada durante o
                  // arrasto, por cima até do `pointer` dos cards.
                  !(edge.start && edge.end) && "cursor-grab",
                  "data-[arrastando]:cursor-grabbing [&[data-arrastando]_*]:!cursor-grabbing",
                  "[scroll-snap-type:x_proximity]",
                  "[&>*]:[scroll-snap-align:start]",
                  // Com a régua ligada a barra nativa é a mesma informação duas
                  // vezes, e a cinza ainda some no Mac e aparece no Windows.
                  progress
                    ? "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    : "[scrollbar-width:thin]",
                ],
          )}
          style={{
            gap: `${gap}px`,
            ...(grade
              ? {
                  /* `auto-fit` e não `repeat(total, 1fr)`: onde a faixa não
                     comporta as colunas — telefone, container estreito — as
                     sobrando descem de linha sozinhas, e as trilhas vazias
                     colapsam pra que as que ficaram dividam a largura inteira.
                     Grade responsiva sem uma media query escrita à mão.

                     O `maxWidth` é o teto de 1,5× (ver a nota do cabeçalho):
                     é ele que impede a coluna de virar pôster gigante quando
                     há dois itens numa faixa larga. */
                  gridTemplateColumns: `repeat(auto-fit, minmax(${itemWidth}px, 1fr))`,
                  maxWidth: `${total * itemWidth * 1.5 + (total - 1) * gap}px`,
                }
              : {
                  gridAutoColumns: `minmax(${itemWidth}px, 1fr)`,
                  scrollbarColor: "var(--border) transparent",
                }),
            /*
             * Sangria em três partes, e as três são obrigatórias.
             *
             * A margem negativa tira a caixa pra fora do container; o padding
             * devolve o CONTEÚDO pro lugar, então o primeiro item continua na
             * mesma vertical do texto de cima; e o `scroll-padding` faz o encaixe
             * parar nessa mesma vertical. Sem a terceira, o snap ancora na borda
             * crua do scroller e o primeiro card encosta na tela toda vez que a
             * pessoa volta pro começo — o defeito clássico de trilho sangrado.
             */
            ...(sangra
              ? {
                  marginInline: `-${sangra}px`,
                  paddingInline: `${sangra}px`,
                  scrollPaddingInline: `${sangra}px`,
                }
              : null),
            /* A máscara vale pro SCROLLER inteiro — a altura toda do item, não
               só a faixa da arte. Uma faixa pintada por cima só cobre o que ela
               alcança: no app que consome isto dá pra ler o título e a descrição
               do card cortado LOGO ABAIXO do gradiente. Máscara recorta o
               elemento, então não sobra nada legível além do fade.
               `black`/`transparent` aqui são canal de opacidade, não cor de
               marca: não há token pra apontar. */
            ...(mascara
              ? {
                  ["--rail-fade-ini" as string]: edge.start ? "0px" : "40px",
                  ["--rail-fade-fim" as string]: edge.end ? "0px" : "40px",
                  maskImage: mascara,
                  WebkitMaskImage: mascara,
                }
              : null),
          }}
        >
          {children}
        </div>

        {remainder && !grade && vista.restam > 0 && (
          /* Fica DENTRO da área rolável e por cima do último card cortado —
             é a legenda do corte. `tabIndex={-1}` pelo mesmo motivo das setas:
             o teclado já anda com ←/→ e moveria o foco junto, que é melhor. */
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => nudge(1)}
            className={cn(
              "absolute right-0 top-1/2 z-10 -translate-y-1/2",
              "inline-flex cursor-pointer items-center rounded-full border border-[var(--border)] bg-[var(--background)]",
              "px-2.5 py-1 font-mono text-[11px] tabular-nums text-[var(--muted-foreground)]",
              "transition-[color,border-color,transform] [transition-duration:var(--dur-press,120ms)]",
              "hover:border-[var(--foreground)] hover:text-[var(--foreground)]",
              "active:scale-[0.94] motion-reduce:active:scale-100",
            )}
          >
            +{vista.restam}
          </button>
        )}
      </div>

      {progress && !grade && (
        // `aria-hidden`: é o retrato da mesma rolagem que o leitor de tela já
        // percorre item a item dentro do `role="group"`. Anunciar de novo, em
        // porcentagem, seria ruído sobre um dado que ele não pode usar.
        <div aria-hidden="true" className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-[var(--muted)]">
          <div
            className="h-full rounded-full bg-[var(--brand,var(--foreground))] transition-transform [transition-duration:var(--dur-press,120ms)] ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))] motion-reduce:transition-none"
            style={{
              width: `${Math.min(1, vista.fatia) * 100}%`,
              // A translação é em % da PRÓPRIA largura, então o polegar anda
              // exatamente o resto da pista: em `fatia` 0,4 ele percorre 150%
              // de si mesmo e encosta no fim sem passar.
              transform: `translateX(${(vista.pos * (1 - Math.min(1, vista.fatia)) * 100) / Math.max(0.0001, Math.min(1, vista.fatia))}%)`,
            }}
          />
        </div>
      )}
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
        "inline-flex size-10 cursor-pointer items-center justify-center border border-[var(--border)]",
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
