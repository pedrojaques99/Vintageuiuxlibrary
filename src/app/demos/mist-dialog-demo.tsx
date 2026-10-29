"use client";

/**
 * Um botão que abre o modal — porque é assim que ele existe numa página.
 *
 * Os ganchos `onOpen`/`onClose` não pausam scroll suave aqui (a vitrine não
 * roda Lenis); o `onClose` conta os fechamentos, pra mostrar que ele dispara
 * também no Esc e no clique fora — que é a garantia que importa para quem vai
 * pendurar `lenis.stop()` / `lenis.start()` neles.
 *
 * O report pediu opções de transição: viraram a prop `variant` da peça
 * (`mist`, `rise`, `zoom`, `wipe`). O seletor miúdo embaixo do card troca qual
 * delas o próximo clique abre. Trocar não abre o modal sozinho: modal que
 * aparece sem a pessoa pedir rouba o foco da página inteira.
 */

import * as React from "react";
import { ArrowRight } from "lucide-react";

import { MistDialog, type MistDialogVariant } from "../../../registry/visant/ui/mist-dialog";
import { Media } from "../media";
import type { DemoProps } from "../catalog";
import { Trocador, useUmPorVez } from "./um-por-vez";

const VARIANTES: readonly MistDialogVariant[] = ["mist", "rise", "zoom", "wipe"];

export default function MistDialogDemo({ props }: DemoProps) {
  const [open, setOpen] = React.useState(false);
  const titulo = React.useId();
  const { variant: _v } = (props ?? {}) as { variant?: MistDialogVariant };
  const { atual, passo } = useUmPorVez(VARIANTES, _v);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      {/* O gatilho é a peça de onde o modal nasce de verdade: o card de produto.
          Um botão solto no palco não mostrava o caso de uso. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group grid w-[min(420px,90%)] grid-cols-[96px_1fr] items-center gap-4 rounded-[var(--r-surface,0.875rem)] border border-border bg-card p-3 text-left outline-none transition-colors [transition-duration:var(--dur-slow,300ms)] hover:border-foreground/30 focus-visible:[box-shadow:var(--focus)]"
      >
        <span className="overflow-hidden rounded-[var(--r-control,0.5rem)]">
          <Media papel="cena" indice={3} ratio="4/5" />
        </span>
        <span className="flex flex-col gap-2">
          <span className="text-[1.15rem] font-medium leading-tight tracking-[-0.02em]">Sai da névoa, volta pra ela.</span>
          <span className="inline-flex items-center gap-1.5 font-mono text-apoio uppercase tracking-[0.08em] text-muted-foreground transition-colors group-hover:text-foreground">
            ver produto
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
        </span>
      </button>

      <Trocador nome={atual} onPasso={passo} onRepetir={() => setOpen(true)} />

      <MistDialog
        variant={atual}
        open={open}
        onOpenChange={setOpen}
        labelledBy={titulo}
        className="w-[min(720px,calc(100vw-32px))]"
      >
        <div className="grid sm:grid-cols-[1fr_1.1fr]">
          <Media papel="cena" indice={3} ratio="4/5" />
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 id={titulo} className="text-[1.75rem] font-medium leading-[1.1] tracking-[-0.03em]">
                Sai da névoa, volta pra ela.
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full border border-current px-3 py-1.5 text-rotulo uppercase tracking-[0.08em]"
              >
                fechar
              </button>
            </div>
            <p className="text-muted-foreground">
              Esc fecha pelo navegador. Clique fora fecha também — mas arrastar uma
              seleção daqui pra fora, não.
            </p>
          </div>
        </div>
      </MistDialog>
    </div>
  );
}
