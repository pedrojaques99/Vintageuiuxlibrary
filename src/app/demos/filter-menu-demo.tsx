"use client";

/** Menu de facetas sobre a fila: status é múltiplo, prioridade é excludente. */

import * as React from "react";

import { FilterMenu } from "../../../registry/visant/ui/filter-menu";
import { GRUPOS_FILTRO, useFilaFiltrada } from "./fila-filtro";

export default function FilterMenuDemo() {
  const { marcado, setMarcado, alternar } = useFilaFiltrada();
  return (
    <div className="flex h-full w-full items-start justify-center p-3">
      <FilterMenu
        groups={GRUPOS_FILTRO}
        selected={marcado}
        onToggle={alternar}
        onClear={() => setMarcado({})}
        align="start"
      />
    </div>
  );
}
