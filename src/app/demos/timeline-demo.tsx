"use client";

/**
 * Três linhas curtas não são uma linha do tempo.
 *
 * A demo antiga tinha 460×300 e três etapas de uma frase: no card ela lia como
 * uma lista com bolinha, e nenhum dos três estados que a peça sabe desenhar —
 * feito, agora, a seguir — chegava a aparecer junto na mesma tela. Daí
 * "espremido" e "quase slop".
 *
 * O que muda aqui é densidade, não enfeite: cinco marcos com data, entregável e
 * corpo de verdade dão altura suficiente pra que o traço encha ENQUANTO o card
 * atravessa a tela — que é a única forma de ver o progresso amarrado à rolagem
 * sem um botão de mentira do lado.
 *
 * A peça é uma coluna de leitura, então o preview é declarado como coluna: 660
 * de largura. Espalhá-la numa faixa de 1350 deixaria metade do card vazia — o
 * defeito oposto ao que o report pediu pra consertar.
 */

import * as React from "react";

import { Timeline } from "../../../registry/visant/ui/timeline";

/**
 * O que sai do marco. Era uma pastilha em caixa alta com borda — e aí cada
 * etapa tinha TRÊS etiquetas gritadas (data, pastilha, "agora"), que é a cara de
 * IA que o report acusou. O entregável é um arquivo, não um selo: sai em mono,
 * na caixa em que ele existe de verdade, atrás de uma seta que diz "resulta em".
 */
function Passo({ texto, entrega }: { texto: string; entrega: string }) {
  return (
    <div className="space-y-1">
      <p className="max-w-[46ch] text-apoio leading-relaxed text-muted-foreground">{texto}</p>
      <p className="font-mono text-micro text-muted-foreground">
        {/* Sem `opacity` na seta: opacidade em cima do cinza de apoio derruba o
            contraste abaixo do piso do portão — medido em 2,23:1 no branco. */}
        <span aria-hidden="true" className="mr-1.5">
          →
        </span>
        {entrega}
      </p>
    </div>
  );
}

const MARCOS = [
  {
    meta: "04 mar",
    title: "Briefing e vault",
    content: (
      <Passo
        texto="A guideline entra pelo vault, não por anexo. Cor e regra de logo saem compiladas."
        entrega="brand.json"
      />
    ),
  },
  {
    meta: "07 mar",
    title: "Rampa de cor",
    content: (
      <Passo
        texto="Rampa neutra e par de cores com contraste AA por construção. Ninguém escolhe hex no caminho."
        entrega="tokens oklch"
      />
    ),
  },
  {
    meta: "12 mar",
    title: "Par tipográfico",
    content: (
      <Passo
        texto="Display e sans amarrados por papel, com a escala já resolvida."
        entrega="2 famílias"
      />
    ),
  },
  {
    meta: "18 mar",
    title: "Peças do registry",
    content: (
      <Passo
        texto="O que falta vira item novo — e volta pro registry, não pro projeto."
        entrega="9 itens"
      />
    ),
  },
  {
    meta: "02 abr",
    title: "No ar",
    content: (
      <Passo
        texto="O tema vira item publicado. O próximo projeto instala por comando."
        entrega="deploy"
      />
    ),
  },
];

export default function TimelineDemo() {
  const data = React.useMemo(() => MARCOS, []);
  return (
    <div className="h-full w-full overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card px-6 py-5">
      <Timeline
        data={data}
        title="Kastrup · identidade"
        description="Da guideline compilada ao tema publicado."
      />
    </div>
  );
}
