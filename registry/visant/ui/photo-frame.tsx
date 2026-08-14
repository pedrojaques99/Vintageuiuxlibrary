"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";

/**
 * Photo Frame — a moldura que revela a foto em vez de mostrá-la já pronta.
 *
 * Três movimentos que só valem juntos, e é a soma que faz a foto parecer
 * fotografada em vez de colada:
 *
 *   1. a moldura ABRE (`clip-path`, de baixo pra cima);
 *   2. a foto ASSENTA (de `scale(1.12)` para 1, mais devagar que a abertura);
 *   3. opcionalmente ela DERIVA na rolagem (paralaxe curta, presa à passagem).
 *
 * O passo 2 é o que quase todo mundo esquece, e é o mais importante: com a foto
 * parada, abrir a máscara parece uma cortina de teatro. Com ela assentando um
 * pouco mais devagar que a cortina, o olho lê profundidade — a foto continua se
 * acomodando depois que a moldura já parou.
 *
 * ── Sobre `ease-in-out`, que é o que se pede e quase nunca é o certo ───────
 *
 * Aqui a curva é `power3.out`, não `inOut`. A regra da casa: **entrada e saída
 * usam `out`; `in-out` é para o que se MOVE na tela já estando presente.** Uma
 * foto sendo revelada está chegando — ela tem que responder na hora e desacelerar
 * no fim. Com `inOut` ela começa devagar, e esse arranque preguiçoso é
 * exatamente a sensação de site pesado. O `in-out` correto está no
 * `@visant/photo-flip`, onde a foto atravessa a tela de um lugar conhecido para
 * outro — ali as duas pontas são conhecidas, e frear nas duas é o que faz o
 * objeto parecer sólido.
 *
 * ── As armadilhas ──────────────────────────────────────────────────────────
 *
 * 1. **A mídia entra por SLOT.** `<img>`, `next/image`, `<video>` — a moldura
 *    não escolhe por você e não faz `fetch`. Mesma regra do
 *    `@visant/showcase-card`. O que ela exige é que a mídia preencha a caixa,
 *    e o CSS cuida disso — em DOIS níveis, de propósito: o filho direto ganha
 *    tamanho, e o `img`/`video` em qualquer profundidade ganha o `object-fit`.
 *    Só o filho direto não basta: `next/image` e `<picture>` embrulham a
 *    imagem, e a regra de recorte caía no invólucro sem efeito nenhum — a foto
 *    ficava esticada e ninguém sabia por quê.
 * 2. **A caixa tem proporção declarada, sempre.** Sem `aspect-ratio` a página
 *    salta quando a imagem carrega, e aí o `ScrollTrigger` já calculou as
 *    posições erradas. O salto de layout não é só feio: ele quebra o gatilho.
 * 3. **Paralaxe pede foto MAIOR que a moldura.** Deslocar uma imagem de 100% da
 *    altura abre uma faixa vazia na borda. Por isso `parallax` também escala a
 *    mídia — e é por isso que o valor é pequeno (8%, não 30%): paralaxe forte
 *    denuncia o efeito, fraca só dá profundidade. Lição herdada do
 *    `@visant/motion-layer`.
 * 4. **O esconderijo é aplicado por JS.** Se o `clip-path` fechado viesse do
 *    CSS, um bloqueio de script deixaria a foto invisível para sempre. A
 *    moldura nasce aberta e fecha no mesmo quadro em que o gatilho é criado.
 * 5. **`will-change` não fica pra sempre.** Ele é ligado no `onStart` e
 *    desligado no fim: uma galeria de 30 fotos com camada de composição
 *    permanente é memória de vídeo torrada por uma animação que já acabou.
 * 6. **Sob `prefers-reduced-motion` não há máscara nem deriva.** A foto está
 *    lá, inteira, desde o primeiro quadro — o desfecho nunca é o que se corta.
 */

gsap.registerPlugin(ScrollTrigger);

export interface PhotoFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A mídia. `<img>`, `next/image`, `<video>` — o que o projeto usar. */
  children: React.ReactNode;
  /** Proporção da moldura, formato CSS: `"4/5"`, `"16/9"`, `"1"`. */
  ratio?: string;
  /** Legenda. Entra como `<figcaption>` e transforma a peça em `<figure>`. */
  caption?: React.ReactNode;
  /** Deriva na rolagem, em % da altura. 0 desliga. Acima de ~12 denuncia. */
  parallax?: number;
  /** De onde a moldura abre. */
  from?: "bottom" | "top" | "left" | "right";
  /** Onde o gatilho arma. */
  start?: string;
}

const CLIP_FECHADO: Record<NonNullable<PhotoFrameProps["from"]>, string> = {
  bottom: "inset(100% 0% 0% 0%)",
  top: "inset(0% 0% 100% 0%)",
  left: "inset(0% 100% 0% 0%)",
  right: "inset(0% 0% 0% 100%)",
};

export function PhotoFrame({
  children,
  ratio = "4/5",
  caption,
  parallax = 0,
  from = "bottom",
  start = "top 85%",
  className,
  style,
  ...props
}: PhotoFrameProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const janela = raiz.querySelector<HTMLElement>(".photo-frame-window");
    const media = raiz.querySelector<HTMLElement>(".photo-frame-media");
    if (!janela || !media) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: raiz, start, once: true },
        onStart: () => {
          janela.style.willChange = "clip-path";
          media.style.willChange = "transform";
        },
        onComplete: () => {
          janela.style.willChange = "";
          // O `will-change` da mídia só sai se ela não seguir derivando — com
          // paralaxe ativa a camada continua sendo útil o resto da rolagem.
          if (!parallax) media.style.willChange = "";
        },
      });

      tl.fromTo(
        janela,
        { clipPath: CLIP_FECHADO[from] },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power3.out" },
      ).fromTo(
        media,
        { scale: 1.12 },
        // Mais longa que a abertura, e começando junto (`<`): é o atraso entre
        // as duas que produz a profundidade. Iguais, viram um efeito só.
        { scale: parallax ? 1 + parallax / 100 : 1, duration: 1.4, ease: "power3.out" },
        "<",
      );

      if (parallax) {
        gsap.fromTo(
          media,
          { yPercent: -parallax / 2 },
          {
            yPercent: parallax / 2,
            // `none` é o certo em movimento amarrado ao dedo: qualquer curva
            // aqui faz a foto acelerar sem o scroll ter acelerado.
            ease: "none",
            scrollTrigger: { trigger: raiz, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      }
    }, raiz);

    return () => ctx.revert();
  }, [from, start, parallax]);

  const Raiz = caption ? "figure" : "div";

  return (
    <Raiz
      ref={ref as React.Ref<never>}
      className={cn("photo-frame", className)}
      style={{ "--ratio": ratio, ...style } as React.CSSProperties}
      {...props}
    >
      <div className="photo-frame-window">
        <div className="photo-frame-media">{children}</div>
      </div>
      {caption ? <figcaption className="photo-frame-caption">{caption}</figcaption> : null}
    </Raiz>
  );
}
