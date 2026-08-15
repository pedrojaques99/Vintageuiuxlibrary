"use client";

/**
 * O catálogo do registry — um item, uma linha, uma demo viva.
 *
 * A vitrine anterior mostrava só o kit vintage, e o resto da library existia
 * apenas dentro do `registry.json`. Item que não se vê não se reusa: a pessoa
 * reescreve o marquee porque não sabia que tinha um.
 *
 * Regra desta lista: **a demo é o componente de verdade**, importado do mesmo
 * arquivo que o `shadcn add` entrega. Nada de captura de tela nem de reimplementação
 * "só para a vitrine" — a vitrine que mente é pior que vitrine nenhuma, porque
 * some a diferença entre o que está publicado e o que funciona.
 */

import * as React from "react";
import { Filter, Layers, Ruler, SlidersHorizontal } from "lucide-react";

import { useStageActive } from "./stage";
import { Media, type Papel } from "./media";
import { depKeysOf } from "./deps";
import { PAD_VOICES, PEOPLE } from "./demo-fixtures";

import { Chip } from "../../registry/visant/ui/chip";
import { SegmentedControl } from "../../registry/visant/ui/segmented-control";
import { StatusTicker } from "../../registry/visant/ui/status-ticker";
import { GlitchChars } from "../../registry/visant/ui/glitch-chars";
import { WorkingGlyph } from "../../registry/visant/ui/working-glyph";
import { PaperShuttle } from "../../registry/visant/ui/paper-shuttle";
import { OctahedronLoader } from "../../registry/visant/ui/octahedron-loader";
import { ScrubInput } from "../../registry/visant/ui/scrub-input";
import { InlineEdit } from "../../registry/visant/ui/inline-edit";
import { SectionIntro } from "../../registry/visant/ui/section-intro";
import { CtaSurface, CtaAction } from "../../registry/visant/ui/cta-surface";
import { EraseField } from "../../registry/visant/ui/erase-field";
import { SpringDots } from "../../registry/visant/ui/spring-dots";
import { SfxToggle } from "../../registry/visant/ui/sfx-toggle";
import { MeasureBar } from "../../registry/visant/ui/measure-bar";
import { EmptyState } from "../../registry/visant/ui/empty-state";
import { PhotoFrame } from "../../registry/visant/ui/photo-frame";
import { PhotoFlip } from "../../registry/visant/ui/photo-flip";
import { MagneticCta } from "../../registry/visant/ui/magnetic-cta";
import {
  NavDrawer,
  NavDrawerTrigger,
  NavDrawerContent,
  NavDrawerList,
  NavDrawerItem,
  NavDrawerClose,
  NavDrawerBurger,
} from "../../registry/visant/ui/nav-drawer";
import { SimSlider } from "../../registry/visant/ui/sim-slider";
import { TestimonialWall } from "../../registry/visant/blocks/testimonial-wall";

import { VintageLargeKnob } from "../../registry/vintage/ui/vintage-large-knob";
import { VintageButton } from "../../registry/vintage/ui/vintage-button";
import { VintageEQ } from "../../registry/vintage/ui/vintage-eq";
import { VintageToggle } from "../../registry/vintage/ui/vintage-toggle";
import { VintageTvFrame } from "../../registry/vintage/ui/vintage-tv-frame";
import { VintageSoundboardPad } from "../../registry/vintage/ui/vintage-soundboard-pad";
import { VintageXYPad } from "../../registry/vintage/ui/vintage-xy-pad";
/*
 * As demos que moram em arquivo próprio.
 *
 * Todas exportam default. O import é estático — o `React.lazy` fica só para
 * quem carrega peso que a grade inteira não usa (o @dnd-kit do board) ou que
 * mora no meio da lista (marquee, pinned-scene). Fatiar as outras não pagaria:
 * o GSAP já entra no primeiro chunk pelas demos que continuam inline aqui
 * (`PhotoFrameDemo`, `PhotoFlipDemo`), então um chunk a mais só somaria
 * requisição sem tirar byte do caminho crítico.
 */
import AssigneeStackDemo from "./demos/assignee-stack-demo";
import BrandSelectorDemo from "./demos/brand-selector-demo";
import ChipDemo from "./demos/chip-demo";
import CountUpDemo from "./demos/count-up-demo";
import CoverArtDemo from "./demos/cover-art-demo";
import DropOverlayDemo from "./demos/drop-overlay-demo";
import FoldMotionDemo from "./demos/fold-motion-demo";
import GleamDemo from "./demos/gleam-demo";
import GridDotsDemo from "./demos/grid-dots-demo";
import LineRevealDemo from "./demos/line-reveal-demo";
import LoadingGalleryDemo from "./demos/loading-gallery-demo";
import LogoWallDemo from "./demos/logo-wall-demo";
import MasonryGalleryDemo from "./demos/masonry-gallery-demo";
import MeasurePickerDemo from "./demos/measure-picker-demo";
import PhotoCompareDemo from "./demos/photo-compare-demo";
import PhotoSplitDemo from "./demos/photo-split-demo";
import PlateDemo from "./demos/plate-demo";
import PointerParallaxDemo from "./demos/use-pointer-parallax-demo";
import QuoteBlockDemo from "./demos/quote-block-demo";
import RailDemo from "./demos/rail-demo";
import ReelsRailDemo from "./demos/reels-rail-demo";
import RepulsiveHoverDemo from "./demos/repulsive-hover-demo";
import ShowcaseCardDemo from "./demos/showcase-card-demo";
import SideNavDemo from "./demos/side-nav-demo";
import AuthButtonDemo from "./demos/auth-button-demo";
import ProfileFormDemo from "./demos/profile-form-demo";
import EmptyStateDemo from "./demos/empty-state-demo";
import PhotoFrameDemo from "./demos/photo-frame-demo";
import PhotoFlipDemo from "./demos/photo-flip-demo";
import VintageParametricEqDemo from "./demos/vintage-parametric-eq-demo";
import VintageOscilloscopeDemo from "./demos/vintage-oscilloscope-demo";
import SkeletonRailDemo from "./demos/skeleton-rail-demo";
import SpineCardDemo from "./demos/spine-card-demo";
import StepCardsDemo from "./demos/step-cards-demo";
import StickyFilterbarDemo from "./demos/sticky-filterbar-demo";
import StoreStatusDemo from "./demos/store-status-demo";
import TimelineDemo from "./demos/timeline-demo";
import TurbulenceFieldDemo from "./demos/turbulence-field-demo";
import VintageKnobDemo from "./demos/vintage-knob-demo";
import VintageLedDemo from "./demos/vintage-led-demo";
import VintageMeterDemo from "./demos/vintage-meter-demo";
import VintageSliderDemo from "./demos/vintage-slider-demo";

export type Family = "trabalho" | "aquisicao" | "motion" | "marca" | "vintage" | "fundacao";

export interface CatalogItem {
  /** Nome no registry — é o que vai no `shadcn add @visant/<name>`. */
  name: string;
  title: string;
  type: "ui" | "block" | "lib" | "hook" | "theme" | "base";
  family: Family;
  description: string;
  tags: string[];
  /** Demo viva. Ausente = item sem superfície visual própria (lib, tema, hook). */
  demo?: () => React.ReactNode;
  /**
   * Tamanho natural da demo, em px. O palco desenha nesse tamanho e escala para
   * caber — declarar aqui é o que impede a peça grande de aparecer cortada.
   */
  preview?: { w: number; h: number };
}

/** Palco padrão de quem não declara tamanho: cabe knob, chip, badge, loader. */
export const DEFAULT_PREVIEW = { w: 380, h: 190 };

export const previewOf = (item: CatalogItem) => item.preview ?? DEFAULT_PREVIEW;

