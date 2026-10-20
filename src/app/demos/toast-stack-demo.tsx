"use client";

/**
 * A pilha no centro do palco, com o botão que a alimenta quieto em cima.
 *
 * Antes a pilha ia pro canto de uma janela desenhada dentro do card, e o botão
 * de marca no canto oposto ganhava a briga pelo olho: janela dentro de card,
 * pilha espremida no canto, peça fora de foco. Agora o próprio palco é a tela,
 * a pilha fica embaixo e no meio (`bottom-center`), e o botão é contorno.
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
      className="absolute left-1/2 top-8 inline-flex h-9 -translate-x-1/2 items-center gap-2 rounded-[var(--r-control)] border border-border bg-card px-3.5 text-sm font-medium text-foreground outline-none transition-[background-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:bg-muted focus-visible:[box-shadow:var(--focus)]"
    >
      <Send className="size-4 text-muted-foreground" aria-hidden="true" />
      Publicar
    </button>
  );
}

export default function ToastStackDemo({ props }: DemoProps) {
  return (
    // Altura própria, e não `h-full`: aberta sozinha (`?solo=1`) a ficha não dá
    // altura ao palco, e com `h-full` a tela da pilha colapsava pra 32px.
    <div className="relative mx-auto h-[340px] w-[480px] max-w-full overflow-hidden">
      <ToastStackProvider duration={6000}>
        <Painel />
        {/* `contained` depois dos knobs: solta na janela, a pilha fugiria do palco. */}
        <ToastStack position="bottom-center" {...props} contained className="bottom-8" />
      </ToastStackProvider>
    </div>
  );
}
