"use client";

/** Fig 2.2 do curso IA para Designers: os programas entram pelo conector do claude.ai, com a tua conta; o serviço pago entra pela chave de API, que mora no .env e conta cada chamada. */
import * as React from "react";

import { Anatomia } from "../../../registry/visant/ui/anatomia";
import figura from "../../../registry/visant/lib/anatomia-tomadas";

export default function AnatomiaTomadasDemo() {
  return (
    <div style={{ width: "100%", maxWidth: 1080 }}>
      <Anatomia figura={figura} />
    </div>
  );
}
