"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

import { cn } from "@/lib/utils";

/**
 * Line Reveal — o título que sobe de dentro do próprio corte de linha.
 *
 * ── Por que existe, tendo três vizinhos ────────────────────────────────────
 *
 * A casa já tem entrada de dobra em três lugares, e nenhum resolve ESTE caso:
 *
 * · `@visant/fold-motion` (variant `mask`) mascara o BLOCO inteiro com
 *   `clip-path` — o título aparece de baixo pra cima como um só objeto. Bonito,
 *   mas não é revelação por linha: quatro linhas entram grudadas.
 * · `@visant/motion-layer` (`data-reveal="lines"`) faz a máscara por linha, só
 *   que exige que VOCÊ já tenha quebrado o texto em elementos filhos. Serve pra
 *   Shopify, onde o Liquid escreve `<span>` por linha na mão. Num React em que
 *   a copy vem de CMS e a quebra depende da largura, isso é impossível.
 * · `@visant/glitch-chars` é textura, não entrada.
 *
 * O que falta é o caro: **descobrir onde a linha quebra** — e isso só o
 * navegador sabe, depois do layout, depois da fonte carregar. É o trabalho do
 * `SplitText`, plugin oficial do GSAP e livre desde a 3.13. Escrever um
 * medidor de linha à mão (`Range.getClientRects()` + agrupar por `top`) é o
 * clássico "duas tardes pra empatar com uma lib madura": não faz.
 *
 * ── As quatro armadilhas, todas pagas em campo ─────────────────────────────
 *
 * 1. **Quebrar antes da fonte carregar quebra no lugar errado.** Com a fonte
 *    de fallback, "estratégia" cabe na linha 2; com a Syncopate carregada, não
 *    cabe — e as máscaras ficam desalinhadas do texto pra sempre, porque o
 *    split já congelou. Por isso o efeito espera `document.fonts.ready` ANTES
 *    de medir. É a diferença entre funcionar na sua máquina (fonte em cache) e
 *    quebrar no primeiro acesso do cliente.
 * 2. **O esconderijo é aplicado por JS, nunca por CSS estático.** Se o CSS
 *    nascesse com `opacity: 0`, um erro de hidratação, um bloqueio de script ou
 *    um crawler deixariam o título invisível pra sempre. Aqui o texto nasce
 *    legível e só some no mesmo quadro em que o trigger é criado. Regra herdada
 *    do `fold-motion`, e é a que impede a página de sumir.
 * 3. **`overflow: hidden` na linha decepa descendente.** A caixa da linha é
 *    exatamente o `line-height`; o "g" e o "ç" vazam por baixo. A máscara ganha
 *    folga (`paddingBottom` + `marginBottom` negativa) — assim o corte é o topo,
 *    que é o que a animação usa, e a barriga da letra fica inteira.
 * 4. **Redimensionar re-quebra a linha.** Sem `autoSplit`, girar o telefone
 *    deixa as máscaras de uma medida e o texto de outra. O plugin refaz o split
 *    e o `onSplit` reconstrói a timeline — por isso a animação vive DENTRO do
 *    callback, e não fora dele.
 *
 * ── Acessibilidade ─────────────────────────────────────────────────────────
 *
 * `aria: true` faz o SplitText marcar os pedaços com `aria-hidden` e devolver a
 * frase inteira no `aria-label` do container: o leitor de tela ouve a frase, não
 * quatro fragmentos. E `revert()` no unmount devolve o DOM original — sem isso,
 * copiar o título colava um texto cheio de quebras invisíveis.
 *
 * Sob `prefers-reduced-motion` não há split nenhum: o texto simplesmente está
 * lá. Movimento é o que se corta; o desfecho (o título legível) não.
 *
 * ── Duração ────────────────────────────────────────────────────────────────
 *
 * 0.9s passa o teto de 300ms da casa de propósito: o teto governa CONTROLE
 * respondendo a clique. Isto é entrada de dobra na rolagem — pode ser longa e
 * deliberada, igual ao `count-up`.
 */

gsap.registerPlugin(ScrollTrigger, SplitText);

export interface LineRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** O texto. Pode conter `<em>`, `<br>`, link — o split preserva a marcação. */
  children: React.ReactNode;
  /** Elemento renderizado. Título de dobra é `h2`; topo de página é `h1`. */
  as?: "h1" | "h2" | "h3" | "p" | "div";
  /**
   * O que se quebra. `lines` é a revelação de título; `words` serve a frases
   * curtas onde a linha inteira subindo parece pesada demais.
   */
  split?: "lines" | "words";
  /** Atraso entre linhas, em segundos. Teto embutido: nunca passa de 0.4s no total. */
  stagger?: number;
  /** Onde na tela o gatilho arma. `top 88%` = a dobra entrou um oitavo. */
  start?: string;
  /**
   * Anima na montagem, sem esperar a rolagem. Para o herói do topo, que já está
   * visível quando a página abre — ali um ScrollTrigger nunca dispararia bem.
   */
  immediate?: boolean;
  /** Repete a cada passagem. Padrão é uma vez só: entrada que repete vira enfeite. */
  repeat?: boolean;
}

const MAX_STAGGER_TOTAL = 0.4;

export function LineReveal({
  children,
  as: Tag = "h2",
  split = "lines",
  stagger = 0.07,
  start = "top 88%",
  immediate = false,
  repeat = false,
  className,
  ...props
}: LineRevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: gsap.Context | undefined;
    let split_: SplitText | undefined;
    let cancelled = false;

    // A fonte primeiro, o corte depois. Ver armadilha 1.
    document.fonts.ready.then(() => {
      if (cancelled) return;

      ctx = gsap.context(() => {
        split_ = SplitText.create(el, {
          type: split,
          // A máscara é criada pelo próprio plugin, com a folga de descendente
          // já resolvida — é para isso que serve `mask`, e é melhor que um
          // wrapper nosso porque acompanha o re-split do `autoSplit`.
          mask: split,
          linesClass: "line-reveal-line",
          wordsClass: "line-reveal-word",
          autoSplit: true,
          aria: "auto",
          onSplit(self) {
            const parts = split === "lines" ? self.lines : self.words;
            if (!parts.length) return;

            // O teto do atraso acumulado: passou de ~400ms a cascata vira
            // desfile. Num título de 6 linhas o passo se aperta sozinho.
            const amount = Math.min(parts.length * stagger, MAX_STAGGER_TOTAL);

            return gsap.fromTo(
              parts,
              { yPercent: 108 },
              {
                yPercent: 0,
                duration: 0.9,
                ease: "power3.out",
                stagger: { each: stagger, amount },
                scrollTrigger: immediate
                  ? undefined
                  : { trigger: el, start, once: !repeat, toggleActions: "play none none reverse" },
              },
            );
          },
        });
      }, el);
    });

    return () => {
      cancelled = true;
      // Ordem importa: matar a timeline antes de desfazer o split, senão o GSAP
      // segue animando nós que já saíram do documento.
      ctx?.revert();
      split_?.revert();
    };
  }, [split, stagger, start, immediate, repeat]);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(
        "text-balance [font-family:var(--font-display,inherit)]",
        "text-[var(--foreground)]",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
