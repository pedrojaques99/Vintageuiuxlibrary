"use client";

/**
 * A pilha num canto de app, com o botão que a alimenta.
 *
 * Ela já começa com três avisos para o leque ter o que abrir: passar o
 * ponteiro sobre a pilha é o gesto que a peça vende. "Publicar" mostra a
 * segunda metade, o toast que nasce como "Publicando" e vira "Publicado" no
 * lugar. Quando a fila esvazia, a demo repõe os três, para o ladrilho nunca
 * ficar mudo.
 */

import * as React from "react";
import { Send } from "lucide-react";

import { ToastStack, ToastStackProvider, useToastStack } from "../../../registry/visant/ui/toast-stack";
import type { DemoProps } from "../catalog";

function Painel() {
  const { toast, update, count } = useToastStack();

  const semear = React.useCallback(() => {
    toast({ type: "info", title: "Marina comentou no rascunho", description: "Ajustar o título da dobra." });
    toast({ type: "warning", title: "Cartão vence semana que vem" });
    toast({
      type: "success",
      title: "Arquivo enviado",
      description: "manual-de-marca.pdf",
      action: { label: "Desfazer", onClick: () => undefined },
    });
  }, [toast]);

  React.useEffect(() => {
    if (count > 0) return;
    const id = window.setTimeout(semear, 400);
    return () => window.clearTimeout(id);
  }, [count, semear]);

  const publicar = () => {
    const id = toast({ type: "loading", title: "Publicando a página" });
    window.setTimeout(
      () => update(id, { type: "success", title: "Página no ar", action: { label: "Ver", onClick: () => undefined } }),
      1400,
    );
  };

  return (
    <button
      type="button"
      onClick={publicar}
      className="absolute left-6 top-6 inline-flex h-10 items-center gap-2 rounded-[var(--r-control)] border border-[var(--brand)] bg-[var(--brand)] px-4 text-sm font-medium text-[var(--brand-foreground)] outline-none focus-visible:[box-shadow:var(--focus)]"
    >
      <Send className="size-4" aria-hidden="true" />
      Publicar
    </button>
  );
}

export default function ToastStackDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-[340px] w-[520px] max-w-full overflow-hidden rounded-[var(--r-surface)] border border-border bg-background">
        <ToastStackProvider duration={6000}>
          <Painel />
          {/* `contained` depois dos knobs: solta na janela, a pilha fugiria do palco. */}
          <ToastStack {...props} contained />
        </ToastStackProvider>
      </div>
    </div>
  );
}
