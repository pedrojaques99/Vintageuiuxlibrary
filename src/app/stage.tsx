"use client";

/**
 * O palco onde uma demo vive.
 *
 * Duas regras, e as duas vieram de defeito real da vitrine anterior:
 *
 * 1. **Nada é cortado.** Antes todo palco era `h-48` com `overflow-hidden`, então
 *    um board e um knob ganhavam a mesma caixa e o board aparecia pela metade.
 *    Agora a demo desenha no tamanho natural declarado no catálogo e o palco
 *    aplica `scale` pra caber na largura disponível. É o que a vitrine do shadcn
 *    faz com iframe; aqui sai mais barato porque a demo já é React no mesmo doc.
 *
 * 2. **O que não está na tela não gasta CPU.** A demo só monta quando entra na
 *    viewport, e os tickers param quando o card sai ou a aba é escondida. Com 45
 *    itens e uma dúzia de `setInterval`, isso era a diferença entre uma página e
 *    um ventilador.
 */

import * as React from "react";

/** Falso enquanto o palco está fora da tela ou a aba escondida. */
const StageActiveCtx = React.createContext(true);

export const useStageActive = () => React.useContext(StageActiveCtx);

/** True quando a aba está visível. Um listener só para a página inteira. */
export function usePageVisible() {
  const [visible, setVisible] = React.useState(
    () => typeof document === "undefined" || !document.hidden,
  );
  React.useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return visible;
}

/*
 * Um observer por `rootMargin`, dividido por todos os palcos.
 *
 * Cada ladrilho da grade observa duas distâncias, e com um observer por chamada
 * eram 268 observers vivos numa página de 134 peças. O navegador agrupa o
 * cálculo de interseção por observer, então um só para todos faz a mesma conta
 * uma vez por quadro.
 */
const observadores = new Map<string, { io: IntersectionObserver; avisos: Map<Element, (v: boolean) => void> }>();

function observar(el: Element, rootMargin: string, aviso: (v: boolean) => void) {
  let o = observadores.get(rootMargin);
  if (!o) {
    const avisos = new Map<Element, (v: boolean) => void>();
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => avisos.get(e.target)?.(e.isIntersecting)),
      { rootMargin },
    );
    o = { io, avisos };
    observadores.set(rootMargin, o);
  }
  o.avisos.set(el, aviso);
  o.io.observe(el);
  return () => {
    o.avisos.delete(el);
    o.io.unobserve(el);
  };
}

export function useInView<T extends HTMLElement>(rootMargin = "300px") {
  const ref = React.useRef<T | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    return observar(el, rootMargin, setInView);
  }, [rootMargin]);

  return [ref, inView] as const;
}

/**
 * Largura em px do elemento observado. 0 antes da primeira medição.
 *
 * Ref de callback, e não `useRef` + `useLayoutEffect`: dentro de um portal do
 * Radix o nó pode entrar no DOM depois de o efeito do componente ter rodado, e
 * aí a medição inicial pega `null` e nunca mais volta. Com callback, quem avisa
 * é o React no instante em que o nó existe.
 */
