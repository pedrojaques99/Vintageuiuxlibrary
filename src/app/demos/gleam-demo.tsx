"use client";

/**
 * Uma peça só, com os parâmetros na mão.
 *
 * ── Por que as três variações saíram ───────────────────────────────────────
 *
 * A demo anterior punha `flat`, 6° e 12° lado a lado com um rótulo embaixo de
 * cada. Ela respondia "qual é a diferença entre estes três ajustes" — e essa
 * nunca foi a pergunta. Quem chega no item quer saber **quanto** de inclinação
 * e **quanta** luz o próprio projeto vai querer, e isso é um valor contínuo:
 * três amostras discretas obrigam a interpolar de cabeça entre 6 e 12 para
 * descobrir que 9 é o certo. Com o controle na mão a resposta sai em dois
 * segundos, e o número que aparece no campo é o que se digita no código.
 *
 * Sobrou espaço: um card de 300px mostra o holofote como ele é. A 190px, a luz
 * cobria a peça inteira e o efeito não existia (é a armadilha 6 do componente,
 * medida na vitrine).
 *
 * ── Controles recolhidos, peça acesa ───────────────────────────────────────
 *
 * O report pediu "CONTROLES ESCONDIDOS POR DEFAULT" e "NASCER EM PERSPECTIVA E
 * BRILHANDO". O card agora nasce na pose de repouso da peça (`rest`, ligado
 * por padrão: inclinado e aceso no canto de cima), e os três campos ficam atrás
 * de um botão miúdo de ajustes. Quem chega vê o card, não um painel.
 *
 * ── Os controles são do registry, não desta pasta ──────────────────────────
 *
 * `ScrubInput` é o campo de painel de edição da casa: arrasta, roda, seta,
 * duplo-clique pra digitar, e o fio da régua no pé mostra onde o valor está
 * dentro da faixa. Desenhar três sliders aqui seria reinventar uma peça que já
 * existe — e pior, uma que não teria teclado nem leitor de tela.
 *
 * A cor é matiz em OKLCH, não uma paleta de amostras: o parâmetro real da peça
 * é uma cor CSS qualquer, e uma fileira de bolinhas mentiria dizendo que são
 * cinco opções. Croma e luminosidade ficam fixos de propósito — variar os três
 * eixos ao mesmo tempo produz "cores feias" e a culpa cai no componente.
 */

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";

import { Chip } from "../../../registry/visant/ui/chip";
import { Gleam } from "../../../registry/visant/ui/gleam";
import { Media } from "../media";
import { ScrubInput } from "../../../registry/visant/ui/scrub-input";
import type { DemoProps } from "../catalog";

export default function GleamDemo({ props }: DemoProps) {
  const [luz, setLuz] = React.useState(100);
  const [inclinacao, setInclinacao] = React.useState(9);
  const [matiz, setMatiz] = React.useState(212);
  const [marca, setMarca] = React.useState(true);
  const [ajustes, setAjustes] = React.useState(false);
  const painel = React.useId();

  // Croma e luminosidade travados: o que se ajusta aqui é matiz. Ver o cabeçalho.
  const cor = marca ? undefined : `oklch(0.74 0.17 ${matiz})`;

  /*
   * `flex-wrap` e larguras com teto, não cravadas.
   *
   * Card de 300 + controles de 210 + goteira dão 530px de largura mínima, e a
   * cena vazava a tela de 360 na página solo — a peça aparecia certa e a PÁGINA
   * rolava de lado. Empilhado, o controle vai pra baixo do card, que é onde ele
   * já vive no celular de qualquer jeito.
   */
  return (
    <div className="relative flex h-full w-full flex-wrap items-center justify-center gap-6 px-5">
      <Gleam
        tilt={inclinacao}
        glow={luz / 100}
        tint={cor}
        flat={inclinacao === 0}
        className="w-full max-w-[300px] shrink-0 overflow-hidden bg-[color-mix(in_oklch,var(--foreground)_5%,var(--card))] p-3"
        {...props}
      >
        {/* A arte é filha do card, não fundo dele: a luz e a borda acesa são
            camadas ACIMA do conteúdo, então o reflexo passa por cima da foto —
            que é o que faz o card ler como vidro sobre imagem. */}
        <Media
          papel="cena"
          indice={1}
          ratio="4/5"
          className="rounded-[var(--r-control,0.5rem)]"
        />
      </Gleam>

      {ajustes ? (
        <div id={painel} className="flex w-full max-w-[210px] shrink-0 flex-col gap-2">
          <ScrubInput
            label="luz"
            kind="percent"
            layout="row"
            min={0}
            max={100}
            value={luz}
            onChange={setLuz}
            hint="Opacidade do holofote sob o ponteiro."
          />
          <ScrubInput
            label="inclinação"
            kind="angle"
            layout="row"
            min={0}
            max={14}
            value={inclinacao}
            onChange={setInclinacao}
            hint="Graus no canto. Zero equivale a flat: só a luz, sem giro."
          />
          <ScrubInput
            label="matiz"
            kind="angle"
            layout="row"
            min={0}
            max={360}
            value={matiz}
            disabled={marca}
            onChange={setMatiz}
            hint="Cor da luz em OKLCH. Só vale com a marca desligada."
          />
          <Chip
            size="sm"
            className="alvo-toque self-start"
            pressed={marca}
            onClick={() => setMarca((v) => !v)}
          >
            cor da marca
          </Chip>
        </div>
      ) : null}

      {/* Ajustes recolhidos por padrão: quem chega vê o card, não um painel. */}
      <button
        type="button"
        aria-expanded={ajustes}
        aria-controls={painel}
        onClick={() => setAjustes((v) => !v)}
        className="alvo-toque inline-flex items-center gap-1.5 absolute bottom-2 right-3 rounded-[var(--r-control,0.5rem)] px-1.5 py-1 font-mono text-micro text-muted-foreground outline-none transition-[color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:text-foreground focus-visible:[box-shadow:var(--focus)] aria-expanded:text-foreground"
      >
        <SlidersHorizontal className="size-3.5" aria-hidden />
        ajustes
      </button>
    </div>
  );
}
