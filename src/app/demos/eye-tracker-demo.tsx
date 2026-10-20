"use client";

/**
 * O mascote no estado vazio de uma caixa de entrada: ele olha pro cursor e,
 * quando alguém navega com Tab, pro botão que ganhou foco.
 */

import { EyeTracker } from "../../../registry/visant/ui/eye-tracker";
import type { DemoProps } from "../catalog";

export default function EyeTrackerDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-[320px] max-w-full flex-col items-center gap-4 p-4 text-center text-foreground">
        <EyeTracker {...props} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Nada novo por aqui</p>
          <p className="text-sm text-muted-foreground">Clica nele pra dar um oi.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="h-9 rounded-[var(--r-control)] border border-border bg-card px-3 text-sm outline-none [font:inherit] hover:bg-muted focus-visible:[box-shadow:var(--focus)]"
          >
            Arquivadas
          </button>
          <button
            type="button"
            className="h-9 rounded-[var(--r-control)] bg-foreground px-3 text-sm text-background outline-none [font:inherit] focus-visible:[box-shadow:var(--focus)]"
          >
            Escrever
          </button>
        </div>
      </div>
    </div>
  );
}
