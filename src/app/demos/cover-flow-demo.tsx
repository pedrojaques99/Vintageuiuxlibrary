"use client";

/**
 * Uma prateleira de objetos de estúdio: cinco capas no MESMO desenho.
 *
 * A versão anterior misturava render com fundo preto (cubo, estouro de luz) e
 * recorte com alpha sobre o cinza da caixa. Cada capa vinha com um fundo, e a
 * prateleira lia como colagem, não como coleção. Aqui são só recortes, todos
 * sobre a mesma superfície e no mesmo enquadramento (objeto contido, com
 * respiro), e a hierarquia fica a cargo da peça: a do centro de frente, as
 * laterais recuadas e apagadas.
 */

import { Media, midia, useWireframe } from "../media";
import { CoverFlow } from "../../../registry/visant/ui/cover-flow";
import type { DemoProps } from "../catalog";

const PROJETOS = [
  { title: "Globo", caption: "Peça de vitrine", indice: 5 },
  { title: "Troféu", caption: "Prêmio anual", indice: 3 },
  { title: "Rádio", caption: "Objeto de coleção", indice: 2 },
  { title: "Caixa", caption: "Embalagem premium", indice: 4 },
  { title: "Estojo", caption: "Linha escolar", indice: 6 },
];

/** A mesma superfície pra toda capa: o objeto muda, o desenho não. */
function Capa({ indice }: { indice: number }) {
  const { wireframe } = useWireframe();
  const m = midia("cena", indice);
  if (wireframe || !m) return <Media papel="cena" indice={indice} className="size-full" />;
  return (
    <div
      className="grid size-full place-items-center"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 18%, color-mix(in oklab, var(--foreground) 10%, var(--card)), var(--card))",
      }}
    >
      <img
        src={m.src}
        alt=""
        draggable={false}
        className="size-[78%] object-contain"
        style={{ filter: "drop-shadow(0 14px 16px color-mix(in oklab, black 40%, transparent))" }}
      />
    </div>
  );
}

const ITENS = PROJETOS.map(({ indice, ...r }) => ({ ...r, media: <Capa indice={indice} /> }));

export default function CoverFlowDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <CoverFlow
        items={ITENS}
        defaultIndex={2}
        cardWidth={200}
        label="Projetos"
        className="w-[620px] max-w-full"
        {...props}
      />
    </div>
  );
}
