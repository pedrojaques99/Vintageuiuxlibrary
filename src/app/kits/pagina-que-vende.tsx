"use client";

/**
 * Página que vende: o kit montado como o site de um estúdio de exemplo.
 *
 * A versão anterior tinha "Dobra 1: promessa", "Dobra 2: categoria" em cima de
 * cada trecho e uma frase de vitrine no fim. O dono leu como documentação, e
 * estava certo: a pessoa não entendia que era uma página montada pra ver as
 * peças em ação. Agora é um site normal, numa janela de navegador, do menu ao
 * rodapé. Nenhum rótulo técnico: quem quer saber qual peça desenha a dobra passa
 * o mouse (`Pecas`, em `sala.tsx`) e copia o comando ali mesmo.
 *
 * A ordem das dobras continua a de quem converte (promessa, categoria, serviço,
 * passos, número, prova, acervo, chamada), só que ela não é mais anunciada: é
 * vivida. O estúdio "Faro" e os clientes citados são inventados.
 */

import * as React from "react";
import { ArrowRight } from "lucide-react";

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
import {
  NavDrawer,
  NavDrawerBurger,
  NavDrawerClose,
  NavDrawerContent,
  NavDrawerItem,
  NavDrawerList,
  NavDrawerTrigger,
} from "../../../registry/visant/ui/nav-drawer";
import { Media, proporcao } from "../media";
import { Janela, Pecas } from "./sala";

const PALAVRAS = ["MARCA", "SITE", "PRODUTO", "CAMPANHA", "EMBALAGEM", "MOTION"];

const LINKS = ["Serviços", "Como funciona", "Trabalhos", "Loja"];

type Papel = "cena" | "retrato" | "textura";

const ACERVO: { papel: Papel; indice: number }[] = [
  { papel: "cena", indice: 0 },
  { papel: "retrato", indice: 1 },
  { papel: "textura", indice: 0 },
  { papel: "cena", indice: 3 },
  { papel: "retrato", indice: 4 },
  { papel: "cena", indice: 5 },
  { papel: "textura", indice: 2 },
  { papel: "retrato", indice: 2 },
];

const FILTROS: { id: "tudo" | Papel; rotulo: string }[] = [
  { id: "tudo", rotulo: "Tudo" },
  { id: "cena", rotulo: "Marca" },
  { id: "retrato", rotulo: "Pessoas" },
  { id: "textura", rotulo: "Impresso" },
];

const LIVROS = ["Marca em 9 etapas", "O método do lote", "Imersão"];

const LOJA = [
  { nome: "Pôster Norte", preco: "R$ 120" },
  { nome: "Caderno Faro", preco: "R$ 68" },
  { nome: "Cartaz Maré", preco: "R$ 140" },
  { nome: "Kit de cartões", preco: "R$ 45" },
  { nome: "Pôster Duna", preco: "R$ 120" },
  { nome: "Calendário 2027", preco: "R$ 89" },
];

/** O relógio da loja em português: a peça vem com rótulo em inglês de fábrica. */
const HORARIO = {
  open: (c: number) => `Atende agora até as ${c}h`,
  closed: (o: number) => `Volta a atender às ${o}h`,
};

function Wordmark() {
  return (
    <span
      className="text-[1.15rem] font-semibold tracking-[-0.03em]"
      style={{ fontFamily: "var(--font-display, inherit)" }}
    >
      faro<span className="text-muted-foreground">.</span>
    </span>
  );
}

/** Dobra de site: largura de leitura e respiro de página, sem moldura. */
function Dobra({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`px-5 py-14 sm:px-10 sm:py-20 ${className ?? ""}`}>
      {children}
    </section>
  );
}

