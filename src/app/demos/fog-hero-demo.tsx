"use client";

/**
 * A hero numa caixa de vitrine — com os vídeos do acervo e sem logo.
 *
 * Sem logo de propósito: o `logo` é opcional, e o caminho sem ele (só névoa e
 * vídeo) é o que mais quebraria calado se o shader dependesse da textura. O
 * título vai em `children`, por cima do canvas; numa página de verdade ele seria
 * o `<h1>` — aqui é um `<p>` porque a vitrine já tem o seu.
 *
 * WebM primeiro, se o navegador tocar: o Chromium de build livre não decodifica
 * h264, e uma hero com vídeo preto pareceria shader quebrado.
 */

import * as React from "react";

import { FogHero } from "../../../registry/visant/blocks/fog-hero";
import { midia } from "../media";
import type { DemoProps } from "../catalog";

export default function FogHeroDemo({ props }: DemoProps) {
  const videos = React.useMemo(() => {
    const webm = document.createElement("video").canPlayType("video/webm") !== "";
    return [0, 1, 2]
      .map((i) => midia("video", i))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map((m) => (webm && m.webm ? m.webm : m.src));
  }, []);

  return (
    <div className="h-full w-full overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border">
      <FogHero videos={videos} className="h-full" swapEvery={6000} {...props}>
        <div className="flex h-full items-end p-5">
          <p className="text-[1.6rem] font-semibold leading-none tracking-[-0.03em]" style={{ fontFamily: "var(--font-display, inherit)" }}>
            A abertura em névoa
          </p>
        </div>
      </FogHero>
    </div>
  );
}
