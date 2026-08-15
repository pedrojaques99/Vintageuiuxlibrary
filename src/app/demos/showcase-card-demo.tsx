"use client";

/**
 * Um card de serviço, centrado, no tamanho em que ele vive.
 *
 * ── O que estava errado ────────────────────────────────────────────────────
 *
 * Duas coisas, e as duas eram de medida:
 *
 * 1. **A caixa era `w-full max-w-[360px]` dentro de um palco de 380px.** Sem
 *    `mx-auto`, um bloco com teto de largura encosta à esquerda — o card
 *    desenhava 360px de conteúdo e 20px de vazio do lado direito. Era isso o
 *    "centralizar no catálogo" da parte que cabe à demo.
 * 2. **O `preview` mentia a altura.** Declarados 400px; a peça pede mídia 4/3
 *    (240px na largura nova), 20px de folga, título de duas linhas, e a lista
 *    do que está incluso quebrando em duas fileiras. Dá ~395px, e qualquer
 *    respiro a mais estourava — o palco cresce para não cortar, e o card mudava
 *    de tamanho depois de montar.
 *
 * O `max-w` continua sendo teto e não largura fixa: a peça roda sozinha num
 * viewport de 360px na suíte de responsivo, e largura cravada estoura a tela.
 */

import * as React from "react";

import { Media } from "../media";
import { ShowcaseCard } from "../../../registry/visant/ui/showcase-card";

export default function ShowcaseCardDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center px-2">
      <ShowcaseCard
        className="mx-auto w-full max-w-[320px]"
        href="#/c/showcase-card"
        title="Identidade que quer dizer alguma coisa"
        media={<Media papel="video" className="size-full" />}
        tags={["Estratégia", "Naming", "Logo", "Identidade visual"]}
      />
    </div>
  );
}
