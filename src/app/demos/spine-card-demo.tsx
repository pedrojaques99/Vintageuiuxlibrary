"use client";

/**
 * A estante, a prumo por padrão, com o tombo como interruptor.
 *
 * ── Por que o tombo saiu do padrão ─────────────────────────────────────────
 *
 * Ele era o estado inicial de todo card, e é ali que ele mais atrapalha: o giro
 * come largura (a 7° um card de 190px pede ~24px a mais de caixa), então numa
 * grade apertada ele aperta de novo, e um card torto sem estante em volta lê
 * como defeito de CSS. A inclinação continua na peça — ela é metade do que faz
 * o retângulo virar objeto — só que agora quem monta a prateleira é quem liga.
 *
 * ── Por que a demo tem o interruptor ───────────────────────────────────────
 *
 * Porque a diferença entre as duas leituras é o argumento inteiro da peça, e
 * ela não cabe em texto: "objeto apoiado" e "card a prumo" são a mesma
 * anatomia com um valor trocado. Duas estantes lado a lado gastariam o dobro do
 * palco pra mostrar a mesma coisa duas vezes; um botão mostra a troca, que é o
 * que se está julgando.
 *
 * O hover fica igual nos dois modos — o objeto sobe. É o gesto de tirar da
 * prateleira, e ele nunca dependeu do tombo.
 */

import * as React from "react";

import { SpineCard } from "../../../registry/visant/ui/spine-card";
import { CoverArt } from "../../../registry/visant/ui/cover-art";
import type { DemoProps } from "../catalog";

const TITULOS = ["Marca em 9 etapas", "O método do lote", "Imersão de dois dias"];

export default function SpineCardDemo({ props }: DemoProps) {
  const [tombo, setTombo] = React.useState(false);

  return (
    <div className="flex h-full w-full flex-col justify-center gap-4 px-5">
      <button
        type="button"
        onClick={() => setTombo((v) => !v)}
        aria-pressed={tombo}
        className={`alvo-toque inline-flex w-fit items-center gap-2 rounded-[var(--r-control,0.5rem)] border px-3 py-1.5 outline-none focus-visible:[box-shadow:var(--focus)] transition-[color,border-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] ${
          tombo
            ? "border-[var(--brand)] text-foreground"
            : "border-border text-muted-foreground hover:border-[var(--brand)] hover:text-foreground"
        }`}
      >
        <span className="font-mono text-rotulo tracking-[0.12em]">tilt</span>
        <span className="text-micro text-muted-foreground">
          {tombo ? "estante apoiada" : "a prumo (padrão)"}
        </span>
      </button>

      {/* `flex-wrap`: a estante tem que caber no celular também — a demo roda
          sozinha num viewport de 360px no teste de peça responsiva.
          `items-end` porque o tombo gira em `transform-origin: bottom`: é a
          base que fica alinhada, e é ela que faz a fileira ler como prateleira. */}
      <div className="flex flex-wrap items-end justify-center gap-6 pt-3">
        {TITULOS.map((t, i) => (
          <SpineCard
            key={t}
            index={i}
            tilt={tombo}
            href="#"
            title={t}
            action="ver →"
            className="w-[190px]"
            cover={
              <div className="relative aspect-[2/3] w-full">
                <CoverArt title={t} seed={t} family="book" />
              </div>
            }
            {...props}
          />
        ))}
      </div>
    </div>
  );
}
