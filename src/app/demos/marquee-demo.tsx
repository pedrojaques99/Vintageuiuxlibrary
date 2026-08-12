"use client";

/**
 * A demo do marquee mora sozinha porque ela é cara.
 *
 * O motor é GSAP + ScrollTrigger — biblioteca inteira no bundle para servir UM
 * card, que ainda por cima fica no meio da lista. Aqui o pedaço só é buscado
 * quando o card entra na tela. Mesmo trato que o board do kanban recebeu.
 */

import * as React from "react";
import { Marquee } from "../../../registry/visant/ui/marquee";

/**
 * Uma faixa por vez, e as setas trocam de modo.
 *
 * ── Por que as três empilhadas estavam erradas ─────────────────────────────
 *
 * A versão anterior montava os três marquees de uma vez, um embaixo do outro,
 * num palco de 640×300. A ideia era boa — "a diferença entre eles não cabe numa
 * descrição, veja as três reagirem ao mesmo gesto" — e o resultado era o oposto:
 *
 * · **Nenhuma ficava em tamanho de faixa.** Três faixas mais três rótulos em
 *   300px de altura dão ~60px por faixa. Faixa de 60px não é faixa, é uma linha
 *   de texto que se mexe, e o que a peça vende — o corte nas pontas, a marca
 *   passando, a inclinação — some junto.
 * · **Comparar três coisas em movimento ao mesmo tempo ninguém faz.** O olho vai
 *   pra uma. As outras duas viram ruído animado atrás da que está sendo lida.
 * · **Custava três motores.** Três timelines GSAP e três ScrollTriggers vivos,
 *   simultâneos, num card de catálogo — pra mostrar uma peça de cada vez.
 * · **A melhor chegava por último.** A "solta" — que é a peça no ponto em que
 *   ela é vendida, torta, rápida e com a marca no meio — era a terceira, a mais
 *   embaixo, e a mais provável de estar fora da tela.
 *
 * Agora é uma faixa por vez, em largura inteira, com as setas trocando o modo.
 * O que se perde é a comparação simultânea; o que se ganha é poder ver cada uma.
 * E a comparação sobrevive melhor assim: trocar de modo COM a página parada e
 * depois rolar é o gesto que mostra a diferença, porque a diferença está toda em
 * como cada uma responde ao scroll — e pra isso só se pode olhar uma.
 *
 * A "solta" é a inicial porque é ela que o report pediu e é ela que responde
 * "por que eu instalaria isto" em um segundo.
 */

interface Modo {
  chave: string;
  nota: string;
  faixa: (itens: React.ReactNode[], marca: React.ReactNode) => React.ReactNode;
}

/* `bleed={12}` em todos: o palco tem respiro lateral e faixa que para antes da
   borda denuncia a caixa. Este é o `full width` do report, e agora ele é uma
   prop da peça em vez de margem negativa escrita à mão por quem consome. */
const SANGRIA = 12;

const MODOS: Modo[] = [
  {
    chave: "solta",
    nota: "rápida, torta e com a marca no meio",
    faixa: (itens, marca) => (
      <Marquee
        band
        speed={16}
        boost={6}
        tilt={-2.5}
        gap={40}
        bleed={SANGRIA}
        items={itens.map((it, i) => (
          <span key={i} className="flex items-center gap-4">
            {it}
            {marca}
          </span>
        ))}
      />
    ),
  },
  {
    chave: "boost",
    nota: "anda sozinha, e o scroll empurra e inverte o sentido",
    faixa: (itens) => <Marquee band speed={40} bleed={SANGRIA} items={itens} />,
  },
  {
    chave: "drive",
    nota: "só anda com o scroll, sempre pro mesmo lado",
    faixa: (itens) => (
      <Marquee
        scroll="drive"
        laps={0.9}
        speed={40}
        bleed={SANGRIA}
        className="border-y border-border py-4"
        items={itens}
      />
    ),
  },
  {
    chave: "scrub",
    nota: "a posição É o scroll: rolar de volta traz a faixa de volta",
    faixa: (itens) => (
      <Marquee
        scroll="scrub"
        speed={40}
        fade
        bleed={SANGRIA}
        className="py-4"
        items={itens}
      />
    ),
  },
];

