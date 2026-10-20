"use client";

/**
 * Cinco depoimentos e espaço para um: o caso de uso da pilha.
 *
 * O card de cima é arrastável (ou setas, com a pilha em foco). O número no
 * canto conta a posição de cada um na lista original, para quem gira a pilha
 * ver que nada se perde: o que foi pro fundo volta na vez dele.
 */

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
        items={DEPOIMENTOS}
        getKey={(d) => d.id}
        getLabel={(d) => d.nome}
        label="Depoimentos"
        renderCard={(d) => (
          <figure className="flex h-full flex-col justify-between p-6">
            <span className="self-end text-xs tabular-nums text-muted-foreground">
              {DEPOIMENTOS.indexOf(d) + 1} de {DEPOIMENTOS.length}
            </span>
            <blockquote className="text-lg font-medium leading-snug text-foreground">{d.fala}</blockquote>
            <figcaption className="text-sm text-muted-foreground">
              {d.nome}, {d.casa}
            </figcaption>
          </figure>
        )}
        {...props}
      />
    </div>
  );
}