/**
 * O fundo do palco.
 *
 * O kit vintage é skeuomórfico: knob de alumínio, LED com halo, fader gravado
 * no metal. Essas peças foram desenhadas para viver sobre um painel escuro, e
 * sobre o papel claro da marca elas viram adesivo recortado — sem sombra que
 * feche, sem o contraste que faz o LED acender. Aqui elas ganham a superfície
 * onde fazem sentido, a mesma da bancada.
 *
 * O resto do registry é o contrário: lê o token da marca e tem de aparecer
 * exatamente sobre o fundo do projeto de quem instala. Esse é o palco neutro.
 */
export const stageSurfaceOf = (item: CatalogItem) =>
  item.family === "vintage"
    ? {
        background:
          "radial-gradient(120% 100% at 50% 0%, var(--vintage-surface-2), var(--vintage-surface-1))",
      }
    : undefined;

/**
 * Como cada tipo se escreve na tela. Fonte única: a grade, a lista e a ficha de
 * foco mostram o mesmo rótulo porque leem daqui, não porque alguém lembrou.
 */
export const TYPE_LABEL: Record<CatalogItem["type"], string> = {
  ui: "ui",
  block: "block",
  lib: "lib",
  hook: "hook",
  theme: "theme",
  base: "base",
};

export const FAMILIES: { key: Family; label: string }[] = [
  { key: "trabalho", label: "Superfície de trabalho" },
  { key: "aquisicao", label: "Aquisição" },
  { key: "motion", label: "Motion e estado" },
  { key: "marca", label: "Marca" },
  { key: "vintage", label: "Kit vintage" },
  { key: "fundacao", label: "Fundação" },
];

export const familyLabel = (key: Family) => FAMILIES.find((f) => f.key === key)?.label ?? key;

/** Busca sem acento dos dois lados — em pt-BR ninguém digita cedilha correndo. */
export const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Corta a terminação da palavra em português.
 *
 * O arquivo da vitrine promete que quem procura "arrastar" acha o `scrub-input`
 * sem saber o nome dele. A descrição da peça diz "número que se **arrasta**" —
 * e busca por substring não liga uma forma à outra: "arrastar" não está dentro
 * de "arrasta". A promessa era falsa até o teste de regressão flagrar.
 *
 * Isto não é um stemmer de verdade e não precisa ser: corta infinitivo, gerúndio,
 * particípio e plural, que é o que separa a forma digitada da forma escrita num
 * catálogo de 47 itens. Cortar demais só aumenta o recall numa lista pequena;
 * cortar de menos é o que fazia a peça sumir.
 */
const stem = (palavra: string) =>
  palavra.length <= 4
    ? palavra
    : palavra.replace(/(ando|endo|indo|acao|coes|ar|er|ir|as|es|os|am|em|a|e|o|s)$/, "");

const tokens = (texto: string) => fold(texto).split(/[^a-z0-9]+/).filter(Boolean).map(stem);

/** O texto que a busca varre de um item. Um lugar só decide o que é buscável. */
export const haystack = (i: CatalogItem) => {
  // As dependências entram na busca junto com o resto: quem digita "gsap" está
  // perguntando o que puxa gsap, e essa pergunta não tem outra porta na página.
  const bruto = [
    i.name,
    i.title,
    i.description,
    i.type,
    familyLabel(i.family),
    ...i.tags,
    ...depKeysOf(i.name),
  ].join(" ");
  // Os dois: o texto cru (para casar "scrub-in" enquanto se digita) e os radicais
  // (para casar "arrastar" com "arrasta").
  return `${fold(bruto)} ${tokens(bruto).join(" ")}`;
};

// --- utilitários de demo -----------------------------------------------------

const SURFACE = "flex h-full w-full items-center justify-center p-5";