function Seta({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Modo anterior" : "Próximo modo"}
      className="alvo-toque inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--r-control,0.5rem)] border border-border text-muted-foreground outline-none transition-[color,border-color,transform] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--brand)] hover:text-foreground focus-visible:border-[var(--brand)] focus-visible:text-foreground active:scale-[0.94] active:[transition-duration:var(--dur-press)] motion-reduce:active:scale-100"
    >
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}

export default function MarqueeDemo() {
  const palavras = ["FRETE GRÁTIS", "NOVA COLEÇÃO", "ESTOQUE REAL", "TROCA EM 30 DIAS"];
  const [i, setI] = React.useState(0);
  const modo = MODOS[i];

  const itens = React.useMemo(
    () =>
      palavras.map((t) => (
        <span key={t} className="font-mono text-rotulo tracking-[0.14em]">
          {t}
        </span>
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* A marca no meio da faixa doidona: um asterisco desenhado, não uma fonte —
     glifo de fonte muda de peso a cada família e a faixa perde o ritmo. */
  const marca = (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" aria-hidden fill="currentColor">
      <path d="M12 1.5 13.9 9l6.6-3.8-3.8 6.6 7.3 1.9-7.3 1.9 3.8 6.6L13.9 18 12 25.5 10.1 18l-6.6 3.8 3.8-6.6L0 13.3l7.3-1.9L3.5 4.8 10.1 9z" />
    </svg>
  );

  const anda = (d: 1 | -1) => setI((v) => (v + d + MODOS.length) % MODOS.length);

  return (
    <div className="flex h-full w-full flex-col justify-center gap-4 overflow-hidden px-3">
      {/*
       * A barra fica FORA da faixa e acima dela. Dentro, o rótulo viraria
       * conteúdo da esteira e andaria junto — foi assim na versão anterior e é
       * por isso que o rótulo já morava fora lá também.
       */}
      <div className="flex items-center gap-3">
        <Seta dir="prev" onClick={() => anda(-1)} />
        <Seta dir="next" onClick={() => anda(1)} />
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-rotulo uppercase tracking-[0.14em] text-foreground">
            {modo.chave}
          </span>
          <span className="truncate font-mono text-micro text-muted-foreground">
            {modo.nota}
          </span>
        </div>
        {/* O qualificador: onde a pessoa está na lista de modos. Sem ele as
            setas não dizem quantas opções existem nem se dão a volta. */}
        <span className="ml-auto shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
          {i + 1}/{MODOS.length}
        </span>
      </div>

      {/*
       * `key` no modo: cada troca REMONTA a faixa.
       *
       * Sem isto o GSAP reaproveitaria o contexto entre dois modos que montam
       * timelines diferentes (o `scrub` cria um tween com ScrollTrigger, o
       * `drive` cria um `quickTo` no playhead), e o efeito seria o clássico:
       * a faixa continua andando, surda, com dois motores discutindo o mesmo
       * `x`. Remontar é barato e é a única forma honesta de trocar de motor.
       */}
      {/*
       * A faixa mora numa fileira própria, com folga vertical e corte.
       *
       * `tilt` gira a caixa inteira, e a subida nas pontas cresce com a largura:
       * a 1500px, 2,5° levantam ~33px de cada lado. Sem folga a ponta de cima
       * subia por cima da barra de controle e comia o contador "1/4" — visto na
       * tela, não deduzido. A folga dá espaço pra inclinação e o corte garante
       * que ela nunca alcance a barra, em qualquer largura.
       */}
      <div key={modo.chave} className="min-w-0 overflow-hidden py-10">
        {modo.faixa(itens, marca)}
      </div>
    </div>
  );
}
