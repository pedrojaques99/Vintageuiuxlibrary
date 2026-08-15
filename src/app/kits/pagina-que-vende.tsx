"use client";

/**
 * Página que vende — as 16 peças de aquisição na ordem em que uma landing usa.
 *
 * Este kit é o que mais sofria na vitrine solta: `count-up` sozinho é um número
 * animado (bonito e inútil), `measure-bar` sozinho é uma barrinha, `spine-card`
 * sozinho é um card torto. Juntos, em ordem, eles são uma página inteira, e é a
 * página que a pessoa quer, não o número.
 *
 * ── O defeito que esta versão mata ──────────────────────────────────────────
 *
 * A composição inteira morava dentro de `overflow-hidden rounded border bg-*`
 * DENTRO da sala, que já é superfície. Com a casca, o card da sala e o palco,
 * dava quatro molduras antes da primeira peça, e sobrava um filete claro entre
 * a borda arredondada e o herói preto. Uma landing não mora num card: ela é uma
 * sequência de dobras que sangram de ponta a ponta. Agora quem troca o chão
 * entre as dobras é `Faixa` (`kits/sala.tsx`), não uma caixa nova.
 *
 * ── A ordem, e por que ela não é decorativa ─────────────────────────────────
 *
 * promessa → categoria → serviço → passos → número → prova → acervo → chamada.
 * É a cascata de `revenue-centric-design`: quem chega está em algum degrau da
 * escada de consciência de Schwartz, e cada dobra empurra um degrau. Tirar uma
 * do meio quebra a costura, e é por isso que o kit se instala inteiro. Cada
 * dobra abaixo declara, no comentário, a alavanca que usa e a variável que move.
 *
 * O rótulo de cada dobra carrega as peças como `PecaTag`: o nome é o botão que
 * copia o `add` daquela peça. Dá pra levar a página inteira pelo comando do
 * cabeçalho, ou uma dobra de cada vez pelo nome.
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
import { MasonryGallery } from "../../../registry/visant/ui/masonry-gallery";
import { Plate } from "../../../registry/visant/ui/plate";
import { Rail } from "../../../registry/visant/ui/rail";
import { Chip } from "../../../registry/visant/ui/chip";
import { CtaSurface, CtaAction } from "../../../registry/visant/ui/cta-surface";
import { Media, proporcao } from "../media";
import { PEOPLE } from "../demo-fixtures";
import { Atos, Bloco, Faixa, Fecho } from "./sala";

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

/**
 * O relógio da loja, em português.
 *
 * `store-status` vem com rótulo em inglês de fábrica, porque a peça não tem
 * idioma. Deixar o padrão passar era a única linha em inglês de uma landing
 * brasileira, no topo da dobra mais cara da página.
 */
const HORARIO = {
  open: (c: number) => `Atende agora até as ${c}h`,
  closed: (o: number) => `Volta a atender às ${o}h`,
};

