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
 *
 * ── Os três botões do campo ────────────────────────────────────────────────
 *
 * `intensity` (quanto se vê), `scale` (o tamanho do grão) e `speed` (quanto
 * demora um ciclo) são as únicas variáveis que mudam o CARÁTER da névoa, e é por
 * isso que são props em vez de números fixos: com a mesma peça e três valores
 * dá pra ir de névoa larga de fundo de marca a grão fechado de papel impresso.
 * `octaves` fica fora — subir de 2 multiplica o custo do filtro por passada sem
 * mudar a leitura em opacidade baixa.
 */
export function TurbulenceField({
  intensity = 0.18,
  scale = 1,
  speed = 14,
  className,
}: {
  /** Alpha total da névoa (0–1). Sutil — acima de ~0.3 come o conteúdo. */
  intensity?: number;
  /**
   * Multiplicador do grão. `<1` abre a névoa (manchas largas, fundo de marca);
   * `>1` fecha (grão de papel).
   */
  scale?: number;
  /** Segundos de um ciclo. Abaixo de ~6s começa a ler como ruído de TV. */
  speed?: number;
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

  // O par base é o que foi calibrado no olho; `scale` mexe nos dois juntos pra
  // não deformar o grão numa direção só.
  const fx = (0.011 * scale).toFixed(4);
  const fy = (0.014 * scale).toFixed(4);
  const fx2 = (0.016 * scale).toFixed(4);
  const fy2 = (0.02 * scale).toFixed(4);
  const base = `${fx} ${fy}`;

  return (
    <svg
      aria-hidden="true"
      className={cn(
        // `text-[var(--brand,…)]` e não `text-brand`: `brand` não é cor do tema
        // do Tailwind (não existe `--color-brand`), então a classe curta não
        // gerava regra nenhuma e o campo caía no `currentColor` herdado —
        // névoa cinza numa peça que se anuncia como cor da marca.
        "pointer-events-none absolute inset-0 h-full w-full text-[var(--brand,currentColor)]",
        className,
      )}
      style={{ opacity: intensity }}
      preserveAspectRatio="xMidYMid slice"
    >
      <filter id={filterId} x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency={base}
          numOctaves={2}
          seed={7}
          stitchTiles="stitch"
          result="noise"
        >
          {!reduced && (
            <animate
              // `key` força o SMIL a reiniciar quando o preset muda: sem isso o
              // Chrome mantém a animação antiga rodando com os valores velhos.
              key={`${base}-${speed}`}
              attributeName="baseFrequency"
              dur={`${speed}s`}
              values={`${fx} ${fy};${fx2} ${fy2};${fx} ${fy}`}
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
