"use client";

/**
 * Só a pílula, no meio do palco: o morph é a peça, e texto em volta só
 * disputava com ele. Rótulos curtos em cada rosto (Apagar, Tem certeza?,
 * Apagado) pra largura andar sem a frase virar o assunto. O `onConfirm`
 * devolve uma promessa curta pra o "Apagando" aparecer, e o `onUndo` dá o
 * Desfazer no resultado.
 */

import * as React from "react";
import { Trash2 } from "lucide-react";

import { ConfirmMorph } from "../../../registry/visant/ui/confirm-morph";
import type { DemoProps } from "../catalog";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ConfirmMorphDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <ConfirmMorph
        label="Apagar"
        icon={<Trash2 strokeWidth={1.75} />}
        prompt="Tem certeza?"
        cancelLabel="Não"
        confirmLabel="Apagar"
        pendingLabel="Apagando"
        doneLabel="Apagado"
        {...props}
        onConfirm={() => espera(700)}
        onUndo={() => espera(500)}
      />
    </div>
  );
}
