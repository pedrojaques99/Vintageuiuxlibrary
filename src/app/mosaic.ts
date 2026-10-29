"use client";

/**
 * A grade mosaico do catálogo — cada peça no tamanho em que foi desenhada.
 *
 * ── O defeito que isto conserta ────────────────────────────────────────────
 *
 * A vitrine anterior era uma peça por linha, em faixa cheia (90rem), com o palco
 * preso em `maxWidth: max(w, 720)` e alinhado à esquerda. Uma demo declarada com
 * 420px desenhava 420px reais, encostada na quina esquerda de um card de 1350px.
 *
 * Quinze reports diferentes descreveram esse mesmo pixel: "não ocupa espaço
 * suficiente no card", "espremido ou pequeno no catálogo", "centralizar".
 * Não eram quinze peças com defeito — era um defeito de grade, quinze vezes.
 *
 * ── A regra ───────────────────────────────────────────────────────────────
 *
 * A largura natural que o item já declara em `preview.w` decide quanto de grade
 * ele ocupa. Ladrilho pequeno ao lado de ladrilho pequeno, peça grande em faixa
 * cheia — e todas em escala 1, porque a coluna nunca é mais estreita que a peça
 * que foi posta nela.
 *
 * O que NÃO fazemos: ampliar por `scale()`. Peça pequena que parece pobre não
 * melhora esticada — a 1,6× ela fica com tipografia de outdoor dentro de um card.
 * Peça pequena melhora com cena que mereça o ladrilho, e isso é trabalho de
 * demo, não de grade.
 */

import * as React from "react";

/**
 * Largura da coluna base.
 *
 * 440 e não 320: é a maior largura da faixa "ladrilho" do catálogo. Com coluna
 * menor que isso, o item de 420px voltaria a encolher — que é exatamente o
 * defeito de origem, só que com outro número.
 */
export const COL_BASE = 440;

/** Goteira. Vale para os dois eixos; `GRID_ROW` conta com ela. */
export const GRID_GAP = 20;

/**
 * Unidade de linha do masonry.
 *
 * O truque padrão de mosaico em CSS grid: linhas minúsculas e cada card
 * atravessando quantas couberem na altura dele. Quanto menor a unidade, mais
 * fino o encaixe; 8px é o suficiente para o olho não ver degrau.
 */
export const GRID_ROW = 8;

/** Quantas colunas cabem numa largura. Zero enquanto não mediu. */
export const colsIn = (width: number) =>
  width ? Math.max(1, Math.floor((width + GRID_GAP) / (COL_BASE + GRID_GAP))) : 1;

/**
 * O balde da peça. Três, e só três.
 *
 * A versão anterior deixava cada peça declarar o tamanho em pixel livre, e o
 * card saía com a largura exata daquele número. Parecia respeitar a peça e o
 * resultado foi ar desigual: `spring-dots` com 520 ao lado de `count-up` com
 * 560, cada um boiando de um jeito no card, nenhum alinhado com o vizinho.
 *
 * Nenhuma library de referência declara tamanho em px por peça. A mais próxima
 * é o Origin UI, e mesmo ela limita a três (`meta.colSpan` 1/2/3 →
 * `col-span-4/6/12`). O shadcn nem isso: palco único de `h-72 p-10` para todo
 * componente, e convive de bom grado com um botão ocupando 10% do card.
 *
 * A lição que a medição confirmou: o problema nunca foi a peça ocupar pouco —
 * foi ocupar pouco de um jeito diferente do vizinho. Três baldes resolvem isso
 * sem tirar da peça o direito de ser grande.
 *
 * - `ladrilho` — controle, pastilha, loader, knob.
 * - `duplo` — cena de uma coisa só: capa, trilho, revelação.
 * - `faixa` — board, parede de depoimento, cena presa ao scroll.
 */
export type Balde = "ladrilho" | "duplo" | "faixa";

export const baldeDe = (w: number): Balde =>
  w < 480 ? "ladrilho" : w < 700 ? "duplo" : "faixa";

