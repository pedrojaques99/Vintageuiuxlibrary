"use client";

/**
 * A barra embaixo de uma nota de versão, com três reações já na mesa.
 *
 * "Curti" começa marcada como sua, pra que o primeiro clique mostre a outra
 * metade da peça: a contagem rolando pra baixo. As outras rolam pra cima. O
 * botão do fim abre a bandeja com as seis opções.
 */

import * as React from "react";
import { Eye, Flame, Heart, Lightbulb, PartyPopper, ThumbsUp } from "lucide-react";

import { Reactions, type ReactionOption } from "../../../registry/visant/ui/reactions";
import type { DemoProps } from "../catalog";

const OPCOES: ReactionOption[] = [
  { id: "curti", label: "Curti", icon: ThumbsUp },
  { id: "amei", label: "Amei", icon: Heart },
  { id: "comemorar", label: "Comemorar", icon: PartyPopper },
  { id: "ideia", label: "Boa ideia", icon: Lightbulb },
  { id: "fogo", label: "Mandou bem", icon: Flame },
  { id: "vendo", label: "Tô de olho", icon: Eye },
];

export default function ReactionsDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-[300px] max-w-full flex-col gap-3 rounded-[var(--r-surface)] border border-border bg-card p-4">
        <div className="flex flex-col gap-1">
          <p className="text-corpo font-medium text-foreground">Versão 2.4 no ar</p>
          <p className="text-apoio text-muted-foreground">Exportar em PDF agora sai com a fonte da marca.</p>
        </div>
        <Reactions
          label="Reações à versão 2.4"
          options={OPCOES}
          defaultValue={[
            { id: "curti", count: 12, reacted: true },
            { id: "comemorar", count: 9, reacted: false },
            { id: "ideia", count: 3, reacted: false },
          ]}
          {...props}
        />
      </div>
    </div>
  );
}
