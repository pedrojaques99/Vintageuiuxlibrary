"use client";

/**
 * Modo solo: uma demo, um documento, nenhuma casca.
 *
 * Existe por um motivo só, e ele é uma correção de honestidade da vitrine.
 *
 * O preset de viewport da ficha de foco **mentia**. Ele desenhava a peça no
 * tamanho declarado e aplicava `scale` para caber em 360px — o que muda o
 * tamanho na tela e **não muda nada para o CSS**. Media query lê o viewport, não
 * o container: com a janela em 1440, `sm:` continua valendo dentro do "celular".
 * Prova do estrago: no preset de 360 a barra do `cta-surface` não empilhava, e o
 * título espremia em cinco linhas ao lado do botão. A peça estava certa; o palco
 * é que não testava.
 *
 * A única forma de um breakpoint valer de verdade é um viewport de verdade —
 * ou seja, um iframe. Esta rota (`/c/<nome>?solo=1`) é o que roda dentro dele:
 * mesmo bundle, mesmo CSS, mesmo componente, viewport próprio.
 *
 * Duas coisas que o solo faz e a ficha não teria como fazer sozinha:
 *
 * - **Devolve a própria altura** por `postMessage`. Sem isso o pai teria de
 *   chutar a altura do iframe, e chute de altura foi exatamente o que produziu
 *   os palcos com um terço de vazio na versão anterior da vitrine.
 * - **Herda a marca e o tema do pai** por query (`?brand=`, `?dark=1`). Um
 *   iframe é outro documento: sem isso a peça apareceria na marca padrão
 *   enquanto o resto da tela está em outra, e a vitrine passaria a mentir num
 *   segundo lugar depois de parar de mentir no primeiro.
 */

import * as React from "react";
import { CATALOG } from "./catalog";

/** O pai escuta por este nome; mudar aqui quebra a medição do iframe. */
export const MSG_ALTURA = "visant:solo:altura";

export function Solo({ name }: { name: string }) {
  const item = CATALOG.find((i) => i.name === name);
  const Demo = item?.demo;
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined" || window.parent === window) return;

    const avisar = () => {
      // `scrollHeight` do conteúdo, não do documento: o `<body>` pode ter margem
      // e altura mínima que não têm nada a ver com a peça.
      window.parent.postMessage({ type: MSG_ALTURA, name, altura: el.scrollHeight }, "*");
    };

    avisar();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(avisar) : null;
    ro?.observe(el);
    // Fonte que chega depois muda a altura do texto; sem este segundo aviso o
    // iframe fica com a altura de antes da fonte carregar.
    const t = setTimeout(avisar, 600);
    return () => {
      ro?.disconnect();
      clearTimeout(t);
    };
  }, [name]);

  if (!Demo) {
    return (
      <div className="p-6 text-corpo text-muted-foreground">
        <span className="font-mono">{name}</span> não tem demo.
      </div>
    );
  }

  return (
    <div ref={ref} className="p-4">
      <Demo />
    </div>
  );
}

/**
 * O fundo do solo, por query (`?bg=%23ffffff`).
 *
 * A peça normalmente senta no `--background` do tema — que na marca da casa é um
 * papel quente, não branco puro. Só que ela vai ser instalada em site de cliente
 * com fundo branco de verdade, e é lá que um texto claro demais ou uma borda de
 * 4% de contraste some. Poder forçar a cor do fundo é o que transforma "acho que
 * funciona no branco" em teste.
 */
export function fundoDoSolo(params: URLSearchParams): string | undefined {
  const bg = params.get("bg");
  // Só cor literal: aceitar qualquer string aqui seria deixar a URL escrever CSS.
  return bg && /^#[0-9a-fA-F]{3,8}$/.test(bg) ? bg : undefined;
}
