"use client";

/**
 * useDebounce — atrasa um valor até ele parar de mudar.
 *
 * Existe para os campos de busca do registry (`search-field`, `command-search`):
 * a cada tecla o consumidor filtraria uma tabela inteira ou dispararia uma
 * requisição. Aqui o valor só "fecha" depois de `delay` sem digitação.
 *
 * Dois detalhes que parecem preciosismo e não são:
 *
 * 1. **Só borda de saída (trailing).** Não emite na primeira tecla. Quem precisa
 *    de resposta imediata na primeira letra não quer debounce, quer outra coisa.
 * 2. **`delay` está nas dependências.** Trocar o atraso em tempo de execução
 *    (ex.: 300ms digitando, 0 ao colar) reprograma o timer em vez de continuar
 *    com o antigo até a próxima tecla.
 *
 * O valor inicial NÃO é atrasado: no primeiro render `debounced === value`, então
 * um campo pré-preenchido por URL ou por preset já entra filtrado.
 */

import * as React from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = React.useState<T>(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
