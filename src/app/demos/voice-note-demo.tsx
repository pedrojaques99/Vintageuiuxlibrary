"use client";

/**
 * A nota de voz numa conversa de atendimento, com a mensagem de texto que a
 * acompanha. Apagar troca a nota por um aviso que a traz de volta.
 */

import * as React from "react";

import { VoiceNote } from "../../../registry/visant/ui/voice-note";
import type { DemoProps } from "../catalog";

export default function VoiceNoteDemo({ props }: DemoProps) {
  const [apagada, setApagada] = React.useState(false);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-[320px] max-w-full flex-col gap-2 text-foreground">
        <p className="self-start rounded-[var(--r-surface)] bg-muted px-3 py-2 text-sm">
          Consegue me explicar a entrega?
        </p>
        <div className="self-end">
          {apagada ? (
            <button
              type="button"
              onClick={() => setApagada(false)}
              className="h-12 rounded-[var(--r-pill)] border border-dashed border-border px-4 text-sm text-muted-foreground outline-none [font:inherit] hover:bg-muted focus-visible:[box-shadow:var(--focus)]"
            >
              Nota apagada. Trazer de volta
            </button>
          ) : (
            <VoiceNote duration={9} {...props} onDelete={() => setApagada(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
