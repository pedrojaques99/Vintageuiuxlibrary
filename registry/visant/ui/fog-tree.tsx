"use client";

/**
 * Fog Tree — uma árvore procedural sozinha na névoa, em duotone da marca.
 *
 * Colhido do site da YURA (2026-10), onde a seção do tema central leva a câmera
 * para dentro do jardim com o scroll enquanto a névoa abre. A peça vale fora
 * dali porque o efeito é de marca nenhuma: a cena é desenhada em cinza e só o
 * último passe pinta com `--background` (papel) e `--foreground` (tinta). Troca
 * de tema inverte a foto inteira; troca de marca troca dois tokens.
 *
 * Decisões que sobrevivem à colheita:
 *
 * 1. **O WebGL só desce perto da tela.** A cena mora em `@/lib/fog-tree-scene`
 *    e entra por `import()` quando a peça passa a 400px da viewport. O ez-tree
 *    embute as texturas no bundle; quem nunca rola até a seção não paga.
 * 2. **Fora da tela e com a aba escondida, zero quadro.** O laço para (não
 *    "renderiza menos"): GPU de notebook esquenta com cena parada rodando atrás
 *    do texto que a pessoa está lendo.
 * 3. **Arrastar só com ponteiro fino, por padrão.** O OrbitControls trava o
 *    `touch-action` do canvas, e no celular encostar na árvore deixaria de
 *    rolar a página. `draggable` força qualquer um dos lados.
 * 4. **Mola ANTES de qualquer transform, no modo `scroll`.** `useScroll` +
 *    `useTransform` direto é acelerado pelo ScrollTimeline nativo e erra a
 *    faixa dentro de `position: sticky` — medido no site de origem. A mola tira
 *    a cadeia do caminho nativo e ainda dá peso à câmera.
 * 5. **Movimento reduzido não é cena congelada às cegas.** Sem giro ocioso, sem
 *    vento, sem rastro e sem grão animado — mas o scroll ainda aproxima a câmera
 *    (é posição, não animação) e o arrasto ainda gira, quadro a quadro, sem
 *    laço contínuo.
 * 6. **Sem WebGL, o papel.** Se o contexto não nasce, a seção fica com o fundo
 *    do token e o texto por cima — nunca uma caixa de erro.
 *
 * Requer `three`, `@dgreenheck/ez-tree` e `framer-motion`.
 */

import * as React from "react";
import {
  isMotionValue,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  type MotionValue,
} from "framer-motion";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";
import type { FogTreePreset, FogTreeScene } from "@/lib/fog-tree-scene";

export type { FogTreePreset };

export interface FogTreeProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /**
   * Progresso 0..1 da caminhada: 0 é a árvore inteira ao longe, 1 é a câmera
   * debaixo da copa com a névoa aberta. Número ou `MotionValue` (o de um
   * `useScroll` seu, por exemplo). Ignorado com `scroll`.
   */
  progress?: number | MotionValue<number>;
  /**
   * Prende o progresso ao scroll da própria seção: a peça vira uma `<section>`
   * com `scrollLength` de altura e o palco fica preso (sticky) na tela.
   */
  scroll?: boolean;
  /** Altura da seção no modo `scroll`. Quanto maior, mais lenta a caminhada. */
  scrollLength?: string;
  /** Cor das luzes. Qualquer cor CSS; o padrão é o token de fundo. */
  paper?: string;
  /** Cor das sombras. O padrão é o token de texto. */
  ink?: string;
  /**
   * Semente do ez-tree. Mesma semente, mesma árvore — em toda visita.
   * @min 1
   * @max 9999
   * @step 1
   */
  seed?: number;
  /** Espécie (preset do ez-tree). O `Oak Medium` ganha a copa redonda. */
  preset?: FogTreePreset;
  /** Densidade da névoa no começo e no fim do progresso. ~0.5 a 1.5. */
  fog?: { start?: number; end?: number };
  /** Girar arrastando. Padrão: só com ponteiro fino (mouse, caneta). */
  draggable?: boolean;
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
   * Camada por cima da cena, para o texto da seção. Função recebe o progresso
   * efetivo (já com mola no modo `scroll`), para o texto chegar junto da câmera.
   * A camada é `pointer-events: none` — dê `pointer-events-auto` ao que clica.
   */
  children?: React.ReactNode | ((progress: MotionValue<number>) => React.ReactNode);
}

