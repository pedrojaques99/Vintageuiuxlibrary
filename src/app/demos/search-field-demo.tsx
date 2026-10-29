"use client";

/** Campo de busca sobre uma fila de verdade: digitar filtra a lista embaixo. */

import * as React from "react";

import { SearchField } from "../../../registry/visant/ui/search-field";
import { useFilaFiltrada } from "./fila-filtro";

export default function SearchFieldDemo() {
  const { busca, setBusca, filtrada } = useFilaFiltrada();
  return (
    <div className="flex h-full w-full flex-col gap-2 p-3">
      {/* Bloco comum em volta: o campo é feito pra crescer numa BARRA (`flex-1`), e
          direto numa coluna ele esticaria na vertical e empurraria a lista. */}
      <div>
        <SearchField value={busca} onChange={setBusca} placeholder="Buscar na fila..." />
      </div>
      <ul className="space-y-1">
        {filtrada.slice(0, 3).map((linha) => (
          <li key={linha.id} className="truncate rounded bg-muted px-2 py-1 text-apoio">
            {linha.nome}
          </li>
        ))}
        {filtrada.length === 0 && (
          <li className="px-2 py-1 text-apoio text-muted-foreground">Nada com esse texto.</li>
        )}
      </ul>
    </div>
  );
}
