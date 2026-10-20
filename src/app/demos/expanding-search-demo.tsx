"use client";

/**
 * A demo põe a lupa onde ela costuma morar: na ponta direita de uma barra,
 * ao lado do que é mais usado que ela. Clique, digite "marca" ou "acao" (sem
 * acento também acha), e Esc dobra de volta.
 */

import * as React from "react";

import { ExpandingSearch, type ExpandingSearchItem } from "../../../registry/visant/ui/expanding-search";
import type { DemoProps } from "../catalog";

const ITENS: ExpandingSearchItem[] = [
  { id: "1", title: "Manual de marca Arco", meta: "Documento, editado ontem" },
  { id: "2", title: "Campanha de verão", meta: "Projeto, 14 peças" },
  { id: "3", title: "Ação de lançamento", meta: "Projeto, em andamento" },
  { id: "4", title: "Paleta e tipografia", meta: "Documento", keywords: ["cores", "fontes"] },
  { id: "5", title: "Fotos do estúdio", meta: "Pasta, 86 arquivos" },
  { id: "6", title: "Proposta Marina Duarte", meta: "Orçamento, enviado" },
  { id: "7", title: "Site institucional", meta: "Projeto, revisão" },
];

export default function ExpandingSearchDemo({ props }: DemoProps) {
  const [escolhido, setEscolhido] = React.useState<string | null>(null);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      {/* A barra no terço de cima: os resultados abrem pra baixo. */}
      <div className="flex h-[300px] w-full max-w-[400px] flex-col gap-3 pt-16">
        <div className="flex items-center gap-3 rounded-[var(--r-surface)] border border-border bg-card p-2 pl-4">
          <span className="shrink-0 font-medium text-foreground">Projetos</span>
          <ExpandingSearch
            label="Buscar projetos e documentos"
            items={ITENS}
            suggestions={ITENS.slice(0, 3)}
            onSelect={(i) => setEscolhido(i.title)}
            expandedWidth={280}
            {...props}
          />
        </div>
        {/* Linha reservada: o retorno da escolha aparece sem empurrar nada, e em
            repouso não há legenda de enchimento disputando com a barra. */}
        <p aria-live="polite" className="min-h-5 px-1 text-sm text-muted-foreground">
          {escolhido && `Abrindo ${escolhido}`}
        </p>
      </div>
    </div>
  );
}
