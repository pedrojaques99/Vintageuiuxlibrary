"use client";

import * as React from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Ink Wordmark — a assinatura de ponta a ponta que condensa da fumaça.
 *
 * Colhido do fecho da página da YURA (2026-10), onde o "yura" gigante fecha o
 * site. A peça é só um SVG com um filtro: `feTurbulence` → `feDisplacementMap`
 * → `feGaussianBlur`. Nada de canvas, nada de WebGL — por isso dá pra pôr no
 * rodapé de qualquer página sem gastar contexto de GPU.
 *
 * Três movimentos, cada um com um dono:
 *
 * 1. **Scroll condensa.** Longe, a marca é fumaça (deslocamento ~35, desfoque
 *    4.5); ao chegar no fim do bloco ela assenta em tinta (deslocamento 1.2,
 *    desfoque 0). O 1.2 final não é zero de propósito: sobra uma borda de tinta
 *    que sangrou no papel, e é ela que separa isto de um `<svg>` chapado.
 * 2. **A tinta respira.** A frequência da turbulência oscila num ciclo de ~25s.
 *    Mais rápido que isso lê como tremedeira, não como tinta.
 * 3. **O ponteiro agita.** A velocidade do ponteiro vira energia que decai a
 *    cada quadro (×0.94): mexeu, a tinta revolve; parou, ela assenta sozinha.
 *
 * A cor é `currentColor`. Quem decide é a classe de texto de quem usa.
 *
 * `prefers-reduced-motion`: a marca nasce assentada (opacidade 1, deslocamento
 * 1.2, sem desfoque) e o laço de quadros nem começa.
 */

export interface InkWordmarkProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** `d` de um path único (a marca convertida em contorno). Use com `viewBox`. */
  path?: string;
  /** `viewBox` do SVG. Obrigatório com `path`; com `children` também é o que dá a proporção. */
  viewBox?: string;
  /**
   * Conteúdo SVG livre no lugar do `path` — vários paths, um `<text>`. O filtro
   * desloca qualquer coisa que pinte, inclusive texto vivo.
   */
  children?: React.ReactNode;
  /** Nome acessível da marca. Sem ele o SVG é só desenho para o leitor de tela. */
  "aria-label": string;
  /** Deslocamento máximo, em unidades do `viewBox`, quando a marca ainda é fumaça. */
  smoke?: number;
  /**
   * Contêiner que rola, se não for a janela. Layout com rolagem num `div`
   * (painel, modal, vitrine) precisa disto, senão o progresso nunca anda.
   */
  container?: React.RefObject<HTMLElement | null>;
  /**
   * Progresso 0..1 vindo de fora (timeline própria, palco sem rolagem, intro).
   * Quando passado, substitui a rolagem: 0 é fumaça, 1 é tinta assentada.
   */
  progress?: MotionValue<number> | number;
}

