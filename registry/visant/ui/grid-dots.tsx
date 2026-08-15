"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Malha de pontos de fundo — o "papel milimetrado" das telas de ferramenta.
 *
 * Um `radial-gradient` repetido, não SVG e não canvas: zero nós no DOM, zero
 * requisição, e o navegador desenha no compositor. Numa página com sidebar,
 * canvas e grade de resultados, isso é a diferença entre textura de graça e mais
 * um elemento para o layout engine resolver.
 *
 * A cor vem de `currentColor` (default: `--foreground`), então inverte sozinha
 * entre tema claro e escuro sem hook de tema nem prop de cor.
 *
 * Opacidade default 0.07 é o teto útil: acima disso a malha compete com o
 * conteúdo em vez de dar profundidade.
 *
 * ── `spotlight`: a malha que responde ao ponteiro ───────────────────────────
 *
 * Malha parada é papel de parede — dá profundidade e para por aí. Com
 * `spotlight={raio}` a peça ganha o trabalho que justifica existir num hero: os
 * pontos ACENDEM na cor da marca dentro de um círculo que segue o ponteiro, e o
 * resto da superfície continua no cinza de fundo. É o mesmo gesto de "a luz
 * mostra que a superfície tem textura" — o fundo deixa de ser decoração e passa
 * a reagir a quem está lendo.
 *
 * Três decisões que fazem isso não virar peso:
 *
 * · **O halo é uma máscara, não um segundo desenho.** A camada acesa é a mesma
 *   malha com `mask-image` radial. Nenhum ponto é recalculado; o compositor
 *   move um gradiente.
 * · **Uma escrita por quadro.** `pointermove` dispara dezenas de vezes por
 *   segundo; escrever custom property em cada evento força recálculo de estilo
 *   fora do quadro.
 * · **Só onde há ponteiro fino.** Em toque não existe hover: o halo ficaria
 *   preso no último ponto tocado, o que é pior que não ter halo. Sem ponteiro
 *   fino a camada acesa nem monta, e a peça é a malha de sempre.
 *
 * O repouso — ponteiro nunca entrou, ou já saiu — é o halo no centro, apagado.
 * Nunca uma superfície em branco esperando gesto.
 */
export function GridDots({
  opacity = 0.07,
  dotSize = 1.5,
  spacing = 20,
  spotlight,
  spotlightOpacity = 0.55,
  className,
}: {
  /** 0–1. Acima de ~0.1 vira ruído. */
  opacity?: number;
  /** Raio do ponto, em px. */
  dotSize?: number;
  /** Distância entre pontos, em px. */
  spacing?: number;
  /**
   * Raio em px do halo que segue o ponteiro. Sem isto a malha é estática —
   * que continua sendo o uso certo em superfície de trabalho.
   */
  spotlight?: number;
  /** 0–1. Alpha dos pontos acesos dentro do halo. */
  spotlightOpacity?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [fino, setFino] = React.useState(false);
  const aceso = spotlight != null && spotlight > 0 && fino;

  React.useEffect(() => {
    if (spotlight == null || spotlight <= 0) return;
    try {
      setFino(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    } catch {
      setFino(false);
    }
  }, [spotlight]);

  React.useEffect(() => {
    const el = ref.current;
    // A superfície que recebe o gesto é o pai — o halo é fundo dela, e o próprio
    // fundo é `pointer-events-none` justamente pra não roubar clique do conteúdo.
    const alvo = el?.parentElement;
    if (!el || !alvo || !aceso) return;

    let raf = 0;
    let x = 0;
    let y = 0;
    let lit = 0;
    const pintar = () => {
      raf = 0;
      el.style.setProperty("--gx", `${x}px`);
      el.style.setProperty("--gy", `${y}px`);
      el.style.setProperty("--lit", `${lit}`);
    };
    const agendar = () => {
      if (raf) return;
      raf = requestAnimationFrame(pintar);
    };

    const mover = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const r = alvo.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      lit = 1;
      agendar();
    };
    const sair = () => {
      lit = 0;
      agendar();
    };

    alvo.addEventListener("pointermove", mover, { passive: true });
    alvo.addEventListener("pointerleave", sair, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      alvo.removeEventListener("pointermove", mover);
      alvo.removeEventListener("pointerleave", sair);
    };
  }, [aceso]);

  const malha = {
    backgroundImage: `radial-gradient(circle, currentColor ${dotSize}px, transparent ${dotSize}px)`,
    backgroundSize: `${spacing}px ${spacing}px`,
  } as const;

  return (
    <div ref={ref} aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      <div className="absolute inset-0 text-foreground" style={{ opacity, ...malha }} />
      {aceso ? (
        <div
          // `text-[var(--brand,…)]`: `brand` não é cor do tema do Tailwind, e a
          // classe curta `text-brand` não geraria regra nenhuma.
          className="absolute inset-0 text-[var(--brand,currentColor)]"
          style={{
            ...malha,
            // Sem gesto ainda: halo no centro e `--lit` em 0. O que se vê é a
            // malha de sempre, nunca uma superfície esperando ponteiro.
            opacity: `calc(${spotlightOpacity} * var(--lit, 0))`,
            transition: "opacity var(--dur-base, 220ms) var(--ease-out, ease)",
            maskImage: `radial-gradient(circle ${spotlight}px at var(--gx, 50%) var(--gy, 50%), #000 0%, #000 35%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(circle ${spotlight}px at var(--gx, 50%) var(--gy, 50%), #000 0%, #000 35%, transparent 100%)`,
          }}
        />
      ) : null}
    </div>
  );
}
