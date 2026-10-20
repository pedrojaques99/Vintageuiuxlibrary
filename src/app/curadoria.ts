"use client";

/**
 * A curadoria do acervo, do lado da vitrine.
 *
 * As notas moram em `curadoria/notas.json`, versionado, e entram no bundle por
 * import: em produção a vitrine lê o arquivo do último build e esconde o que
 * está arquivado, sem servidor nenhum. Em dev o mesmo dado vem do endpoint
 * (`scripts/vite-curadoria.mjs`) e é recarregado a cada avaliação, então dar
 * nota 2 numa peça a tira da grade na hora.
 *
 * Arquivar não apaga nada: a peça continua no registry, instalável, e na ficha
 * por link direto. Ela só sai da grade e da busca até a nota subir.
 */

import * as React from "react";
import NOTAS_DO_BUILD from "../../curadoria/notas.json";

export interface Nota {
  nota: number;
  comentario?: string;
  excluir?: boolean;
  data?: string;
}
export type Notas = Record<string, Nota>;

/** Abaixo disto (inclusive) a peça sai da vitrine. Igual ao do plugin. */
export const NOTA_DE_CORTE = 2;

export const arquivada = (n?: Nota) => Boolean(n && (n.excluir || n.nota <= NOTA_DE_CORTE));

/** A curadoria só se edita com o dev server de pé — é ferramenta do dono, não da visita. */
export const CURADORIA_ATIVA = import.meta.env.DEV;

let atuais: Notas = NOTAS_DO_BUILD as Notas;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export async function recarregarNotas() {
  if (!CURADORIA_ATIVA) return;
  try {
    const r = await fetch("/__curadoria");
    if (r.ok) {
      atuais = (await r.json()) as Notas;
      avisar();
    }
  } catch {
    /* sem endpoint: fica o que veio no build */
  }
}

export async function avaliar(item: string, nota: number, comentario: string, excluir: boolean) {
  const r = await fetch("/__curadoria", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ item, nota, comentario, excluir }),
  });
  const dado = (await r.json()) as { ok?: boolean; notas?: Notas; erro?: string };
  if (!r.ok || !dado.notas) throw new Error(dado.erro ?? `HTTP ${r.status}`);
  atuais = dado.notas;
  avisar();
}

/** As notas atuais, re-renderizando quem usa a cada avaliação. */
export function useNotas(): Notas {
  const [, forcar] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    ouvintes.add(forcar);
    return () => {
      ouvintes.delete(forcar);
    };
  }, []);
  React.useEffect(() => {
    void recarregarNotas();
  }, []);
  return atuais;
}
