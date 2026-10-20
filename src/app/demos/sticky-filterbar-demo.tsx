"use client";

/**
 * A barra que gruda só se explica com uma lista embaixo dela.
 *
 * A demo antiga eram três chips e catorze retângulos cinzas de 6px. Barra de
 * filtro que não filtra nada, grudando em cima de nada: o card mostrava a
 * mecânica (o `position: sticky`) e escondia a peça (governar uma lista longa
 * sem sumir com ela). Daí o "slop total" do report.
 *
 * Aqui a lista é de verdade: a contagem no canto muda, os chips cortam o
 * acervo, e o que rola por baixo da barra é conteúdo com foto. O que a peça
 * promete — grudar, condensar a linha secundária, e o fio contando quanto da
 * região já passou — só é julgável com percurso de rolagem real.
 *
 * O cabeçalho de mentira existe porque o componente MEDE um cabeçalho e publica
 * `--header-h`. Apontá-lo para o header da vitrine faria uma demo reescrever a
 * página que a hospeda.
 */

import * as React from "react";

import { Media } from "../media";
import { Chip } from "../../../registry/visant/ui/chip";
import { StickyFilterbar, FilterRow } from "../../../registry/visant/ui/sticky-filterbar";
import type { DemoProps } from "../catalog";

type Estado = "producao" | "rascunho" | "arquivo";
type Familia = "quente" | "fria" | "neutra";

const ROTULO: Record<Estado, string> = {
  producao: "Em produção",
  rascunho: "Rascunho",
  arquivo: "Arquivado",
};

const ACERVO: { nome: string; estado: Estado; familia: Familia }[] = [
  { nome: "Âmbar", estado: "producao", familia: "quente" },
  { nome: "Casa Vinte", estado: "producao", familia: "neutra" },
  { nome: "Ribalta", estado: "rascunho", familia: "quente" },
  { nome: "Bandeira", estado: "producao", familia: "fria" },
  { nome: "Pomar", estado: "arquivo", familia: "quente" },
  { nome: "Sereno", estado: "producao", familia: "fria" },
  { nome: "Oficina 12", estado: "rascunho", familia: "neutra" },
  { nome: "Maré", estado: "producao", familia: "fria" },
  { nome: "Tarrafa", estado: "arquivo", familia: "neutra" },
  { nome: "Vila Rica", estado: "rascunho", familia: "quente" },
  { nome: "Aurora", estado: "producao", familia: "fria" },
  { nome: "Serralheria", estado: "producao", familia: "neutra" },
];

export default function StickyFilterbarDemo({ props }: DemoProps) {
  const [estado, setEstado] = React.useState<Estado | null>(null);
  const [familia, setFamilia] = React.useState<Familia | null>(null);

  const lista = ACERVO.filter(
    (p) => (!estado || p.estado === estado) && (!familia || p.familia === familia),
  );

  const conta = (e: Estado) => ACERVO.filter((p) => p.estado === e).length;

  return (
    // O contêiner é quem rola. A barra descobre isso sozinha (ela procura o
    // ancestral rolante), então o fio de progresso mede este percurso e não o
    // da página inteira.
    <div className="h-full w-full overflow-y-auto rounded-[var(--r-surface,0.875rem)] border border-border bg-background">
      <div
        data-demo-header
        className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-background px-6"
      >
        <span className="text-destaque font-semibold tracking-tight">Acervo</span>
      </div>

      <StickyFilterbar headerSelector="[data-demo-header]" className="px-6" {...props}>
        <FilterRow>
          <Chip pressed={estado === null} onClick={() => setEstado(null)}>
            Todos
          </Chip>
          {(Object.keys(ROTULO) as Estado[]).map((e) => (
            <Chip
              key={e}
              pressed={estado === e}
              count={conta(e)}
              onClick={() => setEstado(estado === e ? null : e)}
            >
              {ROTULO[e]}
            </Chip>
          ))}
          {/* A contagem do resultado mora na linha principal de propósito: é o
              que a pessoa precisa continuar vendo depois que a barra condensa. */}
          <span className="ml-auto shrink-0 text-apoio tabular-nums text-muted-foreground">
            {lista.length} de {ACERVO.length}
          </span>
        </FilterRow>
        <FilterRow label="Cor" collapsible>
          {(["quente", "fria", "neutra"] as Familia[]).map((f) => (
            <Chip
              key={f}
              pressed={familia === f}
              onClick={() => setFamilia(familia === f ? null : f)}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </Chip>
          ))}
        </FilterRow>
      </StickyFilterbar>

      <div className="grid grid-cols-2 gap-4 p-6">
        {lista.map((p, i) => (
          <article
            key={p.nome}
            className="overflow-hidden rounded-[var(--r-control,0.5rem)] border border-border bg-card"
          >
            <Media papel="cena" indice={i} ratio="16/10" className="w-full" />
            <div className="flex items-baseline justify-between gap-2 px-4 py-3">
              <span className="truncate text-apoio font-medium">{p.nome}</span>
              <span className="shrink-0 text-rotulo uppercase tracking-[0.1em] text-muted-foreground">
                {p.familia}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