export default function PaginaQueVende() {
  const [filtro, setFiltro] = React.useState<(typeof FILTROS)[number]["id"]>("tudo");
  const acervo = React.useMemo(
    () =>
      ACERVO.map((it, i) => ({ ...it, i, ratio: proporcao(it.papel, it.indice) })).filter(
        (it) => filtro === "tudo" || it.papel === filtro,
      ),
    [filtro],
  );
  const contar = (id: (typeof FILTROS)[number]["id"]) =>
    id === "tudo" ? ACERVO.length : ACERVO.filter((a) => a.papel === id).length;

  return (
    <Janela endereco="faro.studio">
      {/* menu do site */}
      <header className="flex items-center gap-6 border-b border-border px-5 py-3.5 sm:px-10">
        <Wordmark />
        <nav aria-label="Menu do site" className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="rounded-sm text-apoio text-muted-foreground outline-none transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:text-foreground focus-visible:[box-shadow:var(--focus)]"
            >
              {l}
            </a>
          ))}
        </nav>
        <span className="ml-auto hidden md:inline">
          <Pecas nomes={["cta-surface"]} canto="base-fim">
            <span data-tone="surface">
              <CtaAction className="min-h-9 px-4 py-1.5 text-[14px]">Agendar conversa</CtaAction>
            </span>
          </Pecas>
        </span>
        <span className="ml-auto md:hidden">
          <Pecas nomes={["nav-drawer"]} canto="base-fim">
            <NavDrawer>
              <NavDrawerTrigger asChild>
                <NavDrawerBurger label="Abrir o menu" />
              </NavDrawerTrigger>
              <NavDrawerContent title="Menu do site" brand={<Wordmark />}>
                <NavDrawerList>
                  {LINKS.map((l) => (
                    <NavDrawerClose asChild key={l}>
                      <NavDrawerItem href="#" onClick={(e) => e.preventDefault()}>
                        {l}
                      </NavDrawerItem>
                    </NavDrawerClose>
                  ))}
                </NavDrawerList>
              </NavDrawerContent>
            </NavDrawer>
          </Pecas>
        </span>
      </header>

      {/* promessa: o herói escuro em que a mão raspa a poeira */}
      <Pecas nomes={["erase-field", "store-status", "repulsive-hover"]} className="dark text-foreground">
        <EraseField className="relative grid min-h-[440px] place-items-center bg-[var(--background)] px-6 py-16 text-center sm:px-10">
          <div className="relative z-10 mx-auto max-w-2xl">
            <div className="mb-6 flex justify-center">
              <StoreStatus timeZone="America/Sao_Paulo" openHour={9} closeHour={18} labels={HORARIO} />
            </div>
            <h1
              className="text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.035em]"
              style={{ fontFamily: "var(--font-display, inherit)" }}
            >
              Coloque a marca de pé sem juntar cinco fornecedores.
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-corpo leading-relaxed text-muted-foreground">
              Estratégia, identidade, site e produto saem do mesmo time. Nada é repassado pra fora
              no meio do caminho.
            </p>
            <div className="mt-8 flex justify-center">
              <RepulsiveHover strength={8} radius={160}>
                <span
                  className="inline-flex items-center gap-2 rounded-[var(--r-pill,9999px)] px-6 py-3 text-corpo font-medium"
                  style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}
                >
                  Agendar 30 minutos
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </RepulsiveHover>
            </div>
            <p className="mt-3 text-apoio text-muted-foreground">
              Resposta no mesmo dia útil. A conversa não vira proposta sem você pedir.
            </p>
          </div>
        </EraseField>
      </Pecas>

      {/* categoria */}
      <Pecas nomes={["marquee"]} className="border-b border-border py-1">
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
      </Pecas>

      {/* serviço */}
      <Dobra id="servicos">
        <Pecas nomes={["section-intro"]}>
          <SectionIntro
            eyebrow="Serviços"
            title="O que a gente entrega"
            lead="Três frentes que se sustentam sozinhas e ficam melhores juntas."
          />
        </Pecas>
        <Pecas nomes={["showcase-card"]} className="mt-10">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        </Pecas>
      </Dobra>

      {/* passos */}
      <Dobra id="como-funciona" className="bg-[color-mix(in_oklab,var(--background)_92%,var(--foreground)_5%)]">
        <SectionIntro
          eyebrow="Como funciona"
          title="Três passos, sem mistério"
          lead="Do pedido ao primeiro entregável em sete dias."
        />
        <Pecas nomes={["step-cards"]} className="mt-10">
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
        </Pecas>
      </Dobra>

      {/* número */}
      <Dobra>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <Pecas nomes={["count-up"]}>
            <CountUp className="block text-[2.6rem] font-semibold leading-none tracking-tight">
              1.291
            </CountUp>
            <p className="mt-2 text-apoio text-muted-foreground">Projetos entregues em 6 anos</p>
          </Pecas>
          <Pecas nomes={["measure-bar"]}>
            <MeasureBar value="9 em 10" qualifier="dos projetos no prazo" ratio={0.9} label="Entrega" />
          </Pecas>
          <Pecas nomes={["measure-bar"]}>
            <MeasureBar
              value="68%"
              qualifier="dos clientes voltam no ano seguinte"
              ratio={0.68}
              label="Recompra"
            />
          </Pecas>
        </div>
      </Dobra>

      {/* prova */}
      <Dobra className="pt-0 sm:pt-0">
        <SectionIntro eyebrow="Quem contratou" title="O que dizem depois da entrega" />
        <Pecas nomes={["testimonial-wall"]} className="mt-10">
          <TestimonialWall
            columns={3}
            items={[
              {
                id: "a",
                kind: "quote",
                headline: "Rápido e fácil de trabalhar junto",
                quote:
                  "Entenderam o que a gente precisava e entregaram no padrão em projetos bem diferentes entre si.",
                author: "Ana Reis",
                role: "Marketing, Padaria Miolo",
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
                name: "Marina Alves",
                role: "Produto, Clínica Alvo",
                onPlay: () => {},
              },
              {
                id: "d",
                kind: "quote",
                tone: "muted",
                quote:
                  "O time é atento e responde rápido. A primeira rodada de identidade atrasou uma semana, e avisaram antes.",
                author: "Caio Duarte",
                role: "Editora Pátio",
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
        </Pecas>
      </Dobra>

      {/* acervo */}
      <Dobra id="trabalhos" className="bg-[color-mix(in_oklab,var(--background)_92%,var(--foreground)_5%)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionIntro eyebrow="Trabalhos" title="O que sai daqui" />
          <Pecas nomes={["chip"]}>
            <div className="flex flex-wrap gap-2">
              {FILTROS.map((f) => (
                <Chip key={f.id} pressed={filtro === f.id} count={contar(f.id)} onClick={() => setFiltro(f.id)}>
                  {f.rotulo}
                </Chip>
              ))}
            </div>
          </Pecas>
        </div>
        <Pecas nomes={["masonry-gallery"]} className="mt-8">
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
                className="rounded-[var(--r-control,0.5rem)]"
              />
            )}
          />
        </Pecas>
      </Dobra>

      {/* publicações e loja */}
      <Dobra id="loja">
        <div className="grid gap-12 lg:grid-cols-[auto_1fr] lg:gap-16">
          <div>
            <h3 className="text-destaque font-medium">Publicações</h3>
            <p className="mt-1 text-apoio text-muted-foreground">O método, por escrito.</p>
            <Pecas nomes={["spine-card"]} className="mt-6">
              <div className="flex flex-wrap items-end gap-5">
                {LIVROS.map((t, i) => (
                  <SpineCard
                    key={t}
                    index={i}
                    href="#"
                    title={t}
                    action="ler"
                    className="w-[132px]"
                    cover={<Media papel="textura" indice={i + 2} ratio="2/3" className="w-full" />}
                  />
                ))}
              </div>
            </Pecas>
          </div>
          <div className="min-w-0">
            <h3 className="text-destaque font-medium">Loja</h3>
            <p className="mt-1 text-apoio text-muted-foreground">Impressos feitos aqui, em tiragem curta.</p>
            <Pecas nomes={["rail", "plate"]} className="mt-6">
              <Rail itemWidth={160} gap={14} label="Produtos da loja">
                {LOJA.map((p, i) => (
                  <a key={p.nome} href="#" onClick={(e) => e.preventDefault()} className="block rounded-[var(--r-control,0.5rem)] outline-none focus-visible:[box-shadow:var(--focus)]">
                    <Plate ratio="4/5">
                      <Media papel="textura" indice={i} className="size-full" />
                    </Plate>
                    <span className="mt-2 flex items-baseline justify-between gap-2 text-apoio">
                      <span className="truncate">{p.nome}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{p.preco}</span>
                    </span>
                  </a>
                ))}
              </Rail>
            </Pecas>
          </div>
        </div>
      </Dobra>

      {/* chamada */}
      <Dobra className="pt-0 sm:pt-0">
        <Pecas nomes={["cta-surface"]}>
          <CtaSurface
            variant="panel"
            tone="ink"
            title="Comece pela conversa de estratégia"
            lead="Marca, site e produto por um time sênior, com escopo fechado na primeira semana."
            actions={<CtaAction>Agendar 30 minutos</CtaAction>}
            footnote="Resposta no mesmo dia útil. A conversa não vira proposta sem você pedir."
          />
        </Pecas>
      </Dobra>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border px-5 py-6 text-apoio text-muted-foreground sm:px-10">
        <Wordmark />
        <span>Rua das Flores, 120 · São Paulo</span>
        <span>oi@faro.studio</span>
        <span className="sm:ml-auto">© 2026 Faro Estúdio</span>
      </footer>
    </Janela>
  );
}
