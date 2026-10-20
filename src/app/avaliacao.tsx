"use client";

/**
 * Avaliar a peça: nota de 1 a 5, comentário e "excluir de vez".
 *
 * Mora no painel da ficha e só existe com o dev server de pé
 * (`CURADORIA_ATIVA`): é a ferramenta do dono pra separar o que é forte do que
 * só ocupa lugar. Nota 2 ou menos arquiva — a peça sai da grade e da busca até
 * a nota subir. "Excluir de vez" é outra coisa: marca pra remoção, que só
 * acontece quando alguém roda `npm run curadoria -- --excluir`.
 */

import * as React from "react";
import { Check, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURADORIA_ATIVA, NOTA_DE_CORTE, arquivada, avaliar, useNotas } from "./curadoria";

export function Avaliacao({ item }: { item: string }) {
  const notas = useNotas();
  const atual = notas[item];
  const [nota, setNota] = React.useState(atual?.nota ?? 0);
  const [comentario, setComentario] = React.useState(atual?.comentario ?? "");
  const [excluir, setExcluir] = React.useState(Boolean(atual?.excluir));
  const [estado, setEstado] = React.useState<"parado" | "gravando" | "gravado" | "erro">("parado");

  // Trocar de peça (setas da ficha) carrega a avaliação dela.
  React.useEffect(() => {
    setNota(atual?.nota ?? 0);
    setComentario(atual?.comentario ?? "");
    setExcluir(Boolean(atual?.excluir));
    setEstado("parado");
  }, [item, atual?.nota, atual?.comentario, atual?.excluir]);

  if (!CURADORIA_ATIVA) return null;

  const sujo =
    nota !== (atual?.nota ?? 0) ||
    comentario.trim() !== (atual?.comentario ?? "") ||
    excluir !== Boolean(atual?.excluir);

  const gravar = async () => {
    if (!nota) return;
    setEstado("gravando");
    try {
      await avaliar(item, nota, comentario, excluir);
      setEstado("gravado");
    } catch {
      setEstado("erro");
    }
  };

  const fica = { nota, excluir };
  const situacao = !nota
    ? "Sem nota ainda."
    : excluir
      ? "Marcada pra excluir de vez."
      : arquivada(fica as never)
        ? `Nota ${NOTA_DE_CORTE} ou menos: sai da vitrine até subir.`
        : "Fica na vitrine.";

  return (
    <section className="space-y-2.5 rounded-control bg-casa-tile-2 p-3" aria-label="Avaliar a peça">
      <div className="flex items-center justify-between">
        <span className="text-casa-sm text-casa-fg-3">Sua nota</span>
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Nota de 1 a 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={nota === n}
              aria-label={`${n} de 5`}
              onClick={() => setNota(n)}
              className="casa-icone alvo-toque size-7 focus-visible:[box-shadow:var(--focus)]"
            >
              <Star className={cn("h-4 w-4", n <= nota ? "fill-current text-casa-fg" : "text-casa-fg-3")} />
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={2}
        placeholder="O que falta pra ela ser foda?"
        className="w-full resize-none rounded-control bg-casa-tile px-3 py-2 text-casa-base text-casa-fg outline-none placeholder:text-casa-fg-3 focus-visible:[box-shadow:var(--focus)]"
      />

      <label className="flex cursor-pointer items-center gap-2 text-casa-sm text-casa-fg-2">
        <input
          type="checkbox"
          checked={excluir}
          onChange={(e) => setExcluir(e.target.checked)}
          className="size-3.5 accent-[var(--casa-fg)]"
        />
        Excluir de vez
      </label>

      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 text-casa-sm text-casa-fg-3">{situacao}</span>
        <button
          type="button"
          onClick={() => void gravar()}
          disabled={!nota || !sujo || estado === "gravando"}
          className="alvo-toque flex h-8 shrink-0 items-center gap-1.5 rounded-control bg-casa-cta px-3 text-casa-sm text-casa-cta-fg transition-opacity [transition-duration:var(--dur-fast)] hover:opacity-90 disabled:opacity-40 focus-visible:[box-shadow:var(--focus)]"
        >
          {estado === "gravando" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {estado === "gravado" && !sujo ? <Check className="h-3.5 w-3.5" /> : null}
          {estado === "gravado" && !sujo ? "Gravado" : estado === "erro" ? "Tentar de novo" : "Gravar"}
        </button>
      </div>
    </section>
  );
}
