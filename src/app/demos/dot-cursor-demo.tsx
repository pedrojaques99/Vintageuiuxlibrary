"use client";

/**
 * Um palco com o que o ponto reconhece: link, botão e um `[data-cursor]` sem
 * papel de controle nenhum (o caso da foto clicável que é só uma `div`).
 *
 * O cursor é montado AQUI e não na raiz da vitrine porque é a demo dele — mas
 * ele é `fixed` e segue a janela inteira enquanto a demo estiver montada. É o
 * comportamento real da peça: num site ele mora na raiz e vale para tudo.
 *
 * `ink` usa `--foreground` sob tema escuro (armadilha 4 do componente): com
 * `difference`, tinta escura não inverte nada e o ponto sumiria.
 */

import * as React from "react";

import { DotCursor } from "../../../registry/visant/ui/dot-cursor";
import { Media } from "../media";
import type { DemoProps } from "../catalog";

function useEscuro() {
  const [escuro, setEscuro] = React.useState(false);
  React.useEffect(() => {
    const raiz = document.documentElement;
    const ler = () => setEscuro(raiz.classList.contains("dark"));
    ler();
    const mo = new MutationObserver(ler);
    mo.observe(raiz, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return escuro;
}

export default function DotCursorDemo(_: DemoProps) {
  const escuro = useEscuro();

  return (
    <div className="grid h-full w-full grid-cols-[1fr_auto] items-center gap-6 px-6">
      <DotCursor ink={escuro ? "var(--foreground)" : "var(--background)"} />

      <div className="flex flex-col items-start gap-4">
        <p className="max-w-[22rem] text-[1.05rem] leading-[1.5] text-muted-foreground">
          Passe o ponteiro. Sobre um{" "}
          <a
            href="#dot-cursor"
            onClick={(e) => e.preventDefault()}
            className="text-foreground underline underline-offset-4"
          >
            link
          </a>{" "}
          ou um botão, o ponto abre num anel.
        </p>
        <button
          type="button"
          className="rounded-full border border-current px-4 py-2 text-rotulo uppercase tracking-[0.08em] text-foreground"
        >
          um botão
        </button>
      </div>

      <div data-cursor className="w-[180px] overflow-hidden rounded-[var(--r-surface,16px)]">
        <Media papel="cena" indice={2} ratio="4/5" />
      </div>
    </div>
  );
}
