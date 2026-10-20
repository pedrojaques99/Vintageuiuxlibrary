"use client";

/**
 * Uma prateleira de projetos de estúdio: sete capas do acervo, a terceira de
 * frente. É a cena em que a peça vende: a imagem convence antes do título.
 */

import { Media } from "../media";
import { CoverFlow } from "../../../registry/visant/ui/cover-flow";
import type { DemoProps } from "../catalog";

const PROJETOS = [
  { title: "Cubo", caption: "Identidade em 3D" },
  { title: "Estouro", caption: "Campanha de lançamento" },
  { title: "Rádio", caption: "Objeto de coleção" },
  { title: "Troféu", caption: "Prêmio anual" },
  { title: "Caixa", caption: "Embalagem premium" },
  { title: "Globo", caption: "Peça de vitrine" },
  { title: "Estojo", caption: "Linha escolar" },
];

const ITENS = PROJETOS.map((r, i) => ({
  ...r,
  media: <Media papel="cena" indice={i} className="size-full" />,
}));

export default function CoverFlowDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <CoverFlow items={ITENS} defaultIndex={2} label="Projetos" className="w-[560px] max-w-full" {...props} />
    </div>
  );
}
