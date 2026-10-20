"use client";

/**
 * Só o gatilho: segurar ou clicar abre o arco, e o nome da ação aparece só
 * quando ela está na mira. Nada em volta pra explicar o botão.
 */

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
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <OrbitMenu actions={ACOES} label="Ações da nota" {...props} />
    </div>
  );
}
