"use client";

/**
 * Só o mostrador: a hora no centro, o arco do expediente marcado na borda e o
 * polegar pra girar. A conta de fuso que morava do lado era outra peça.
 */

import * as React from "react";

import { TimeDial } from "../../../registry/visant/ui/time-dial";
import type { DemoProps } from "../catalog";

const EXPEDIENTE: [number, number] = [9 * 60, 18 * 60];

export default function TimeDialDemo({ props }: DemoProps) {
  const [min, setMin] = React.useState(17 * 60);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <TimeDial
        value={min}
        onValueChange={setMin}
        band={EXPEDIENTE}
        caption="Expediente"
        label="Horário da reunião"
        {...props}
      />
    </div>
  );
}
