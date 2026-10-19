"use client";

/**
 * FogGarden — a caminhada por um jardim na névoa, presa ao scroll.
 *
 * Colhido da rota `/jardim` do site da YURA (2026-10). A seção é alta (uma
 * janela de scroll por parada) e o palco fica preso na tela: rolar leva a
 * câmera pela trilha, e cada parada de texto sai da névoa, fica, e volta para
 * ela. Nenhuma cor própria — a cena é cinza até o duotone do `fog-post` pintar
 * com `--background` e `--foreground`.
 *
 * Decisões que sobrevivem à colheita:
 *
 * 1. **Mola antes de qualquer `useTransform`.** `useScroll` direto num
 *    `useTransform` de opacidade é acelerado pelo ScrollTimeline nativo, que
 *    erra a faixa dentro de `position: sticky` — as paradas acendiam na hora
 *    errada. Passar pela `useSpring` tira a cadeia do caminho nativo e ainda dá
 *    passo de caminhada à câmera, em vez do tranco da roda do mouse.
 * 2. **Texto em `mix-blend-difference`.** Sobre a névoa ele lê como tinta;
 *    sobre uma copa escura, em negativo. Nenhuma posição da trilha deixa o
 *    texto ilegível, e ninguém precisa de caixa de vidro atrás da frase. A cor
 *    da camada é o tom MAIS CLARO do duotone (papel no claro, tinta no escuro):
 *    `difference` com cor escura sobre fundo escuro dá preto no preto, e o
 *    texto sumia no dark mode.
 * 3. **Cada parada tem a sua janela.** Parada `i` de `n` acende em torno de
 *    `(i + 0.5) / n`. A primeira já está acesa no carregamento (a seção não abre
 *    vazia) e a última fica — a caminhada termina num lugar, não no nada.
 *    `keep` faz qualquer uma ficar.
 * 4. **Só clica o que se vê.** O conteúdo das paradas apagadas continua no DOM
 *    (leitor de tela lê a sequência inteira), mas `pointer-events` só liga com
 *    a parada acima de 60% de opacidade: link invisível não rouba clique.
 * 5. **Clareiras saem das paradas.** Sem `clearings`, cada parada a partir da
 *    segunda ganha uma clareira um pouco à frente do seu centro — o texto
 *    acende quando a árvore protagonista entra no quadro.
 * 6. **O WebGL só desce perto da tela, e para fora dela.** Mesmo trato do
 *    `fog-tree`: `import()` a 400px da viewport, laço parado fora da tela e com
 *    a aba escondida, modo leve no toque e em tela pequena.
 *
 * Requer `three`, `@dgreenheck/ez-tree` e `framer-motion`.
 */

import * as React from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor, type RGB } from "@/lib/css-color";
import type { GardenLandmark, GardenScene } from "./garden-scene";

export type { GardenLandmark };

export interface FogGardenStop {
  id: string;
  content: React.ReactNode;
  /** Onde o bloco encosta na horizontal. */
  align?: "start" | "center" | "end";
  /** Fica aceso depois da sua janela, em vez de voltar para a névoa. */
  keep?: boolean;
}

export interface FogGardenProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  stops: FogGardenStop[];
  /** Comprimento de scroll de cada parada. A seção mede `n × heightPerStop`. */
  heightPerStop?: string;
  /**
   * Altura do palco preso. Com `container`, o padrão é a altura do container
   * (medida), porque `svh` é da janela e não do scroller.
   */
  viewport?: string;
  /**
   * Posições de plantio ao longo da trilha. O modo leve usa 60% disso.
   * @min 8
   * @max 140
   * @step 1
   */
  density?: number;
  /** Pontos 0..1 da trilha com clareira. Padrão: derivados das paradas. */
  clearings?: number[];
  /**
   * Objeto para cada clareira (ver `GardenLandmark`). Lido uma vez, quando a
   * cena nasce: uma função inline mudaria a cada render e replantaria o jardim.
   */
  landmark?: GardenLandmark;
  /** Contador "01 / 05" no canto. */
  counter?: boolean;
  /**
   * Semente do plantio. Mesma semente, mesmo jardim.
   * @min 1
   * @max 9999
   * @step 1
   */
  seed?: number;
  paper?: string;
  ink?: string;
  /**
   * Rastro de longa exposição. 0 desliga.
   * @min 0
   * @max 0.98
   * @step 0.01
   */
  trail?: number;
  /**
   * Grão de película.
   * @min 0
   * @max 0.2
   * @step 0.01
   */
  grain?: number;
  /**
   * Scroller que não é a janela (um painel com `overflow: auto`). O progresso
   * passa a ser medido nele.
   */
  container?: React.RefObject<HTMLElement | null>;
}

