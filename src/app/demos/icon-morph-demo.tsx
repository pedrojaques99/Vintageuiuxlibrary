"use client";

/**
 * Uma barra de ferramentas, que é onde ícone de dois estados mora. Cada botão
 * guarda o próprio estado e diz o estado pelo `aria-pressed`/rótulo, porque o
 * ícone é mudo de propósito. Os knobs (tamanho, traço) valem pros seis.
 */

import * as React from "react";

import { IconMorph, type IconMorphName } from "../../../registry/visant/ui/icon-morph";
import type { DemoProps } from "../catalog";

const BOTOES: { name: IconMorphName; rotulo: [string, string] }[] = [
  { name: "menu", rotulo: ["Abrir menu", "Fechar menu"] },
  { name: "play", rotulo: ["Tocar", "Pausar"] },
  { name: "copy", rotulo: ["Copiar link", "Link copiado"] },
  { name: "plus", rotulo: ["Adicionar", "Adicionado"] },
  { name: "theme", rotulo: ["Modo escuro", "Modo claro"] },
  { name: "chevron", rotulo: ["Mostrar mais", "Mostrar menos"] },
];

export default function IconMorphDemo({ props }: DemoProps) {
  const [ligado, setLigado] = React.useState<Record<string, boolean>>({});

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        role="toolbar"
        aria-label="Ações"
        className="flex items-center gap-1 rounded-[var(--r-surface)] border border-border bg-card p-1.5 text-foreground [box-shadow:var(--e-raised)]"
      >
        {BOTOES.map(({ name, rotulo }) => {
          const on = !!ligado[name];
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              aria-label={rotulo[on ? 1 : 0]}
              title={rotulo[on ? 1 : 0]}
              onClick={() => setLigado((s) => ({ ...s, [name]: !s[name] }))}
              className="grid size-11 place-items-center rounded-[var(--r-control)] text-foreground outline-none transition-colors [transition-duration:var(--dur-fast)] hover:bg-muted focus-visible:[box-shadow:var(--focus)] aria-pressed:bg-muted"
            >
              <IconMorph size={22} {...props} name={name} state={on} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
