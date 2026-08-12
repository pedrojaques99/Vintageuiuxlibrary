"use client";

import * as React from "react";

/**
 * Busca em memória, tolerante a acento — a que quase todo catálogo precisa e
 * quase toda base reescreve.
 *
 * ── Quando ela é a resposta certa ──────────────────────────────────────────
 *
 * Até alguns milhares de registros já carregados, filtrar em memória é
 * **instantâneo** e evita um round-trip por tecla. Endpoint de busca vale a
 * pena quando o corpus não cabe no cliente; abaixo disso ele só adiciona
 * latência, estado de carregamento, condição de corrida entre respostas fora de
 * ordem, e uma rota pra manter.
 *
 * ── As três decisões que fazem diferença ───────────────────────────────────
 *
 * 1. **Dobra acento e caixa.** "tipografia" tem que achar "tipografía", e
 *    "acao" tem que achar "ação". Num produto em português, busca que exige
 *    acento correto é busca que não funciona pra metade de quem digita — e o
 *    diagnóstico "não tem esse conteúdo" nunca chega a quem poderia consertar.
 * 2. **O índice é montado uma vez.** Normalizar a base inteira a cada tecla é
 *    trabalho de CPU no exato instante em que a pessoa está digitando. O índice
 *    se refaz quando a lista muda, e não quando o termo muda.
 * 3. **Todos os termos precisam bater, em qualquer ordem.** "brand tipo" acha
 *    "tipografia de marca". `AND` sobre termos separados é o que faz a busca
 *    parecer inteligente sem nenhum ranqueamento — e ranqueamento aqui seria
 *    peso pra ordenar uma lista que a pessoa já consegue varrer com o olho.
 *
 * ── O contrato de vazio ────────────────────────────────────────────────────
 *
 * Termo vazio devolve a lista **inteira**, não vazia. Parece óbvio e é o bug
 * mais comum do padrão: a tela nasce sem nada e a pessoa acha que o catálogo
 * está vazio.
 */

/** Remove diacrítico e normaliza caixa. Exportada porque a mesma dobra costuma
 *  ser precisa fora do hook (num `<option>`, num agrupamento). */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    // Escapes e não os caracteres literais: um bloco de combining marks colado
    // no fonte sobrevive mal a copiar, colar e reformatar.
    .replace(new RegExp("[\u0300-\u036f]", "g"), "");
}

export interface UseLocalSearchOptions<T> {
  /** Os campos que entram no índice, na ordem em que importam. */
  fields: (item: T) => Array<string | null | undefined>;
  /** O termo. Componente controlado por fora — o hook não guarda input. */
  query: string;
}

export function useLocalSearch<T>(items: readonly T[], { fields, query }: UseLocalSearchOptions<T>) {
  // O índice acompanha a LISTA, não o termo. É a linha que segura o custo.
  const indice = React.useMemo(
    () =>
      items.map((item) =>
        fold(
          fields(item)
            .filter(Boolean)
            .join(" "),
        ),
      ),
    // `fields` costuma ser inline; depender dela remontaria o índice a cada
    // render. A lista é a dependência honesta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  const termos = React.useMemo(() => fold(query).trim().split(/\s+/).filter(Boolean), [query]);

  return React.useMemo(() => {
    if (!termos.length) return items as T[];
    return items.filter((_, i) => termos.every((t) => indice[i].includes(t)));
  }, [items, indice, termos]);
}
