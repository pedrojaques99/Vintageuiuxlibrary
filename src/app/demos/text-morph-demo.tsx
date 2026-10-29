"use client";

/**
 * O lugar onde o morph ganha o pão: o botão de publicar.
 *
 * Um clique percorre os três estados de verdade ("Publicar", "Publicando",
 * "Publicado") e o botão encolhe e cresce junto com a palavra, sem salto. O
 * `aria-live` fica aqui na demo, do lado de fora da peça, porque é o
 * consumidor quem sabe que essa troca merece ser anunciada.
 *
 * O som de completo (`playSfx("complete")`, do `sfx-bus`) mora aqui pelo mesmo
 * motivo: a peça só troca palavra, não sabe qual troca é sucesso. Quem sabe é
 * o botão, então ele toca quando o rótulo chega em "Publicado". O bus já
 * respeita o liga e desliga de som da página e segura repetição.
 */

import * as React from "react";
import { Check, Send } from "lucide-react";

import { playSfx } from "@/lib/sfx-bus";
import { TextMorph } from "../../../registry/visant/ui/text-morph";
import type { DemoProps } from "../catalog";

type Estado = "pronto" | "enviando" | "feito";

const ROTULO: Record<Estado, string> = {
  pronto: "Publicar",
  enviando: "Publicando",
  feito: "Publicado",
};

export default function TextMorphDemo({ props }: DemoProps) {
  const [estado, setEstado] = React.useState<Estado>("pronto");

  React.useEffect(() => {
    if (estado === "feito") playSfx("complete");
  }, [estado]);

  React.useEffect(() => {
    if (estado === "pronto") return;
    const t = window.setTimeout(() => setEstado(estado === "enviando" ? "feito" : "pronto"), estado === "enviando" ? 1300 : 2200);
    return () => window.clearTimeout(t);
  }, [estado]);

  const Icone = estado === "feito" ? Check : Send;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <button
        type="button"
        aria-live="polite"
        onClick={() => estado === "pronto" && setEstado("enviando")}
        className="inline-flex h-11 items-center gap-2 rounded-[var(--r-control)] bg-[var(--brand)] px-5 text-destaque font-medium text-[var(--brand-foreground)] [box-shadow:var(--e-raised)] focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]"
      >
        <Icone className="size-4" aria-hidden="true" />
        <TextMorph {...props}>{ROTULO[estado]}</TextMorph>
      </button>
    </div>
  );
}
