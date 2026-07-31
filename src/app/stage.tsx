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
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
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
function useContentHeight<T extends HTMLElement>() {
  const [height, setHeight] = React.useState(0);
  const node = React.useRef<T | null>(null);
  const observer = React.useRef<ResizeObserver | null>(null);

  const measure = React.useCallback(() => {
    const el = node.current;
    // Só cresce: encolher de volta na mesma medição faria o palco pulsar entre
    // dois valores a cada quadro.
    if (el) setHeight((prev) => Math.max(prev, el.scrollHeight));
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
  className,
  children,
}: {
  w: number;
  h: number;
  active?: boolean;
  /** 1 = nunca amplia. A vista de foco usa >1 para ocupar a tela. */
  maxScale?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [outer, width] = useElementWidth<HTMLDivElement>();
  const [inner, overflowH] = useContentHeight<HTMLDivElement>();
  const pageVisible = usePageVisible();

  // O `h` do catálogo é um piso, não uma promessa: se a peça desenhar mais alto
  // do que foi declarado, o palco cresce em vez de cortar. Sem isto, errar a
  // altura de um item por 20px volta a produzir exatamente o defeito que esta
  // vitrine nasceu para corrigir — e errar em 45 itens é questão de tempo.
  const naturalH = Math.max(h, overflowH);
  const scale = width ? Math.min(maxScale, width / w) : maxScale;

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
