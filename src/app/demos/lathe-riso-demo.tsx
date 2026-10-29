"use client";

/**
 * Uma fruta de revolução (perfil de meia esfera achatada) impressa ao vivo em riso. Arraste para
 * girar: o mesmo gesto puxa as tintas do registro.
 */

import { LatheRiso } from "../../../registry/visant/ui/lathe-riso";
import type { LatheProfile } from "../../../registry/visant/ui/lathe-object";
import type { DemoProps } from "../catalog";

// Meia silhueta de uma fruta redonda, de baixo pra cima, fechando no eixo.
const FRUTA: LatheProfile = Array.from({ length: 17 }, (_, i) => {
  const a = -Math.PI / 2 + (i / 16) * Math.PI;
  return [Number((Math.cos(a) * 1.1).toFixed(3)), Number((Math.sin(a) * 0.95 + 0.95).toFixed(3))];
});

export default function LatheRisoDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <LatheRiso profile={FRUTA} className="w-[400px] max-w-full" {...props} />
    </div>
  );
}