function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${SURFACE} ${className}`}>{children}</div>;
}

/**
 * Relógio das demos animadas. Para quando o palco sai da tela ou a aba é
 * escondida: com uma dúzia de demos em loop, deixar todas correndo o tempo todo
 * era o que fazia a página esquentar a máquina parada numa aba de fundo.
 */
function useTick(ms = 120, fn?: (n: number) => void) {
  const active = useStageActive();
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN((v) => v + 1), ms);
    return () => clearInterval(id);
  }, [ms, active]);
  React.useEffect(() => fn?.(n), [n, fn]);
  return n;
}


// --- demos com estado --------------------------------------------------------

function SegmentedDemo() {
  const [v, setV] = React.useState<"grade" | "lista" | "kanban">("grade");
  return (
    <Frame>
      <SegmentedControl
        value={v}
        onChange={setV}
        aria-label="Visão"
        className="w-full max-w-[260px]"
        options={[
          { value: "grade", label: "Grade" },
          { value: "lista", label: "Lista" },
          { value: "kanban", label: "Kanban" },
        ]}
      />
    </Frame>
  );
}

function ScrubDemo() {
  // Um campo sozinho não mostra o que a peça é: ela existe para a COLUNA de
  // parâmetros de um painel de edição, e é ali que `layout="row"` paga — dois
  // por linha, quatro na altura que antes cabia um.
  const [p, setP] = React.useState(64);
  const [ang, setAng] = React.useState(45);
  const [raio, setRaio] = React.useState(12);
  const [esc, setEsc] = React.useState(1.5);
  return (
    <Frame>
      <div className="grid w-full max-w-[420px] grid-cols-1 gap-1.5 sm:grid-cols-2">
        <ScrubInput
          label="Intensidade"
          kind="percent"
          layout="row"
          value={p}
          min={0}
          max={100}
          hint="arraste na horizontal"
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          onChange={setP}
        />
        <ScrubInput
          label="Ângulo"
          kind="angle"
          layout="row"
          value={ang}
          min={0}
          max={360}
          onChange={setAng}
        />
        <ScrubInput label="Raio" kind="px" layout="row" value={raio} min={0} max={64} onChange={setRaio} />
        <ScrubInput
          label="Escala"
          kind="multiple"
          layout="row"
          value={esc}
          min={0.5}
          max={4}
          onChange={setEsc}
        />
      </div>
    </Frame>
  );
}

function InlineEditDemo() {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState("Campanha Verão 26");
  const [draft, setDraft] = React.useState(value);
  return (
    <Frame>
      <InlineEdit
        isEditing={editing}
        value={<span className="text-destaque font-medium">{value}</span>}
        onStartEdit={() => {
          setDraft(value);
          setEditing(true);
        }}
        onSave={async () => {
          setValue(draft);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded-[var(--r-control,0.5rem)] border border-border bg-background px-2 py-1 text-destaque outline-none"
        />
      </InlineEdit>
    </Frame>
  );
}

const KanbanBoard = React.lazy(() => import("./demos/kanban-demo"));

/**
 * Sob demanda: o @dnd-kit que este board usa pesa mais que o resto da grade
 * inteira e serve um card só. Chega quando o card chega.
 */
function KanbanDemo() {
  return (
    <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-muted/30" />}>
      <KanbanBoard />
    </React.Suspense>
  );
}

function LargeKnobDemo() {
  const [v, setV] = React.useState(6);
  return (
    <Frame>
      <VintageLargeKnob label="VOLUME" value={v} onChange={setV} />
    </Frame>
  );
}


function PadDemo() {
  const [on, setOn] = React.useState<Set<number>>(new Set([1]));
  return (
    <Frame className="grid grid-cols-2 gap-2">
      {PAD_VOICES.slice(0, 4).map((voice, i) => (
        <VintageSoundboardPad
          key={voice.label}
          label={voice.label}
          color={voice.color}
          size={58}
          active={on.has(i)}
          onTrigger={() => setOn((p) => new Set(p).add(i))}
          onRelease={() =>
            setOn((p) => {
              const n = new Set(p);
              n.delete(i);
              return n;
            })
          }
        />
      ))}
    </Frame>
  );
}

function PaperShuttleDemo() {
  // `progress` é 0–100, e não 0–1: com a escala errada a barra vivia colada no
  // zero e a demo parecia uma peça quebrada.
  const [p, setP] = React.useState(10);
  useTick(90, React.useCallback(() => setP((v) => (v > 98 ? 2 : v + 2)), []));
  return (
    <Frame>
      <PaperShuttle progress={p} label="exportando" />
    </Frame>
  );
}

/**
 * O drawer abre em tela cheia mesmo dentro do card, e é assim que tem que ser:
 * ele é um `Dialog` do Radix, portalizado no `body`. Simular a peça dentro da
 * moldura do catálogo pediria `container` no portal e `absolute` no painel — e
 * aí a vitrine mostraria uma coisa que não é a que o `shadcn add` entrega.
 * Vitrine que mente é pior que vitrine nenhuma.
 */
function NavDrawerDemo() {
  const links = [
    ["Início", "01"],
    ["Serviços", "02"],
    ["Portfólio", "03"],
    ["Contato", "04"],
  ] as const;
  return (
    <Frame>
      <NavDrawer>
        <div className="flex items-center gap-3">
          <NavDrawerTrigger asChild>
            <NavDrawerBurger />
          </NavDrawerTrigger>
          <span className="text-[length:var(--text-apoio,0.8125rem)] text-muted-foreground">
            abrir menu
          </span>
        </div>
        <NavDrawerContent
          title="Navegação"
          // O slot da marca existe porque o painel cobre o header inteiro: sem
          // ele, o único momento da navegação em que a marca some da tela é
          // justamente aquele em que a pessoa está escolhendo pra onde ir.
          brand={
            <span className="text-[length:var(--text-destaque,0.9375rem)] font-semibold tracking-[-0.02em] text-foreground">
              Marca
            </span>
          }
          footer={
            <div className="flex items-center justify-between">
              <span>pt-BR</span>
              <span>contato@marca.com</span>
            </div>
          }
        >
          <NavDrawerList>
            {links.map(([label, n], i) => (
              // `NavDrawerClose asChild` em volta do item: em app com router o
              // clique no link não desmonta nada, e o drawer ficaria aberto por
              // cima da rota nova.
              <NavDrawerClose asChild key={label}>
                <NavDrawerItem href="#" meta={n} active={i === 0}>
                  {label}
                </NavDrawerItem>
              </NavDrawerClose>
            ))}
          </NavDrawerList>
        </NavDrawerContent>
      </NavDrawer>
    </Frame>
  );
}

const MarqueeVariantes = React.lazy(() => import("./demos/marquee-demo"));

const CenaPresa = React.lazy(() => import("./demos/pinned-scene-demo"));

/** Mesmo trato do marquee: GSAP só chega quando o card chega. */
function PinnedSceneDemoCard() {
  return (
    <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-muted/30" />}>
      <CenaPresa />
    </React.Suspense>
  );
}

/**
 * Sob demanda: o motor da faixa é GSAP + ScrollTrigger, e importar aqui em cima
 * colocava a biblioteca inteira no primeiro chunk da vitrine — para um card que
 * mora lá pelo meio da lista. Mesmo trato do board: chega quando o card chega.
 */
function MarqueeDemo() {
  return (
    <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-muted/30" />}>
      <MarqueeVariantes />
    </React.Suspense>
  );
}

// --- catálogo ----------------------------------------------------------------

/** Faixa de investimento → receita projetada, com a premissa escrita embaixo. */
function SimSliderDemo() {
  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  return (
    <SimSlider
      className="w-full"
      label="Investimento mensal"
      min={2000}
      max={20000}
      step={500}
      defaultValue={6000}
      format={brl}
      outputs={[
        { label: "Receita projetada", value: (v) => brl(v * 3.2), primary: true },
        { label: "Retorno", value: () => "3,2×" },
      ]}
      ceilingLabel="teto da faixa"
      // A curva é a projeção distribuída em 12 meses, com a rampa de maturação
      // da campanha — série derivada do valor, não pontos bonitos inventados.
      // A escala é a FAIXA inteira (por isso `/ 20000`): arrastar o controle
      // tem que mostrar ganho, não redesenhar a mesma curva cheia.
      curve={(v) =>
        Array.from({ length: 12 }, (_, i) => (v / 20000) * (1 - Math.exp(-(i + 1) / 3.5)))
      }
      assumption="Projeção a partir de ticket médio de R$180 e 2,4% de conversão medidos nos últimos 90 dias. Não é garantia de resultado."
    />
  );
}

export const CATALOG: CatalogItem[] = [
  // ---- marca
  {
    name: "brand-selector",
    title: "Brand Selector",
    type: "ui",
    family: "marca",
    description:
      "Seletor de marca com prévia ao percorrer: paleta, par tipográfico e completude do vault na linha. Aplica o tema da marca escolhida ao app inteiro.",
    tags: ["marca", "tema", "cmdk", "vault"],
    demo: BrandSelectorDemo,
    preview: { w: 620, h: 220 },
  },
  {
    name: "brand-theme",
    title: "Brand Theme Runtime",
    type: "lib",
    family: "marca",
    description:
      "Provider e hook que aplicam em runtime o tema compilado de uma brand guideline. Uma folha de estilo só, trocada sem recarregar a página.",
    tags: ["marca", "tokens", "runtime", "provider"],
  },
  {
    name: "theme-visant",
    title: "Temas de marca",
    type: "theme",
    family: "marca",
    description:
      "Tema compilado de uma brand guideline: cor com contraste AA por construção, par tipográfico e o esqueleto de craft invariante. O da casa é público. Os de cliente saem do vault de cada conta.",
    tags: ["tema", "tokens", "oklch", "aa"],
  },

  // ---- superfície de trabalho
  {
    name: "data-table",
    title: "Data Table",
    type: "ui",
    family: "trabalho",
    description:
      "Tabela densa: ordenação, seleção, edição inline e menu de contexto. Hoje acoplada a Next (next-auth + next/navigation) — roda em app Next, não nesta vitrine.",
    tags: ["tabela", "fila", "tanstack"],
  },
  {
    name: "kanban",
    title: "Kanban",
    type: "block",
    family: "trabalho",
    description:
      "Board com drag-and-drop, seleção por marquee sobre o vazio e multi-seleção com shift/ctrl.",
    tags: ["board", "dnd", "seleção"],
    demo: KanbanDemo,
    // Largura pra caber as colunas sem barra de rolagem horizontal — que dentro
    // de um card de vitrine é sempre defeito; 220 de altura porque o que sobrava
    // era buraco, não respiro.
    preview: { w: 1020, h: 220 },
  },
  {
    name: "inline-edit",
    title: "Inline Edit",
    type: "ui",
    family: "trabalho",
    description:
      "Editar onde se lê. Enter salva, Esc cancela, o valor só troca depois que a promessa resolve.",
    tags: ["edição", "formulário"],
    demo: InlineEditDemo,
  },
  {
    name: "auth-button",
    title: "Auth Button",
    type: "ui",
    family: "trabalho",
    description:
      "O canto da conta nos três estados. Enquanto a sessão não responde ele não escreve “Entrar” — e não muda de tamanho quando ela chega.",
    tags: ["conta", "sessão", "menu"],
    demo: AuthButtonDemo,
    // 620: o defeito que a peça mata (o pulo do cabeçalho quando a sessão
    // chega) só é visível com a barra em volta. Botão sozinho num quadro não
    // tem o que empurrar.
    preview: { w: 620, h: 300 },
  },
  {
    name: "profile-form",
    title: "Profile Form",
    type: "ui",
    family: "trabalho",
    description:
      "Editar o perfil com foto, nome e e-mail verificado. Quando não dá pra salvar, o motivo aparece no campo — não num toast.",
    tags: ["conta", "formulário", "validação"],
    demo: ProfileFormDemo,
    preview: { w: 620, h: 400 },
  },
  {
    name: "segmented-control",
    title: "Segmented Control",
    type: "ui",
    family: "trabalho",
    description: "Alternador de poucas opções. Substitui um select quando as opções cabem na tela.",
    tags: ["controle", "apple"],
    demo: SegmentedDemo,
  },
  {
    name: "scrub-input",
    title: "Scrub Input",
    type: "ui",
    family: "trabalho",
    description:
      "Número que se arrasta na horizontal, como nos editores gráficos. Teclado continua funcionando.",
    tags: ["número", "gesto"],
    demo: ScrubDemo,
  },
  {
    name: "assignee-stack",
    title: "Assignee Stack",
    type: "ui",
    family: "trabalho",
    description: "Pilha de responsáveis com excedente contado. Iniciais quando não há avatar.",
    tags: ["avatar", "equipe"],
    demo: AssigneeStackDemo,
    preview: { w: 620, h: 320 },
  },
  {
    name: "sticky-filterbar",
    title: "Sticky Filterbar",
    type: "ui",
    family: "trabalho",
    description:
      "Barra de filtro que gruda abaixo do cabeçalho sem medir altura na mão e sem pular no scroll.",
    tags: ["filtro", "scroll"],
    demo: StickyFilterbarDemo,
    preview: { w: 760, h: 440 },
  },
  {
    name: "measure-picker",
    title: "Measure Picker",
    type: "ui",
    family: "trabalho",
    description:
      "Escolher por medida e receber a recomendação. A faixa traduz o número em produto.",
    tags: ["slider", "recomendação"],
    demo: MeasurePickerDemo,
    preview: { w: 620, h: 280 },
  },
  {
    name: "timeline",
    title: "Timeline",
    type: "ui",
    family: "trabalho",
    description: "Linha do tempo com progresso amarrado ao scroll.",
    tags: ["scroll", "narrativa"],
    demo: TimelineDemo,
    // 780 de altura porque a linha do tempo é a peça inteira: cortada em 300 o
    // card mostrava um passo e meio, e o progresso preso ao scroll nunca andava.
    preview: { w: 660, h: 780 },
  },
  {
    name: "side-nav",
    title: "Side Nav",
    type: "ui",
    family: "trabalho",
    description:
      "A navegação lateral de aplicação: colapsa por clique ou por ⌘/Ctrl+B, agrupa, marca a rota ativa e lembra o estado. O rótulo vira sr-only quando fecha, nunca some do DOM.",
    tags: ["sidebar", "navegação", "app", "colapsar", "atalho", "teclado"],
    demo: SideNavDemo,
    preview: { w: 1360, h: 500 },
  },

  // ---- aquisição
  {
    name: "marquee",
    title: "Marquee",
    type: "ui",
    family: "aquisicao",
    description:
      "Faixa infinita em GSAP com três modos de scroll: empurrar o ritmo, virar esteira do scroll ou amarrar a posição à rolagem.",
    tags: ["faixa", "loop", "scroll", "gsap", "vitrine"],
    demo: MarqueeDemo,
    preview: { w: 640, h: 300 },
  },
  {
    name: "logo-wall",
    title: "Logo Wall",
    type: "ui",
    family: "aquisicao",
    description:
      "A faixa de \"confiam na gente\" com os logos normalizados: altura óptica por item, teto de largura pro wordmark comprido e dessaturação em repouso que vira cor no hover.",
    tags: ["logos", "clientes", "prova social", "faixa", "marquee", "gsap"],
    demo: LogoWallDemo,
    preview: { w: 760, h: 260 },
  },
  {
    name: "rail",
    title: "Rail",
    type: "ui",
    family: "aquisicao",
    description:
      "Trilho horizontal com snap, setas que somem nas pontas e scroll por teclado.",
    tags: ["carrossel", "snap"],
    demo: RailDemo,
    preview: { w: 920, h: 360 },
  },
  {
    name: "plate",
    title: "Plate",
    type: "ui",
    family: "aquisicao",
    description:
      "A placa onde a foto de catálogo senta. Resolve o recorte branco sobre fundo colorido.",
    tags: ["produto", "foto"],
    demo: PlateDemo,
    preview: { w: 660, h: 350 },
  },
  {
    name: "chip",
    title: "Chip",
    type: "ui",
    family: "aquisicao",
    description: "Pastilha de filtro com contagem que nunca renderiza zero.",
    tags: ["filtro", "loja"],
    demo: ChipDemo,
    preview: { w: 660, h: 350 },
  },
  {
    name: "store-status",
    title: "Store Status",
    type: "ui",
    family: "aquisicao",
    description:
      "Aberto/fechado calculado no fuso da loja, não no do visitante. Quem está do outro lado do mundo vê a resposta certa.",
    tags: ["loja", "fuso"],
    demo: StoreStatusDemo,
    preview: { w: 420, h: 250 },
  },
  {
    name: "masonry-gallery",
    title: "Masonry Gallery",
    type: "ui",
    family: "aquisicao",
    description:
      "Mosaico por round-robin: anexar página nova não reordena o que já estava na tela.",
    tags: ["galeria", "grid"],
    demo: MasonryGalleryDemo,
    preview: { w: 920, h: 520 },
  },
  {
    name: "repulsive-hover",
    title: "Repulsive Hover",
    type: "ui",
    family: "aquisicao",
    description: "O elemento foge do cursor com mola. Gesto de hero, fora de formulário.",
    tags: ["hover", "mola"],
    demo: RepulsiveHoverDemo,
    preview: { w: 680, h: 290 },
  },

  // ---- motion e estado
  {
    name: "status-ticker",
    title: "Status Ticker",
    type: "ui",
    family: "motion",
    description:
      "O texto que segura a pessoa durante uma espera longa: passo atual, cronômetro e glitch de máquina.",
    tags: ["espera", "ia", "estado"],
    demo: () => (
      <Frame>
        <StatusTicker />
      </Frame>
    ),
  },
  {
    name: "working-glyph",
    title: "Working Glyph",
    type: "ui",
    family: "motion",
    description:
      "Ícone que bate com faísca. O sistema mostra esforço em vez de pedir paciência.",
    tags: ["espera", "ícone"],
    demo: () => (
      <Frame>
        <WorkingGlyph size={26} />
      </Frame>
    ),
  },
  {
    name: "generating-tile",
    title: "Generating Tile",
    type: "ui",
    family: "motion",
    description: "O quadro que ocupa o lugar do resultado enquanto ele não existe.",
    tags: ["ia", "placeholder"],
    demo: LoadingGalleryDemo,
    preview: { w: 980, h: 450 },
  },
  {
    name: "paper-shuttle",
    title: "Paper Shuttle",
    type: "ui",
    family: "motion",
    description: "Progresso com narrativa de papel passando pela máquina.",
    tags: ["progresso", "export"],
    demo: PaperShuttleDemo,
  },
  {
    name: "octahedron-loader",
    title: "Octahedron Loader",
    type: "ui",
    family: "motion",
    description: "Carregamento com sólido girando. A marca da casa em espera curta.",
    tags: ["loader", "lottie"],
    // O loader é de tela cheia por contrato (`min-h-screen` — ele ocupa a rota
    // inteira enquanto ela carrega). Dentro do card isso viraria um palco de 600px,
    // então a regra é desfeita aqui, na vitrine, e não no componente publicado.
    //
    // Sem `src`: o `.lottie` do símbolo é ativo de marca e não é versionado
    // neste repo, então a vitrine mostra de propósito o estado de espera
    // genérico — que é exatamente o que quem instalar sem passar o arquivo vai
    // ver. O aviso no console faz parte da demonstração.
    demo: () => (
      <Frame>
        <OctahedronLoader size={72} className="min-h-0" />
      </Frame>
    ),
  },
  {
    name: "glitch-chars",
    title: "Glitch Chars",
    type: "ui",
    family: "motion",
    description: "Caracteres que trocam sozinhos. Textura de máquina trabalhando, em duas letras.",
    tags: ["textura", "mono"],
    demo: () => (
      <Frame>
        <span className="font-mono text-2xl">
          <GlitchChars length={4} />
        </span>
      </Frame>
    ),
  },
  {
    name: "turbulence-field",
    title: "Turbulence Field",
    type: "ui",
    family: "motion",
    description: "Ruído animado em SVG para dar vida a uma superfície parada.",
    tags: ["ruído", "svg"],
    demo: TurbulenceFieldDemo,
    preview: { w: 560, h: 330 },
  },
  {
    name: "grid-dots",
    title: "Grid Dots",
    type: "ui",
    family: "motion",
    description: "Malha de pontos de fundo, o papel milimetrado que dá profundidade sem competir.",
    tags: ["fundo", "grid"],
    demo: GridDotsDemo,
    preview: { w: 620, h: 320 },
  },
  {
    name: "drop-overlay",
    title: "Drop Overlay",
    type: "ui",
    family: "motion",
    description: "A camada que aparece quando um arquivo está sendo arrastado sobre a área.",
    tags: ["upload", "dnd"],
    demo: DropOverlayDemo,
    // 440 e não 320: a cena tem zona de solta MAIS a fileira de miniaturas que
    // aparece depois de receber. Medida na página, ela fecha em 432 — declarar
    // menos fazia o palco crescer depois de montar e empurrar a grade.
    preview: { w: 560, h: 440 },
  },
  {
    name: "motion-layer",
    title: "Motion Layer",
    type: "lib",
    family: "motion",
    description:
      "O ciclo de scroll do editor Shopify em GSAP/ScrollTrigger, com limpeza de instância.",
    tags: ["gsap", "scroll"],
  },
  {
    name: "smooth-scroll-provider",
    title: "Smooth Scroll Provider",
    type: "lib",
    family: "motion",
    description:
      "Lenis + GSAP num relógio só, com bail-out em prefers-reduced-motion. A instância sai por callback.",
    tags: ["lenis", "gsap"],
  },

  // ---- kit vintage
  {
    name: "vintage-knob",
    title: "Vintage Knob",
    type: "ui",
    family: "vintage",
    description: "Potenciômetro com arraste vertical e trava de curso.",
    tags: ["áudio", "knob"],
    demo: VintageKnobDemo,
    preview: { w: 340, h: 240 },
  },
  {
    name: "vintage-large-knob",
    title: "Vintage Large Knob",
    type: "ui",
    family: "vintage",
    description: "O irmão grande: marcação de escala e leitura de valor.",
    tags: ["áudio", "knob"],
    demo: LargeKnobDemo,
    preview: { w: 340, h: 360 },
  },
  {
    name: "vintage-meter",
    title: "Vintage Meter",
    type: "ui",
    family: "vintage",
    description: "VU analógico com balística de ponteiro.",
    tags: ["áudio", "medidor"],
    demo: VintageMeterDemo,
    preview: { w: 340, h: 200 },
  },
  {
    name: "vintage-slider",
    title: "Vintage Slider",
    type: "ui",
    family: "vintage",
    description: "Fader de console com curso e trilho gravados.",
    tags: ["áudio", "fader"],
    demo: VintageSliderDemo,
    preview: { w: 300, h: 290 },
  },
  {
    name: "vintage-button",
    title: "Vintage Button",
    type: "ui",
    family: "vintage",
    description: "Botão de painel que afunda no clique.",
    tags: ["áudio", "botão"],
    demo: () => (
      <Frame className="gap-2">
        <VintageButton label="POWER" active onClick={() => {}} />
        <VintageButton label="MUTE" onClick={() => {}} />
      </Frame>
    ),
    preview: { w: 440, h: 210 },
  },
  {
    name: "vintage-toggle",
    title: "Vintage Toggle",
    type: "ui",
    family: "vintage",
    description: "Chave de duas posições com estalo visual.",
    tags: ["áudio", "chave"],
    demo: () => (
      <Frame>
        <VintageToggle />
      </Frame>
    ),
    preview: { w: 440, h: 330 },
  },
  {
    name: "vintage-led",
    title: "Vintage LED",
    type: "ui",
    family: "vintage",
    description: "LED de painel com halo. Quatro cores, estado on/off.",
    tags: ["áudio", "estado"],
    demo: VintageLedDemo,
    preview: { w: 620, h: 540 },
  },
  {
    name: "vintage-eq",
    title: "Vintage EQ",
    type: "ui",
    family: "vintage",
    description: "Banco de faders com curva desenhada.",
    tags: ["áudio", "eq", "faders", "gráfico"],
    demo: () => (
      <Frame>
        <VintageEQ />
      </Frame>
    ),
    preview: { w: 560, h: 540 },
  },
  {
    name: "vintage-parametric-eq",
    title: "Vintage Parametric EQ",
    type: "ui",
    family: "vintage",
    description:
      "O EQ paramétrico: cada banda é um sino, e a curva grossa é a soma em dB. Arraste um ponto, roda muda o Q, e o BYPASS achata sem perder os valores.",
    tags: ["áudio", "eq", "curva", "paramétrico", "filtro"],
    // Peça NOVA, não substituta: o gráfico e o paramétrico são ferramentas
    // diferentes (um é o EQ de quem ouve, outro o de quem mistura) e trocar a
    // API do item publicado quebraria quem já rodou o `add`. Ver o cabeçalho do
    // `vintage-parametric-eq.tsx`.
    demo: VintageParametricEqDemo,
    preview: { w: 690, h: 460 },
  },
  {
    name: "vintage-oscilloscope",
    title: "Vintage Oscilloscope",
    type: "ui",
    family: "vintage",
    description: "Traço de osciloscópio alimentado por um buffer de amostras.",
    tags: ["áudio", "canvas"],
    // Quatro tubos comendo o MESMO buffer: é o que prova que os modos são
    // leituras diferentes de um sinal, e não quatro animações decorativas
    // rodando lado a lado. Um de cada vez esconderia justamente isso.
    demo: VintageOscilloscopeDemo,
    preview: { w: 690, h: 420 },
  },
  {
    name: "vintage-soundboard-pad",
    title: "Soundboard Pad",
    type: "ui",
    family: "vintage",
    description: "Pad de disparo com estado aceso e retorno tátil.",
    tags: ["áudio", "pad"],
    demo: PadDemo,
    preview: { w: 440, h: 265 },
  },
  {
    name: "vintage-xy-pad",
    title: "Vintage XY Pad",
    type: "ui",
    family: "vintage",
    description: "Campo de dois eixos para controlar dois parâmetros num gesto só.",
    tags: ["áudio", "gesto"],
    demo: () => (
      <Frame>
        <VintageXYPad size={150} labelX="FILTER" labelY="REVERB" color="var(--vintage-accent)" />
      </Frame>
    ),
    preview: { w: 440, h: 275 },
  },
  {
    name: "vintage-tv-frame",
    title: "Vintage TV Frame",
    type: "ui",
    family: "vintage",
    description: "Moldura de tubo com curvatura e brilho de varredura.",
    tags: ["moldura", "crt"],
    demo: () => (
      <Frame>
        {/* 240px em vez de 190: abaixo disso o rótulo da marca corta, e a demo
            existe pra mostrar o console inteiro. Que a peça AGUENTE 190 é outra
            coisa — isso o teste de 390px prova. */}
        <div className="w-[240px]">
          <VintageTvFrame title="VISANT TV" width={240} showTimecode="00:12:34" signalActive>
            <div className="grid h-full place-items-center font-mono text-micro text-white/70">
              NO SIGNAL
            </div>
          </VintageTvFrame>
        </div>
      </Frame>
    ),
    preview: { w: 440, h: 300 },
  },
  {
    name: "vintage-command-palette",
    title: "Vintage Command Palette",
    type: "ui",
    family: "vintage",
    description: "Paleta de comandos no vocabulário do painel.",
    tags: ["comando", "teclado"],
    /*
     * Cartão de recado, não demo.
     *
     * A paleta monta em `fixed inset-0` e rouba o foco do input assim que
     * aparece: dentro de um card ela escaparia da moldura e sequestraria o
     * teclado de quem está só rolando o catálogo. O lugar de usá-la é a bancada.
     *
     * O texto lê token vintage porque este palco é escuro — `muted-foreground`
     * aqui é cinza-escuro sobre preto, ilegível.
     */
    demo: () => (
      <Frame className="flex-col gap-2 text-center">
        <span className="font-mono text-rotulo text-[var(--vintage-text-muted)]">
          abre na bancada, em tela cheia
        </span>
        <kbd className="rounded border border-[var(--vintage-border)] px-2 py-0.5 font-mono text-apoio text-[var(--vintage-label)]">
          ⌘K
        </kbd>
      </Frame>
    ),
    preview: { w: 440, h: 190 },
  },

  // ---- fundação
  {
    name: "vintage-base",
    title: "Vintage Base",
    type: "base",
    family: "fundacao",
    description: "A fundação do kit: variáveis de painel, texturas e as regras em @layer.",
    tags: ["css", "base"],
  },
  {
    name: "vintage-theme",
    title: "Vintage Theme",
    type: "theme",
    family: "fundacao",
    description: "O tema do kit de áudio, o contraponto escuro aos temas de marca.",
    tags: ["tema", "css"],
  },
  {
    name: "use-media-query",
    title: "useMediaQuery",
    type: "hook",
    family: "fundacao",
    description:
      "Media query como estado de React, via useSyncExternalStore: leitura síncrona no primeiro render, sem piscar, e segura em SSR.",
    tags: ["hook", "responsivo", "ssr"],
  },
  {
    name: "use-knob-drag",
    title: "useKnobDrag",
    type: "hook",
    family: "fundacao",
    description:
      "O gesto de arrastar um knob isolado do desenho: pointer capture, trava de curso e passo fino com shift.",
    tags: ["hook", "gesto"],
  },
  {
    name: "section-intro",
    title: "Section Intro",
    type: "ui",
    family: "aquisicao",
    description:
      "Abertura de dobra: rótulo, título grande e linha de contexto, com duas medidas de linha em vez de uma.",
    tags: ["dobra", "título", "landing"],
    demo: () => (
      <SectionIntro
        eyebrow="Serviços"
        title="Um time só. Todo serviço que a marca precisa."
        lead="Da estratégia de marca ao desenvolvimento, sem repassar o trabalho para fora no meio do caminho."
      />
    ),
    preview: { w: 620, h: 300 },
  },
  {
    name: "cta-surface",
    title: "CTA Surface",
    type: "ui",
    family: "aquisicao",
    description:
      "A superfície de conversão em três proporções (barra, painel, card). O botão herda o contraste do tom em vez de receber cor.",
    tags: ["cta", "conversão", "dobra"],
    demo: () => (
      <div className="flex w-full flex-col gap-4">
        <CtaSurface
          variant="bar"
          tone="brand"
          title="Tudo isso em um plano só. Sem lacuna."
          actions={<CtaAction>Agendar conversa</CtaAction>}
        />
        <CtaSurface
          variant="panel"
          tone="ink"
          title="Vamos construir algo que compete"
          lead="Marca, site e produto por um time sênior. Começa por uma conversa de estratégia."
          actions={<CtaAction>Agendar conversa</CtaAction>}
        />
      </div>
    ),
    preview: { w: 640, h: 480 },
  },
  {
    name: "showcase-card",
    title: "Showcase Card",
    type: "ui",
    family: "aquisicao",
    description:
      "Card de serviço: mídia com selo de seta, título que cobre o card inteiro e a lista do que está incluso como texto, não como filtro.",
    tags: ["serviço", "card", "vitrine"],
    demo: ShowcaseCardDemo,
    preview: { w: 340, h: 400 },
  },
  {
    name: "step-cards",
    title: "Step Cards",
    type: "block",
    family: "aquisicao",
    description:
      "Como funciona, em passos numerados. Sai como lista ordenada no HTML, e a arte de cada passo entra por slot.",
    tags: ["passos", "como funciona", "onboarding"],
    demo: StepCardsDemo,
    preview: { w: 1180, h: 370 },
  },
  {
    name: "quote-block",
    title: "Quote Block",
    type: "ui",
    family: "aquisicao",
    description:
      "O depoimento único, em tamanho de dobra: a citação vem primeiro e em corpo de manchete, a atribuição entra depois como assinatura.",
    tags: ["depoimento", "prova social", "citação", "cliente", "retrato"],
    demo: QuoteBlockDemo,
    preview: { w: 660, h: 380 },
  },
  {
    name: "testimonial-wall",
    title: "Testimonial Wall",
    type: "block",
    family: "aquisicao",
    description:
      "Parede de prova social com tipos misturados: citação, número, retrato e depoimento em vídeo na mesma malha.",
    tags: ["depoimento", "prova social", "masonry"],
    demo: () => (
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
          { id: "b", kind: "stat", tone: "brand", value: "1.291+", label: "Projetos entregues em 6 anos" },
          {
            id: "c",
            kind: "portrait",
            media: <DemoSurface papel="video" indice={2} />,
            name: PEOPLE[3].name,
            role: "Produto @ Casa Vinte",
            onPlay: () => {},
          },
          {
            id: "d",
            kind: "quote",
            tone: "muted",
            quote: "O time é atento e responde rápido quando entram revisão e projeto novo no mesmo dia.",
            author: PEOPLE[2].name,
            role: "Oficina Bandeira",
          },
          { id: "e", kind: "stat", tone: "muted", value: "4,9/5", label: "Nota média de quem já contratou" },
        ]}
      />
    ),
    // 700 e não 360: a parede agora escolhe a contagem de colunas pela largura
    // do container, e num palco de 760px cabem duas — o que dobra a altura. O
    // número declarado é medido, não chutado (696px a 760 de largura).
    preview: { w: 760, h: 700 },
  },

  /* ══════════════════════════════════════════════════════════════════════
     Colheita `visantismo` + `visant-club` — 11/08/2026.
     Ver COLHEITA-VISANTISMO-CLUB.md para o portão aplicado e os rejeitados.
     ══════════════════════════════════════════════════════════════════════ */
  {
    name: "erase-field",
    title: "Erase Field",
    type: "ui",
    family: "aquisicao",
    description:
      "Fundo em canvas que a mão raspa pra revelar a luz por baixo, com acabamento líquido, poeira que volta em deriva e passeio ocioso pra quem não mexe o ponteiro.",
    tags: ["fundo", "canvas", "ponteiro", "cta", "revelar", "raspar"],
    demo: () => (
      <EraseField className="grid h-full w-full place-items-center rounded-[var(--r-surface)]">
        <p className="px-6 text-center text-[15px] font-semibold text-foreground">
          Passe o ponteiro aqui
        </p>
      </EraseField>
    ),
    preview: { w: 520, h: 260 },
  },
  {
    name: "spring-dots",
    title: "Spring Dots",
    type: "ui",
    family: "motion",
    description:
      "Malha de pontos com mola: o ponteiro empurra, o atrito segura, e quem sai de casa acende na cor da marca.",
    tags: ["fundo", "canvas", "ponteiro", "física", "mola"],
    demo: () => <SpringDots className="h-full w-full rounded-[var(--r-surface)]" />,
    preview: { w: 520, h: 260 },
  },
  {
    name: "sfx-bus",
    title: "SFX Bus",
    type: "lib",
    family: "fundacao",
    description:
      "Dois sons de interface em WebAudio puro, hover e clique, com throttle, debounce por alvo, contexto armado no primeiro gesto e mudo sob prefers-reduced-motion.",
    tags: ["som", "áudio", "webaudio", "feedback", "tato"],
  },
  {
    name: "sfx-toggle",
    title: "SFX Toggle",
    type: "ui",
    family: "fundacao",
    description:
      "Liga e desliga o som da casa em um ícone só: as ondas recolhem pro alto-falante, e o estado nulo antes da hidratação fica desenhado em vez de chutado.",
    tags: ["som", "toggle", "preferência", "acessibilidade"],
    demo: () => (
      <div className="flex h-full items-center justify-center gap-3">
        <SfxToggle />
        <span className="text-[length:var(--text-apoio,0.8rem)] text-muted-foreground">
          clique pra ouvir
        </span>
      </div>
    ),
  },
  {
    name: "count-up",
    title: "Count Up",
    type: "ui",
    family: "aquisicao",
    description:
      "O número que se apura em vez de aparecer pronto: lê o valor final do próprio texto, trava a largura antes do primeiro quadro e não anima o que não dá pra parsear.",
    tags: ["número", "contagem", "prova", "estatística", "animar"],
    demo: CountUpDemo,
    preview: { w: 560, h: 210 },
  },
  {
    name: "use-pointer-parallax",
    title: "usePointerParallax",
    type: "hook",
    family: "motion",
    description:
      "Escreve --px e --py uma vez por quadro e deixa o CSS decidir a profundidade de cada objeto. Só em ponteiro fino, volta ao repouso ao sair da janela.",
    tags: ["paralaxe", "ponteiro", "profundidade", "colagem", "hero"],
    demo: PointerParallaxDemo,
    preview: { w: 690, h: 380 },
  },
  {
    name: "fold-motion",
    title: "Fold Motion",
    type: "lib",
    family: "motion",
    description:
      "Hierarquia de entradas por dobra: rise, drift, mask, settle, climax e invert em vez de trinta entradas iguais. O esconderijo é aplicado pelo componente, nunca por CSS estático.",
    tags: ["scroll", "entrada", "reveal", "dobra", "hierarquia"],
    demo: FoldMotionDemo,
    preview: { w: 690, h: 300 },
  },
  {
    name: "line-reveal",
    title: "Line Reveal",
    type: "ui",
    family: "motion",
    description:
      "O título que sobe de dentro do próprio corte de linha: mede a quebra depois da fonte carregar, re-quebra ao redimensionar, e o esconderijo é aplicado por JS pra página nunca sumir sem script.",
    tags: ["título", "reveal", "linha", "split", "gsap", "herói", "tipografia"],
    demo: LineRevealDemo,
    // 1280 de largura porque a peça revela POR LINHA: num palco estreito a
    // frase quebra em duas e a cascata some. A demo agora traz frase longa e
    // as variantes lado a lado — é essa medida que faz o corte aparecer.
    preview: { w: 1280, h: 230 },
  },
  {
    name: "gleam",
    title: "Gleam",
    type: "ui",
    family: "motion",
    description:
      "A superfície que sabe onde o cursor está: luz sob o ponteiro, borda acesa do lado da luz e inclinação de 5 graus. Quatro números por quadro no JS, o desenho inteiro no CSS.",
    tags: ["hover", "card", "ponteiro", "tilt", "luz", "spotlight", "magnético"],
    demo: GleamDemo,
    preview: { w: 690, h: 390 },
  },
  {
    name: "photo-frame",
    title: "Photo Frame",
    type: "ui",
    family: "motion",
    description:
      "A moldura que revela a foto: a máscara abre, a foto assenta mais devagar que a máscara, e opcionalmente deriva na rolagem. Proporção declarada pra não haver salto de layout, e mídia por slot.",
    tags: ["foto", "moldura", "imagem", "reveal", "paralaxe", "scroll", "gsap"],
    demo: () => <PhotoFrameDemo />,
    preview: { w: 690, h: 320 },
  },
  {
    name: "photo-split",
    title: "Photo Split",
    type: "ui",
    family: "motion",
    description:
      "A dobra alternada foto ↔ texto: a moldura revela a imagem, o texto entra deslizando da borda externa e o lado inverte a cada dobra sem ninguém escrever nada.",
    tags: ["dobra", "seção", "foto", "texto", "alternado", "scroll", "gsap"],
    demo: PhotoSplitDemo,
    preview: { w: 900, h: 700 },
  },
  {
    name: "photo-flip",
    title: "Photo Flip",
    type: "ui",
    family: "motion",
    description:
      "A foto atravessa da grade para a tela cheia — mesmo nó do DOM, reparentado e animado por GSAP Flip com ease-in-out. A vaga segura a proporção pra grade não desabar, e o foco volta pra foto que abriu.",
    tags: ["foto", "galeria", "lightbox", "flip", "morph", "grade", "gsap"],
    demo: () => <PhotoFlipDemo />,
    preview: { w: 1360, h: 300 },
  },
  {
    name: "photo-compare",
    title: "Photo Compare",
    type: "ui",
    family: "motion",
    description:
      "A cortina entre o antes e o depois: a camada de cima é RECORTADA, nunca redimensionada, então as duas fotos ficam na mesma escala. O arrasto, o teclado e o leitor de tela vêm de um input range invisível.",
    tags: ["foto", "antes", "depois", "comparar", "cortina", "rebrand", "slider"],
    demo: PhotoCompareDemo,
    preview: { w: 700, h: 440 },
  },
  {
    name: "reels-rail",
    title: "Reels Rail",
    type: "ui",
    family: "motion",
    description:
      "O trilho de vídeo vertical: cartões 9:16 com encaixe, o do meio tocando e os vizinhos parados e mudos. Som opcional, um card por vez, e fora da tela pausa tudo.",
    tags: ["vídeo", "reels", "shorts", "vertical", "carrossel", "trilho"],
    demo: ReelsRailDemo,
    preview: { w: 1360, h: 490 },
  },
  {
    name: "measure-bar",
    title: "Measure Bar",
    type: "ui",
    family: "aquisicao",
    description:
      "Nenhum número sem régua: valor, qualificador, evidência e rótulo nessa ordem. Sem denominador a barra não desenha, e o estado desconhecido fica tracejado em vez de zerado.",
    tags: ["número", "régua", "evidência", "prova", "métrica"],
    demo: () => (
      <div className="flex h-full items-center justify-center gap-10">
        <MeasureBar value="R$450k" qualifier="de uma meta de 600k" ratio={0.75} label="Faturado" />
        <MeasureBar value="200+" qualifier="piso, não proporção" label="Comunidade" />
        <MeasureBar value="—" qualifier="a API não respondeu" state="unknown" label="Vendidos" />
      </div>
    ),
    preview: { w: 620, h: 220 },
  },
  {
    name: "sim-slider",
    title: "Sim Slider",
    type: "ui",
    family: "aquisicao",
    description:
      "A dobra que deixa o visitante fazer a conta: controle acessível, projeção derivada do próprio valor, curva sem transição (pra não discordar do número) e premissa obrigatória por escrito.",
    tags: ["simulador", "calculadora", "slider", "projeção", "roi", "curva", "premissa"],
    demo: () => <SimSliderDemo />,
    preview: { w: 640, h: 420 },
  },
  {
    name: "spine-card",
    title: "Spine Card",
    type: "ui",
    family: "aquisicao",
    description:
      "O retângulo que lê como objeto: lombada de luz na borda, tombo apoiado na base que endireita no hover, e capa em duotone que só ganha cor onde a atenção está.",
    tags: ["card", "livro", "estante", "produto", "lombada"],
    demo: SpineCardDemo,
    preview: { w: 670, h: 420 },
  },
  {
    name: "cover-art",
    title: "Cover Art",
    type: "ui",
    family: "trabalho",
    description:
      "Capa determinística em CSS pra item sem arte: três famílias (livro, app, placa), monograma, e rampa tonal derivada da marca por color-mix. Zero byte de imagem, SSR igual ao cliente.",
    tags: ["capa", "placeholder", "catálogo", "determinístico", "sem imagem"],
    demo: CoverArtDemo,
    // Palco em retrato (330×430): a capa é 3/4, e numa caixa larga ela vira
    // faixa. A demo mostra uma família por vez, então o que precisa caber é a
    // altura de uma capa inteira, não três lado a lado.
    preview: { w: 330, h: 430 },
  },
  {
    name: "empty-state",
    title: "Empty State",
    type: "ui",
    family: "fundacao",
    description:
      "O estado vazio canônico: arte por slot com véu de contraste garantido, eyebrow, frase que diz o que vai aparecer ali, e no máximo uma ação.",
    tags: ["vazio", "empty", "onboarding", "primeiro uso"],
    demo: EmptyStateDemo,
    // Duas caixas lado a lado, e por isso `duplo` e não ladrilho: "generativo" é
    // uma afirmação sobre variação, e uma caixa sozinha prova que a arte existe,
    // não que ela nasce da semente.
    preview: { w: 690, h: 360 },
  },
  {
    name: "skeleton-rail",
    title: "Skeleton Rail",
    type: "ui",
    family: "trabalho",
    description:
      "O esqueleto do trilho com as mesmas medidas do trilho: mesmos nomes de prop, overflow hidden em vez de auto, e pulse em vez de shimmer.",
    tags: ["skeleton", "carregando", "trilho", "espera"],
    demo: SkeletonRailDemo,
    preview: { w: 1360, h: 740 },
  },
  {
    name: "use-local-search",
    title: "useLocalSearch",
    type: "hook",
    family: "fundacao",
    description:
      "Busca em memória tolerante a acento: índice montado uma vez por lista, todos os termos batendo em qualquer ordem, e termo vazio devolvendo a lista inteira.",
    tags: ["busca", "filtro", "acento", "catálogo"],
  },
  {
    name: "magnetic-cta",
    title: "Magnetic CTA",
    type: "ui",
    family: "aquisicao",
    description:
      "O botão principal que vem buscar o ponteiro: campo de atração com medida lida uma vez, rótulo com inércia própria e volta com mola. No toque e sob reduced-motion é um botão comum.",
    tags: ["cta", "botão", "ímã", "hover", "conversão"],
    // Empilha no estreito. O halo do ímã reserva 84px de cada lado — é a área
    // onde o cursor já é sentido —, então dois CTAs lado a lado pedem ~500px de
    // geometria mesmo com 250px de botão. A 360 eles vazavam a tela: não era o
    // botão que não cabia, era o campo.
    demo: () => (
      <Frame className="flex-col gap-8 sm:flex-row">
        <MagneticCta>Agendar conversa</MagneticCta>
        <MagneticCta variant="outline" pull={6}>
          Ver o método
        </MagneticCta>
      </Frame>
    ),
    preview: { w: 560, h: 220 },
  },
  {
    name: "nav-drawer",
    title: "Nav Drawer",
    type: "ui",
    family: "fundacao",
    description:
      "O menu mobile feito uma vez direito: foco preso, Escape, retorno do foco e trava de rolagem vindos do Radix Dialog; entrada em cascata com teto, e ícone que lê o estado em vez de guardar o seu.",
    tags: ["menu", "mobile", "drawer", "navegação", "acessibilidade"],
    demo: NavDrawerDemo,
    preview: { w: 420, h: 200 },
  },
  {
    name: "pinned-scene",
    title: "Pinned Scene",
    type: "ui",
    family: "motion",
    description:
      "A dobra que prende a arte e avança em passos. O pin é position:sticky, não ScrollTrigger.pin — o GSAP entra só pra relatar progresso em --p, --sp e --near, sem tocar no DOM.",
    tags: ["scroll", "sticky", "passos", "storytelling", "gsap"],
    demo: PinnedSceneDemoCard,
    preview: { w: 1360, h: 620 },
  },
];

/**
 * O lugar da foto nas demos de aquisição.
 *
 * Foto de verdade traria peso e uma dependência de rede que a vitrine não deve
 * ter. E colocar cor de exemplo aqui esconderia o ponto: essas peças leem o
 * token da marca. Isto é o `--muted` do tema ativo, e nada mais.
 */
/**
 * O espaço de mídia das demos — hoje com acervo de verdade dentro.
 *
 * Era `<div className="size-full bg-[var(--muted)]" />`: um retângulo cinza em
 * todo card que promete foto, vídeo ou capa. O bloco cinza não é neutro, ele
 * MENTE — some a diferença entre uma parede de depoimento que respira e uma que
 * embola, e faz a library da agência de branding parecer estudo de wireframe.
 *
 * O bloco cinza continua a um clique de distância: o botão da barra devolve o
 * wireframe pra todas as peças de uma vez, que é como se julga a estrutura sem
 * a maquiagem da foto. Ver `media.tsx`.
 */
function DemoSurface({ papel = "cena", indice = 0 }: { papel?: Papel; indice?: number }) {
  // Sem `ratio`: o único cliente que restou aqui é o `testimonial-wall`, e ele
  // reserva a caixa do retrato — a mídia só preenche. Quem precisava declarar
  // proporção (o `step-cards`) mudou pra `demos/step-cards-demo`.
  return <Media papel={papel} indice={indice} className="size-full" />;
}

/**
 * Índice de busca montado uma vez. A lista é estática; normalizar 45 strings a
 * cada tecla digitada é trabalho que não muda de resultado.
 */
const SEARCH_INDEX = new Map(CATALOG.map((i) => [i.name, haystack(i)] as const));

/**
 * `needle` já vem passado por `fold`.
 *
 * Cada palavra digitada precisa aparecer — crua ou pelo radical. Exigir todas
 * é o que faz "knob vintage" e "vintage knob" darem o mesmo resultado sem
 * inventar ordenação por relevância que ninguém pediu.
 */
export const matches = (item: CatalogItem, needle: string) => {
  if (!needle) return true;
  const alvo = SEARCH_INDEX.get(item.name) ?? haystack(item);
  return needle
    .split(/\s+/)
    .filter(Boolean)
    .every((palavra) => alvo.includes(palavra) || alvo.includes(stem(palavra)));
};

/** Quantos itens cada família tem — o número que aparece no filtro. */
export const COUNT_BY_FAMILY = CATALOG.reduce<Record<string, number>>((acc, i) => {
  acc[i.family] = (acc[i.family] ?? 0) + 1;
  return acc;
}, {});

export const ICON_BY_FAMILY: Record<Family, React.ComponentType<{ className?: string }>> = {
  trabalho: Layers,
  aquisicao: Filter,
  motion: SlidersHorizontal,
  marca: Ruler,
  vintage: SlidersHorizontal,
  fundacao: Layers,
};
