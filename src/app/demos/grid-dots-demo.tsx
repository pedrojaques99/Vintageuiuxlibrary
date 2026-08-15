"use client";

/**
 * A malha de pontos só se explica dentro da tela que ela serve.
 *
 * Sozinha ela é papel de parede: um retângulo pontilhado não diz se é fundo de
 * hero, de canvas ou de nada. Aqui ela aparece no lugar onde é obrigatória — o
 * canvas de nós de uma ferramenta —, e com o `spotlight` ligado, que é o que
 * separa "textura" de "fundo que responde": os pontos acendem na cor da marca
 * embaixo do ponteiro.
 *
 * Os nós são desenhados com token e nada mais, de propósito: quem olha o card
 * tem que julgar a MALHA, não os cartões em cima dela.
 */

import * as React from "react";

import { GridDots } from "../../../registry/visant/ui/grid-dots";

const NOS = [
  { rotulo: "Vault", valor: "marca", marca: false, deslocamento: "translate-y-3" },
  { rotulo: "Tokens", valor: "AA", marca: true, deslocamento: "-translate-y-4" },
  { rotulo: "No ar", valor: "v3", marca: false, deslocamento: "translate-y-2" },
];

export default function GridDotsDemo() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card">
      <GridDots opacity={0.11} spacing={18} dotSize={1.4} spotlight={170} />

      <div className="relative flex h-full items-center justify-center px-6">
        {NOS.map((no, i) => (
          <React.Fragment key={no.rotulo}>
            {i > 0 ? (
              // O fio entre nós é o que faz a malha ler como canvas, e não como
              // textura decorativa atrás de três caixas soltas.
              <span aria-hidden className="h-px w-9 shrink-0 bg-border" />
            ) : null}
            <div
              className={`flex flex-col gap-1 rounded-[var(--r-control,0.5rem)] border border-border bg-background px-3.5 py-2.5 [box-shadow:var(--e-raised)] ${no.deslocamento}`}
            >
              <span className="text-rotulo uppercase tracking-[0.14em] text-muted-foreground">
                {no.rotulo}
              </span>
              <span
                className="w-fit rounded-[var(--r-pill,9999px)] px-2 py-0.5 text-micro font-medium"
                style={
                  no.marca
                    ? { background: "var(--brand)", color: "var(--brand-foreground)" }
                    : { background: "var(--muted)", color: "var(--muted-foreground)" }
                }
              >
                {no.valor}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>

      <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-micro text-muted-foreground">
        mova o ponteiro
      </span>
    </div>
  );
}
