"use client";

/**
 * Figura didática do curso IA para Designers, no núcleo da anatomia
 * (anatomia/CONTRATO.md). A geometria vem pronta do build; aqui ela só monta.
 */
import * as React from "react";

import { Anatomia } from "../../../registry/visant/ui/anatomia";
import figura from "../../../registry/visant/lib/anatomia-memoria";

export default function AnatomiaMemoriaDemo() {
  return (
    <div style={{ width: "100%", maxWidth: 1080 }}>
      <Anatomia figura={figura} />
    </div>
  );
}
