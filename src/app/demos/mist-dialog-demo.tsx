"use client";

/**
 * Um botão que abre o modal — porque é assim que ele existe numa página.
 *
 * Os ganchos `onOpen`/`onClose` não pausam scroll suave aqui (a vitrine não
 * roda Lenis); o `onClose` conta os fechamentos, pra mostrar que ele dispara
 * também no Esc e no clique fora — que é a garantia que importa para quem vai
 * pendurar `lenis.stop()` / `lenis.start()` neles.
 */

import * as React from "react";

import { Chip } from "../../../registry/visant/ui/chip";
import { MistDialog } from "../../../registry/visant/ui/mist-dialog";
import { Media } from "../media";
import type { DemoProps } from "../catalog";

export default function MistDialogDemo(_: DemoProps) {
  const [open, setOpen] = React.useState(false);
  const [fechou, setFechou] = React.useState(0);
  const titulo = React.useId();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <Chip mark={false} onClick={() => setOpen(true)} className="alvo-toque">
        abrir vitrine
      </Chip>
      <p className="font-mono text-micro text-muted-foreground">fechou {fechou}×</p>

      <MistDialog
        open={open}
        onOpenChange={setOpen}
        onClose={() => setFechou((n) => n + 1)}
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
