"use client";

/**
 * A demo do marquee mora sozinha porque ela é cara.
 *
 * O motor é GSAP + ScrollTrigger — biblioteca inteira no bundle para servir UM
 * card, que ainda por cima fica no meio da lista. Aqui o pedaço só é buscado
 * quando o card entra na tela. Mesmo trato que o board do kanban recebeu.
 */

import * as React from "react";
import { Marquee } from "../../../registry/visant/ui/marquee";

/**
 * As três faixas, uma embaixo da outra — porque a diferença entre elas não cabe
 * numa descrição.
 *
 * "Marquee com scroll" quer dizer três coisas incompatíveis, e a pessoa que
 * instala só descobre qual queria vendo as três reagirem ao MESMO gesto: rolar
 * a página com o card na tela. A de cima anda sozinha e o scroll empurra; a do
 * meio está parada até a página se mover e nunca volta atrás; a de baixo é a
 * mesma da primeira levada ao exagero — rápida, torta e com marca no meio.
 *
 * O rótulo de cada uma fica FORA da faixa, em mono minúsculo: dentro ele
 * viraria conteúdo da esteira e andaria junto.
 */
export default function MarqueeDemo() {
  const palavras = ["FRETE GRÁTIS", "NOVA COLEÇÃO", "ESTOQUE REAL", "TROCA EM 30 DIAS"];

  const itens = (extra?: React.ReactNode) =>
    palavras.map((t, i) => (
      <span key={i} className="flex items-center gap-4">
        <span className="font-mono text-rotulo tracking-[0.14em]">{t}</span>
        {extra}
      </span>
    ));

  /* A marca no meio da faixa doidona: um asterisco desenhado, não uma fonte —
     glifo de fonte muda de peso a cada família e a faixa perde o ritmo. */
  const marca = (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" aria-hidden fill="currentColor">
      <path d="M12 1.5 13.9 9l6.6-3.8-3.8 6.6 7.3 1.9-7.3 1.9 3.8 6.6L13.9 18 12 25.5 10.1 18l-6.6 3.8 3.8-6.6L0 13.3l7.3-1.9L3.5 4.8 10.1 9z" />
    </svg>
  );

  const Faixa = ({ nota, children }: { nota: string; children: React.ReactNode }) => (
    <div className="min-w-0">
      <p className="mb-1.5 font-mono text-micro uppercase tracking-wider text-muted-foreground">
        {nota}
      </p>
      {children}
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col justify-center gap-5 overflow-hidden">
      <Faixa nota="boost · anda sozinha, o scroll empurra e inverte">
        <Marquee band speed={40} items={itens()} />
      </Faixa>

      <Faixa nota="drive · só anda com o scroll, sempre pro mesmo lado">
        <Marquee
          scroll="drive"
          laps={0.9}
          speed={40}
          className="border-y border-border py-3"
          items={itens()}
        />
      </Faixa>

      <Faixa nota="solta · rápida, torta e com a marca no meio">
        <Marquee
          band
          speed={16}
          boost={6}
          tilt={-2.5}
          gap={40}
          items={itens(marca)}
        />
      </Faixa>
    </div>
  );
}
