"use client";

/**
 * A mesma abertura de dobra passando pelas quatro composições.
 *
 * Sem rótulo dizendo qual é qual: a troca acontece sozinha, num fade curto, e
 * quem quiser parar numa delas escolhe `layout` nos knobs (aí o ciclo para).
 * Parada sob `prefers-reduced-motion` e fora da tela.
 */

import * as React from "react";

import { useStageActive } from "../stage";
import { SectionIntro, type SectionIntroLayout } from "../../../registry/visant/ui/section-intro";
import type { DemoProps } from "../catalog";

const ORDEM: SectionIntroLayout[] = ["center", "split", "index", "editorial"];

export default function SectionIntroDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const fixo = (props as { layout?: SectionIntroLayout } | undefined)?.layout;
  const [i, setI] = React.useState(0);
  const [visivel, setVisivel] = React.useState(true);

  React.useEffect(() => {
    if (!ativo || fixo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let troca: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setVisivel(false);
      troca = setTimeout(() => {
        setI((v) => (v + 1) % ORDEM.length);
        setVisivel(true);
      }, 220);
    }, 4200);
    return () => {
      clearInterval(id);
      if (troca) clearTimeout(troca);
    };
  }, [ativo, fixo]);

  return (
    <div className="flex h-full w-full items-center px-10">
      <SectionIntro
        className="w-full transition-opacity [transition-duration:var(--dur-fast,200ms)] [transition-timing-function:var(--ease-out)] motion-reduce:transition-none"
        style={{ opacity: visivel ? 1 : 0 }}
        layout={fixo ?? ORDEM[i]}
        eyebrow="Serviços"
        index="02"
        title="Um time só. Todo serviço que a marca precisa."
        lead="Da estratégia de marca ao desenvolvimento, sem repassar o trabalho para fora no meio do caminho."
        {...props}
      />
    </div>
  );
}
