"use client";

/**
 * A contagem numa dobra de lançamento, com a versão compacta logo embaixo.
 *
 * Esperar dias pra ver o fim não serve de demo: "Pular pro fim" põe o alvo a
 * cinco segundos, e dá pra ver os dígitos virando "Ao vivo". "Recomeçar" volta
 * pros dois dias e pouco, e as rodas giram pelo caminho curto até lá.
 */

import * as React from "react";
import { RotateCcw, SkipForward } from "lucide-react";

import { Countdown } from "../../../registry/visant/ui/countdown";
import type { DemoProps } from "../catalog";

const DOIS_DIAS = (2 * 86_400 + 5 * 3_600 + 41 * 60 + 12) * 1000;

const botao =
  "inline-flex h-8 items-center gap-1.5 rounded-[var(--r-control)] border border-border bg-card px-3 text-apoio font-medium text-foreground [transition:background-color_var(--dur-fast)_var(--ease-out)] hover:bg-muted focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]";

export default function CountdownDemo({ props }: DemoProps) {
  const [alvo, setAlvo] = React.useState(() => Date.now() + DOIS_DIAS);
  const [perto, setPerto] = React.useState(false);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-[380px] max-w-full flex-col items-center gap-4">
        <p className="text-corpo text-muted-foreground">A coleção nova abre em</p>
        <Countdown className="w-full" target={alvo} label="A coleção nova abre em" {...props} />
        <div className="flex items-center gap-3">
          <Countdown variant="compact" target={alvo} units={["hours", "minutes", "seconds"]} label="Falta pra abrir" />
          {perto ? (
            <button type="button" className={botao} onClick={() => { setAlvo(Date.now() + DOIS_DIAS); setPerto(false); }}>
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Recomeçar
            </button>
          ) : (
            <button type="button" className={botao} onClick={() => { setAlvo(Date.now() + 5_000); setPerto(true); }}>
              <SkipForward className="size-3.5" aria-hidden="true" />
              Pular pro fim
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
