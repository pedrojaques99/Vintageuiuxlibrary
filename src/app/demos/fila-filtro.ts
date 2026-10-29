/**
 * Uma fila de trabalho de mentira, mas com a forma da de verdade: é o mínimo
 * para a demo mostrar filtro FILTRANDO. Barra de filtro sobre lista estática
 * mostra o controle e esconde o que ele faz, que é o ponto inteiro da peça.
 *
 * Divide as demos de busca e filtro (search-field, filter-menu, filter-bar,
 * command-search). Os nomes são fictícios: a vitrine é pública, e cliente de
 * verdade não aparece em demo.
 */

import * as React from "react";

export const FILA = [
  { id: "1", nome: "Identidade Café Norte", status: "producao", prioridade: "urgente" },
  { id: "2", nome: "Landing Ateliê Sol", status: "revisao", prioridade: "alta" },
  { id: "3", nome: "Kit de mockups Visant", status: "producao", prioridade: "media" },
  { id: "4", nome: "Guideline Estúdio Vale", status: "backlog", prioridade: "alta" },
  { id: "5", nome: "Catálogo de peças", status: "backlog", prioridade: "media" },
];

// A cor da bolinha vem do dado, como viria de uma API — por isso ela é token da
// marca aqui, e não hexadecimal cravado no componente.
export const GRUPOS_FILTRO = [
  {
    key: "status",
    label: "Status",
    options: [
      { id: "backlog", label: "Backlog", dot: "var(--muted-foreground)" },
      { id: "producao", label: "Em produção", dot: "var(--brand, var(--foreground))" },
      { id: "revisao", label: "Em revisão", dot: "var(--accent-ink, var(--foreground))" },
    ],
  },
  {
    key: "prioridade",
    label: "Prioridade",
    mode: "single" as const,
    options: [
      { id: "urgente", label: "Urgente" },
      { id: "alta", label: "Alta" },
      { id: "media", label: "Média" },
    ],
  },
];

export const ROTULO_FILTRO: Record<string, string> = Object.fromEntries(
  GRUPOS_FILTRO.flatMap((g) => g.options.map((o) => [o.id, o.label])),
);

export function useFilaFiltrada() {
  const [busca, setBusca] = React.useState("");
  const [marcado, setMarcado] = React.useState<Record<string, string[]>>({});

  const alternar = React.useCallback((grupo: string, id: string) => {
    setMarcado((atual) => {
      const single = GRUPOS_FILTRO.find((g) => g.key === grupo)?.mode === "single";
      const antes = atual[grupo] ?? [];
      if (single) return { ...atual, [grupo]: antes[0] === id ? [] : [id] };
      return {
        ...atual,
        [grupo]: antes.includes(id) ? antes.filter((x) => x !== id) : [...antes, id],
      };
    });
  }, []);

  const filtrada = React.useMemo(() => {
    const needle = busca.toLowerCase().trim();
    return FILA.filter((linha) => {
      if (needle && !linha.nome.toLowerCase().includes(needle)) return false;
      return GRUPOS_FILTRO.every((g) => {
        const sel = marcado[g.key] ?? [];
        return sel.length === 0 || sel.includes(linha[g.key as "status" | "prioridade"]);
      });
    });
  }, [busca, marcado]);

  return { busca, setBusca, marcado, setMarcado, alternar, filtrada };
}
