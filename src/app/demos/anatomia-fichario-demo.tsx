"use client";

/** Fig 2.6 do curso IA para Designers: o agente lê só as etiquetas das skills e abre a receita que casa com o pedido; a pasta references/ só sobe quando a receita pede. */
import * as React from "react";

import { Anatomia } from "../../../registry/visant/ui/anatomia";
import figura from "../../../registry/visant/lib/anatomia-fichario";

export default function AnatomiaFicharioDemo() {
  return (
    <div style={{ width: "100%", maxWidth: 1080 }}>
      <Anatomia figura={figura} />
    </div>
  );
}
