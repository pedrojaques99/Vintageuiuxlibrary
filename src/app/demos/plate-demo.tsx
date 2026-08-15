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
 * E o que a peça vende de verdade — o multiply casando o recorte com o fundo —
 * agora é um interruptor, porque é o tipo de coisa que ninguém acredita por
 * descrição: desligue e o retângulo branco do arquivo aparece inteiro sobre a
 * placa colorida; ligue e ele some. A mesma foto, o mesmo pixel de layout.
 *
 * O acervo aqui é recorte com alpha; o `bg-white` no `<img>` é o que reproduz o
 * arquivo como ele chega do fornecedor — matado em branco. É cor de ARQUIVO,
 * não de interface: é justamente o branco que a placa existe pra dissolver.
 */

import * as React from "react";

import { Plate } from "../../../registry/visant/ui/plate";
import { Media, midia, useWireframe, type Papel } from "../media";

const PRATELEIRA = [
  { nome: "Cubo alumínio", preco: "R$ 249", papel: "cena" as Papel, indice: 0, etiqueta: null },
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

export default function PlateDemo() {
  const [multiply, setMultiply] = React.useState(true);
  const [chao, setChao] = React.useState(true);

  return (
    <div
      className="flex h-full w-full flex-col gap-3 p-4"
      style={
        {
          // A página da loja tem cor — é o caso em que o recorte sobre branco
          // denuncia a placa. Sobre fundo branco não haveria nada pra ver.
          background: "color-mix(in oklch, var(--brand) 9%, var(--background))",
          // A ilha clara da placa herda a mesma marca, um degrau acima do papel.
          "--plate-photo": "color-mix(in oklch, var(--brand) 7%, oklch(0.98 0 0))",
        } as React.CSSProperties
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-destaque font-semibold tracking-tight">Prateleira</span>
        <div className="flex gap-1.5">
          <Interruptor ligado={multiply} onClick={() => setMultiply((v) => !v)}>
            multiply
          </Interruptor>
          <Interruptor ligado={chao} onClick={() => setChao((v) => !v)}>
            chão
          </Interruptor>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {PRATELEIRA.map((p) => (
          <a
            key={p.nome}
            href="#"
            onClick={(e) => e.preventDefault()}
            className="group block rounded-[var(--r-control,0.5rem)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--brand)]"
          >
            <Plate
              ratio="4/5"
              inset={16}
              surface="photo"
              blend={multiply ? "multiply" : "normal"}
              ground={chao}
              className="rounded-[var(--r-control,0.5rem)]"
              badge={
                p.etiqueta ? (
                  <span className="rounded-[var(--r-pill,9999px)] bg-[var(--brand)] px-2 py-0.5 font-mono text-micro uppercase tracking-[0.12em] text-[var(--brand-foreground)]">
                    {p.etiqueta}
                  </span>
                ) : undefined
              }
            >
              <Recorte papel={p.papel} indice={p.indice} />
            </Plate>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-apoio">{p.nome}</span>
              <span className="shrink-0 font-mono text-apoio tabular-nums">{p.preco}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function Interruptor({
  ligado,
  onClick,
  children,
}: {
  ligado: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ligado}
      className={[
        "alvo-toque rounded-[var(--r-pill,9999px)] border px-2.5 py-1 font-mono text-micro uppercase tracking-[0.12em] outline-none",
        "transition-[color,border-color,background-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
        ligado
          ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
          : "border-border text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
