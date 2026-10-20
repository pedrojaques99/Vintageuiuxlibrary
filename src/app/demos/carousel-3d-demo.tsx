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
import { midia, type Papel } from "../media";
import type { DemoProps } from "../catalog";

/**
 * Só mídia de borda a borda: texturas e o quadro de capa dos vídeos.
 *
 * Os recortes 3D (rádio, troféu) que a demo usava têm fundo transparente e
 * proporção quadrada; num card 16:9 o shader de capa os cortava ao meio e o
 * objeto flutuava sem card nenhum em volta. Com mídia que enche o quadro, cada
 * card é um card, e o círculo se lê.
 */
const PECAS: { title: string; papel: Papel; indice: number; poster?: boolean }[] = [
  { title: "Trilha Norte", papel: "textura", indice: 3 },
  { title: "Leme", papel: "video", indice: 2, poster: true },
  { title: "Pomar", papel: "textura", indice: 1 },
  { title: "Forno Lento", papel: "textura", indice: 2 },
  { title: "Maré", papel: "video", indice: 0, poster: true },
  { title: "Sereno", papel: "textura", indice: 0 },
];

export default function Carousel3DDemo({ props }: DemoProps) {
  const items = React.useMemo<Carousel3DItem[]>(
    () =>
      PECAS.map((p, i) => {
        const m = midia(p.papel, p.indice);
        return { id: `peca-${i}`, title: p.title, media: (p.poster ? m?.poster : m?.src) ?? "" };
      }).filter((i) => i.media),
    [],
  );

  return (
    <div className="grid h-full w-full place-items-center">
      <Carousel3D
        items={items}
        cta="Ver projeto"
        className="h-[420px] min-h-0"
        onSelect={(id) => console.info("[carousel-3d] selecionou", id)}
        {...props}
      />
    </div>
  );
}
