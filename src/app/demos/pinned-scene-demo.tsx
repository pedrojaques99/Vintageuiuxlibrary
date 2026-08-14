"use client";

/**
 * A demo da cena presa mora sozinha por dois motivos.
 *
 * 1. **Ela puxa GSAP + ScrollTrigger.** Mesmo trato do marquee e do board: a
 *    biblioteca chega quando o card chega, não no primeiro chunk da vitrine.
 * 2. **Ela precisa de um scroller próprio.** A peça é uma dobra de página
 *    inteira; num palco de 500px ela não teria comprimento de rolagem nenhum.
 *    Aqui o card VIRA a janela: um `overflow-y: auto` de altura fixa, com
 *    `stepHeight` na mesma medida e o `scroller` apontado pra ele.
 *
 * E a régua sai (`rail={false}`) porque aqui ela não teria como andar: o palco
 * da vitrine escala a demo com `transform` pra caber no card, e o ScrollTrigger
 * mede por `getBoundingClientRect` — geometria pintada, encolhida pela escala —
 * contra um `scrollTop` que continua em pixel real. Medido: a cena de 1140px
 * era lida como 219px, e a faixa de rolagem dava zero. O `sticky` não se
 * importa (é layout, não rect), então o que a peça vende — a arte que segura
 * enquanto o texto passa — aparece inteiro. Mostrar uma régua parada ao lado de
 * uma cena que anda seria a vitrine mentindo sobre a peça.
 */

import * as React from "react";

import { Media } from "../media";
import { PinnedScene } from "../../../registry/visant/ui/pinned-scene";

const PASSOS = [
  {
    id: "brief",
    label: "Briefing",
    title: "A marca entra pelo vault, não por anexo.",
    body: "Cor, tipografia e regra de logo saem da guideline compilada — o site nasce com a marca já resolvida.",
  },
  {
    id: "tokens",
    label: "Tokens",
    title: "Contraste AA por construção.",
    body: "O motor gera a rampa e o par de cores. Ninguém escolhe hex no meio do caminho, então nenhuma tela sai fora do sistema.",
  },
  {
    id: "deploy",
    label: "No ar",
    title: "Publicar é a mesma linha de sempre.",
    body: "O tema vira item do registry e o próximo projeto instala por comando, em vez de copiar código do anterior.",
  },
];

export default function PinnedSceneDemo() {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  // O ScrollTrigger precisa do elemento, e no primeiro render ele é `null`.
  // Um estado força o segundo render com o nó em mãos — sem isso a cena monta
  // medindo a janela, e nada se move dentro do card.
  const [scroller, setScroller] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => setScroller(scrollerRef.current), []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border">
      <div ref={scrollerRef} className="h-full w-full overflow-y-auto px-6">
        <PinnedScene
          scroller={scroller}
          stepHeight="380px"
          top="24px"
          rail={false}
          steps={PASSOS.map((p, i) => ({
            ...p,
            art: <Media papel="cena" indice={i} className="h-full w-full" />,
          }))}
        />
      </div>
      <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[length:var(--text-micro,0.68rem)] text-muted-foreground">
        role dentro do quadro
      </span>
    </div>
  );
}
