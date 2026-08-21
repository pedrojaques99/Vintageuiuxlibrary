"use client";

/**
 * Os três passos com foto de verdade e o foco andando sozinho.
 *
 * ── O que estava faltando ──────────────────────────────────────────────────
 *
 * A demo antiga tinha três cards idênticos, parados, com 140px de área de
 * visual. Isso mostra a estrutura do bloco e mais nada — e estrutura é a parte
 * que qualquer um escreve. O que a peça resolve é a leitura de PERCURSO: onde
 * você está na sequência. Parada, ela não tinha percurso nenhum.
 *
 * Agora o `active` anda, e é por isso que a prop existe: quem manda no passo
 * atual é a página (rolagem, timer, clique), nunca o bloco.
 *
 * ── O relógio ──────────────────────────────────────────────────────────────
 *
 * · **Preso ao `useStageActive`.** Card fora da tela não gasta timer — regra da
 *   vitrine, e com 45 itens é a diferença entre uma página e um ventilador.
 * · **Morto sob `prefers-reduced-motion`.** Quem pediu menos movimento recebe
 *   o passo 1 em foco, parado. O destaque continua (é informação); o que sai é
 *   a troca automática, que é movimento que ninguém pediu.
 * · **2,8s.** Abaixo de ~2s a fileira pisca; acima de ~4s a pessoa larga o card
 *   antes de ver a segunda posição.
 *
 * A área de visual subiu de 140px para 220px porque abaixo de ~180px o mockup
 * não se lê — o número está escrito na própria prop (`visualHeight`) e a demo
 * estava desmentindo a documentação da peça.
 */

import * as React from "react";

import { Media } from "../media";
import { useStageActive } from "../stage";
import { StepCards } from "../../../registry/visant/blocks/step-cards";
import type { DemoProps } from "../catalog";

const PASSOS = [
  {
    title: "Envie o pedido",
    description: "Conte o que precisa e suba os arquivos da marca.",
    indice: 1,
    papel: "cena" as const,
  },
  {
    title: "O time entra",
    description: "Cruzamos o projeto com quem tem a mão certa para ele.",
    indice: 3,
    papel: "retrato" as const,
  },
  {
    title: "Você comenta",
    description: "Feedback direto na plataforma até ficar de pé.",
    indice: 4,
    papel: "cena" as const,
  },
];

export default function StepCardsDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (!ativo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((v) => (v + 1) % PASSOS.length), 2800);
    return () => clearInterval(id);
  }, [ativo]);

  return (
    <div className="flex h-full w-full items-center px-4">
      <StepCards
        className="w-full"
        columns={3}
        active={i}
        visualHeight={220}
        steps={PASSOS.map((p) => ({
          title: p.title,
          description: p.description,
          // Proporção declarada, e não `size-full`: o slot do visual tem
          // `min-height`, não `height`, então uma altura em porcentagem cai em
          // `auto` e cada passo fecharia numa altura diferente — três cards
          // desalinhados pela proporção do arquivo, não pelo componente.
          visual: <Media papel={p.papel} indice={p.indice} ratio="16/10" className="w-full" />,
        }))}
        {...props}
      />
    </div>
  );
}
