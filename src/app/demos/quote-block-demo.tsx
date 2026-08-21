"use client";

/**
 * A demo mostra UM depoimento, em tamanho de dobra, e nada mais.
 *
 * A tentação era mostrar dois tons lado a lado — e seria o mesmo erro que a
 * parede de depoimentos comete quando encolhe: o que esta peça vende é o PESO
 * da citação, e peso não sobrevive a duas colunas de metade da largura. Um
 * depoimento, no corpo em que ele é entregue.
 *
 * O logo do "cliente" é desenhado aqui, não é arquivo: o acervo da vitrine não
 * tem marca de terceiro, e um retângulo cinza no lugar do logo esconderia
 * justamente a parte que a peça normaliza.
 */

import * as React from "react";

import { Media } from "../media";
import { QuoteBlock } from "../../../registry/visant/ui/quote-block";
import type { DemoProps } from "../catalog";

function LogoCliente() {
  return (
    <svg viewBox="0 0 112 24" aria-hidden="true" fill="currentColor">
      <path d="M0 24 8.4 0h4.9l8.4 24h-5.1l-1.7-5.2H6.8L5.1 24H0Zm8.1-9.1h5.4l-2.7-8.2-2.7 8.2Z" />
      <path d="M26 24V0h4.8v19.6H41V24H26Z" />
      <path d="M45.6 12c0-6.9 4.7-12 11.4-12S68.4 5.1 68.4 12 63.7 24 57 24s-11.4-5.1-11.4-12Zm18 0c0-4.4-2.6-7.5-6.6-7.5S50.4 7.6 50.4 12s2.6 7.5 6.6 7.5 6.6-3.1 6.6-7.5Z" />
      <path d="M74 24V0h9.3c5 0 8.3 2.9 8.3 7.4 0 3.2-1.7 5.5-4.4 6.5l5.2 10.1h-5.3l-4.6-9.3h-3.7V24H74Zm4.8-13.5h4.1c2.3 0 3.8-1.2 3.8-3.1s-1.5-3-3.8-3h-4.1v6.1Z" />
      <path d="M97 24V0h4.8v9.6h5.4V0h4.8v24h-4.8v-9.9h-5.4V24H97Z" />
    </svg>
  );
}

export default function QuoteBlockDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center px-4">
      <QuoteBlock
        tone="muted"
        quote="Chegaram com a marca já resolvida no primeiro dia. A gente parou de discutir cor e voltou a discutir produto."
        author="Marina Sales"
        role="Head de Produto"
        company="Aloro"
        logo={<LogoCliente />}
        source="https://exemplo.com/cases/aloro"
        portrait={<Media papel="retrato" indice={2} className="size-full" />}
        {...props}
      />
    </div>
  );
}
