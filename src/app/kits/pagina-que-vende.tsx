"use client";

/**
 * Página que vende — as 16 peças de aquisição na ordem em que uma landing usa.
 *
 * Este kit é o que mais sofria na vitrine solta: `count-up` sozinho é um número
 * animado (bonito e inútil), `measure-bar` sozinho é uma barrinha, `spine-card`
 * sozinho é um card torto. Juntos, em ordem, eles são uma página inteira — e é
 * a página que a pessoa quer, não o número.
 *
 * A ordem aqui não é decorativa, é o argumento: promessa (hero) → o que fazemos
 * (serviços) → como funciona (passos) → prova em número → prova em gente →
 * acervo → chamada. Tirar uma dobra do meio quebra a costura, e é por isso que
 * o kit se instala inteiro.
 */

import * as React from "react";

import { EraseField } from "../../../registry/visant/ui/erase-field";
import { RepulsiveHover } from "../../../registry/visant/ui/repulsive-hover";
import { StoreStatus } from "../../../registry/visant/ui/store-status";
import { Marquee } from "../../../registry/visant/ui/marquee";
import { SectionIntro } from "../../../registry/visant/ui/section-intro";
import { ShowcaseCard } from "../../../registry/visant/ui/showcase-card";
import { StepCards } from "../../../registry/visant/blocks/step-cards";
import { TestimonialWall } from "../../../registry/visant/blocks/testimonial-wall";
import { CountUp } from "../../../registry/visant/ui/count-up";
import { MeasureBar } from "../../../registry/visant/ui/measure-bar";
import { SpineCard } from "../../../registry/visant/ui/spine-card";
import { CoverArt } from "../../../registry/visant/ui/cover-art";
import { MasonryGallery } from "../../../registry/visant/ui/masonry-gallery";
import { Plate } from "../../../registry/visant/ui/plate";
import { Rail } from "../../../registry/visant/ui/rail";
import { Chip } from "../../../registry/visant/ui/chip";
import { CtaSurface, CtaAction } from "../../../registry/visant/ui/cta-surface";
import { Media, proporcao } from "../media";
import { PEOPLE } from "../demo-fixtures";

const PALAVRAS = ["MARCA", "SITE", "PRODUTO", "CAMPANHA", "EMBALAGEM", "MOTION"];

const ACERVO = [
  { papel: "cena" as const, indice: 0 },
  { papel: "retrato" as const, indice: 1 },
  { papel: "textura" as const, indice: 0 },
  { papel: "cena" as const, indice: 3 },
  { papel: "retrato" as const, indice: 4 },
  { papel: "cena" as const, indice: 5 },
];

const LIVROS = ["Marca em 9 etapas", "O método do lote", "Imersão"];

function Dobra({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`px-4 py-10 sm:px-8 sm:py-14 ${className}`}>{children}</section>;
}