const ALIGN = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
} as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** Luminância relativa aproximada — só para escolher o tom claro do par. */
const luma = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const toCss = ([r, g, b]: RGB) =>
  `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;

const prefersLight = () =>
  window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

export function FogGarden({
  stops,
  heightPerStop = "120vh",
  viewport,
  density = 78,
  clearings,
  landmark,
  counter = true,
  seed = 2026,
  paper = "var(--background)",
  ink = "var(--foreground)",
  trail = 0.84,
  grain = 0.05,
  container,
  className,
  style,
  ...props
}: FogGardenProps) {
  const rootRef = React.useRef<HTMLElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const sceneRef = React.useRef<GardenScene | null>(null);
  const reduce = useReducedMotion() ?? false;
  const n = stops.length;

  const { scrollYProgress } = useScroll({
    target: rootRef,
    container,
    offset: ["start start", "end end"],
  });
  // decisão 1 — passo de caminhada: mais mole que a mola do `fog-tree`
  const prog = useSpring(scrollYProgress, { stiffness: 70, damping: 24, restDelta: 0.0002 });

  React.useEffect(() => {
    sceneRef.current?.setProgress(prog.get());
    return prog.on("change", (v) => sceneRef.current?.setProgress(v));
  }, [prog]);

  // ── Palco: altura da janela, ou do container medido ──────────────────────
  const [measured, setMeasured] = React.useState<string | null>(null);
  React.useEffect(() => {
    const el = container?.current;
    if (!el || viewport) return;
    const ro = new ResizeObserver(() => setMeasured(`${el.clientHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, [container, viewport]);
  const stageHeight = viewport ?? measured ?? "100svh";

  // ── Clareiras (decisão 5). Chave em string: array novo a cada render do pai
  //    não pode replantar o jardim. ───────────────────────────────────────────
  const clearingKey = clearings
    ? clearings.join(",")
    : Array.from({ length: Math.max(0, n - 1) }, (_, j) =>
        Math.min(0.97, (j + 1.5) / n + 0.02).toFixed(4),
      ).join(",");

  const landmarkRef = React.useRef(landmark);
  landmarkRef.current = landmark;

  // ── Cores (decisão 2) ────────────────────────────────────────────────────
  const applyColors = React.useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const p = resolveCssColor(paper, el);
    const k = resolveCssColor(ink, el);
    el.style.setProperty("--fog-garden-text", toCss(luma(p) >= luma(k) ? p : k));
    sceneRef.current?.setColors(p, k);
  }, [paper, ink]);
  const applyRef = React.useRef(applyColors);
  applyRef.current = applyColors;

  React.useEffect(() => {
    applyColors();
    const off = onThemeChange(applyColors);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", applyColors);
    return () => {
      off();
      mq.removeEventListener("change", applyColors);
    };
  }, [applyColors]);

  // ── Ciclo de vida da cena (decisão 6) ────────────────────────────────────
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    let alive = true;
    let loading = false;
    let near = false;

    const running = () => near && document.visibilityState === "visible";
    const sync = () => sceneRef.current?.setRunning(running());

    const io = new IntersectionObserver(
      ([e]) => {
        near = !!e?.isIntersecting;
        if (near && !sceneRef.current && !loading) {
          loading = true;
          import("./garden-scene")
            .then(({ createGardenScene }) => {
              if (!alive) return;
              const scene = createGardenScene(canvas, {
                seed,
                density,
                clearings: clearingKey ? clearingKey.split(",").map(Number) : [],
                landmark: landmarkRef.current,
                trail,
                grain,
                reduce,
                light: prefersLight(),
              });
              sceneRef.current = scene;
              if (!scene) return;
              applyRef.current();
              scene.setProgress(prog.get());
              sync();
            })
            .catch(() => {});
        }
        sync();
      },
      // `root: null` mesmo com container: o IO observa a interseção com a
      // janela, e o container está dentro dela — continua valendo.
      { rootMargin: "400px 0px" },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", sync);

    // Olhar que segue o ponteiro: só com mouse. No toque não há ponteiro
    // pairando, e o "olhar" pularia a cada toque de scroll.
    const fine = window.matchMedia("(pointer: fine)").matches;
    const move = (e: PointerEvent) =>
      sceneRef.current?.setPointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1,
      );
    if (fine && !reduce) window.addEventListener("pointermove", move, { passive: true });

    return () => {
      alive = false;
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", move);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, density, clearingKey, trail, grain, reduce]);

  const counterText = useTransform(prog, (v) => pad(Math.min(n, Math.floor(v * n) + 1)));

  if (!n) return null;

  return (
    <section
      ref={rootRef}
      className={cn("relative", className)}
      style={{ height: `calc(${n} * ${heightPerStop})`, background: paper, ...style }}
      {...props}
    >
      <div className="sticky top-0 overflow-hidden" style={{ height: stageHeight }}>
        <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 block h-full w-full" />

        <div
          className="pointer-events-none absolute inset-0 mix-blend-difference"
          style={{ color: "var(--fog-garden-text, var(--background))" }}
        >
          {stops.map((s, i) => (
            <Stop key={s.id} stop={s} i={i} n={n} prog={prog} reduce={reduce} />
          ))}

          {counter && n > 1 && (
            <div
              aria-hidden
              className="absolute bottom-6 left-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] md:bottom-8 md:left-10"
            >
              <motion.span className="tabular-nums">{counterText}</motion.span>
              <span className="opacity-50">/ {pad(n)}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stop({
  stop,
  i,
  n,
  prog,
  reduce,
}: {
  stop: FogGardenStop;
  i: number;
  n: number;
  prog: MotionValue<number>;
  reduce: boolean;
}) {
  const c = (i + 0.5) / n;
  const w = 0.5 / n;
  const first = i === 0;
  const stays = stop.keep || i === n - 1;

  // decisão 3 — entra da névoa, fica, volta para ela
  const range = [c - w, c - w * 0.35, c + w * 0.35, c + w];
  const enter = first ? 1 : 0;
  const leave = stays ? 1 : 0;
  const opacity = useTransform(prog, range, [enter, 1, 1, leave]);
  const fogBlur = reduce ? 0 : 14;
  const filter = useTransform(
    prog,
    range,
    [(1 - enter) * fogBlur, 0, 0, (1 - leave) * fogBlur].map((b) => `blur(${b}px)`),
  );
  const drift = reduce ? 0 : 40;
  const y = useTransform(
    prog,
    [c - w, c, c + w],
    [first ? 0 : drift, 0, stays ? 0 : -drift],
  );
  // decisão 4
  const pointerEvents = useTransform(opacity, (o) => (o > 0.6 ? "auto" : "none"));

  return (
    <motion.div
      style={{ opacity, filter, y }}
      className={cn(
        "absolute inset-0 flex flex-col justify-center px-6 md:px-10 lg:px-16",
        ALIGN[stop.align ?? "center"],
      )}
    >
      <motion.div
        style={{ pointerEvents }}
        className={cn("flex max-w-full flex-col", ALIGN[stop.align ?? "center"])}
      >
        {stop.content}
      </motion.div>
    </motion.div>
  );
}

export default FogGarden;