export function useElementWidth<T extends HTMLElement>() {
  const [width, setWidth] = React.useState(0);
  const observer = React.useRef<ResizeObserver | null>(null);

  const ref = React.useCallback((node: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    setWidth(node.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    observer.current = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.current.observe(node);
  }, []);

  React.useEffect(() => () => observer.current?.disconnect(), []);

  return [ref, width] as const;
}

/**
 * Altura que o conteúdo realmente ocupa, incluindo o que passa da caixa.
 *
 * `scrollHeight`, e não `contentRect`: a caixa tem altura definida (as demas
 * precisam de `h-full`), então o observador só reporta a altura que nós mesmos
 * demos. O que interessa é o transbordo — quanto a peça pede a mais.
 */
function useContentHeight<T extends HTMLElement>(label: string) {
  const [height, setHeight] = React.useState(0);
  const node = React.useRef<T | null>(null);
  const observer = React.useRef<ResizeObserver | null>(null);
  /*
   * A medição fecha depois do primeiro meio segundo.
   *
   * Sem isso, demo que troca de texto sozinha (o ticker de status, o glitch, o
   * progresso) empurra o palco a cada frase mais longa. O card cresce, a página
   * cresce junto, e tudo que está abaixo escorrega debaixo do cursor — o
   * Playwright chegou a desistir de clicar num filtro dizendo que o elemento
   * "nunca fica estável". Medir serve para caber a peça, não para segui-la.
   */
  const locked = React.useRef(false);

  const measure = React.useCallback(() => {
    const el = node.current;
    if (!el || locked.current) return;
    // Só cresce: encolher de volta na mesma medição faria o palco pulsar entre
    // dois valores a cada quadro.
    setHeight((prev) => Math.max(prev, el.scrollHeight));
  }, []);

  const ref = React.useCallback(
    (el: T | null) => {
      observer.current?.disconnect();
      observer.current = null;
      node.current = el;
      if (!el) return;
      measure();
      if (typeof ResizeObserver === "undefined") return;
      observer.current = new ResizeObserver(measure);
      observer.current.observe(el);
      for (const child of Array.from(el.children)) observer.current.observe(child);
      // Meio segundo é o bastante para a demo montar e assentar; daí em diante
      // o palco tem um tamanho e mantém.
      setTimeout(() => {
        locked.current = true;
        observer.current?.disconnect();
      }, 500);
    },
    [measure],
  );

  React.useEffect(() => () => observer.current?.disconnect(), []);

  return [ref, height] as const;
}

/**
 * Palco de preview: desenha `children` numa caixa de `w × h` e escala pra caber.
 *
 * A altura do elemento acompanha a escala, então a grade recebe alturas
 * diferentes por item — é daí que vem o ritmo da grade, não de um `h-48` chutado.
 */
export function FitStage({
  w,
  h,
  active = true,
  maxScale = 1,
  minScale = 0,
  label = "palco",
  className,
  children,
}: {
  w: number;
  h: number;
  active?: boolean;
  /** Nome do item — aparece no aviso de dev quando a peça pede mais altura. */
  label?: string;
  /** 1 = nunca amplia. A vista de foco usa >1 para ocupar a tela. */
  maxScale?: number;
  /**
   * Piso da escala. Abaixo dele a peça para de encolher e **transborda** — cabe
   * ao pai rolar na horizontal.
   *
   * Uma parede de 760px espremida em 340px de celular sai a 0,45: o texto do
   * depoimento fica com 6px e a peça deixa de ser julgável. Rolar de lado é
   * chato; ilegível é inútil.
   */
  minScale?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [outer, width] = useElementWidth<HTMLDivElement>();
  const [inner, overflowH] = useContentHeight<HTMLDivElement>(label);
  const pageVisible = usePageVisible();

  // O `h` do catálogo é um piso, não uma promessa: se a peça desenhar mais alto
  // do que foi declarado, o palco cresce em vez de cortar. Sem isto, errar a
  // altura de um item por 20px volta a produzir exatamente o defeito que esta
  // vitrine nasceu para corrigir — e errar em 45 itens é questão de tempo.
  const naturalH = Math.max(h, overflowH);
  const scale = width ? Math.max(minScale, Math.min(maxScale, width / w)) : maxScale;

  /*
   * Crescer é conserto de emergência, não recurso.
   *
   * Toda vez que uma peça pede mais do que foi declarado, o card muda de tamanho
   * depois de a demo montar — e a página inteira escorrega alguns pixels a cada
   * card que aparece durante o scroll. Este aviso existe para a correção virar
   * número no catálogo em vez de comportamento permanente.
   */
  const avisado = React.useRef(false);
  if (import.meta.env?.DEV && overflowH > h && !avisado.current) {
    avisado.current = true;
    console.warn(`[palco] "${label}" pediu ${overflowH}px, declarado ${h}px`);
  }

  return (
    <div ref={outer} className={className} style={{ height: naturalH * scale }}>
      <div
        ref={inner}
        style={{
          width: w,
          height: naturalH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          // Sem isso, a demo escalada continua capturando ponteiro na área que
          // ela ocupava antes da escala e "vaza" hover para o card vizinho.
          willChange: scale === 1 ? undefined : "transform",
        }}
      >
        <StageActiveCtx.Provider value={active && pageVisible}>
          {children}
        </StageActiveCtx.Provider>
      </div>
    </div>
  );
}

/**
 * Palco de proporção fixa: a peça inteira, centrada numa moldura sempre igual.
 *
 * O `FitStage` deixa a ALTURA seguir a peça — cada card do catálogo ficava com
 * uma altura, e a grade virava um mosaico que só fecha com medição de linha,
 * `gridRow: span`, degraus de altura e um `ResizeObserver` por card. Funcionava
 * e nunca pareceu uma vitrine: card de tamanho variável é lista de conteúdo, e
 * o olho não consegue comparar duas peças que não estão na mesma moldura.
 *
 * Aqui a moldura manda. Toda peça recebe a mesma caixa, a escala é a que faz a
 * peça CABER inteira dentro dela (largura E altura), e o que sobra é respiro —
 * nunca corte. Uma cena de 1280px vira miniatura, e isso é honesto: quem
 * precisa ler a peça abre o foco, que a desenha em tamanho real.
 *
 * Nunca amplia. Peça de 380px numa caixa de 420 fica em 380, centrada; esticar
 * pra preencher mostraria a peça num tamanho em que ela não foi desenhada.
 */
/**
 * O miolo da caixa `w×h` do palco — o mesmo na grade e na captura da foto.
 *
 * Medido no acervo inteiro (2026-10-19): onze peças apareciam descentradas no
 * ladrilho, e por três causas que esta caixa resolve de uma vez:
 *
 * - **Trilho que pinta além da caixa** (rail, marquee, logo-wall): o conteúdo
 *   começava na borda esquerda da caixa e escorria até a borda do ladrilho, e a
 *   peça parecia empurrada pra direita. `overflow: hidden` recorta na caixa,
 *   e as margens ficam iguais dos dois lados.
 * - **Demo mais baixa que a caixa** (testimonial-wall, kanban): encostava no
 *   topo. Coluna flex com `justify-content: center` centra na vertical —
 *   e, ao contrário de `place-items`, mantém a largura cheia dos filhos e não
 *   quebra quem usa `h-full` (a altura da caixa é definida).
 * - **Demo mais alta que a caixa**: recortada embaixo em vez de vazar.
 *
 * A captura (`Solo` com `?caixa=1`) usa o MESMO objeto: se os dois divergirem,
 * a foto sai fora de registro com a peça viva e o crossfade volta a pular.
 */
export const CAIXA_DO_PALCO: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  overflow: "hidden",
};

export function PalcoFixo({
  w,
  h,
  ratio = 4 / 3,
  active = true,
  className,
  style,
  children,
}: {
  w: number;
  h: number;
  /** Largura ÷ altura da moldura. Igual para todos os cards da grade. */
  ratio?: number;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [ref, largura] = useElementWidth<HTMLDivElement>();
  const pageVisible = usePageVisible();

  const altura = largura / ratio;
  // Antes da primeira medição a escala é 0 e a peça fica invisível por um quadro
  // — melhor que aparecer em tamanho natural e encolher na frente de quem olha.
  const escala = largura ? Math.min(1, largura / w, altura / h) : 0;

  return (
    <div
      ref={ref}
      /* A marca de "aqui tem peça VIVA montada".
       *
       * A grade do acervo mostra foto em repouso e monta a peça no hover; sem um
       * marcador no DOM não há como um teste provar a diferença — foto e peça
       * desenham coisas parecidas, e "não montou nada" é justamente o invariante
       * que mantém a página de oitenta e duas peças leve. */
      data-palco=""
      className={className}
      style={{ ...style, aspectRatio: String(ratio), position: "relative", overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: w,
          height: h,
          transform: `translate(-50%, -50%) scale(${escala})`,
          willChange: escala === 1 ? undefined : "transform",
          ...CAIXA_DO_PALCO,
        }}
      >
        <StageActiveCtx.Provider value={active && pageVisible}>{children}</StageActiveCtx.Provider>
      </div>
    </div>
  );
}

/**
 * Monta na primeira vez que aparece e nunca mais desmonta; `active` acompanha
 * a visibilidade.
 *
 * Desmontar ao sair da tela zeraria o estado da demo (o knob voltaria ao 5 a
 * cada scroll). O ganho de CPU vem de `active`, que o `FitStage` propaga para
 * os relógios das demos.
 *
 * Devolve o *ref do card inteiro*, não do palco: quem decide montar é a chegada
 * do card na tela, e o palco precisa existir desde o primeiro quadro com a
 * altura final. Palco que só nasce depois muda a altura do documento no meio do
 * scroll — foi assim que a página ganhou faixas em branco e o cabeçalho
 * aparentemente solto no meio do nada.
 */
export function useLazyDemo<T extends HTMLElement>(rootMargin = "300px") {
  const [ref, inView] = useInView<T>(rootMargin);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (inView) setMounted(true);
  }, [inView]);

  return { ref, mounted, active: inView };
}
