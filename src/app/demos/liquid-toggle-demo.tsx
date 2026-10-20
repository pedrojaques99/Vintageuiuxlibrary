"use client";

/**
 * Três ajustes de verdade numa ficha, porque um switch solto no palco não diz
 * para que serve. Um começa ligado para a vitrine mostrar os dois estados sem
 * ninguém clicar. Os knobs pilotam os três de uma vez.
 */

import * as React from "react";

import { LiquidToggle } from "../../../registry/visant/ui/liquid-toggle";
import type { DemoProps } from "../catalog";

const AJUSTES = [
  { id: "avisos", rotulo: "Avisos por e-mail", ligado: true },
  { id: "foco", rotulo: "Modo foco", ligado: false },
  { id: "sync", rotulo: "Sincronizar fotos", ligado: false },
];

export default function LiquidToggleDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ul className="flex w-[280px] flex-col divide-y divide-border rounded-[var(--r-surface)] border border-border bg-card">
        {AJUSTES.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <span id={`lt-${a.id}`} className="text-[length:var(--text-corpo,0.8125rem)] text-foreground">
              {a.rotulo}
            </span>
            <LiquidToggle aria-labelledby={`lt-${a.id}`} defaultChecked={a.ligado} {...props} />
          </li>
        ))}
      </ul>
    </div>
  );
}
