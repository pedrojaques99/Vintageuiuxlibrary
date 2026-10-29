"use client";

/**
 * Anatomia: a figura didática interativa num componente React.
 *
 *   <Anatomia figura={comoSobe} />   (comoSobe vem do item @visant/anatomia-como-sobe)
 *
 * Por baixo é o web component `<visant-anatomia>` (Shadow DOM), então a mesma
 * figura roda em React, em página estática, em livro e em blog. O wrapper só
 * registra o elemento e entrega a figura como propriedade; o tema vem das
 * variáveis do site (--foreground, --card, --brand...).
 */
import * as React from "react";

import { definirAnatomia, type FiguraDef, type VisantAnatomia } from "@/lib/anatomia-nucleo";

export interface AnatomiaProps extends React.HTMLAttributes<HTMLElement> {
  figura: FiguraDef;
  /** Começa explorando (padrão) ou já no passo a passo. */
  modo?: "explorar" | "passos";
  /** Só pra site sem tokens: força o esquema das cores do sistema. */
  tema?: "claro" | "escuro";
}

export function Anatomia({ figura, modo, tema, ...rest }: AnatomiaProps) {
  const ref = React.useRef<VisantAnatomia | null>(null);
  React.useEffect(() => {
    definirAnatomia();
    // Propriedade e não atributo: a figura é um objeto, e assim não precisa
    // de registro global nem colide com outra figura de mesmo id.
    if (ref.current) ref.current.figura = figura;
  }, [figura]);
  return React.createElement("visant-anatomia", { ref, modo, tema, ...rest });
}
