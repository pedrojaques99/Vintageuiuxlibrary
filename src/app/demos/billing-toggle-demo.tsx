"use client";

/**
 * A demo fecha a conta inteira: o interruptor e o preço que rola junto. Um
 * período só no estado, e o preço derivado dele, como a peça recomenda.
 */

import * as React from "react";

import { BillingPrice, BillingToggle } from "../../../registry/visant/ui/billing-toggle";
import type { DemoProps } from "../catalog";

const MENSAL = 49;
const ANUAL_POR_MES = 39;

export default function BillingToggleDemo({ props }: DemoProps) {
  const [periodo, setPeriodo] = React.useState("mensal");
  const anual = periodo === "anual";

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-5">
        <BillingToggle
          value={periodo}
          onValueChange={setPeriodo}
          options={[
            { value: "mensal", label: "Mensal" },
            { value: "anual", label: "Anual", badge: "-20%", activeBadge: "Você economiza R$ 120" },
          ]}
          {...props}
        />
        <BillingPrice amount={anual ? ANUAL_POR_MES : MENSAL} was={anual ? MENSAL : undefined} period="/mês" />
      </div>
    </div>
  );
}
