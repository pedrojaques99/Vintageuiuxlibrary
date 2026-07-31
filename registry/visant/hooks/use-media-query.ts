"use client";

/**
 * useMediaQuery — media query como estado de React.
 *
 * Existe porque o `data-table` já dependia dele: o item era publicado importando
 * `@/hooks/use-media-query` sem declarar de onde isso vinha, então o `shadcn add`
 * entregava um arquivo que não compilava na casa de quem instalou. Este é o
 * arquivo que faltava.
 *
 * Três detalhes que separam esta versão de um `useState` + `addEventListener`:
 *
 * 1. **Estado inicial lido de forma síncrona**, no `useState`, e não num efeito.
 *    Ler depois faz o componente pintar uma vez com a resposta errada — a tabela
 *    monta em desktop e pisca para mobile no quadro seguinte.
 * 2. **`useSyncExternalStore`**, que é a API do React para exatamente isto:
 *    fonte externa que muda sozinha. Resolve o rasgo de concorrência que a dupla
 *    `useState`/`useEffect` deixa em renderização interrompível.
 * 3. **Guarda de SSR.** No servidor não existe `matchMedia`; o hook devolve
 *    `false` em vez de explodir, e o cliente corrige na hidratação.
 */

import * as React from "react";

export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = React.useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  // No servidor, nada casa: quem decide é o cliente, na hidratação.
  const getServerSnapshot = React.useCallback(() => false, []);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
