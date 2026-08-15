"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Gleam — a superfície que sabe onde o cursor está.
 *
 * Três coisas ao mesmo tempo, e é a soma que faz o card parecer objeto em vez
 * de retângulo: a luz que segue o ponteiro, a borda que acende só do lado de
 * onde a luz vem, e a inclinação de 5 graus que dá espessura à peça.
 *
 * ── Por que não é o `use-pointer-parallax` ─────────────────────────────────
 *
 * O hook da casa escreve `--px/--py` a partir do ponteiro na JANELA, para uma
 * colagem inteira se mexer junto — profundidade de cena. Aqui a coordenada é
 * LOCAL ao elemento (0→1 dentro da própria caixa), porque a luz tem que nascer
 * exatamente sob o cursor em cada card de uma grade de doze. São medidas
 * diferentes do mesmo gesto; usar o hook de cena aqui acenderia os doze cards
 * no mesmo canto.
 *
 * Também não é o `@visant/repulsive-hover`, que FOGE do cursor. Este reconhece
 * o cursor e fica.
 *
 * ── A divisão de trabalho ──────────────────────────────────────────────────
 *
 * O JS escreve quatro números e para: `--gx/--gy` (0→1, onde está o cursor) e
 * `--rx/--ry` (graus de inclinação). Todo o desenho é CSS. Duas consequências
 * boas: trocar a estética não encosta em JavaScript, e o navegador compõe o
 * `transform` sem passar pelo layout.
 *
 * ── As armadilhas ──────────────────────────────────────────────────────────
 *
 * 1. **Sem ponteiro fino, o código é morto e nocivo.** Num telefone `pointermove`
 *    dispara a cada toque e a "luz" fica presa no último ponto tocado. A guarda
 *    de `(hover: hover) and (pointer: fine)` é checada ANTES de assinar o
 *    listener, não dentro dele.
 * 2. **`transition` no transform durante o arrasto do ponteiro atrasa a luz.**
 *    A suavização fica em 120ms só — o suficiente pra tirar o degrau do
 *    primeiro quadro, curto demais pra virar arrasto. Já a VOLTA ao repouso
 *    (`pointerleave`) é mais longa de propósito: a saída é que precisa de calma.
 * 3. **A luz não pode capturar clique.** A camada de brilho é `pointer-events:
 *    none`, senão o card inteiro vira uma área morta sobre o próprio link.
 * 4. **`perspective` mora no elemento externo, o giro no interno.** Perspectiva
 *    no mesmo nó que rotaciona não produz profundidade — produz um losango.
 * 5. **O foco de teclado não tem cursor.** Quem chega de Tab não recebe luz
 *    nenhuma; recebe o `--focus` da casa, que é o contrato de foco visível.
 *    Efeito de ponteiro nunca substitui estado de foco.
 * 6. **Raio de luz em pixel fixo não é holofote, é lavagem.** A primeira versão
 *    usava `240px circle`. Medido na vitrine: card de 152×87, canto mais
 *    distante a ~174px — a "luz" cobria a peça inteira com cor uniforme e o
 *    efeito de holofote não existia em card nenhum de grade. O gradiente agora
 *    não declara raio: sem tamanho explícito o padrão é `farthest-corner`, e as
 *    paradas em porcentagem passam a ser relativas à PRÓPRIA caixa. Um card de
 *    150px e um herói de 900px ganham a mesma leitura sem prop nenhuma.
 * 7. **`prefers-reduced-motion` desliga a inclinação, não a peça.** A luz de
 *    hover é opacidade — informação de "estou aqui" — e fica. O que sai é o
 *    movimento no espaço, que é o que embrulha o estômago.
 *
 * Sem cor própria: o brilho é `color-mix` sobre `--brand`, então o card acende
 * na cor da marca instalada e em nenhuma outra.
 */

export interface GleamProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Graus de inclinação no canto. Acima de ~8 o card lê como brinquedo. */
  tilt?: number;
  /** Força da luz, 0→1. */
  glow?: number;
  /**
   * Cor da luz e da borda acesa. Qualquer cor CSS; o padrão é a marca.
   *
   * Existe para o caso em que uma superfície precisa acender numa cor que NÃO é
   * a da marca — o card de erro, o de destaque sazonal, a grade em que cada
   * categoria tem a sua tinta. Sem isto a única saída era redefinir `--brand`
   * num ancestral, o que repinta também o conteúdo do card (botão, pastilha,
   * ícone), e aí "mudar a cor da luz" vira "trocar a marca dentro desse pedaço
   * da página".
   *
   * A troca é escrita nas DUAS camadas de luz, e só nelas: o `--brand` local
   * morre no `<span>` do brilho e não desce para os filhos.
   */
  tint?: string;
  /** Desliga o giro e mantém luz e borda. Para card dentro de grade densa. */
  flat?: boolean;
  /** Elemento raiz. `a` quando o card inteiro leva a algum lugar. */
  as?: "div" | "a" | "article" | "li";
}

export function Gleam({
  tilt = 5,
  glow = 1,
  tint,
  flat = false,
  as: Tag = "div",
  className,
  children,
  style,
  ...props
}: GleamProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    // Uma escrita por quadro. `pointermove` chega mais rápido que o navegador
    // desenha, e escrever custom property duas vezes no mesmo quadro é trabalho
    // que ninguém vê.
    const flush = () => {
      frame = 0;
      if (!pending) return;
      const { x, y } = pending;
      el.style.setProperty("--gx", x.toFixed(4));
      el.style.setProperty("--gy", y.toFixed(4));
      if (!reduced && !flat) {
        el.style.setProperty("--ry", ((x - 0.5) * 2 * tilt).toFixed(3));
        el.style.setProperty("--rx", ((0.5 - y) * 2 * tilt).toFixed(3));
      }
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pending = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      pending = null;
      el.style.setProperty("--rx", "0");
      el.style.setProperty("--ry", "0");
      // A luz não volta ao centro: ela apaga onde estava. Voltar ao centro
      // desenha um risco atravessando o card no caminho de saída.
      el.dataset.lit = "";
    };

    const onEnter = () => {
      el.dataset.lit = "1";
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [tilt, flat]);

  // `React.ElementType` em vez de genérico completo: a peça aceita quatro tags
  // conhecidas e o ganho de tipar cada uma delas separadamente não paga a
  // assinatura ilegível que isso produz na ficha do componente.
  const Root = Tag as React.ElementType;

  // Redefinir `--brand` NA camada, não no card: o CSS do brilho já lê `--brand`,
  // então a troca é de uma propriedade só, e ela não vaza para o conteúdo.
  const cor = tint ? ({ "--brand": tint } as React.CSSProperties) : undefined;

  return (
    <div className="gleam-stage" style={{ "--glow": glow } as React.CSSProperties}>
      <Root ref={ref} className={cn("gleam", className)} style={style} {...props}>
        <span aria-hidden="true" className="gleam-light" style={cor} />
        <span aria-hidden="true" className="gleam-edge" style={cor} />
        {children}
      </Root>
    </div>
  );
}
