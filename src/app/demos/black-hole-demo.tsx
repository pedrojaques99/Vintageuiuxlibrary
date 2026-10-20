"use client";

/**
 * Uma caixa de entrada com duas conversas já marcadas: basta apertar
 * "Apagar 2" para ver o buraco. Os retratos vêm do acervo, então a lista tem
 * cara de produto e não de wireframe.
 */

import { Media } from "../media";
import { BlackHole } from "../../../registry/visant/ui/black-hole";
import type { DemoProps } from "../catalog";

const CONVERSAS = [
  { id: "1", nome: "Marina Lopes", assunto: "Copy da dobra, segunda passada", hora: "9:41" },
  { id: "2", nome: "Rafael Souza", assunto: "Relatório da semana", hora: "9:12" },
  { id: "3", nome: "Júlia Prado", assunto: "Revisão do layout mudou pra quinta", hora: "8:30" },
  { id: "4", nome: "Caio Mendes", assunto: "A nota 2381 está pronta", hora: "Ontem" },
  { id: "5", nome: "Bia Ramos", assunto: "Planejamento do trimestre", hora: "Ontem" },
];

export default function BlackHoleDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <BlackHole
        className="w-[380px] max-w-full"
        items={CONVERSAS}
        defaultSelected={["2", "4"]}
        itemLabel={(c) => `${c.nome}: ${c.assunto}`}
        renderItem={(c) => (
          <span className="flex items-center gap-3">
            <Media
              papel="retrato"
              indice={Number(c.id)}
              className="size-8 shrink-0 rounded-[var(--r-pill)]"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{c.nome}</span>
              <span className="block truncate text-xs text-muted-foreground">{c.assunto}</span>
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{c.hora}</span>
          </span>
        )}
        {...props}
      />
    </div>
  );
}