const prefersLight = () =>
  window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

export function FogTree({
  progress,
  scroll = false,
  scrollLength = "220vh",
  paper = "var(--background)",
  ink = "var(--foreground)",
  seed = 4242,
  preset = "Oak Medium",
  fog,
  draggable,
  trail = 0.86,
  grain = 0.05,
  className,
  style,
  children,
  ...props
}: FogTreeProps) {
  const rootRef = React.useRef<HTMLElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const sceneRef = React.useRef<FogTreeScene | null>(null);
  const reduce = useReducedMotion() ?? false;

  // ── Progresso efetivo ────────────────────────────────────────────────────
  // Os três ganchos rodam sempre (regra dos hooks); o modo só escolhe a fonte.
  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start start", "end end"],
  });
  const sprung = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.0005 });
  const own = useMotionValue(typeof progress === "number" ? progress : 0);
  const effective = scroll ? sprung : isMotionValue(progress) ? progress : own;

  React.useEffect(() => {
    if (typeof progress === "number") own.set(progress);
  }, [progress, own]);

  React.useEffect(() => {
    sceneRef.current?.setProgress(effective.get());
    return effective.on("change", (v) => sceneRef.current?.setProgress(v));
  }, [effective]);

  // ── Ponteiro fino (SSR devolve falso; o efeito corrige no cliente) ───────
  const [fine, setFine] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const read = () => setFine(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  const canDrag = draggable ?? fine;

  // ── Cores: token → sRGB, relido quando o tema muda ───────────────────────
  const applyColors = React.useCallback(() => {
    const el = rootRef.current;
    if (!el || !sceneRef.current) return;
    sceneRef.current.setColors(resolveCssColor(paper, el), resolveCssColor(ink, el));
  }, [paper, ink]);
  const applyRef = React.useRef(applyColors);
  applyRef.current = applyColors;

  React.useEffect(() => {
    applyColors();
    // Tema por classe/atributo no <html> E tema por media query: os dois
    // existem por aí, e só um deles dispara o MutationObserver.
    const off = onThemeChange(applyColors);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", applyColors);
    return () => {
      off();
      mq.removeEventListener("change", applyColors);
    };
  }, [applyColors]);

  // ── Ciclo de vida da cena ────────────────────────────────────────────────
  const fogStart = fog?.start ?? 0.85;
  const fogEnd = fog?.end ?? 0.6;
  const dragRef = React.useRef(canDrag);
  dragRef.current = canDrag;

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
          import("@/lib/fog-tree-scene")
            .then(({ createFogTreeScene }) => {
              if (!alive) return;
              const scene = createFogTreeScene(canvas, {
                preset,
                seed,
                fog: { start: fogStart, end: fogEnd },
                trail,
                grain,
                draggable: dragRef.current,
                reduce,
                light: prefersLight(),
              });
              sceneRef.current = scene;
              if (!scene) return;
              applyRef.current();
              scene.setProgress(effective.get());
              sync();
            })
            // chunk que não desce (rede caiu, deploy novo) deixa o papel liso
            .catch(() => {});
        }
        sync();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", sync);

    return () => {
      alive = false;
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // `effective` fica de fora: trocar a fonte do progresso não regera a árvore,
    // o efeito acima já reassina. O resto muda a geometria ou o pós — regera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, seed, fogStart, fogEnd, trail, grain, reduce]);

  React.useEffect(() => {
    sceneRef.current?.setDraggable(canDrag);
  }, [canDrag]);

  const content = typeof children === "function" ? children(effective) : children;

  const stage = (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          "absolute inset-0 block h-full w-full",
          canDrag ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
        )}
      />
      {content != null && (
        <div className="pointer-events-none relative h-full w-full">{content}</div>
      )}
    </>
  );

  if (scroll) {
    return (
      <section
        ref={rootRef}
        className={cn("relative", className)}
        style={{ height: scrollLength, background: paper, ...style }}
        {...props}
      >
        <div className="sticky top-0 h-svh overflow-hidden">{stage}</div>
      </section>
    );
  }

  return (
    <div
      ref={rootRef as React.RefObject<HTMLDivElement>}
      className={cn("relative isolate h-[70svh] min-h-[420px] w-full overflow-hidden", className)}
      style={{ background: paper, ...style }}
      {...props}
    >
      {stage}
    </div>
  );
}

export default FogTree;
