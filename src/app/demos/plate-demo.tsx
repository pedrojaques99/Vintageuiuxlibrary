"use client";

/**
 * A placa trabalhando numa prateleira, e não posando sozinha.
 *
 * A demo anterior já usava foto real e ainda assim lia como "uma div com
 * imagem", por dois motivos que só aparecem lendo o DOM:
 *
 * 1. **A `Media` pinta `bg-muted` na caixa dela.** Dentro da placa isso é um
 *    retângulo opaco por cima do chão (`z-0`) e por baixo de nada: o produto
 *    nunca pousava, porque a sombra de contato ficava escondida atrás da
 *    própria moldura da foto. Aqui a caixa é transparente e o chão aparece.
 * 2. **Nada acontecia.** Placa de catálogo é um alvo — o card é `group`, então
 *    o zoom da foto e o espalhar do chão acontecem juntos, no hover.
 *
 * O multiply e o chão eram dois interruptores em pílula da marca no topo, com
 * um título "Prateleira" do lado. O report chamou de slop, e com razão: a demo
 * se explicava por cima da peça. Os dois agora são knobs do painel (`blend`,
 * `ground`), que é onde controle mora, e o ladrilho fica só com a prateleira.
 * A etiqueta também saiu da pílula da marca: é texto pequeno num selo neutro,
 * porque etiqueta de loja de verdade não grita na cor do site.
 *
 * O acervo aqui é recorte com alpha; o `bg-white` no `<img>` é o que reproduz o
 * arquivo como ele chega do fornecedor — matado em branco. É cor de ARQUIVO,
 * não de interface: é justamente o branco que a placa existe pra dissolver.
 */

import * as React from "react";

import { Plate } from "../../../registry/visant/ui/plate";
import { Media, midia, useWireframe, type Papel } from "../media";
import type { DemoProps } from "../catalog";

const PRATELEIRA = [
  { nome: "Caixa presente", preco: "R$ 249", papel: "cena" as Papel, indice: 4, etiqueta: null },
  { nome: "Troféu 12cm", preco: "R$ 380", papel: "cena" as Papel, indice: 3, etiqueta: "-30%" },
  { nome: "Estojo lápis", preco: "R$ 96", papel: "cena" as Papel, indice: 6, etiqueta: "novo" },
];

/**
 * O arquivo como ele chega: recorte matado em branco.
 *
 * Em modo wireframe volta a caixa riscada da vitrine — julgar a malha sem foto
 * continua valendo aqui, e um `<img>` cru não obedeceria ao interruptor.
 */
function Recorte({ papel, indice }: { papel: Papel; indice: number }) {
  const { wireframe } = useWireframe();
  const m = midia(papel, indice);
  if (wireframe || !m) {
    return <Media papel={papel} indice={indice} className="size-full bg-transparent" />;
  }
  return (
    <img
      src={m.src}
      alt={m.alt}
      width={m.w}
      height={m.h}
      loading="lazy"
      decoding="async"
      className="bg-white"
    />
  );
}

export default function PlateDemo({ props }: DemoProps) {
  return (
    <div
      className="flex h-full w-full items-center px-6 py-5"
      style={
        {
          // Uma ilha só, levemente fria, nos dois temas: é a condição do multiply.
          "--plate-photo": "oklch(0.965 0.003 260)",
        } as React.CSSProperties
      }
    >
      <div className="grid w-full grid-cols-3 gap-5">
        {PRATELEIRA.map((p) => (
          <a
            key={p.nome}
            href="#"
            onClick={(e) => e.preventDefault()}
            className="group block rounded-[var(--r-control,0.5rem)] outline-none focus-visible:[box-shadow:var(--focus)]"
          >
            <Plate
              ratio="4/5"
              inset={18}
              surface="photo"
              blend="multiply"
              ground
              className="rounded-[var(--r-control,0.5rem)]"
              badge={
                p.etiqueta ? (
                  <span className="rounded-[var(--r-control,0.375rem)] bg-[var(--background)] px-1.5 py-0.5 font-mono text-micro tabular-nums text-[var(--foreground)]">
                    {p.etiqueta}
                  </span>
                ) : undefined
              }
              {...props}
            >
              <Recorte papel={p.papel} indice={p.indice} />
            </Plate>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-apoio text-foreground">{p.nome}</span>
              <span className="shrink-0 text-apoio tabular-nums text-muted-foreground">{p.preco}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
