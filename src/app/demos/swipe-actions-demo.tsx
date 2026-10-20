"use client";

/**
 * Uma caixa de entrada curta, que é a cena do gesto. Arrastar pra direita
 * marca como não lida (a linha fica); pra esquerda revela Arquivar e Apagar
 * (a linha sai). O botão de três pontos de cada linha faz o mesmo sem gesto.
 * Quando a lista esvazia, um Restaurar traz tudo de volta pra testar de novo.
 */

import * as React from "react";
import { Archive, Mail, MailOpen, RotateCcw, Trash2 } from "lucide-react";

import { SwipeActions, SwipeActionsRow } from "../../../registry/visant/ui/swipe-actions";
import type { DemoProps } from "../catalog";

const CAIXA = [
  { id: "1", de: "Marina Lopes", assunto: "Prova final do rótulo", trecho: "Subi a versão com o verniz localizado." },
  { id: "2", de: "Gráfica Ipiranga", assunto: "Orçamento aprovado", trecho: "Tiragem de 5 mil, entrega na quinta." },
  { id: "3", de: "Téo Sampaio", assunto: "Fotos do estúdio", trecho: "Separei as doze melhores pra capa." },
  { id: "4", de: "Bia Nogueira", assunto: "Reunião de naming", trecho: "Pode ser amanhã às dez?" },
];

export default function SwipeActionsDemo({ props }: DemoProps) {
  const [itens, setItens] = React.useState(CAIXA);
  const [naoLidas, setNaoLidas] = React.useState<Set<string>>(() => new Set(["1", "3"]));

  const tirar = (id: string) => setItens((l) => l.filter((m) => m.id !== id));
  const alternar = (id: string) =>
    setNaoLidas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-[400px] text-foreground">
        {itens.length === 0 ? (
          <button
            type="button"
            onClick={() => setItens(CAIXA)}
            className="mx-auto flex items-center gap-2 rounded-[var(--r-control)] border border-border bg-card px-4 py-2 text-sm font-medium outline-none hover:bg-muted focus-visible:[box-shadow:var(--focus)]"
          >
            <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Restaurar caixa
          </button>
        ) : (
          <SwipeActions label="Caixa de entrada" {...props}>
            {itens.map((m) => {
              const nova = naoLidas.has(m.id);
              return (
                <SwipeActionsRow
                  key={m.id}
                  label={m.assunto}
                  leading={[
                    {
                      label: nova ? "Lida" : "Não lida",
                      icon: nova ? <MailOpen strokeWidth={1.75} /> : <Mail strokeWidth={1.75} />,
                      tone: "brand",
                      keepRow: true,
                      onSelect: () => alternar(m.id),
                    },
                  ]}
                  trailing={[
                    { label: "Arquivar", icon: <Archive strokeWidth={1.75} />, onSelect: () => tirar(m.id) },
                    { label: "Apagar", icon: <Trash2 strokeWidth={1.75} />, tone: "danger", onSelect: () => tirar(m.id) },
                  ]}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2 flex-none rounded-[var(--r-pill)] ${nova ? "bg-[var(--brand)]" : "bg-transparent"}`}
                    />
                    <div className="min-w-0">
                      <p className={`truncate text-sm ${nova ? "font-semibold" : "font-medium"}`}>{m.de}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {m.assunto}. {m.trecho}
                      </p>
                    </div>
                  </div>
                </SwipeActionsRow>
              );
            })}
          </SwipeActions>
        )}
      </div>
    </div>
  );
}
