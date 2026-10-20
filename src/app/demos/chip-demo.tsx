"use client";

/**
 * Uma fileira de filtros e mais nada: é assim que a pastilha aparece numa
 * loja. Ligar uma pastilha pinta a marca e faz o traço de conferido entrar;
 * a contagem fica do lado, e a faceta sem resultado fica apagada e sem número
 * em vez de mostrar zero.
 */

import * as React from "react";

import { Chip } from "../../../registry/visant/ui/chip";

const FILTROS = [
  { id: "camisetas", rotulo: "Camisetas", n: 24 },
  { id: "moletons", rotulo: "Moletons", n: 9 },
  { id: "bones", rotulo: "Bonés", n: 6 },
  { id: "meias", rotulo: "Meias", n: 0 },
];

export default function ChipDemo() {
  const [ligados, setLigados] = React.useState<Set<string>>(() => new Set(["moletons"]));

  const alternar = (id: string) =>
    setLigados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div role="group" aria-label="Filtrar por tipo" className="flex max-w-full flex-wrap items-center justify-center gap-2">
        {FILTROS.map((f) => (
          <Chip
            key={f.id}
            pressed={ligados.has(f.id)}
            count={f.n}
            disabled={f.n === 0}
            className="rounded-[var(--r-pill,9999px)]"
            onClick={() => alternar(f.id)}
          >
            {f.rotulo}
          </Chip>
        ))}
      </div>
    </div>
  );
}
