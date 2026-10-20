"use client";

/**
 * A pílula no rodapé de uma seleção, que é onde "apagar" mora num app de
 * trabalho. O `onConfirm` devolve uma promessa de quase um segundo pra o
 * "apagando" aparecer, e o `onUndo` existe pra o resultado mostrar o Desfazer.
 */

import * as React from "react";
import { Trash2 } from "lucide-react";

import { ConfirmMorph } from "../../../registry/visant/ui/confirm-morph";
import type { DemoProps } from "../catalog";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ConfirmMorphDemo({ props }: DemoProps) {
  const [apagados, setApagados] = React.useState(false);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-[420px] items-center justify-between gap-4 rounded-[var(--r-surface)] border border-border bg-card py-3 pl-5 pr-3 text-foreground">
        <p className="text-sm text-muted-foreground">
          {apagados ? "Nenhum arquivo selecionado" : "3 arquivos selecionados"}
        </p>
        <ConfirmMorph
          label="Apagar"
          icon={<Trash2 strokeWidth={1.75} />}
          prompt="Apagar 3 arquivos?"
          {...props}
          onConfirm={async () => {
            await espera(900);
            setApagados(true);
          }}
          onUndo={async () => {
            await espera(600);
            setApagados(false);
          }}
        />
      </div>
    </div>
  );
}
