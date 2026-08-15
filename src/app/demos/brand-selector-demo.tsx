"use client";

/**
 * A demo antiga não mostrava a peça: mostrava uma seta.
 *
 * O card do catálogo trazia "está na barra do topo →" e um "⌘B" — dois blocos
 * de texto no lugar do componente, que é o que "slop?" quer dizer. Vitrine que
 * aponta pra outro canto da tela não é vitrine.
 *
 * Aqui o gatilho de verdade fica no card, dentro da barra de um produto de
 * mentira, junto do que ele governa: um bloco pintado só com token. Trocar a
 * marca não muda nada NESTE arquivo — muda `--brand`, `--card`, `--font-display`
 * na raiz, e a amostra acompanha porque nunca soube a cor de ninguém. É esse o
 * argumento inteiro do runtime de marca, e ele só é visível se houver algo
 * pintado ao lado do seletor.
 *
 * A caixa de comando abre em tela cheia mesmo saindo de um card, e é assim que
 * tem que ser: ela é portalizada no `body`, igual ao que o `shadcn add` entrega.
 * Simular uma versão contida aqui seria a vitrine mentindo sobre a peça.
 */

import * as React from "react";

import { useBrandTheme } from "@/lib/brand-theme";
import { BrandSelector } from "../../../registry/visant/ui/brand-selector";

export default function BrandSelectorDemo() {
  const { active } = useBrandTheme();

  return (
    <div className="flex h-full w-full flex-col justify-center px-5">
      <div className="overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card">
        {/* A barra de um produto qualquer: é o lugar onde esta peça mora. */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
          <span className="text-rotulo font-semibold tracking-tight">Mesa de trabalho</span>
          <BrandSelector />
        </div>

        {/*
         * A amostra. Tudo aqui é token puro — nenhum hex, nenhuma prop de cor —
         * então ela é a prova de que a troca alcança componente que nunca ouviu
         * falar de marca nenhuma.
         */}
        <div className="flex items-center gap-4 px-4 py-4">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-[var(--r-control,0.5rem)] text-[length:var(--text-destaque,0.9375rem)] font-semibold"
            style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}
          >
            Aa
          </span>
          <span className="flex min-w-0 flex-col gap-1.5">
            <span
              className="truncate text-[length:var(--text-destaque,0.9375rem)] font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display, inherit)" }}
            >
              {active?.name ?? "Sem marca aplicada"}
            </span>
            <span className="flex items-center gap-2">
              <span
                className="rounded-[var(--r-pill,9999px)] px-2.5 py-1 text-micro font-semibold uppercase tracking-[0.1em]"
                style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}
              >
                ação
              </span>
              {/* Contorno na marca, texto na tinta do tema: marca clara pintando
                  palavra some no papel branco (o ciano da Visant dá 1,29:1, e o
                  portão de legibilidade pega). Borda é forma, não leitura — ali
                  a cor da marca pode viver. */}
              <span className="rounded-[var(--r-pill,9999px)] border border-[var(--brand)] px-2.5 py-1 text-micro font-semibold uppercase tracking-[0.1em] text-[var(--foreground)]">
                contorno
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
