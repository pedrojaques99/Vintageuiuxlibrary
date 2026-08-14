"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/**
 * Pinned Scene — a dobra que prende e avança em passos.
 *
 * O registry tinha `timeline` (progresso amarrado ao scroll, mas em fluxo
 * normal) e `rail` (trilho horizontal, dirigido pela mão). Faltava a peça que
 * segura a arte parada enquanto o texto passa — o gesto de "como funciona", de
 * tour de produto, de método em quatro etapas.
 *
 * ── A decisão que economiza o dia inteiro: o pin é `sticky`, não é GSAP ────
 *
 * `ScrollTrigger.pin` funciona, e cobra caro: ele injeta um wrapper no DOM,
 * troca o elemento pra `position: fixed` e reserva o espaço com um spacer
 * calculado. Isso quebra em três lugares que sempre aparecem em site de
 * cliente — dentro de container com `overflow` ou `transform`, com scroll
 * suave (Lenis) em cima, e em qualquer coisa que mude de altura depois do
 * `refresh()` (fonte da marca carregando, imagem sem `width`/`height`,
 * acordeão abrindo). `position: sticky` é o navegador fazendo o mesmo trabalho
 * sem tocar no DOM, e ele nunca precisa de `refresh`.
 *
 * Então aqui o ScrollTrigger faz só o que sticky não sabe fazer: **relatar
 * progresso**. Ele escreve `--p` (a cena inteira), `--sp` (o passo) e `--near`
 * (1 no meio do passo, 0 nas pontas) e não move nada. Quem move é o CSS.
 *
 * ── Por que a arte NÃO é uma pilha de camadas em cross-fade ───────────────
 *
 * A versão com todas as artes empilhadas em `absolute` e trocadas por opacidade
 * parece mais sofisticada e é pior: a arte deixa de ter posição no documento,
 * o leitor de tela recebe cinco imagens de uma vez, e cada passo precisa de
 * `inert` pra não virar armadilha de foco. Aqui cada passo é um `<article>` de
 * verdade com a arte DELE, grudada dentro da própria linha. A troca acontece
 * porque a linha acabou — é o navegador, não é animação. Resultado: sem JS,
 * sem `prefers-reduced-motion`, com `Ctrl+F` e com leitor de tela, a cena
 * continua sendo uma sequência legível de passos.
 *
 * ── O caminho sem movimento ───────────────────────────────────────────────
 *
 * Sob `prefers-reduced-motion` o GSAP nem inicializa. Os `var(--near, 1)` têm
 * default 1, então a arte fica em opacidade e escala plenas — o repouso correto,
 * não um estado quebrado. No mobile a grade vira uma coluna e o sticky continua
 * valendo, com a arte acima do texto do passo.
 *
 * ── Um limite que vale conhecer antes de descobrir na unha ────────────────
 *
 * O ScrollTrigger mede por `getBoundingClientRect`, e rect é geometria PINTADA:
 * qualquer ancestral com `transform: scale()` entrega medidas encolhidas
 * enquanto o `scrollTop` continua em pixel real. Os dois não conversam, e o
 * resultado é uma faixa de rolagem de tamanho zero — sem erro no console.
 * Aconteceu na própria vitrine da casa, cujo palco escala a demo pra caber no
 * card. Em página de cliente isso não existe; dentro de palco escalado, o `pin`
 * por `sticky` continua funcionando (é layout, não rect) e só o progresso
 * (`--p`, `--near`, a régua) fica parado. Por isso a régua sai da demo do
 * catálogo, e não porque a peça esteja quebrada.
 *
 * Requer `gsap` no projeto.
 */

export interface PinnedStep {
  id: string;
  /** Rótulo curto do passo. É o que a régua mostra — 1–2 palavras. */
  label?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  /** Slot da arte: `next/image`, vídeo, um `@visant/cover-art`, um canvas. */
  art?: React.ReactNode;
}