export function InkWordmark({
  path,
  viewBox = "0 0 1000 300",
  children,
  "aria-label": ariaLabel,
  smoke = 34,
  container,
  progress,
  className,
  onPointerMove,
  onPointerLeave,
  ...props
}: InkWordmarkProps) {
  // id único por instância: dois filtros com o mesmo id no DOM e um apaga o outro.
  const filterId = `tinta-${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const ref = React.useRef<HTMLDivElement>(null);
  const turb = React.useRef<SVGFETurbulenceElement>(null);
  const desl = React.useRef<SVGFEDisplacementMapElement>(null);
  const desfoque = React.useRef<SVGFEGaussianBlurElement>(null);
  const energia = React.useRef(0);
  const ultimo = React.useRef<{ x: number; y: number } | null>(null);
  const reduce = useReducedMotion() ?? false;
  const [visivel, setVisivel] = React.useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    container,
    offset: ["start end", "end end"],
  });
  // A mola não é só suavização. Ligado direto no `style`, o `useScroll` pode ser
  // promovido a ScrollTimeline nativo, e o nativo mede o alcance do `offset` de
  // outro jeito: a opacidade chegava a 1 antes da marca entrar na tela. Passar
  // por `useSpring` força o cálculo em JS, que respeita o offset pedido.
  // Progresso externo tem precedência; número vira MotionValue para a mesma mola.
  const fixo = useMotionValue(typeof progress === "number" ? progress : 0);
  React.useEffect(() => {
    if (typeof progress === "number") fixo.set(progress);
  }, [progress, fixo]);
  const fonte = progress === undefined ? scrollYProgress : typeof progress === "number" ? fixo : progress;
  const prog = useSpring(fonte, { stiffness: 90, damping: 28, restDelta: 0.0005 });
  const opacity = useTransform(prog, [0, 0.55], reduce ? [1, 1] : [0, 1]);

  // O laço de quadros só existe com a marca perto da tela. `requestAnimationFrame`
  // já para sozinho com a aba escondida, então o observer cobre o outro caso.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), {
      rootMargin: "200px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!visivel || reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const quadro = (agora: number) => {
      raf = requestAnimationFrame(quadro);
      if (!turb.current || !desl.current || !desfoque.current) return;
      energia.current *= 0.94;
      // fumaça: 1 longe, 0 quando a marca já assentou (aos 85% do percurso)
      const fumaca = 1 - Math.min(1, Math.max(0, prog.get() / 0.85));
      const s = (agora - t0) / 1000;
      // A turbulência também abre um pouco enquanto é fumaça: grão maior lê
      // como vapor, grão fino lê como borda de tinta.
      const f = 0.018 + Math.sin(s * 0.25) * 0.004 + fumaca * 0.02;
      // setAttribute direto, fora do React: re-render a 60fps por causa de três
      // atributos de filtro seria o componente inteiro reconciliado à toa.
      turb.current.setAttribute("baseFrequency", `${f.toFixed(4)} ${(f * 1.6).toFixed(4)}`);
      desl.current.setAttribute("scale", (1.2 + fumaca * smoke + energia.current * 9).toFixed(2));
      desfoque.current.setAttribute("stdDeviation", (fumaca * 4.5).toFixed(2));
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [visivel, reduce, prog, smoke]);

  const mover = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    const p = { x: e.clientX, y: e.clientY };
    if (ultimo.current) {
      // 140px de deslocamento entre dois eventos = energia cheia. Um gesto
      // calmo agita pouco; só o rápido revolve a tinta inteira.
      const v = Math.hypot(p.x - ultimo.current.x, p.y - ultimo.current.y);
      energia.current = Math.min(1, energia.current + v / 140);
    }
    ultimo.current = p;
  };

  return (
    <div
      ref={ref}
      onPointerMove={mover}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        ultimo.current = null;
      }}
      className={cn("overflow-hidden", className)}
      {...props}
    >
      <motion.svg
        viewBox={viewBox}
        role="img"
        aria-label={ariaLabel}
        className="block h-auto w-full overflow-visible"
        style={{ opacity }}
      >
        <defs>
          {/* Região folgada: o deslocamento empurra a tinta para fora da caixa
              do desenho, e o filtro recorta tudo que passar da região. */}
          <filter id={filterId} x="-15%" y="-40%" width="130%" height="180%">
            <feTurbulence
              ref={turb}
              type="fractalNoise"
              baseFrequency="0.018 0.029"
              numOctaves={2}
              seed={7}
              result="ruido"
            />
            <feDisplacementMap
              ref={desl}
              in="SourceGraphic"
              in2="ruido"
              scale={reduce ? 1.2 : 1.2 + smoke}
              xChannelSelector="R"
              yChannelSelector="G"
              result="tinta"
            />
            <feGaussianBlur ref={desfoque} in="tinta" stdDeviation={reduce ? 0 : 4.5} />
          </filter>
        </defs>
        <g fill="currentColor" filter={`url(#${filterId})`}>
          {children ?? (path ? <path d={path} fillRule="evenodd" clipRule="evenodd" /> : null)}
        </g>
      </motion.svg>
    </div>
  );
}
