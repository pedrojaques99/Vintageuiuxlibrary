"use client";

/**
 * A dobra de prova em miniatura — que é o único lugar onde o contador existe.
 *
 * ── O que mudou, e por quê ─────────────────────────────────────────────────
 *
 * A demo anterior punha um travessão solto (`—`) ao lado dos dois números, para
 * demonstrar a regra 2 do componente: "o que não dá pra parsear não anima". A
 * intenção era boa e a leitura era outra — quem chega no card vê um traço no
 * meio de dois números e conclui que a peça quebrou. Foi exatamente o que o
 * report disse ("pq tem um traçado?"), com severidade de coisa quebrada.
 *
 * Regra que fica: **a demo mostra o que a peça faz, não o que ela se recusa a
 * fazer.** A recusa é comportamento defensivo, está documentada no componente e
 * não tem forma visual própria — um valor ausente e um valor ausente por bug
 * desenham o mesmo traço na tela.
 *
 * O rótulo embaixo de cada número entra pelo mesmo motivo: número sem unidade
 * nem nome é ornamento. Com rótulo, o card é a dobra de prova de verdade — que é
 * a cena em que alguém vai instalar isto.
 */

import * as React from "react";

import { Chip } from "../../../registry/visant/ui/chip";
import { CountUp } from "../../../registry/visant/ui/count-up";

const NUMEROS = [
  { valor: "R$450k", rotulo: "faturado", delay: 0 },
  { valor: "1.200", rotulo: "contratos", delay: 120 },
  { valor: "98%", rotulo: "renovação", delay: 240 },
];

export default function CountUpDemo() {
  const [n, setN] = React.useState(0);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5">
      {/* A remontagem por `key` é o único jeito de rever a entrada: a contagem
          acontece uma vez, quando o número entra em tela, e o componente
          publicado não expõe método imperativo nenhum. */}
      <div className="flex items-start justify-center gap-9" key={n}>
        {NUMEROS.map((item) => (
          <div key={item.rotulo} className="flex flex-col items-center gap-1">
            <CountUp
              className="text-[2rem] font-semibold leading-none tracking-tight"
              delay={item.delay}
            >
              {item.valor}
            </CountUp>
            <span className="text-rotulo uppercase tracking-[0.14em] text-muted-foreground">
              {item.rotulo}
            </span>
          </div>
        ))}
      </div>

      <Chip className="alvo-toque" onClick={() => setN((x) => x + 1)}>
        contar de novo
      </Chip>
    </div>
  );
}