export const colsWanted = (w: number) => {
  const b = baldeDe(w);
  return b === "ladrilho" ? 1 : b === "duplo" ? 2 : Infinity;
};

/**
 * A altura de palco do balde — **piso, não teto**.
 *
 * É o degrau que faz dois cards vizinhos começarem a peça na mesma linha do
 * olho. Peça que declara mais alto continua ganhando a altura dela: cortar
 * seria voltar ao `h-48` que esta vitrine nasceu para corrigir.
 */
export const ALTURA_DO_BALDE: Record<Balde, number> = {
  ladrilho: 260,
  duplo: 340,
  faixa: 460,
};

/** A altura que o palco desenha: o maior entre o degrau do balde e o declarado. */
export const alturaEmDegraus = (w: number, h: number) =>
  Math.max(ALTURA_DO_BALDE[baldeDe(w)], h);

/**
 * Mede a largura da grade e devolve quantas colunas ela tem.
 *
 * Ref de callback pelo mesmo motivo do `useElementWidth` do palco: o nó pode
 * entrar no DOM depois do efeito, e aí a medição inicial pega `null` e nunca
 * mais volta.
 */
export function useGridCols<T extends HTMLElement>() {
  const [cols, setCols] = React.useState(1);
  const observer = React.useRef<ResizeObserver | null>(null);

  const ref = React.useCallback((node: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    setCols(colsIn(node.clientWidth));
    if (typeof ResizeObserver === "undefined") return;
    observer.current = new ResizeObserver(([entry]) =>
      setCols(colsIn(entry.contentRect.width)),
    );
    observer.current.observe(node);
  }, []);

  React.useEffect(() => () => observer.current?.disconnect(), []);

  return [ref, cols] as const;
}

/**
 * A superfície está escura? — medida na cor, não na classe.
 *
 * O `dark:` do Tailwind pergunta se existe um ancestral com `.dark`, e aqui isso
 * responde a pergunta errada: uma marca de tema escuro (a "Vega Noturno" do
 * vault, por exemplo) pinta `--background` quase preto **sem** ligar a classe.
 * A capa clara caía sobre papel preto e a legenda sumia junto.
 *
 * Quem decide qual foto usar é a luminância do fundo que a página realmente
 * tem. Recalcula quando a marca troca, porque é o `<html>` que muda de cor.
 */
/**
 * A cor é escura? — e `oklch` NÃO é `rgb`.
 *
 * O Chrome devolve `getComputedStyle().backgroundColor` já em `rgb()` para quase
 * tudo, mas mantém `oklch(...)` quando foi assim que o token foi escrito — e é
 * assim que os temas desta casa são compilados. Uma conta de luminância BT.601
 * aplicada a `oklch(0.283 0.0091 285.81)` lê "285.81" como canal azul: número
 * sem sentido, resultado por acidente.
 *
 * Em OKLCH o primeiro número **já é** a luminosidade percebida, de 0 a 1 — é
 * literalmente para isso que o espaço existe. Então: se veio oklch, lê o L; se
 * veio rgb, faz a conta de sempre.
 */
