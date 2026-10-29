"use client";

/** Busca de comando sobre a fila, com o atalho desligado para não roubar o ⌘K da vitrine. */

import * as React from "react";

import { CommandSearch } from "../../../registry/visant/ui/command-search";
import { FILA, ROTULO_FILTRO } from "./fila-filtro";

export default function CommandSearchDemo() {
  /*
   * `shortcut={null}`: o componente registra o atalho no `document`. Montado
   * aqui, ele roubaria o ⌘K de quem está só rolando o catálogo — e a peça tem a
   * prop justamente porque o mesmo choque acontece num app com duas buscas.
   * O gatilho continua sendo o de verdade, e abre o diálogo de verdade.
   */
  const buscar = React.useCallback(async (q: string) => {
    const needle = q.toLowerCase();
    return FILA.filter((l) => l.nome.toLowerCase().includes(needle)).map((l) => ({
      id: l.id,
      title: l.nome,
      subtitle: ROTULO_FILTRO[l.status],
      type: "job",
    }));
  }, []);

  return (
    <div className="flex h-full w-full items-start p-3">
      <CommandSearch
        shortcut={null}
        onSearch={buscar}
        onSelect={() => {}}
        quickLinks={[
          { id: "q1", title: "Fila de produção", subtitle: "Tudo que está aberto" },
          { id: "q2", title: "Criar job", subtitle: "Novo job com cliente" },
        ]}
      />
    </div>
  );
}