export default function PaginaQueVende() {
  const acervo = React.useMemo(
    () => ACERVO.map((it, i) => ({ ...it, i, ratio: proporcao(it.papel, it.indice) })),
    [],
  );

  return (
    <div className="overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-background">
      {/*
        Hero. O `erase-field` é FUNDO, não peça: ele existe para que a promessa
        apareça sobre algo que reage à mão. Peça de fundo dentro de um card de
        vitrine parecia efeito solto; aqui ela faz o trabalho dela.
      */}
      <EraseField className="relative grid min-h-[380px] place-items-center px-6 py-14 text-center">
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-5 flex justify-center">
            <StoreStatus timeZone="America/Sao_Paulo" openHour={9} closeHour={18} />
          </div>
          <h2
            className="text-[clamp(1.8rem,4.5vw,3rem)] font-semibold leading-[1.04] tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-display, inherit)" }}
          >
            Um time só. Todo serviço que a marca precisa.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-corpo leading-relaxed text-muted-foreground">
            Da estratégia ao código publicado — sem repassar o trabalho para fora no meio do
            caminho.
          </p>
          <div className="mt-7 flex justify-center">
            <RepulsiveHover strength={8} radius={160}>
              <span
                className="inline-block rounded-[var(--r-pill,9999px)] px-6 py-3 text-corpo font-medium"
                style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}
              >
                Agendar conversa
              </span>
            </RepulsiveHover>
          </div>
        </div>
      </EraseField>

      {/* Duas faixas em sentidos opostos: uma só lê como enfeite, duas leem
          como sistema. */}
      <div className="overflow-hidden border-y border-border py-1">
        <Marquee
          band
          speed={38}
          items={PALAVRAS.map((p) => (
            <span key={p} className="font-mono text-rotulo tracking-[0.14em]">
              {p}
            </span>
          ))}
        />
      </div>

      <Dobra>
        <SectionIntro
          eyebrow="Serviços"
          title="O que a gente entrega"
          lead="Três frentes que se sustentam sozinhas e ficam melhores juntas."
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ShowcaseCard
            href="#"
            title="Identidade que quer dizer alguma coisa"
            media={<Media papel="video" indice={0} className="size-full" />}
            tags={["Estratégia", "Naming", "Logo", "Identidade visual"]}
          />
          <ShowcaseCard
            href="#"
            title="Site que carrega rápido e converte"
            media={<Media papel="cena" indice={3} className="size-full" />}
            tags={["Landing", "E-commerce", "Design system"]}
          />
          <ShowcaseCard
            href="#"
            title="Produto desenhado com quem constrói"
            media={<Media papel="retrato" indice={4} className="size-full" />}
            tags={["App", "Dashboard", "Componentes"]}
          />
        </div>
      </Dobra>

      <Dobra className="border-t border-border">
        <SectionIntro eyebrow="Como funciona" title="Três passos, sem mistério" />
        <div className="mt-8">
          <StepCards
            columns={3}
            visualHeight={150}
            steps={[
              {
                title: "Envie o pedido",
                description: "Conte o que precisa e suba os arquivos da marca.",
                visual: <Media papel="cena" indice={1} ratio="4/3" className="size-full" />,
              },
              {
                title: "O time entra",
                description: "Cruzamos o projeto com quem tem a mão certa para ele.",
                visual: <Media papel="retrato" indice={3} ratio="4/3" className="size-full" />,
              },
              {
                title: "Você comenta",
                description: "Feedback direto na plataforma até ficar de pé.",
                visual: <Media papel="cena" indice={4} ratio="4/3" className="size-full" />,
              },
            ]}
          />
        </div>
      </Dobra>

      {/*
        Número e régua na mesma dobra, de propósito.

        `count-up` apura o número e `measure-bar` diz de quanto ele é — juntos
        são prova, separados são enfeite e afirmação sem denominador. A terceira
        barra é o estado desconhecido: dado que a API não devolveu aparece
        tracejado, e não como zero.
      */}
      <Dobra className="border-t border-border">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <CountUp className="block text-[2.4rem] font-semibold leading-none tracking-tight">
              1.291
            </CountUp>
            <p className="mt-2 text-apoio text-muted-foreground">Projetos entregues em 6 anos</p>
          </div>
          <MeasureBar
            value="R$450k"
            qualifier="de uma meta de 600k"
            ratio={0.75}
            label="Faturado no trimestre"
          />
          <MeasureBar value="—" qualifier="a API não respondeu" state="unknown" label="Em rota" />
        </div>
      </Dobra>

      <Dobra className="border-t border-border">
        <SectionIntro eyebrow="Prova" title="Quem já contratou" />
        <div className="mt-8">
          <TestimonialWall
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
                id: "b",
                kind: "stat",
                tone: "brand",
                value: "1.291+",
                label: "Projetos entregues em 6 anos",
              },
              {
                id: "c",
                kind: "portrait",
                media: <Media papel="video" indice={2} className="size-full" />,
                name: PEOPLE[3].name,
                role: "Produto @ Casa Vinte",
                onPlay: () => {},
              },
              {
                id: "d",
                kind: "quote",
                tone: "muted",
                quote:
                  "O time é atento e responde rápido quando entram revisão e projeto novo no mesmo dia.",
                author: PEOPLE[2].name,
                role: "Oficina Bandeira",
              },
              {
                id: "e",
                kind: "stat",
                tone: "muted",
                value: "4,9/5",
                label: "Nota média de quem já contratou",
              },
            ]}
          />
        </div>
      </Dobra>

      <Dobra className="border-t border-border">
        <SectionIntro eyebrow="Acervo" title="O que sai daqui" />

        <div className="mt-7 flex flex-wrap gap-2">
          {["Tudo", "Marca", "Site", "Impresso"].map((t, i) => (
            <Chip key={t} pressed={i === 0} count={[24, 11, 8, 5][i]}>
              {t}
            </Chip>
          ))}
        </div>

        {/* Estante, trilho e mosaico: as três formas de mostrar acervo que o kit
            traz, na mesma dobra, para a escolha ser por olho e não por nome. */}
        <div className="mt-7 flex flex-wrap items-end gap-6">
          {LIVROS.map((t, i) => (
            <SpineCard
              key={t}
              index={i}
              href="#"
              title={t}
              action="ver →"
              className="w-[150px]"
              cover={
                <div className="relative aspect-[2/3] w-full">
                  <CoverArt title={t} seed={t} family="book" />
                </div>
              }
            />
          ))}
        </div>

        <div className="mt-9">
          <Rail itemWidth={150} gap={12} label="Produtos">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Plate key={i} ratio="4/5">
                <Media papel="textura" indice={i} className="size-full" />
              </Plate>
            ))}
          </Rail>
        </div>

        <div className="mt-9">
          <MasonryGallery
            items={acervo}
            cols={3}
            gap={10}
            getKey={(it) => it.i}
            renderItem={(it) => (
              <Media
                papel={it.papel}
                indice={it.indice}
                ratio={it.ratio}
                className="rounded-[var(--r-control,0.5rem)] border border-border"
              />
            )}
          />
        </div>
      </Dobra>

      <Dobra className="border-t border-border">
        <CtaSurface
          variant="panel"
          tone="ink"
          title="Vamos construir algo que compete"
          lead="Marca, site e produto por um time sênior. Começa por uma conversa de estratégia."
          actions={<CtaAction>Agendar conversa</CtaAction>}
        />
      </Dobra>
    </div>
  );
}
