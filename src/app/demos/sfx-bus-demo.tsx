"use client";

/**
 * A paleta do `sfx-bus` pra ouvir uma por uma.
 *
 * Cada botão pede o timbre por `data-sfx`, do mesmo jeito que um app pediria:
 * a demo não chama o bus no clique, quem toca é a fiação da casa. Se o som
 * estiver desligado, nada soa aqui também, e é de propósito: a demo obedece a
 * mesma escolha que o resto da página.
 *
 * O trilho embaixo é o gesto contínuo. Arrastar chama `playSfx("detent")` a
 * cada passo, e o portão de 30 ms segura o giro rápido sem perder o ritmo.
 */

import * as React from "react";

import { SfxToggle } from "../../../registry/visant/ui/sfx-toggle";
import { playSfx, useSfxEnabled, type SfxTimbre } from "../../lib/sfx-bus";

const PALETA: { timbre: SfxTimbre; nome: string; objeto: string }[] = [
  { timbre: "click", nome: "click", objeto: "botão de câmera" },
  { timbre: "detent", nome: "detent", objeto: "dente de knob" },
  { timbre: "toggle", nome: "toggle", objeto: "alavanca" },
  { timbre: "drop", nome: "drop", objeto: "agulha pousando" },
];

const BOTAO =
  "flex min-w-[7.5rem] flex-col items-start gap-0.5 rounded-[var(--r-control)] border border-border bg-card px-3 py-2 text-left text-foreground [transition:background-color_var(--dur-fast)_var(--ease-out)] hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]";

export default function SfxBusDemo() {
  const ligado = useSfxEnabled();
  const [passo, setPasso] = React.useState(5);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-4">
      <div className="grid grid-cols-2 gap-2">
        {PALETA.map((p) => (
          <button key={p.timbre} type="button" data-sfx={p.timbre} className={BOTAO}>
            <span className="text-apoio font-medium">{p.nome}</span>
            <span className="text-rotulo text-muted-foreground">{p.objeto}</span>
          </button>
        ))}
      </div>

      <label className="flex w-full max-w-[16rem] flex-col gap-1.5">
        <span className="flex justify-between text-rotulo text-muted-foreground">
          <span>gire: um dente por passo</span>
          <span className="tabular-nums">{passo}</span>
        </span>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={passo}
          onChange={(e) => {
            setPasso(Number(e.target.value));
            playSfx("detent");
          }}
          className="w-full accent-foreground focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]"
        />
      </label>

      <div className="flex items-center gap-2 text-rotulo text-muted-foreground">
        <SfxToggle />
        <span>{ligado === false ? "som desligado" : "som ligado"}</span>
      </div>
    </div>
  );
}
