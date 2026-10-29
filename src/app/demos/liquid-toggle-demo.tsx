"use client";

/**
 * Um toggle só, com o rótulo do lado: é o bastante pra dizer pra que serve e
 * deixa a gota ser o que se vê. Começa ligado pra vitrine mostrar a cor sem
 * ninguém clicar.
 */

import * as React from "react";

import { LiquidToggle } from "../../../registry/visant/ui/liquid-toggle";
import type { DemoProps } from "../catalog";

export default function LiquidToggleDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex items-center gap-4">
        <span id="lt-avisos" className="text-sm font-medium text-foreground">
          Avisos por e-mail
        </span>
        <LiquidToggle aria-labelledby="lt-avisos" defaultChecked {...props} />
      </div>
    </div>
  );
}
