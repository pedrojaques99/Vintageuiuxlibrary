"use client";

/**
 * Cinco depoimentos e espaço para um: o caso de uso da pilha.
 *
 * O card de cima é arrastável (ou setas, com a pilha em foco). O número no
 * rodapé conta a posição de cada um na lista original, para quem gira a pilha
 * ver que nada se perde: o que foi pro fundo volta na vez dele.
 */

import { Media } from "../media";
import { CardStack } from "../../../registry/visant/ui/card-stack";
import type { DemoProps } from "../catalog";

const DEPOIMENTOS = [
  { id: "a", nome: "Marina Rocha", casa: "Casa Vinte", fala: "O site novo pagou o projeto no primeiro mês de reservas." },
  { id: "b", nome: "Caio Duarte", casa: "Ribalta", fala: "A marca finalmente parece do tamanho que a gente é." },
  { id: "c", nome: "Lia Prado", casa: "Forno Lento", fala: "Entregaram o manual e o time usou sem pedir ajuda." },
  { id: "d", nome: "Davi Campos", casa: "Trilha Norte", fala: "Rápido, direto e sem reunião sobrando." },
  { id: "e", nome: "Rosa Leme", casa: "Ateliê Leme", fala: "A loja nova vende sozinha de madrugada." },
];

export default function CardStackDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <CardStack
        className="w-[min(100%,21rem)] [--card-stack-h:18rem]"
        items={DEPOIMENTOS}
        getKey={(d) => d.id}
        getLabel={(d) => d.nome}
        label="Depoimentos"
        renderCard={(d) => {
          const i = DEPOIMENTOS.indexOf(d);
          return (
            <figure className="flex h-full flex-col">
              <Media papel="cena" indice={[0, 2, 3, 5, 6][i]} className="h-[45%] w-full shrink-0" />
              <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                <blockquote className="text-[length:var(--text-destaque,1.0625rem)] font-medium leading-snug tracking-[-0.01em] text-foreground">
                  {d.fala}
                </blockquote>
                <figcaption className="flex items-center gap-2.5">
                  <Media papel="retrato" indice={i} className="size-7 shrink-0 rounded-[var(--r-pill)]" />
                  <span className="min-w-0 truncate text-sm text-foreground">{d.nome}</span>
                  <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}/{String(DEPOIMENTOS.length).padStart(2, "0")}
                  </span>
                </figcaption>
              </div>
            </figure>
          );
        }}
        {...props}
      />
    </div>
  );
}
