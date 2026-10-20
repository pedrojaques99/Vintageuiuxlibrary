"use client";

/**
 * A órbita sobre um objeto de verdade: a nota esmaece enquanto o arco está
 * aberto, e o que foi feito fica escrito nela depois.
 */

import * as React from "react";
import { Archive, Copy, Pin, Share2, Trash2 } from "lucide-react";

import { OrbitMenu, type OrbitAction } from "../../../registry/visant/ui/orbit-menu";
import type { DemoProps } from "../catalog";

const ACOES: OrbitAction[] = [
  { id: "fixar", label: "Fixar", feedback: "Fixada no topo", icon: <Pin aria-hidden="true" className="size-[18px]" /> },
  { id: "compartilhar", label: "Compartilhar", feedback: "Link copiado", icon: <Share2 aria-hidden="true" className="size-[18px]" /> },
  { id: "duplicar", label: "Duplicar", feedback: "Cópia criada", icon: <Copy aria-hidden="true" className="size-[18px]" /> },
  { id: "arquivar", label: "Arquivar", feedback: "Arquivada", icon: <Archive aria-hidden="true" className="size-[18px]" /> },
  { id: "excluir", label: "Excluir", feedback: "Foi pra lixeira", tone: "danger", icon: <Trash2 aria-hidden="true" className="size-[18px]" /> },
];

export default function OrbitMenuDemo({ props }: DemoProps) {
  const [aberto, setAberto] = React.useState(false);
  const [ultima, setUltima] = React.useState<string | null>(null);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-5">
        <article
          className="w-[300px] max-w-full rounded-[var(--r-surface)] border border-border bg-card p-5 [box-shadow:var(--e-raised)] transition-opacity duration-[var(--dur-base)] ease-[var(--ease-out)]"
          style={{ opacity: aberto ? 0.45 : 1 }}
        >
          <h3 className="text-base font-medium text-foreground">Briefing da Lumen</h3>
          <p className="mt-1 text-sm text-muted-foreground">Rever a paleta antes da reunião de quinta e mandar as duas rotas.</p>
          <p className="mt-4 text-xs text-muted-foreground">
            {ultima ? ACOES.find((a) => a.id === ultima)?.feedback : "Editada há 2 horas"}
          </p>
        </article>
        <OrbitMenu actions={ACOES} label="Ações da nota" onAction={setUltima} onOpenChange={setAberto} {...props} />
      </div>
    </div>
  );
}
