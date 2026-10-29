"use client";

/**
 * A Fig 1.4 do curso IA para Designers: o que sobe pro GitHub, o que o
 * .gitignore segura e quando a Vercel põe no ar. É a figura de referência do
 * núcleo da anatomia; as outras seguem o mesmo contrato (anatomia/CONTRATO.md).
 */
import * as React from "react";

import { Anatomia } from "../../../registry/visant/ui/anatomia";
import comoSobe from "../../../registry/visant/lib/anatomia-como-sobe";

export default function AnatomiaComoSobeDemo() {
  return (
    <div style={{ width: "100%", maxWidth: 1080 }}>
      <Anatomia figura={comoSobe} />
    </div>
  );
}
