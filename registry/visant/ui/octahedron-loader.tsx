"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Loader de rota da marca — o Octahedron Visant no centro da tela.
 *
 * Substitui os `loading.tsx` genéricos (spinner cru / skeleton chutado). NÃO
 * substitui os skeletons internos dos componentes-cliente (SWR `isLoading`,
 * data-table), que refletem o dado real chegando — esses são a inteligência de
 * cada página e ficam intactos.
 *
 * `prefers-reduced-motion`: mostra o símbolo parado (sem loop/autoplay).
 *
 * Usa a variante de linha do símbolo (`-lines`), gerada do original por
 * `scripts/lottie-outline.js` — o arquivo de marca fica intacto.
 */
export function OctahedronLoader({
  className,
  size = 96,
}: {
  className?: string;
  /** Lado do símbolo em px. */
  size?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn(
        "flex min-h-screen w-full items-center justify-center",
        className,
      )}
    >
      <DotLottieReact
        src="/assets/brand/Octahedron-vsn-lines.lottie"
        loop={!reduceMotion}
        autoplay={!reduceMotion}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
