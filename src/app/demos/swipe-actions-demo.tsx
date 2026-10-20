"use client";

/**
 * Uma mensagem só, com uma ação só: arrastar pra esquerda arquiva (a linha sai pelo lado antes
 * de o Restaurar aparecer). Ao montar,
 * a linha espia pro lado da ação e volta (`peek`), que é como o gesto se
 * ensina sem legenda. O botão de três pontos faz o mesmo sem gesto. Arquivada,
 * um Restaurar traz a linha de volta pra testar de novo.
 */

import * as React from "react";
import { Archive, RotateCcw } from "lucide-react";

import { SwipeActions, SwipeActionsRow } from "../../../registry/visant/ui/swipe-actions";
import type { DemoProps } from "../catalog";

export default function SwipeActionsDemo({ props }: DemoProps) {
  const [arquivada, setArquivada] = React.useState(false);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex h-[76px] w-[360px] max-w-full items-center justify-center text-foreground">
        {arquivada ? (
          <button
            type="button"
            onClick={() => setArquivada(false)}
            className="flex items-center gap-2 rounded-[var(--r-control)] px-3 py-2 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:[box-shadow:var(--focus)]"
          >
            <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Restaurar
          </button>
        ) : (
          <SwipeActions label="Caixa de entrada" className="w-full" {...props}>
            <SwipeActionsRow
              key="msg"
              label="Prova final do rótulo"
              peek
              trailing={[
                { label: "Arquivar", icon: <Archive strokeWidth={1.75} />, tone: "brand", onSelect: () => window.setTimeout(() => setArquivada(true), 380) },
              ]}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Marina Lopes</p>
                <p className="truncate text-sm text-muted-foreground">Prova final do rótulo. Subi a versão nova.</p>
              </div>
            </SwipeActionsRow>
          </SwipeActions>
        )}
      </div>
    </div>
  );
}
