"use client";

/**
 * A galeria que mostra a passagem — e a mídia que deixava a passagem invisível.
 *
 * A demo saiu do `catalog.tsx` porque ela puxa GSAP + Flip; mesmo trato do
 * marquee e da cena presa: a biblioteca chega quando o card chega.
 *
 * ── Duas correções, e a segunda é a que o report chamou de "bugado" ────────
 *
 * · **O defeito real estava no componente**, não aqui: o overlay ainda estava
 *   `hidden` quando o Flip media o destino, então a foto viajava para 0 × 0 e
 *   piscava para a tela cheia no fim. Está anotado como armadilha 10 no
 *   `@visant/photo-flip`.
 * · **A mídia escondia o que sobrou.** A grade usava `papel="cena"` a partir do
 *   índice 4, e esse trecho do acervo é ícone 3D e logotipo sobre fundo preto —
 *   um deles é um cartão com texto, que aparecia cortado no meio da palavra. Em
 *   ladrilho quadrado, com `object-fit: cover` na grade e `contain` na tela
 *   cheia, aquilo lia como galeria quebrada mesmo com o percurso perfeito. Os
 *   retratos são fotografia de verdade, todos na mesma proporção 4/5: a grade
 *   fica homogênea e a passagem é a única coisa que se move.
 *
 * A caixa é elástica (`w-full` com teto), e não uma largura cravada: o palco da
 * vitrine escala a demo para caber, e uma medida fixa menor que o ladrilho
 * deixa a peça encostada na esquerda — que é o "descentralizado" reportado na
 * peça vizinha. Elástico com `max-w` resolve as duas pontas: preenche o palco e
 * não vaza a tela de 360.
 */

import * as React from "react";

import { Media } from "../media";
import { PhotoFlip } from "../../../registry/visant/ui/photo-flip";

export default function PhotoFlipDemo() {
  const items = React.useMemo(
    () =>
      [0, 1, 2, 3, 4, 5].map((i) => ({
        id: `f${i}`,
        media: <Media papel="retrato" indice={i} className="size-full" />,
        caption: `Retrato ${i + 1}`,
      })),
    [],
  );

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <PhotoFlip
        items={items}
        ratio="4/5"
        className="grid w-full max-w-[1240px] grid-cols-6 gap-3"
      />
      <span className="text-micro text-muted-foreground">clique pra ampliar · Esc fecha</span>
    </div>
  );
}
