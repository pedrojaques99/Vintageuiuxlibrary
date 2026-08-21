"use client";

/**
 * Duas dobras, e são duas de propósito.
 *
 * Com uma só, a peça pareceria "foto ao lado de texto" — que é o que qualquer
 * `grid-cols-2` faz. O que ela vende é a ALTERNÂNCIA: a segunda dobra chega com
 * a foto do outro lado sem ninguém ter escrito nada, e a entrada de cada texto
 * vem da borda de fora, convergindo. Isso não cabe numa dobra só.
 *
 * A demo puxa GSAP (pelo `@visant/photo-frame`) e o CSS do `@visant/fold-motion`;
 * por isso mora em arquivo próprio, como a do marquee e a da cena presa.
 */

import * as React from "react";

import { Media } from "../media";
import { PhotoSplit, PhotoSplitStack } from "../../../registry/visant/ui/photo-split";
import type { DemoProps } from "../catalog";

export default function PhotoSplitDemo({ props }: DemoProps) {
  return (
    <div className="h-full w-full overflow-hidden px-5 py-4">
      <PhotoSplitStack space={3} {...props}>
        <PhotoSplit
          eyebrow="Marca"
          title="A guideline compilada entra antes da primeira tela."
          lead="Cor, tipografia e regra de logo saem do vault. O site nasce com a marca resolvida em vez de descobrir a paleta no meio do caminho."
          ratio="4/3"
          gap={2.5}
          media={<Media papel="cena" indice={0} className="size-full" />}
        />
        <PhotoSplit
          eyebrow="Produção"
          title="A dobra seguinte inverte sozinha."
          lead="O lado de cada foto é escrito pela pilha. Inserir uma dobra no meio não desalinha as de baixo — que é o defeito que a alternância à mão sempre acaba tendo."
          ratio="4/3"
          gap={2.5}
          media={<Media papel="cena" indice={3} className="size-full" />}
        />
      </PhotoSplitStack>
    </div>
  );
}
