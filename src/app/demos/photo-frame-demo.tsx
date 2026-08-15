"use client";

/**
 * A moldura revela UMA vez — e é por isso que a demo precisa de um relógio.
 *
 * ── O que o report acusou ──────────────────────────────────────────────────
 *
 * "sempre em loop — com timer". A revelação acontecia na montagem, durava 1,4s
 * e acabava; daí em diante o card era três fotos paradas com um botão "revelar
 * de novo" que ninguém clica. Quem passa o olho na vitrine depois desse segundo
 * e meio nunca vê a peça funcionando.
 *
 * ── Por que o loop mora aqui e não no componente ───────────────────────────
 *
 * Revelar em loop seria ERRADO no `@visant/photo-frame`: numa página de verdade
 * a foto se revela quando a pessoa chega nela, e uma moldura que reabre a cada
 * quatro segundos é um piscar no meio do texto. O contrato "uma vez, na
 * rolagem" é o produto da peça, não um limite dela.
 *
 * O que a VITRINE precisa é outra coisa: rever o gesto. Rever, em React, é
 * remontar — a `key` muda, o componente nasce de novo, o `ScrollTrigger` é
 * recriado e arma imediatamente porque o palco já está em tela. É o mesmo
 * recurso que o botão usava; só trocamos o dedo por um relógio.
 *
 * ── O temporizador ─────────────────────────────────────────────────────────
 *
 * O anel não é enfeite: sem ele, uma revelação que reaparece sozinha a cada
 * quatro segundos parece defeito de renderização. O anel diz que existe um
 * ciclo e onde ele está — e é `transition` em `stroke-dashoffset`, não
 * `setInterval` desenhando quadro a quadro, porque o relógio do navegador é
 * mais preciso que o nosso e não custa render nenhum do React.
 *
 * As duas paradas da casa valem: fora da tela o relógio não roda
 * (`useStageActive`), e sob `prefers-reduced-motion` não há loop nem anel — as
 * fotos estão lá, inteiras, e repetir uma revelação que não acontece seria só
 * remontar três componentes a cada quatro segundos.
 */

import * as React from "react";

import { Media } from "../media";
import { PhotoFrame } from "../../../registry/visant/ui/photo-frame";
import { useStageActive } from "../stage";

/** Duração do ciclo. A revelação leva 1,4s; o resto é tempo de olhar. */
const CICLO = 4200;

const usaMovimento = () =>
  typeof window === "undefined" ||
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const R = 8;
const VOLTA = 2 * Math.PI * R;

/** O anel do ciclo. Remontado a cada rodada; a `key` é quem reinicia o traço. */
function Temporizador({ ms }: { ms: number }) {
  const [correndo, setCorrendo] = React.useState(false);
  // Um quadro parado antes de soltar: `transition` só existe entre dois valores
  // já pintados. Trocar no mesmo quadro da montagem não anima nada.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setCorrendo(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 -rotate-90" aria-hidden fill="none">
      <circle cx="10" cy="10" r={R} stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <circle
        cx="10"
        cy="10"
        r={R}
        stroke="var(--brand)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={VOLTA}
        style={{
          strokeDashoffset: correndo ? 0 : VOLTA,
          transition: `stroke-dashoffset ${ms}ms linear`,
        }}
      />
    </svg>
  );
}

export default function PhotoFrameDemo() {
  const ativo = useStageActive();
  const [rodada, setRodada] = React.useState(0);
  const [anima] = React.useState(usaMovimento);

  React.useEffect(() => {
    if (!ativo || !anima) return;
    const id = window.setInterval(() => setRodada((n) => n + 1), CICLO);
    return () => window.clearInterval(id);
  }, [ativo, anima]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      {/* `flex-wrap` + largura em porcentagem: três molduras de largura fixa
          somavam mais que a tela de 360 e a PÁGINA rolava de lado, que é o
          defeito que a suíte de responsivo trava. Assim elas dobram de linha
          em vez de empurrar. */}
      <div className="flex max-w-full flex-wrap items-start justify-center gap-4" key={rodada}>
        <PhotoFrame ratio="4/5" className="w-[min(190px,30vw)]" caption="sem paralaxe">
          <Media papel="cena" indice={1} className="size-full" />
        </PhotoFrame>
        <PhotoFrame ratio="4/5" className="w-[min(190px,30vw)]" parallax={10} caption="paralaxe 10%">
          <Media papel="cena" indice={3} className="size-full" />
        </PhotoFrame>
        <PhotoFrame ratio="4/5" className="w-[min(190px,30vw)]" from="left" caption="abre da esquerda">
          <Media papel="retrato" indice={2} className="size-full" />
        </PhotoFrame>
      </div>

      {anima ? (
        <span className="text-muted-foreground">
          <Temporizador key={rodada} ms={CICLO} />
        </span>
      ) : null}
    </div>
  );
}
