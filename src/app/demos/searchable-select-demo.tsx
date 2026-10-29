"use client";

/** Combobox com grupos, busca em keywords e criação no lugar. */

import * as React from "react";

import { SearchableSelect } from "../../../registry/visant/ui/searchable-select";

export default function SearchableSelectDemo() {
  const [valor, setValor] = React.useState("");
  const [extras, setExtras] = React.useState<{ value: string; label: string }[]>([]);

  const grupos = React.useMemo(
    () => [
      {
        label: "Clientes",
        options: [
          { value: "cafe-norte", label: "Café Norte", keywords: "café loja" },
          { value: "atelie-sol", label: "Ateliê Sol", keywords: "moda" },
        ],
      },
      { label: "Internos", options: [{ value: "visant", label: "Visant Labs" }, ...extras] },
    ],
    [extras],
  );

  return (
    <div className="flex h-full w-full items-start p-3">
      <SearchableSelect
        value={valor}
        onValueChange={setValor}
        groups={grupos}
        placeholder="Escolher cliente..."
        createEntityLabel="cliente"
        onCreate={async (label) => {
          const value = label.toLowerCase().replace(/\s+/g, "-");
          setExtras((atual) => [...atual, { value, label }]);
          return value;
        }}
      />
    </div>
  );
}