const ehEscuro = (cor: string) => {
  const oklch = cor.match(/^oklch\(\s*([\d.]+)(%?)/i);
  if (oklch) {
    const L = Number(oklch[1]) / (oklch[2] ? 100 : 1);
    return L < 0.5;
  }
  const m = cor.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.map(Number);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
};

export function useFundoEscuro() {
  /*
   * Decidido no PRIMEIRO render, não num efeito.
   *
   * Com o valor inicial fixo em `false`, toda visita desenhava as capas claras,
   * o efeito rodava e trocava tudo para escuro — um piscar de imagem a cada
   * carregamento, e a rede baixando os dois conjuntos. O inicializador do
   * `useState` roda antes da pintura, então a primeira foto já é a certa.
   */
  const [escuro, setEscuro] = React.useState(() => {
    if (typeof document === "undefined") return false;
    const sonda = document.createElement("div");
    sonda.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;background:var(--background)";
    (document.getElementById("root") ?? document.body).appendChild(sonda);
    const r = ehEscuro(getComputedStyle(sonda).backgroundColor);
    sonda.remove();
    return r ?? false;
  });

  React.useEffect(() => {
    /*
     * Sonda, e não `getComputedStyle(document.body)`.
     *
     * O `<body>` deste app não pinta nada — quem carrega `bg-background` é um
     * filho —, então ler a cor do body devolvia transparente e a conta caía
     * sempre em "claro". E ler a custom property crua também não serve: ela vem
     * em `oklch(...)`, que ninguém quer parsear à mão. Um nó fora da tela com
     * `background: var(--background)` faz o próprio navegador resolver o token
     * em `rgb()`, que é a única leitura que não pode divergir do que está na
     * tela. Mesma técnica que o `spring-dots` já usa para sondar cor.
     */
    const sonda = document.createElement("div");
    sonda.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;background:var(--background)";
    (document.getElementById("root") ?? document.body).appendChild(sonda);

    const ler = () => {
      const r = ehEscuro(getComputedStyle(sonda).backgroundColor);
      if (r !== null) setEscuro(r);
    };
    ler();

    /*
     * Três gatilhos, porque a marca chega tarde e por caminhos diferentes.
     *
     * O tema do vault é aplicado DEPOIS do primeiro quadro (a paleta vem da
     * rede), e nem sempre por um atributo do `<html>`: pode ser uma folha
     * injetada, e folha nova não dispara `MutationObserver` de atributo. Sem os
     * três, a capa nascia clara sobre uma marca escura e ficava assim até a
     * pessoa navegar.
     */
    const mo = new MutationObserver(ler);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    mo.observe(document.head, { childList: true, subtree: true });
    // A rede não avisa quando termina de repintar; três leituras espaçadas
    // cobrem o vault que responde em 100ms e o que responde em 1s, e param.
    const relogios = [120, 400, 1200].map((ms) => setTimeout(ler, ms));

    return () => {
      mo.disconnect();
      relogios.forEach(clearTimeout);
      sonda.remove();
    };
  }, []);

  return escuro;
}

/** Linhas de 8px que uma altura em px consome, contando a goteira. */
export const rowsFor = (height: number) =>
  Math.max(1, Math.ceil((height + GRID_GAP) / (GRID_ROW + GRID_GAP)));

/**
 * O `grid-row: span N` de um card, medido do próprio card.
 *
 * `estimativa` é o que vale antes da primeira medição — e ela existe porque a
 * página é pré-renderizada: sem palpite, todo card nasceria com uma linha só e
 * a grade inteira se recolocaria no instante em que o JS assumisse. Com o palpite
 * (cabeçalho + o `preview.h` que o item declara), o HTML estático já sai com a
 * grade quase certa e a medição só ajusta o resto.
 */
export function useRowSpan<T extends HTMLElement>(estimativa: number) {
  const [rows, setRows] = React.useState(() => rowsFor(estimativa));
  const observer = React.useRef<ResizeObserver | null>(null);

  const ref = React.useCallback((node: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    const medir = (h: number) => setRows((prev) => Math.max(prev, rowsFor(h)));
    medir(node.getBoundingClientRect().height);
    if (typeof ResizeObserver === "undefined") return;
    /*
     * `Math.max` acima, e não o valor cru: a demo monta preguiçosa e cresce uma
     * vez ao trocar o esqueleto pela peça. Deixar o span encolher entre as duas
     * medições faria a coluna inteira abaixo dela pular durante o scroll — o
     * mesmo tipo de deslize que o palco já resolve travando a altura.
     */
    observer.current = new ResizeObserver(([entry]) => medir(entry.contentRect.height));
    observer.current.observe(node);
  }, []);

  React.useEffect(() => () => observer.current?.disconnect(), []);

  return [ref, rows] as const;
}