export default function PaginaQueVende() {
  const acervo = React.useMemo(
    () => ACERVO.map((it, i) => ({ ...it, i, ratio: proporcao(it.papel, it.indice) })),
    [],
  );

  return (
    <Atos>
      {/* A abertura saiu. Numa sala que é uma LANDING, um parágrafo de vitrine
          antes do herói é a pior coisa possível: ele empurra a promessa para
          baixo e diz em prosa o que as oito dobras provam em seguida. */}
      {/*
        DOBRA 1 · promessa → move a taxa de conversão.

        Alavanca: *pass the 5-second test* somada a *neutrality is omission*. A
        headline nomeia a TAREFA que a pessoa foi ali resolver ("colocar a marca
        de pé"), não o estado dela, e existe UMA ação primária na dobra. A linha
        miúda embaixo do botão é o *click trigger*: responde o que acontece
        depois do clique antes de a pessoa precisar imaginar.

        `px-0` na faixa: o herói é o único bloco que precisa do fundo colado na
        borda. Com o respiro da faixa por fora, sobrava o filete claro entre a
        sala e a poeira do `erase-field` que esta versão veio matar.
      */}
      <Bloco
        titulo="Dobra 1: promessa"
        pecas={["erase-field", "store-status", "repulsive-hover"]}
        nota="Passa a mão sobre o fundo: a poeira sai onde o cursor anda."
      >
        {/*
          `dark` no herói, e não no documento.

          O `erase-field` pinta poeira escura sobre luz de marca; ele nasceu numa
          dobra de CTA preta e é lá que funciona. Com os tokens claros do papel a
          promessa saía preta sobre preto e só aparecia depois que a pessoa
          raspasse, que é o pior defeito possível numa dobra de herói.
        */}
        <Faixa tom="recuo" className="dark px-0 text-foreground sm:px-0">
          <EraseField className="relative grid min-h-[380px] place-items-center bg-[var(--background)] px-6 py-14 text-center sm:px-10">
            <div className="relative z-10 mx-auto max-w-2xl">
              <div className="mb-5 flex justify-center">
                <StoreStatus
                  timeZone="America/Sao_Paulo"
                  openHour={9}
                  closeHour={18}
                  labels={HORARIO}
                />
              </div>
              <h2
                className="text-[clamp(1.8rem,4.5vw,3rem)] font-semibold leading-[1.04] tracking-[-0.03em]"
                style={{ fontFamily: "var(--font-display, inherit)" }}
              >
                Coloque a marca de pé sem juntar cinco fornecedores.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-corpo leading-relaxed text-muted-foreground">
                Estratégia, identidade, site e produto saem do mesmo time. Nada é repassado pra
                fora no meio do caminho.
              </p>
              <div className="mt-7 flex justify-center">
                <RepulsiveHover strength={8} radius={160}>
                  <span
                    className="inline-block rounded-[var(--r-pill,9999px)] px-6 py-3 text-corpo font-medium"
                    style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}
                  >
                    Agendar 30 minutos
                  </span>
                </RepulsiveHover>
              </div>
              <p className="mt-3 text-apoio text-muted-foreground">
                Resposta no mesmo dia útil. A conversa não vira proposta sem você pedir.
              </p>
            </div>
          </EraseField>
        </Faixa>
      </Bloco>

      {/*
        DOBRA 2 · categoria → move a qualificação do lead.

        Alavanca: *cut CAC by filtering on the landing page*. Seis palavras
        dizem em um segundo o que a casa faz e, principalmente, o que ela não
        faz. Quem procura tráfego pago lê "EMBALAGEM" e sai antes de virar uma
        reunião que não fecha.

        Duas faixas em sentidos opostos: uma só lê como enfeite, duas leem como
        sistema. A peça já carrega `overflow-hidden`, então a faixa sangrada não
        estoura o documento no celular.
      */}
      <Bloco
        titulo="Dobra 2: categoria"
        pecas={["marquee"]}
        nota="O scroll acelera a faixa e inverte o sentido dela."
      >
        <Faixa tom="recuo" className="px-0 py-1 sm:px-0">
          <Marquee
            band
            speed={38}
            items={PALAVRAS.map((p) => (
              <span key={p} className="font-mono text-rotulo tracking-[0.14em]">
                {p}
              </span>
            ))}
          />
          <Marquee
            reverse
            speed={46}
            fade
            className="py-2.5"
            items={PALAVRAS.map((p) => (
              <span key={p} className="font-mono text-rotulo tracking-[0.14em] text-muted-foreground">
                {p}
              </span>
            ))}
          />
        </Faixa>
      </Bloco>

      {/*
        DOBRA 3 · serviço → move a taxa de conversão.

        Alavanca: *specificity is the difference between decoration and
        persuasion*. Os títulos dos cards descrevem a TRANSFORMAÇÃO ("site que
        carrega rápido e converte"), nunca a categoria ("desenvolvimento web").
        As tags embaixo fazem o trabalho que a lista de features faria, sem
        gastar uma dobra inteira com ela.
      */}
      <Bloco titulo="Dobra 3: serviço" pecas={["section-intro", "showcase-card"]}>
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
      </Bloco>

      {/*
        DOBRA 4 · passos → move o custo percebido de começar.

        Alavanca: *construal level* aplicado ao esforço. Entre a promessa e o
        preço mora a pergunta "quanto trabalho isso me dá?". Três passos com
        prazo escrito respondem antes que ela vire objeção na reunião. O prazo
        no lead é número cru, e é o que a dobra tem de mais caro.
      */}
      <Bloco titulo="Dobra 4: passos" pecas={["step-cards"]}>
        <SectionIntro
          eyebrow="Como funciona"
          title="Três passos, sem mistério"
          lead="Do pedido ao primeiro entregável em sete dias."
        />
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
      </Bloco>

      {/*
        DOBRA 5 · número → move a credibilidade da promessa.

        Alavanca: *your promise is the size of your proof*. `count-up` apura o
        número e `measure-bar` diz de quanto ele é: juntos são prova, separados
        são enfeite e afirmação sem denominador. A terceira barra é o estado
        desconhecido, e ela está aqui de propósito: dado que a API não devolveu
        aparece tracejado, nunca como zero, porque uma UI que mente pro banco
        corrompe a métrica pela qual a própria página é julgada.

        Chão trocado nesta dobra. Depois de duas dobras de foto, o degrau de
        superfície é o que faz o número parecer um dado apurado e não mais um
        card. É separação por chão, sem desenhar caixa.
      */}
      <Bloco
        titulo="Dobra 5: número"
        pecas={["count-up", "measure-bar"]}
        nota="A terceira barra é o dado que não chegou. Tracejado, e não zero."
      >
        <Faixa tom="recuo" className="py-8 sm:py-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
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
            {/* `value` escrito por extenso, e não um travessão de tabela: o
                glifo de "sem dado" só é convenção pra quem já leu a legenda, e
                aqui não há legenda. */}
            <MeasureBar
              value="sem dado"
              qualifier="a API não respondeu"
              state="unknown"
              label="Em rota"
            />
          </div>
        </Faixa>
      </Bloco>

      {/*
        DOBRA 6 · prova → move a confiança antes do clique.

        Alavanca: *aim for 4.2–4.5 stars, not a perfect 5*. Nota redonda lê como
        catálogo comprado. Aqui a média é 4,4 com a contagem de avaliações ao
        lado, e o depoimento de 4 estrelas conta um atraso. A parede mistura
        citação, número e retrato porque prova de um formato só vira padrão e o
        olho para de ler.
      */}
      <Bloco titulo="Dobra 6: prova" pecas={["testimonial-wall"]}>
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
                  "O time é atento e responde rápido. A primeira rodada de identidade atrasou uma semana, e avisaram antes.",
                author: PEOPLE[2].name,
                role: "Oficina Bandeira",
                rating: 4,
              },
              {
                id: "e",
                kind: "stat",
                tone: "muted",
                value: "4,4/5",
                label: "Nota média de quem já contratou",
                footnote: "89 avaliações",
              },
            ]}
          />
        </div>
      </Bloco>

      {/*
        DOBRA 7 · acervo → move a percepção de padrão.

        Alavanca: *image superiority*. Depois do número e do depoimento, o que
        fecha o argumento é o trabalho na tela. Estante, trilho e mosaico são as
        três formas de mostrar acervo que o kit traz, na mesma dobra, para a
        escolha de quem copia ser por olho e não por nome.

        As capas saem do banco de mídia e não do `cover-art`. `cover-art` é peça
        da família `trabalho`: usar aqui deixaria a sala bonita e o comando do
        kit incompleto, porque quem copiasse a dobra receberia uma capa vazia.
      */}
      <Bloco
        titulo="Dobra 7: acervo"
        pecas={["chip", "spine-card", "rail", "plate", "masonry-gallery"]}
        nota="Estante, trilho e mosaico: três jeitos de mostrar a mesma pasta."
      >
        <SectionIntro eyebrow="Acervo" title="O que sai daqui" />

        <div className="mt-7 flex flex-wrap gap-2">
          {["Tudo", "Marca", "Site", "Impresso"].map((t, i) => (
            <Chip key={t} pressed={i === 0} count={[24, 11, 8, 5][i]}>
              {t}
            </Chip>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-end gap-6">
          {LIVROS.map((t, i) => (
            <SpineCard
              key={t}
              index={i}
              href="#"
              title={t}
              action="ver"
              className="w-[150px]"
              cover={<Media papel="textura" indice={i + 2} ratio="2/3" className="w-full" />}
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
      </Bloco>

      {/*
        DOBRA 8 · chamada → move a taxa de conversão, de novo.

        Alavanca: *write the CTA microcopy, not the button color*, com a
        redundância que a mesma fonte recomenda. É o MESMO rótulo do herói, e de
        propósito: duas chamadas com textos diferentes na mesma página viram duas
        ofertas na cabeça de quem lê. O `footnote` responde as duas perguntas que
        sobram antes do clique, prazo de resposta e compromisso.
      */}
      <Bloco titulo="Dobra 8: chamada" pecas={["cta-surface"]}>
        <CtaSurface
          variant="panel"
          tone="ink"
          title="Comece pela conversa de estratégia"
          lead="Marca, site e produto por um time sênior, com escopo fechado na primeira semana."
          actions={<CtaAction>Agendar 30 minutos</CtaAction>}
          footnote="Resposta no mesmo dia útil. A conversa não vira proposta sem você pedir."
        />
      </Bloco>

      <Fecho>
        Este kit entrega as oito dobras e a costura entre elas. Os números, os depoimentos e as
        fotos aqui são de mentira, e é você que troca.
      </Fecho>
    </Atos>
  );
}
