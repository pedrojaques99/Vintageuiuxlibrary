"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Névoa procedural para estados de espera — SVG `feTurbulence` puro.
 *
 * A alternativa óbvia (shader/WebGL) morre no caso real: uma grade de 12 tiles
 * gerando ao mesmo tempo estoura o limite de contextos WebGL do browser e os
 * primeiros tiles apagam. Isto é filtro SVG animado pelo compositor — escala
 * para qualquer número de instâncias e não gasta um frame de JS.
 *
 * A cor vem de `currentColor`, então herda o token da marca sem hex próprio.
 *
 * `baseFrequency` animada em 14s: devagar o bastante para ler como fluido, não
 * como ruído de TV. Encurtar isso é a tentação errada.
 *
 * `prefers-reduced-motion`: congela a turbulência (a textura fica, o movimento sai).
 */
export function TurbulenceField({
  intensity = 0.18,
  className,
}: {
  /** Alpha total da névoa (0–1). Sutil — acima de ~0.3 come o conteúdo. */
  intensity?: number;
  className?: string;
}) {
  // id único por instância: dois filtros com o mesmo id no DOM e um apaga o outro.
  const filterId = `turb-${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-brand",
        className,
      )}
      style={{ opacity: intensity }}
      preserveAspectRatio="xMidYMid slice"
    >
      <filter id={filterId} x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.011 0.014"
          numOctaves={2}
          seed={7}
          stitchTiles="stitch"
          result="noise"
        >
          {!reduced && (
            <animate
              attributeName="baseFrequency"
              dur="14s"
              values="0.011 0.014;0.016 0.020;0.011 0.014"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
              repeatCount="indefinite"
            />
          )}
        </feTurbulence>
        {/* tinge o ruído com currentColor, usando o alpha do ruído como máscara */}
        <feFlood floodColor="currentColor" result="tint" />
        <feComposite in="tint" in2="noise" operator="in" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}