export interface PinnedSceneProps extends React.HTMLAttributes<HTMLElement> {
  steps: PinnedStep[];
  /** De que lado a arte gruda. `left` é o padrão de leitura ocidental. */
  side?: "left" | "right";
  /** Distância do topo em que a arte trava. Deixe espaço pro header fixo. */
  top?: string;
  /**
   * Altura de cada passo — é o que define o comprimento de rolagem da cena.
   * `100svh` é o padrão (e `svh`, não `vh`: no iOS o `vh` conta a barra de
   * endereço que já recolheu, e cada passo ganharia uns 70px de vão morto).
   * Baixar pra `70svh` deixa a cena mais rápida; abaixo disso a arte troca antes
   * de a pessoa terminar de ler.
   */
  stepHeight?: string;
  /** Régua de progresso com contagem. Some abaixo de `md`. */
  rail?: boolean;
  /**
   * Quem rola, quando não é a janela: um `overflow-y: auto` (documentação,
   * modal, painel). O `sticky` já funciona dentro de container sem ajuda; isto
   * existe só pra o ScrollTrigger medir o progresso no mesmo scroller, senão a
   * régua fica parada enquanto a cena anda.
   */
  scroller?: string | HTMLElement | null;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function PinnedScene({
  steps,
  side = "left",
  top = "12vh",
  stepHeight = "100svh",
  rail = true,
  scroller = null,
  className,
  style,
  ...props
}: PinnedSceneProps) {
  const rootRef = React.useRef<HTMLElement>(null);
  const [active, setActive] = React.useState(0);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // `setProperty` na unha, e não `gsap.quickSetter(root, "--p")`: o
      // quickSetter escreve em `el.style[prop]`, e propriedade customizada só
      // entra por `setProperty`. Ele não reclama — só não escreve nada, e a
      // régua fica parada com a cena andando.
      const setP = (v: string) => root.style.setProperty("--p", v);
      const common = scroller ? { scroller } : {};

      // A cena inteira: `--p` de 0 a 1 do topo do primeiro passo ao fim do
      // último. É o número que a régua consome, e o que o consumidor pode usar
      // pra girar, colorir ou contar qualquer coisa por fora da peça.
      const scene = ScrollTrigger.create({
        ...common,
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          setP(String(self.progress));
          // O passo ativo sai do MESMO número, e não de um gatilho por passo.
          // A primeira versão criava um ScrollTrigger `top center`/`bottom
          // center` por passo e lia `isActive`: na montagem os três se
          // anunciavam ativos na ordem, e a régua abria em "03 / 03" com a cena
          // parada no começo. Com `end: bottom bottom` o percurso vai de 0 no
          // primeiro passo a 1 no último, então arredondar é exato — e é uma
          // fonte de verdade só, que nunca discorda da barra.
          setActive(Math.round(self.progress * (steps.length - 1)));
        },
      });

