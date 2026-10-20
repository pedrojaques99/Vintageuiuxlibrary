"use client";

/**
 * Um palco com o que o ponto reconhece: link, botão e um `[data-cursor]` sem
 * papel de controle nenhum (o caso da foto clicável que é só uma `div`).
 *
 * O cursor é `position: fixed`, e o palco da vitrine é escalado com
 * `transform`: dentro dele o `fixed` passa a medir a partir da caixa
 * transformada e o ponto aparecia longe do ponteiro. Por isso ele vai para o
 * `body` por portal, como mora num site de verdade (na raiz), e só existe
 * enquanto o ponteiro está sobre a demo: fora dela a vitrine segue sem ponto.
 *
 * `ink` usa `--foreground` sob tema escuro (armadilha 4 do componente): com
 * `difference`, tinta escura não inverte nada e o ponto sumiria.
 */

import * as React from "react";
import { createPortal } from "react-dom";

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
  const [dentro, setDentro] = React.useState(false);

  return (
    <div
      className="flex h-full w-full items-center justify-center gap-8 overflow-hidden px-6"
      onPointerEnter={() => setDentro(true)}
      onPointerLeave={() => setDentro(false)}
    >
      {dentro
        ? createPortal(<DotCursor ink={escuro ? "var(--foreground)" : "var(--background)"} />, document.body)
        : null}

      <div data-cursor className="w-[132px] shrink-0 overflow-hidden rounded-[var(--r-surface,16px)]">
        <Media papel="cena" indice={2} ratio="4/5" />
      </div>

      <div className="flex min-w-0 flex-col items-start gap-4">
        <p className="max-w-[16rem] text-[1.05rem] leading-[1.5] text-muted-foreground">
          Sobre um{" "}
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
          className="rounded-[var(--r-control,10px)] border border-current px-4 py-2 text-rotulo text-foreground focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]"
        >
          Um botão
        </button>
      </div>
    </div>
  );
}
