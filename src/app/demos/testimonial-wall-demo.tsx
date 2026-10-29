"use client";

/**
 * A parede em grade, ocupando a altura toda do palco, e fechada embaixo.
 *
 * `layout="bento"` divide a altura em linhas e o retrato em vídeo atravessa
 * as duas, então nenhuma coluna termina antes da outra. A faixa do `footer`
 * fecha a composição com a nota média e o caminho pros outros depoimentos:
 * sem ela a parede só parava, não terminava.
 */

import { ArrowRight, Star } from "lucide-react";

import { Media } from "../media";
import { PEOPLE } from "../demo-fixtures";
import { TestimonialWall } from "../../../registry/visant/blocks/testimonial-wall";
import type { DemoProps } from "../catalog";

export default function TestimonialWallDemo({ props }: DemoProps) {
  return (
    <TestimonialWall
      className="h-full w-full"
      layout="bento"
      columns={3}
      items={[
        {
          id: "a",
          kind: "quote",
          headline: "Rápido e fácil de trabalhar junto",
          quote:
            "Entenderam o que a gente precisava e entregaram no padrão em projetos bem diferentes entre si.",
          author: PEOPLE[1].name,
          role: "Marketing @ Estúdio Ribalta",
          rating: 5,
        },
        {
          id: "c",
          kind: "portrait",
          media: <Media papel="video" indice={2} className="size-full" />,
          name: PEOPLE[3].name,
          role: "Produto @ Casa Vinte",
          onPlay: () => {},
        },
        { id: "b", kind: "stat", tone: "brand", value: "1.291+", label: "Projetos entregues em 6 anos" },
        {
          id: "d",
          kind: "quote",
          tone: "muted",
          quote: "O time é atento e responde rápido quando entram revisão e projeto novo no mesmo dia.",
          author: PEOPLE[2].name,
          role: "Oficina Bandeira",
        },
        {
          id: "e",
          kind: "quote",
          quote: "A marca nova saiu com sistema, não com um logo solto. O time interno usa sem perguntar.",
          author: PEOPLE[0].name,
          role: "Fundador @ Ateliê Norte",
        },
      ]}
      footer={
        <>
          <p className="flex items-center gap-2 text-[14px] text-foreground">
            <span className="flex gap-0.5" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-3.5 fill-current" strokeWidth={0} />
              ))}
            </span>
            <span>
              <strong className="font-semibold tabular-nums">4,9</strong>
              <span className="text-muted-foreground"> de média em 212 avaliações</span>
            </span>
          </p>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-1.5 rounded-[var(--r-control,0.5rem)] text-[14px] font-medium text-foreground focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]"
          >
            Ler todos os depoimentos
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </>
      }
      {...props}
    />
  );
}
