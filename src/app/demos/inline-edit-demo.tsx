"use client";

/**
 * O título de um projeto, que é onde edição no lugar faz sentido: ninguém abre
 * um formulário pra trocar um nome. O título vem grande (é a peça), o lápis e
 * o tracejado dizem que dá pra mexer, e salvar tem uma espera curta pra o giro
 * e o check aparecerem. Enter salva, Esc cancela; vazio volta ao nome antigo.
 */

import * as React from "react";

import { InlineEdit } from "../../../registry/visant/ui/inline-edit";
import type { DemoProps } from "../catalog";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TITULO = "text-2xl font-semibold tracking-tight";

export default function InlineEditDemo({ props }: DemoProps) {
  const [editando, setEditando] = React.useState(false);
  const [nome, setNome] = React.useState("Lançamento de inverno");
  const [rascunho, setRascunho] = React.useState(nome);
  const [editadoAgora, setEditadoAgora] = React.useState(false);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-[360px] max-w-full flex-col gap-1 text-foreground">
        <p className="px-1.5 text-sm text-muted-foreground">Projetos</p>
        <InlineEdit
          className="max-w-full self-start [--ie-h:2.75rem]"
          showButtons
          {...props}
          isEditing={editando}
          value={<span className={TITULO}>{nome}</span>}
          onStartEdit={() => {
            setRascunho(nome);
            setEditando(true);
          }}
          onSave={async () => {
            await espera(600);
            const limpo = rascunho.trim();
            if (limpo) setNome(limpo);
            setEditadoAgora(true);
            setEditando(false);
          }}
          onCancel={() => setEditando(false)}
        >
          <input
            autoFocus
            aria-label="Nome do projeto"
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            className={`h-[2.75rem] w-full rounded-[var(--r-control,0.5rem)] border border-border bg-background px-1.5 outline-none focus-visible:[box-shadow:var(--focus)] ${TITULO}`}
          />
        </InlineEdit>
        <p className="px-1.5 text-sm text-muted-foreground">
          12 arquivos, {editadoAgora ? "editado agora" : "editado ontem"}
        </p>
      </div>
    </div>
  );
}
