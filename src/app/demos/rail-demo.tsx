"use client";

/**
 * O trilho em largura de vitrine, com tudo que ele sabe ligado ao mesmo tempo.
 *
 * A demo antiga rodava em 620px: nesse espaço cabiam cinco cards e meio, então
 * a lista acabava quase junto com a vista — as setas nasciam a um clique do
 * fim, a máscara mal tinha o que esconder e o corte na borda, que é a peça
 * inteira, virava um detalhe de 8px. Trilho é faixa; aqui ele tem faixa.
 *
 * As doze peças não são enfeite: `+N` só significa alguma coisa quando N é
 * grande, e a régua embaixo só responde "de seis ou de sessenta?" quando o
 * polegar é visivelmente menor que a pista.
 *
 * O foco entra por Tab uma vez só — depois ←/→ andam pelos cards. É a promessa
 * de acessibilidade da peça, e ela só se verifica com o teclado numa lista que
 * não cabe na tela.
 */

import * as React from "react";

import { Rail } from "../../../registry/visant/ui/rail";
import { Media, type Papel } from "../media";
import type { DemoProps } from "../catalog";

const PECAS = [
  { nome: "Cubo alumínio", preco: "R$ 249", papel: "cena", indice: 0 },
  { nome: "Vidro fosco", preco: "R$ 128", papel: "textura", indice: 0 },
  { nome: "Troféu 12cm", preco: "R$ 380", papel: "cena", indice: 3 },
  { nome: "Papel algodão", preco: "R$ 42", papel: "textura", indice: 2 },
  { nome: "Rádio de mesa", preco: "R$ 590", papel: "cena", indice: 2 },
  { nome: "Estojo lápis", preco: "R$ 96", papel: "cena", indice: 6 },
  { nome: "Globo terra", preco: "R$ 310", papel: "cena", indice: 5 },
  { nome: "Bruma", preco: "R$ 74", papel: "textura", indice: 3 },
  { nome: "Caixa presente", preco: "R$ 158", papel: "cena", indice: 4 },
  { nome: "Neon", preco: "R$ 210", papel: "textura", indice: 1 },
  { nome: "Reflexo", preco: "R$ 88", papel: "cena", indice: 1 },
  { nome: "Cartão", preco: "R$ 36", papel: "cena", indice: 7 },
] satisfies Array<{ nome: string; preco: string; papel: Papel; indice: number }>;

export default function RailDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center px-6">
      <Rail
        itemWidth={186}
        gap={16}
        label="Coleção outono"
        heading="Coleção outono"
        hint={`${PECAS.length} peças`}
        // O respiro do palco é `px-6`; a sangria devolve a fileira à borda sem
        // desalinhar o título do primeiro card.
        bleed={24}
        fade
        remainder
        progress
        {...props}
      >
        {PECAS.map((p) => (
          <a
            key={p.nome}
            href="#"
            onClick={(e) => e.preventDefault()}
            className="group block min-w-0 rounded-[var(--r-control,0.5rem)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--brand)]"
          >
            <Media
              papel={p.papel}
              indice={p.indice}
              ratio="4/5"
              className="rounded-[var(--r-control,0.5rem)] border border-border transition-colors [transition-duration:var(--dur-fast)] group-hover:border-[var(--brand)]"
            />
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-apoio">{p.nome}</span>
              <span className="shrink-0 font-mono text-apoio tabular-nums text-muted-foreground">
                {p.preco}
              </span>
            </div>
          </a>
        ))}
      </Rail>
    </div>
  );
}
