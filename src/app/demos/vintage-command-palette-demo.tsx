"use client";

/**
 * A paleta de verdade, dentro de um painel de bancada.
 *
 * O que estava na vitrine era um cartão de recado — "abre na bancada, em tela
 * cheia" — e um card que descreve o componente em vez de mostrá-lo é o mesmo
 * que card vazio. A razão do recado era boa: a paleta montava `fixed inset-0` e
 * roubava o foco, e dentro de um card ela escaparia da moldura e sequestraria o
 * teclado de quem só estava rolando o catálogo.
 *
 * Então o conserto foi na peça, não na cena: `inline` monta a paleta dentro do
 * pai posicionado, e sem `autoFocus` ela não puxa o cursor de ninguém. Aqui a
 * cena é o painel; a paleta é a peça, filtrando e navegando por seta como
 * filtra e navega em tela cheia.
 */

import * as React from "react";

import {
  VintageCommandPalette,
  type CommandItem,
} from "../../../registry/vintage/ui/vintage-command-palette";

const ITENS: CommandItem[] = [
  { id: "reverb", label: "Plate Reverb", icon: "🌊", active: true },
  { id: "delay", label: "Tape Delay", icon: "🎚️", active: false },
  { id: "chorus", label: "Chorus Ensemble", icon: "✨", active: false },
  { id: "comp", label: "Bus Compressor", icon: "🧱", active: true },
  { id: "eq", label: "Parametric EQ", icon: "📈", active: true },
  { id: "scope", label: "Oscilloscope", icon: "📺", active: false },
  { id: "tape", label: "Tape Saturation", icon: "🎞️", active: false },
];

const GRUPOS = [
  { label: "efeitos", ids: ["reverb", "delay", "chorus", "tape"] },
  { label: "medição", ids: ["comp", "eq", "scope"] },
];

export default function VintageCommandPaletteDemo() {
  const [itens, setItens] = React.useState(ITENS);
  const [aberta, setAberta] = React.useState(true);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      {/* O painel é o pai posicionado que a paleta embutida exige. */}
      <div
        className="relative h-[300px] w-[420px] overflow-hidden rounded-xl border border-[var(--vintage-border)]"
        style={{
          background:
            "linear-gradient(160deg, var(--vintage-surface-2), var(--vintage-surface-1))",
        }}
      >
        <div className="flex h-full flex-col justify-between p-4">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{
              color: "var(--vintage-text-muted)",
              fontFamily: "var(--font-vintage-mono, monospace)",
            }}
          >
            bancada
          </span>

          <button
            type="button"
            onClick={() => setAberta(true)}
            className="self-start rounded border border-[var(--vintage-border)] px-2 py-1 text-[11px] font-bold"
            style={{
              fontFamily: "var(--font-vintage-mono, monospace)",
              color: "var(--vintage-label)",
              background: "var(--vintage-surface-3)",
            }}
          >
            ⌘K
          </button>
        </div>

        {aberta && (
          <VintageCommandPalette
            inline
            items={itens}
            groups={GRUPOS}
            placeholder="buscar módulo…"
            onSelect={(id) =>
              setItens((p) =>
                p.map((it) => (it.id === id ? { ...it, active: !it.active } : it))
              )
            }
            onClose={() => setAberta(false)}
          />
        )}
      </div>
    </div>
  );
}
