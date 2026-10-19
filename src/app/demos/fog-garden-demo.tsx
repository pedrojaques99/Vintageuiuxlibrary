"use client";

/**
 * A caminhada dentro de um card: o card VIRA a janela.
 *
 * Mesmo trato do `pinned-scene`: a peça é uma dobra de página inteira, então
 * aqui ela ganha um scroller próprio (`overflow-y: auto` de altura fixa) e o
 * `container` apontado para ele. O `useScroll` do framer mede por layout
 * (`offsetTop`), não por `getBoundingClientRect`, então a escala que o palco
 * da vitrine aplica com `transform` não distorce o progresso — a caminhada
 * anda inteira no card.
 *
 * O marco das clareiras é um vaso torneado em `LatheGeometry`, construído aqui
 * mesmo: a prova de que o bloco aceita o objeto de qualquer marca sem saber o
 * que ele é. Cinzas numéricos, porque o duotone pinta depois.
 */

import * as React from "react";
import * as THREE from "three";

import { FogGarden, type FogGardenStop } from "../../../registry/visant/blocks/fog-garden";
import type { DemoProps } from "../catalog";

const cinza = (v: number) => new THREE.Color().setRGB(v, v, v, THREE.SRGBColorSpace);

/** Perfil do vaso (raio, altura): base, bojo, gargalo, boca. */
const PERFIL: [number, number][] = [
  [0, 0],
  [1.1, 0],
  [1.5, 0.6],
  [1.7, 1.8],
  [1.4, 3],
  [0.6, 3.8],
  [0.45, 4.6],
  [0.7, 5],
  [0.6, 5.05],
];

/** Toco + vaso. A cena posiciona, gira `userData.spin` e descarta no fim. */
function vasoNoToco() {
  const g = new THREE.Group();
  const toco = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.8, 5, 9),
    new THREE.MeshStandardMaterial({ color: cinza(0.42), roughness: 1, flatShading: true }),
  );
  toco.position.y = 2.5;
  const vaso = new THREE.Mesh(
    new THREE.LatheGeometry(PERFIL.map(([x, y]) => new THREE.Vector2(x, y)), 48),
    new THREE.MeshStandardMaterial({ color: cinza(0.26), roughness: 0.55 }),
  );
  vaso.position.y = 5;
  vaso.scale.setScalar(1.4);
  g.add(toco, vaso);
  g.userData.spin = 0.35;
  return g;
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 text-[11px] uppercase tracking-[0.14em] opacity-70">{children}</p>
);

const STOPS: FogGardenStop[] = [
  {
    id: "entrada",
    content: (
      <>
        <Eyebrow>Caminhada</Eyebrow>
        <h3 className="max-w-[16ch] text-6xl font-normal leading-[0.95] tracking-tight">
          Entre devagar no jardim
        </h3>
      </>
    ),
  },
  {
    id: "um",
    align: "start",
    content: (
      <>
        <Eyebrow>01 · Clareira</Eyebrow>
        <h3 className="max-w-[18ch] text-4xl font-normal leading-[1.02] tracking-tight">
          Cada parada sai da névoa e volta para ela
        </h3>
      </>
    ),
  },
  {
    id: "dois",
    align: "end",
    content: (
      <>
        <Eyebrow>02 · Clareira</Eyebrow>
        <h3 className="max-w-[18ch] text-4xl font-normal leading-[1.02] tracking-tight">
          O texto em negativo lê sobre a copa e sobre o céu
        </h3>
      </>
    ),
  },
  {
    id: "fim",
    content: (
      <>
        <Eyebrow>Fim da trilha</Eyebrow>
        <h3 className="max-w-[16ch] text-5xl font-normal leading-[0.98] tracking-tight">
          A última parada fica
        </h3>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="mt-8 inline-flex rounded-full border border-current px-5 py-2.5 text-xs uppercase tracking-[0.08em]"
        >
          Voltar ao início
        </a>
      </>
    ),
  },
];

export default function FogGardenDemo({ props }: DemoProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  // max-h: na rota solo o palco não tem altura, e sem teto o contêiner de rolagem
  // crescia até o conteúdo (canvas de 2240px, capa em branco).
  return (
    <div className="relative h-[min(620px,100%)] min-h-[520px] w-full overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border">
      <div ref={scrollerRef} className="absolute inset-0 overflow-y-auto overscroll-contain">
        <FogGarden
          container={scrollerRef}
          heightPerStop="560px"
          stops={STOPS}
          landmark={vasoNoToco}
          {...props}
        />
      </div>
      <span className="pointer-events-none absolute inset-x-0 top-3 text-center text-[length:var(--text-micro,0.68rem)] text-muted-foreground">
        role dentro do quadro
      </span>
    </div>
  );
}