      const perStep = gsap.utils.toArray<HTMLElement>("[data-pinned-step]", root).map((el) =>
        ScrollTrigger.create({
          ...common,
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            el.style.setProperty("--sp", String(self.progress));
            // Triângulo: 0 nas pontas, 1 no meio da travessia. Feito aqui e não
            // em CSS porque `abs()` ainda não é seguro em navegador de cliente.
            el.style.setProperty("--near", String(1 - Math.abs(self.progress * 2 - 1)));
          },
        }),
      );

      /*
       * O gatilho mede a cena no instante em que nasce, e nesse instante ela
       * quase nunca tem a altura final: a foto ainda não baixou, a fonte da
       * marca ainda não trocou pela real, o modal ainda está entrando. Medido
       * aqui: `start` e `end` saíam ambos 0 — faixa de rolagem zero — e nada
       * jamais atualizava, sem erro nenhum no console.
       *
       * O `ResizeObserver` no root resolve os três casos de uma vez, porque
       * todos terminam em "a altura mudou". O rAF junta a rajada de mudanças
       * numa medida só; sem ele, uma imagem por passo vira uma remedida por
       * passo, cada uma percorrendo todos os gatilhos da página.
       */
      let pending = 0;
      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(pending);
        pending = requestAnimationFrame(() => ScrollTrigger.refresh());
      });
      ro.observe(root);

      return () => {
        cancelAnimationFrame(pending);
        ro.disconnect();
        scene.kill();
        perStep.forEach((t) => t.kill());
      };
    });

    return () => mm.revert();
  }, [steps.length, scroller]);

  return (
    <section
      ref={rootRef}
      className={cn("pinned-scene relative", className)}
      style={
        { "--pinned-top": top, "--pinned-h": stepHeight, ...style } as React.CSSProperties
      }
      {...props}
    >
      {rail && (
        // `h-0` + `sticky`: a régua gruda sem ocupar altura nenhuma no fluxo —
        // um wrapper com altura empurraria o primeiro passo pra baixo em uma
        // tela inteira. O conteúdo dela transborda de propósito.
        <div
          aria-hidden="true"
          className="pointer-events-none sticky top-[var(--pinned-top)] z-10 hidden h-0 md:block"
        >
          <div
            className={cn(
              "absolute flex flex-col gap-3",
              side === "left" ? "right-0 items-end" : "left-0 items-start",
            )}
          >
            <span className="text-[length:var(--text-rotulo,0.6875rem)] tabular-nums tracking-[0.14em] text-muted-foreground">
              {String(active + 1).padStart(2, "0")}
              <span className="opacity-40"> / {String(steps.length).padStart(2, "0")}</span>
            </span>
            <span className="relative block h-24 w-px bg-border">
              {/* A barra é `scaleY` sobre `--p`: uma altura em % obrigaria
                  layout a cada frame, e isto aqui roda no compositor. */}
              <span
                className="absolute inset-0 block origin-top bg-[var(--brand,var(--foreground))]"
                style={{ transform: "scaleY(var(--p, 0))" }}
              />
            </span>
          </div>
        </div>
      )}

      {steps.map((step, i) => (
        <article
          key={step.id}
          data-pinned-step=""
          data-active={i === active || undefined}
          className="pinned-step grid items-start gap-x-12 gap-y-6 md:grid-cols-2 lg:gap-x-20"
        >
          <div
            className={cn(
              // A arte gruda dentro da PRÓPRIA linha: quando o passo acaba, ela
              // sai empurrada pelo próximo. É a troca sem cross-fade da nota.
              "pinned-art md:sticky md:top-[var(--pinned-top)]",
              "h-[calc(var(--pinned-h)*0.45)] md:h-[calc(var(--pinned-h)*0.7)]",
              side === "right" && "md:order-2",
            )}
            style={{
              opacity: "calc(0.5 + 0.5 * var(--near, 1))",
              transform: "scale(calc(0.975 + 0.025 * var(--near, 1)))",
              transition: "opacity 120ms linear",
            }}
          >
            <div className="h-full w-full overflow-hidden rounded-[var(--r-surface,0.875rem)] bg-muted">
              {step.art}
            </div>
          </div>

          {/* É a coluna de texto que dá comprimento de rolagem ao passo — ver
              `stepHeight`. No mobile ela encolhe: com a arte empilhada em cima,
              a altura cheia deixaria meia tela vazia entre as duas. */}
          <div className="flex min-h-[calc(var(--pinned-h)*0.7)] flex-col justify-center py-10 md:min-h-[var(--pinned-h)]">
            {step.label && (
              <div className="mb-3 flex items-center gap-3 text-[length:var(--text-rotulo,0.6875rem)] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="h-px w-6 bg-border" />
                {step.label}
              </div>
            )}
            <h3 className="text-balance text-[length:var(--text-titulo,1.75rem)] font-semibold tracking-[-0.02em] text-foreground">
              {step.title}
            </h3>
            {step.body && (
              <div className="mt-4 max-w-[46ch] text-pretty text-[length:var(--text-corpo,0.9375rem)] leading-relaxed text-muted-foreground">
                {step.body}
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
