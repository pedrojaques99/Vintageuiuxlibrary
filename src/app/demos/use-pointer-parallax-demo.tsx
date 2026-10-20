"use client";

/**
 * Três objetos soltos no ar, cada um numa profundidade. Mais nada.
 *
 * A versão anterior provava a paralaxe com malha: pontos, grade grossa, um
 * retalho de marca, uma moldura vazia, um selo e uma legenda. Seis camadas
 * explicando o efeito, e o report devolveu "poluído". O olho não precisa de
 * régua quando a cena tem OBJETO: um recorte 3D que anda mais que o de trás já
 * diz "este está mais perto", sem grade nenhuma.
 *
 * O que sobrou de método:
 * - `--d` cresce do fundo pra frente. O globo, maior e mais escuro, quase não
 *   anda; o troféu, pequeno e na frente, anda seis vezes mais. Tamanho e
 *   deslocamento contam a mesma história de distância.
 * - O fundo é um pontilhado só, bem apagado, e é a camada que sangra
 *   (`-inset-4`): deslocada, ela nunca mostra borda vazia.
 * - Sem legenda "mova o ponteiro". Quem passa o mouse descobre na hora; quem
 *   não passa vê uma composição parada, que é o repouso correto da peça.
 */

import * as React from "react";

import { usePointerParallax } from "../../../registry/visant/hooks/use-pointer-parallax";
import { Media, midia, useWireframe } from "../media";

/** O CSS decide a profundidade de cada objeto; o hook só escreve `--px/--py`. */
const desloca = (d: number) => ({
  transform: `translate3d(calc(var(--px, 0) * ${d}px), calc(var(--py, 0) * ${d}px), 0)`,
});

const PONTOS = {
  backgroundImage:
    "radial-gradient(circle, color-mix(in oklab, var(--foreground) 14%, transparent) 1px, transparent 1.2px)",
  backgroundSize: "22px 22px",
};

/** Recorte com alpha, sem a caixa `bg-muted` da `Media`: o objeto flutua. */
function Objeto({ indice, className, d, sombra }: { indice: number; className: string; d: number; sombra: number }) {
  const { wireframe } = useWireframe();
  const m = midia("cena", indice);
  const estilo = {
    ...desloca(d),
    filter: `drop-shadow(0 ${sombra}px ${sombra * 1.6}px color-mix(in oklab, black 38%, transparent))`,
  };
  if (wireframe || !m) {
    return <Media papel="cena" indice={indice} ratio="1/1" className={className} style={desloca(d)} aria-hidden />;
  }
  return (
    <img
      src={m.src}
      alt=""
      aria-hidden
      draggable={false}
      width={m.w}
      height={m.h}
      className={`pointer-events-none absolute select-none object-contain ${className}`}
      style={estilo}
    />
  );
}

export default function PointerParallaxDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  usePointerParallax(ref);

  return (
    // `min-h`: todos os planos são absolutos, então a caixa não tem altura
    // própria. Na página solo a cena colapsava numa linha de 1px.
    <div ref={ref} className="relative h-full min-h-[300px] w-full overflow-hidden bg-card">
      <div aria-hidden className="absolute -inset-4" style={{ ...PONTOS, ...desloca(6) }} />

      {/* fundo: o globo, grande e quase parado */}
      <Objeto indice={5} d={10} sombra={10} className="left-[12%] top-[8%] h-[84%] w-auto opacity-90" />
      {/* meio: o rádio */}
      <Objeto indice={2} d={26} sombra={16} className="right-[10%] top-[16%] h-[58%] w-auto" />
      {/* frente: o troféu, pequeno e o que mais anda */}
      <Objeto indice={3} d={60} sombra={22} className="bottom-[6%] left-[44%] h-[46%] w-auto" />
    </div>
  );
}
