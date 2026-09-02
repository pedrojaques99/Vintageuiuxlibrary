"use client";

/**
 * Seis capas no círculo — o número em que a peça ainda funciona.
 *
 * Não é fixture preguiçosa: com três, o carrossel vira um triângulo girando e
 * o vazio entre os cards denuncia o truque; com vinte, só o da frente é
 * legível e o resto é ruído em perspectiva. Seis é o intervalo onde o formato
 * defende a si mesmo — e é justamente por não escalar além disso que ele saiu
 * de uma seção de listagem na home da Visant (ver a nota do componente).
 *
 * O `onSelect` só registra: a vitrine não navega, mas a peça precisa provar
 * que o clique do botão central chega inteiro do outro lado do canvas.
 */

import * as React from "react";

import { Carousel3D, type Carousel3DItem } from "../../../registry/visant/ui/carousel-3d";
import { midia } from "../media";
import type { DemoProps } from "../catalog";

const TITULOS = [
  "Calha Norte",
  "Lenzo",
  "Plu",
  "Feira do Produtor",
  "Arko",
  "Mizz",
];

export default function Carousel3DDemo({ props }: DemoProps) {
  const items = React.useMemo<Carousel3DItem[]>(
    () =>
      TITULOS.map((title, i) => ({
        id: `peca-${i}`,
        title,
        media: midia("cena", i)?.src ?? "",
      })).filter((i) => i.media),
    [],
  );

  return (
    <div className="grid h-full w-full place-items-center">
      <Carousel3D
        items={items}
        cta="Ver projeto"
        onSelect={(id) => console.info("[carousel-3d] selecionou", id)}
        {...props}
      />
    </div>
  );
}
