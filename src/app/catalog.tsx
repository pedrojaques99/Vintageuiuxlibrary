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

import { useStageActive } from "./stage";
import { Media, type Papel } from "./media";
import { depKeysOf } from "./deps";
import { PAD_VOICES, PEOPLE } from "./demo-fixtures";

import { Chip } from "../../registry/visant/ui/chip";
import { GlitchChars } from "../../registry/visant/ui/glitch-chars";
import { PaperShuttle } from "../../registry/visant/ui/paper-shuttle";
import { SectionIntro } from "../../registry/visant/ui/section-intro";
import { CtaSurface, CtaAction } from "../../registry/visant/ui/cta-surface";
import { EraseField } from "../../registry/visant/ui/erase-field";
import { SpringDots } from "../../registry/visant/ui/spring-dots";
import { SfxToggle } from "../../registry/visant/ui/sfx-toggle";
import { MeasureBar } from "../../registry/visant/ui/measure-bar";
import { EmptyState } from "../../registry/visant/ui/empty-state";
import { MagneticCta } from "../../registry/visant/ui/magnetic-cta";
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
 * As demos que moram em arquivo próprio — todas sob demanda.
 *
 * Elas eram `import` estático, e a conta fazia sentido enquanto a grade montava
 * demo viva: se a página ia montar quarenta delas de qualquer jeito, fatiar só
 * somaria requisição. O GSAP entrava no primeiro chunk por tabela.
 *
 * A grade do acervo passou a mostrar FOTO e só acordar a peça sob o cursor. Aí
 * a conta virou: quem abre a home não monta demo nenhuma, e mesmo assim baixava
 * as quarenta — mais o GSAP, o Lenis e o resto que elas arrastam. Agora cada uma
 * é um `React.lazy`, e o Rollup leva junto o que só ela usa.
 *
 * Quem renderiza `item.demo` põe `<React.Suspense>` em volta. São três lugares:
 * o ladrilho da grade, a ficha e a rota `?solo=1`.
 */
const AssigneeStackDemo = React.lazy(() => import("./demos/assignee-stack-demo"));
const BrandSelectorDemo = React.lazy(() => import("./demos/brand-selector-demo"));
const ChipDemo = React.lazy(() => import("./demos/chip-demo"));
const CountUpDemo = React.lazy(() => import("./demos/count-up-demo"));
const Book3DDemo = React.lazy(() => import("./demos/book-3d-demo"));
const Carousel3DDemo = React.lazy(() => import("./demos/carousel-3d-demo"));
const MistTextDemo = React.lazy(() => import("./demos/mist-text-demo"));
const MistSwapDemo = React.lazy(() => import("./demos/mist-swap-demo"));
const DotCursorDemo = React.lazy(() => import("./demos/dot-cursor-demo"));
const MistDialogDemo = React.lazy(() => import("./demos/mist-dialog-demo"));
const InkWordmarkDemo = React.lazy(() => import("./demos/ink-wordmark-demo"));
const FogHeroDemo = React.lazy(() => import("./demos/fog-hero-demo"));
const LatheObjectDemo = React.lazy(() => import("./demos/lathe-object-demo"));
const CssColorDemo = React.lazy(() => import("./demos/css-color-demo"));
const FogTreeDemo = React.lazy(() => import("./demos/fog-tree-demo"));
const FogGardenDemo = React.lazy(() => import("./demos/fog-garden-demo"));
const BookShelfDemo = React.lazy(() => import("./demos/book-shelf-demo"));
const CoverArtDemo = React.lazy(() => import("./demos/cover-art-demo"));
const DropOverlayDemo = React.lazy(() => import("./demos/drop-overlay-demo"));
const FoldMotionDemo = React.lazy(() => import("./demos/fold-motion-demo"));
const GleamDemo = React.lazy(() => import("./demos/gleam-demo"));
const GridDotsDemo = React.lazy(() => import("./demos/grid-dots-demo"));
const LineRevealDemo = React.lazy(() => import("./demos/line-reveal-demo"));
const LogoWallDemo = React.lazy(() => import("./demos/logo-wall-demo"));
const MasonryGalleryDemo = React.lazy(() => import("./demos/masonry-gallery-demo"));
const MeasurePickerDemo = React.lazy(() => import("./demos/measure-picker-demo"));
const PhotoCompareDemo = React.lazy(() => import("./demos/photo-compare-demo"));
const PhotoSplitDemo = React.lazy(() => import("./demos/photo-split-demo"));
const PlateDemo = React.lazy(() => import("./demos/plate-demo"));
const PointerParallaxDemo = React.lazy(() => import("./demos/use-pointer-parallax-demo"));
const QuoteBlockDemo = React.lazy(() => import("./demos/quote-block-demo"));
const RailDemo = React.lazy(() => import("./demos/rail-demo"));
const ReelsRailDemo = React.lazy(() => import("./demos/reels-rail-demo"));
const RepulsiveHoverDemo = React.lazy(() => import("./demos/repulsive-hover-demo"));
const ShowcaseCardDemo = React.lazy(() => import("./demos/showcase-card-demo"));
const SideNavDemo = React.lazy(() => import("./demos/side-nav-demo"));
const AuthButtonDemo = React.lazy(() => import("./demos/auth-button-demo"));
const ProfileFormDemo = React.lazy(() => import("./demos/profile-form-demo"));
const EmptyStateDemo = React.lazy(() => import("./demos/empty-state-demo"));
const PhotoFrameDemo = React.lazy(() => import("./demos/photo-frame-demo"));
const PhotoFlipDemo = React.lazy(() => import("./demos/photo-flip-demo"));
const VintageParametricEqDemo = React.lazy(() => import("./demos/vintage-parametric-eq-demo"));
const VintageOscilloscopeDemo = React.lazy(() => import("./demos/vintage-oscilloscope-demo"));
const SkeletonRailDemo = React.lazy(() => import("./demos/skeleton-rail-demo"));
const SpineCardDemo = React.lazy(() => import("./demos/spine-card-demo"));
const StepCardsDemo = React.lazy(() => import("./demos/step-cards-demo"));
const StickyFilterbarDemo = React.lazy(() => import("./demos/sticky-filterbar-demo"));
const StoreStatusDemo = React.lazy(() => import("./demos/store-status-demo"));
const TimelineDemo = React.lazy(() => import("./demos/timeline-demo"));
const TurbulenceFieldDemo = React.lazy(() => import("./demos/turbulence-field-demo"));
const VintageTvFrameDemo = React.lazy(() => import("./demos/vintage-tv-frame-demo"));
const InlineEditFileDemo = React.lazy(() => import("./demos/inline-edit-demo"));
const SegmentedControlDemo = React.lazy(() => import("./demos/segmented-control-demo"));
const ScrubInputDemo = React.lazy(() => import("./demos/scrub-input-demo"));
const NavDrawerDemo = React.lazy(() => import("./demos/nav-drawer-demo"));
const StatusTickerDemo = React.lazy(() => import("./demos/status-ticker-demo"));
const WorkingGlyphDemo = React.lazy(() => import("./demos/working-glyph-demo"));
const AnatomiaComoSobeDemo = React.lazy(() => import("./demos/anatomia-como-sobe-demo"));
const AnatomiaMemoriaDemo = React.lazy(() => import("./demos/anatomia-memoria-demo"));
const AnatomiaTokensDemo = React.lazy(() => import("./demos/anatomia-tokens-demo"));
const AnatomiaScriptDemo = React.lazy(() => import("./demos/anatomia-script-demo"));
const AnatomiaPermissaoDemo = React.lazy(() => import("./demos/anatomia-permissao-demo"));
const AnatomiaFicharioDemo = React.lazy(() => import("./demos/anatomia-fichario-demo"));
const AnatomiaTomadasDemo = React.lazy(() => import("./demos/anatomia-tomadas-demo"));
const SfxBusDemo = React.lazy(() => import("./demos/sfx-bus-demo"));
const VintageKnobDemo = React.lazy(() => import("./demos/vintage-knob-demo"));
const VintageLedDemo = React.lazy(() => import("./demos/vintage-led-demo"));
const VintageMeterDemo = React.lazy(() => import("./demos/vintage-meter-demo"));
const VintageSliderDemo = React.lazy(() => import("./demos/vintage-slider-demo"));

/**
 * A categoria diz o que a peça É, não pra que superfície de negócio ela serve.
 * Até 2026-10-20 eram "trabalho", "aquisição", "motion", "marca": jargão da
 * agência, e quem chegava não sabia onde procurar um slider. Os nomes antigos
 * continuam abrindo (`FAMILIA_ANTIGA`), pra link mandado no chat não morrer.
 */
export type Family =
  | "controles"
  | "dados"
  | "navegacao"
  | "cards"
  | "feedback"
  | "secoes"
  | "midia"
  | "texto"
  | "efeitos"
  | "3d"
  | "shaders"
  | "vintage"
  | "anatomia"
  | "base";

/**
 * O que uma demo recebe.
 *
 * `props` são os valores dos knobs da ficha de foco. Demo que não declara
 * `knobs` recebe `{}` e pode ignorar o argumento — é o que as demos sem painel
 * fazem, e é por isso que o contrato entrou sem tocar em nenhuma delas.
 */
export interface DemoProps {
  props?: Record<string, unknown>;
}

export interface CatalogItem {
  /** Nome no registry — é o que vai no `shadcn add @visant/<name>`. */
  name: string;
  title: string;
  type: "ui" | "block" | "lib" | "hook" | "theme" | "base";
  family: Family;
  description: string;
  tags: string[];
  /** Demo viva. Ausente = item sem superfície visual própria (lib, tema, hook). */
  demo?: (args: DemoProps) => React.ReactNode;
  /**
   * O componente que os knobs da ficha pilotam — o nome como ele sai do
   * `props.generated.json` (`"LogoWall"`, `"Rail"`).
   *
   * Declarar isto é uma promessa: a demo espalha `props` no componente. Sem a
   * promessa não há painel, e é assim de propósito — painel cujo slider não move
   * nada é pior que painel nenhum, porque quem mexe conclui que a peça quebrou.
   * Quem escreve a linha é o `scripts/demos-knobs.mjs`, junto com o `{...props}`
   * do outro lado: as duas metades do contrato entram na mesma passada.
   */
  knobs?: string;
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
  ui: "Componente",
  block: "Seção inteira",
  lib: "Utilitário",
  hook: "Hook",
  theme: "Tema",
  base: "CSS base",
};

export const FAMILIES: { key: Family; label: string }[] = [
  { key: "controles", label: "Controles" },
  { key: "dados", label: "Dados" },
  { key: "navegacao", label: "Navegação" },
  { key: "cards", label: "Cards" },
  { key: "feedback", label: "Feedback" },
  { key: "secoes", label: "Seções" },
  { key: "midia", label: "Mídia" },
  { key: "texto", label: "Texto" },
  { key: "efeitos", label: "Efeitos" },
  { key: "3d", label: "3D" },
  { key: "shaders", label: "Shaders" },
  { key: "vintage", label: "Vintage" },
  { key: "anatomia", label: "Anatomia" },
  { key: "base", label: "Base" },
];

/** Os nomes de antes, pra `/catalogo/motion` mandado ontem ainda abrir algo. */
export const FAMILIA_ANTIGA: Record<string, Family> = {
  trabalho: "controles",
  aquisicao: "secoes",
  motion: "efeitos",
  marca: "base",
  fundacao: "base",
};

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


function PadDemo({ props }: DemoProps) {
  const [on, setOn] = React.useState<Set<number>>(new Set([1]));
  return (
    <Frame className="grid grid-cols-[repeat(2,auto)] place-content-center gap-2">
      {PAD_VOICES.slice(0, 4).map((voice, i) => (
        <VintageSoundboardPad
          key={voice.label}
          label={voice.label}
          color={voice.color}
          size={58}
          active={on.has(i)}
          {...props}
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
      <PaperShuttle progress={p} label="Exportando" />
    </Frame>
  );
}


const MarqueeVariantes = React.lazy(() => import("./demos/marquee-demo"));

const CenaPresa = React.lazy(() => import("./demos/pinned-scene-demo"));
const ActivityHeatmapColheitaDemo = React.lazy(() => import("./demos/activity-heatmap-demo"));
const BillingToggleColheitaDemo = React.lazy(() => import("./demos/billing-toggle-demo"));
const CardStackColheitaDemo = React.lazy(() => import("./demos/card-stack-demo"));
const ConfirmMorphColheitaDemo = React.lazy(() => import("./demos/confirm-morph-demo"));
const ElasticSliderColheitaDemo = React.lazy(() => import("./demos/elastic-slider-demo"));
const ExpandableCardColheitaDemo = React.lazy(() => import("./demos/expandable-card-demo"));
const ExpandingSearchColheitaDemo = React.lazy(() => import("./demos/expanding-search-demo"));
const GaugeColheitaDemo = React.lazy(() => import("./demos/gauge-demo"));
const HoldToConfirmColheitaDemo = React.lazy(() => import("./demos/hold-to-confirm-demo"));
const IconMorphColheitaDemo = React.lazy(() => import("./demos/icon-morph-demo"));
const MorphSelectColheitaDemo = React.lazy(() => import("./demos/morph-select-demo"));
const SlotTextColheitaDemo = React.lazy(() => import("./demos/slot-text-demo"));
const SwipeActionsColheitaDemo = React.lazy(() => import("./demos/swipe-actions-demo"));
const TextMorphColheitaDemo = React.lazy(() => import("./demos/text-morph-demo"));
const ToastStackColheitaDemo = React.lazy(() => import("./demos/toast-stack-demo"));
const DynamicIslandColheitaDemo = React.lazy(() => import("./demos/dynamic-island-demo"));
const FoldingBillColheitaDemo = React.lazy(() => import("./demos/folding-bill-demo"));
const HeatWordColheitaDemo = React.lazy(() => import("./demos/heat-word-demo"));
const LiquidToggleColheitaDemo = React.lazy(() => import("./demos/liquid-toggle-demo"));
const MagneticSelectColheitaDemo = React.lazy(() => import("./demos/magnetic-select-demo"));
const MagnifyDockColheitaDemo = React.lazy(() => import("./demos/magnify-dock-demo"));
const SloshSliderColheitaDemo = React.lazy(() => import("./demos/slosh-slider-demo"));
const TiltCardColheitaDemo = React.lazy(() => import("./demos/tilt-card-demo"));
const EclipseSwitchColheitaDemo = React.lazy(() => import("./demos/eclipse-switch-demo"));
const BlackHoleColheitaDemo = React.lazy(() => import("./demos/black-hole-demo"));
const CountdownColheitaDemo = React.lazy(() => import("./demos/countdown-demo"));
const CoverFlowColheitaDemo = React.lazy(() => import("./demos/cover-flow-demo"));
const DateReelColheitaDemo = React.lazy(() => import("./demos/date-reel-demo"));
const EyeTrackerColheitaDemo = React.lazy(() => import("./demos/eye-tracker-demo"));
const OrbitMenuColheitaDemo = React.lazy(() => import("./demos/orbit-menu-demo"));
const PageCurlColheitaDemo = React.lazy(() => import("./demos/page-curl-demo"));
const PullToRefreshColheitaDemo = React.lazy(() => import("./demos/pull-to-refresh-demo"));
const ReactionsColheitaDemo = React.lazy(() => import("./demos/reactions-demo"));
const SignaturePadColheitaDemo = React.lazy(() => import("./demos/signature-pad-demo"));
const SlideToConfirmColheitaDemo = React.lazy(() => import("./demos/slide-to-confirm-demo"));
const StickerPeelColheitaDemo = React.lazy(() => import("./demos/sticker-peel-demo"));
const StreamgraphColheitaDemo = React.lazy(() => import("./demos/streamgraph-demo"));
const TimeDialColheitaDemo = React.lazy(() => import("./demos/time-dial-demo"));
const VoiceNoteColheitaDemo = React.lazy(() => import("./demos/voice-note-demo"));
const WalletStackColheitaDemo = React.lazy(() => import("./demos/wallet-stack-demo"));
const ShaderAsciiColheitaDemo = React.lazy(() => import("./demos/shader-ascii-demo"));
const ShaderHalftoneColheitaDemo = React.lazy(() => import("./demos/shader-halftone-demo"));
const ShaderNeonColheitaDemo = React.lazy(() => import("./demos/shader-neon-demo"));
const ShaderRisoColheitaDemo = React.lazy(() => import("./demos/shader-riso-demo"));
const ShaderTunnelColheitaDemo = React.lazy(() => import("./demos/shader-tunnel-demo"));
const ShaderVoronoiColheitaDemo = React.lazy(() => import("./demos/shader-voronoi-demo"));

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
    family: "controles",
    description:
      "Seletor de marca com prévia ao percorrer: paleta, par tipográfico e completude do vault na linha. Aplica o tema da marca escolhida ao app inteiro.",
    tags: ["marca", "tema", "cmdk", "vault"],
    demo: BrandSelectorDemo,
    knobs: "BrandSelector",
    preview: { w: 360, h: 140 },
  },
  {
    name: "brand-theme",
    title: "Brand Theme Runtime",
    type: "lib",
    family: "base",
    description:
      "Provider e hook que aplicam em runtime o tema compilado de uma brand guideline. Uma folha de estilo só, trocada sem recarregar a página.",
    tags: ["marca", "tokens", "runtime", "provider"],
  },
  {
    name: "css-color",
    title: "CSS Color",
    type: "lib",
    family: "base",
    description:
      "Resolve qualquer cor CSS ou token (var(--x), oklch, color-mix) para sRGB 0..1 e avisa na troca de tema, para shader e canvas pintarem com a cor da marca.",
    tags: ["marca", "tokens", "webgl", "canvas", "oklch", "tema"],
    demo: CssColorDemo,
    preview: { w: 520, h: 320 },
  },
  {
    name: "theme-visant",
    title: "Temas de marca",
    type: "theme",
    family: "base",
    description:
      "Tema compilado de uma brand guideline: cor com contraste AA por construção, par tipográfico e o esqueleto de craft invariante. O da casa é público. Os de cliente saem do vault de cada conta.",
    tags: ["tema", "tokens", "oklch", "aa"],
  },

  // ---- superfície de trabalho
  {
    name: "data-table",
    title: "Data Table",
    type: "ui",
    family: "dados",
    description:
      "Tabela densa: ordenação, seleção, edição inline e menu de contexto. Hoje acoplada a Next (next-auth + next/navigation) — roda em app Next, não nesta vitrine.",
    tags: ["tabela", "fila", "tanstack"],
  },
  {
    name: "kanban",
    title: "Kanban",
    type: "block",
    family: "dados",
    description:
      "Board com drag-and-drop, seleção por marquee sobre o vazio e multi-seleção com shift/ctrl.",
    tags: ["board", "dnd", "seleção"],
    demo: KanbanDemo,
    // Largura pra caber as colunas sem barra de rolagem horizontal — que dentro
    // de um card de vitrine é sempre defeito; 220 de altura porque o que sobrava
    // era buraco, não respiro.
    preview: { w: 1020, h: 130 },
  },
  {
    name: "inline-edit",
    title: "Inline Edit",
    type: "ui",
    family: "controles",
    description:
      "Editar onde se lê. Enter salva, Esc cancela, o valor só troca depois que a promessa resolve.",
    tags: ["edição", "formulário"],
    demo: InlineEditFileDemo,
    preview: { w: 420, h: 220 },
  },
  {
    name: "auth-button",
    title: "Auth Button",
    type: "ui",
    family: "controles",
    description:
      "O canto da conta nos três estados. Enquanto a sessão não responde ele não escreve “Entrar” — e não muda de tamanho quando ela chega.",
    tags: ["conta", "sessão", "menu"],
    demo: AuthButtonDemo,
    knobs: "AuthButton",
    // 620: o defeito que a peça mata (o pulo do cabeçalho quando a sessão
    // chega) só é visível com a barra em volta. Botão sozinho num quadro não
    // tem o que empurrar.
    preview: { w: 360, h: 200 },
  },
  {
    name: "profile-form",
    title: "Profile Form",
    type: "ui",
    family: "controles",
    description:
      "Editar o perfil com foto, nome e e-mail verificado. Quando não dá pra salvar, o motivo aparece no campo — não num toast.",
    tags: ["conta", "formulário", "validação"],
    demo: ProfileFormDemo,
    knobs: "ProfileForm",
    preview: { w: 620, h: 400 },
  },
  {
    name: "segmented-control",
    title: "Segmented Control",
    type: "ui",
    family: "controles",
    description: "Alternador de poucas opções. Substitui um select quando as opções cabem na tela.",
    tags: ["controle", "apple"],
    demo: SegmentedControlDemo,
    preview: { w: 400, h: 200 },
  },
  {
    name: "scrub-input",
    title: "Scrub Input",
    type: "ui",
    family: "controles",
    description:
      "Número que se arrasta na horizontal, como nos editores gráficos. Teclado continua funcionando.",
    tags: ["número", "gesto"],
    demo: ScrubInputDemo,
    preview: { w: 360, h: 240 },
  },
  {
    name: "assignee-stack",
    title: "Assignee Stack",
    type: "ui",
    family: "dados",
    description: "Pilha de responsáveis com excedente contado. Iniciais quando não há avatar.",
    tags: ["avatar", "equipe"],
    demo: AssigneeStackDemo,
    knobs: "AssigneeStack",
    preview: { w: 620, h: 320 },
  },
  {
    name: "sticky-filterbar",
    title: "Sticky Filterbar",
    type: "ui",
    family: "navegacao",
    description:
      "Barra de filtro que gruda abaixo do cabeçalho sem medir altura na mão e sem pular no scroll.",
    tags: ["filtro", "scroll"],
    demo: StickyFilterbarDemo,
    knobs: "StickyFilterbar",
    preview: { w: 760, h: 520 },
  },
  {
    name: "measure-picker",
    title: "Measure Picker",
    type: "ui",
    family: "controles",
    description:
      "Escolher por medida e receber a recomendação. A faixa traduz o número em produto.",
    tags: ["slider", "recomendação"],
    demo: MeasurePickerDemo,
    knobs: "MeasurePicker",
    preview: { w: 620, h: 280 },
  },
  {
    name: "timeline",
    title: "Timeline",
    type: "ui",
    family: "secoes",
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
    family: "navegacao",
    description:
      "A navegação lateral de aplicação: colapsa por clique ou por ⌘/Ctrl+B, agrupa, marca a rota ativa e lembra o estado. O rótulo vira sr-only quando fecha, nunca some do DOM.",
    tags: ["sidebar", "navegação", "app", "colapsar", "atalho", "teclado"],
    demo: SideNavDemo,
    knobs: "SideNav",
    preview: { w: 720, h: 500 },
  },

  // ---- aquisição
  {
    name: "marquee",
    title: "Marquee",
    type: "ui",
    family: "secoes",
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
    family: "secoes",
    description:
      "A faixa de \"confiam na gente\" com os logos normalizados: altura óptica por item, teto de largura pro wordmark comprido e dessaturação em repouso que vira cor no hover.",
    tags: ["logos", "clientes", "prova social", "faixa", "marquee", "gsap"],
    demo: LogoWallDemo,
    knobs: "LogoWall",
    preview: { w: 760, h: 260 },
  },
  {
    name: "rail",
    title: "Rail",
    type: "ui",
    family: "navegacao",
    description:
      "Trilho horizontal com snap: anda por arrasto, Shift + roda, setas e teclado; as setas somem nas pontas.",
    tags: ["carrossel", "snap"],
    demo: RailDemo,
    knobs: "Rail",
    preview: { w: 920, h: 400 },
  },
  {
    name: "plate",
    title: "Plate",
    type: "ui",
    family: "midia",
    description:
      "A placa onde a foto de catálogo senta. Resolve o recorte branco sobre fundo colorido.",
    tags: ["produto", "foto"],
    demo: PlateDemo,
    knobs: "Plate",
    preview: { w: 660, h: 350 },
  },
  {
    name: "chip",
    title: "Chip",
    type: "ui",
    family: "controles",
    description:
      "Pastilha de filtro com contagem; a faceta sem resultado apaga em vez de mostrar zero.",
    tags: ["filtro", "loja"],
    demo: ChipDemo,
    preview: { w: 460, h: 160 },
  },
  {
    name: "store-status",
    title: "Store Status",
    type: "ui",
    family: "dados",
    description:
      "Aberto/fechado calculado no fuso da loja, não no do visitante. Quem está do outro lado do mundo vê a resposta certa.",
    tags: ["loja", "fuso"],
    demo: StoreStatusDemo,
    knobs: "StoreStatus",
    preview: { w: 420, h: 280 },
  },
  {
    name: "masonry-gallery",
    title: "Masonry Gallery",
    type: "ui",
    family: "midia",
    description:
      "Mosaico por round-robin: anexar página nova não reordena o que já estava na tela.",
    tags: ["galeria", "grid"],
    demo: MasonryGalleryDemo,
    knobs: "MasonryGallery",
    preview: { w: 920, h: 520 },
  },
  {
    name: "repulsive-hover",
    title: "Repulsive Hover",
    type: "ui",
    family: "efeitos",
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
    family: "feedback",
    description:
      "O texto que segura a pessoa durante uma espera longa, em quatro desenhos: linha com cronômetro, barra que varre, etapas e pulso.",
    tags: ["espera", "ia", "estado"],
    demo: StatusTickerDemo,
    preview: { w: 600, h: 300 },
  },
  {
    name: "working-glyph",
    title: "Working Glyph",
    type: "ui",
    family: "feedback",
    description:
      "Ícone que trabalha enquanto o sistema trabalha: picareta, martelo, engrenagem, pincel ou faísca, e o brilho corre só no traço.",
    tags: ["espera", "ícone"],
    demo: WorkingGlyphDemo,
    preview: { w: 540, h: 200 },
  },
  {
    name: "paper-shuttle",
    title: "Paper Shuttle",
    type: "ui",
    family: "feedback",
    description: "Progresso com narrativa de papel passando pela máquina.",
    tags: ["progresso", "export"],
    demo: PaperShuttleDemo,
  },
  {
    name: "glitch-chars",
    title: "Glitch Chars",
    type: "ui",
    family: "texto",
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
    family: "efeitos",
    description: "Ruído animado em SVG para dar vida a uma superfície parada.",
    tags: ["ruído", "svg"],
    demo: TurbulenceFieldDemo,
    knobs: "TurbulenceField",
    preview: { w: 560, h: 330 },
  },
  {
    name: "grid-dots",
    title: "Grid Dots",
    type: "ui",
    family: "efeitos",
    description: "Malha de pontos de fundo, o papel milimetrado que dá profundidade sem competir.",
    tags: ["fundo", "grid"],
    demo: GridDotsDemo,
    knobs: "GridDots",
    preview: { w: 620, h: 320 },
  },
  {
    name: "drop-overlay",
    title: "Drop Overlay",
    type: "ui",
    family: "feedback",
    description: "A camada que aparece quando um arquivo está sendo arrastado sobre a área.",
    tags: ["upload", "dnd"],
    demo: DropOverlayDemo,
    knobs: "DropOverlay",
    // 440 e não 320: a cena tem zona de solta MAIS a fileira de miniaturas que
    // aparece depois de receber. Medida na página, ela fecha em 432 — declarar
    // menos fazia o palco crescer depois de montar e empurrar a grade.
    preview: { w: 420, h: 300 },
  },
  {
    name: "motion-layer",
    title: "Motion Layer",
    type: "lib",
    family: "efeitos",
    description:
      "O ciclo de scroll do editor Shopify em GSAP/ScrollTrigger, com limpeza de instância.",
    tags: ["gsap", "scroll"],
  },
  {
    name: "smooth-scroll-provider",
    title: "Smooth Scroll Provider",
    type: "lib",
    family: "efeitos",
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
    knobs: "VintageMeter",
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
    knobs: "VintageSlider",
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
    preview: { w: 300, h: 260 },
  },
  {
    name: "vintage-led",
    title: "Vintage LED",
    type: "ui",
    family: "vintage",
    description: "LED de painel com halo. Quatro cores, estado on/off.",
    tags: ["áudio", "estado"],
    demo: VintageLedDemo,
    preview: { w: 440, h: 200 },
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
    preview: { w: 420, h: 320 },
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
    knobs: "VintageParametricEQ",
    preview: { w: 690, h: 460 },
  },
  {
    name: "vintage-oscilloscope",
    title: "Vintage Oscilloscope",
    type: "ui",
    family: "vintage",
    description: "Traço de osciloscópio alimentado por um buffer de amostras.",
    tags: ["áudio", "canvas"],
    // Um tubo, um modo por vez, e o PLAY liga um som de verdade que o tubo desenha.
    demo: VintageOscilloscopeDemo,
    knobs: "VintageOscilloscope",
    preview: { w: 480, h: 330 },
  },
  {
    name: "vintage-soundboard-pad",
    title: "Soundboard Pad",
    type: "ui",
    family: "vintage",
    description: "Pad de disparo com estado aceso e retorno tátil.",
    tags: ["áudio", "pad"],
    demo: PadDemo,
    knobs: "VintageSoundboardPad",
    preview: { w: 310, h: 265 },
  },
  {
    name: "vintage-xy-pad",
    title: "Vintage XY Pad",
    type: "ui",
    family: "vintage",
    description: "Campo de dois eixos para controlar dois parâmetros num gesto só.",
    tags: ["áudio", "gesto"],
    demo: ({ props }) => (
      <Frame>
        <VintageXYPad
          size={150}
          labelX="FILTER"
          labelY="REVERB"
          {...props}
        />
      </Frame>
    ),
    knobs: "VintageXYPad",
    preview: { w: 440, h: 275 },
  },
  {
    name: "vintage-tv-frame",
    title: "Vintage TV Frame",
    type: "ui",
    family: "vintage",
    description: "Moldura de tubo com curvatura e brilho de varredura.",
    tags: ["moldura", "crt"],
    // O tubo toca um programa e o seletor troca de canal; o botão de força é o da peça.
    demo: VintageTvFrameDemo,
    preview: { w: 440, h: 360 },
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
    family: "vintage",
    description: "A fundação do kit: variáveis de painel, texturas e as regras em @layer.",
    tags: ["css", "base"],
  },
  {
    name: "vintage-theme",
    title: "Vintage Theme",
    type: "theme",
    family: "vintage",
    description: "O tema do kit de áudio, o contraponto escuro aos temas de marca.",
    tags: ["tema", "css"],
  },
  {
    name: "use-media-query",
    title: "useMediaQuery",
    type: "hook",
    family: "base",
    description:
      "Media query como estado de React, via useSyncExternalStore: leitura síncrona no primeiro render, sem piscar, e segura em SSR.",
    tags: ["hook", "responsivo", "ssr"],
  },
  {
    name: "use-knob-drag",
    title: "useKnobDrag",
    type: "hook",
    family: "base",
    description:
      "O gesto de arrastar um knob isolado do desenho: pointer capture, trava de curso e passo fino com shift.",
    tags: ["hook", "gesto"],
  },
  {
    name: "section-intro",
    title: "Section Intro",
    type: "ui",
    family: "secoes",
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
    preview: { w: 620, h: 320 },
  },
  {
    name: "cta-surface",
    title: "CTA Surface",
    type: "ui",
    family: "secoes",
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
    preview: { w: 640, h: 500 },
  },
  {
    name: "showcase-card",
    title: "Showcase Card",
    type: "ui",
    family: "cards",
    description:
      "Card de serviço: mídia com selo de seta, título que cobre o card inteiro e a lista do que está incluso como texto, não como filtro.",
    tags: ["serviço", "card", "vitrine"],
    demo: ShowcaseCardDemo,
    knobs: "ShowcaseCard",
    preview: { w: 340, h: 400 },
  },
  {
    name: "step-cards",
    title: "Step Cards",
    type: "block",
    family: "secoes",
    description:
      "Como funciona, em passos numerados. Sai como lista ordenada no HTML, e a arte de cada passo entra por slot.",
    tags: ["passos", "como funciona", "onboarding"],
    demo: StepCardsDemo,
    knobs: "StepCards",
    preview: { w: 1180, h: 370 },
  },
  {
    name: "quote-block",
    title: "Quote Block",
    type: "ui",
    family: "secoes",
    description:
      "O depoimento único, em tamanho de dobra: a citação vem primeiro e em corpo de manchete, a atribuição entra depois como assinatura.",
    tags: ["depoimento", "prova social", "citação", "cliente", "retrato"],
    demo: QuoteBlockDemo,
    knobs: "QuoteBlock",
    preview: { w: 660, h: 400 },
  },
  {
    name: "testimonial-wall",
    title: "Testimonial Wall",
    type: "block",
    family: "secoes",
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
    family: "efeitos",
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
    family: "efeitos",
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
    family: "base",
    description:
      "Cliques de objeto analógico em WebAudio puro, sem arquivo: botão de câmera, dente de knob, alavanca e agulha pousando, com throttle, contexto armado no primeiro gesto e mudo sob prefers-reduced-motion.",
    tags: ["som", "áudio", "webaudio", "feedback", "tato", "clique", "analógico"],
    demo: () => <SfxBusDemo />,
    preview: { w: 420, h: 240 },
  },
  {
    name: "sfx-toggle",
    title: "SFX Toggle",
    type: "ui",
    family: "controles",
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
    family: "dados",
    description:
      "O número que se apura em vez de aparecer pronto: lê o valor final do próprio texto, trava a largura antes do primeiro quadro e não anima o que não dá pra parsear.",
    tags: ["número", "contagem", "prova", "estatística", "animar"],
    demo: CountUpDemo,
    knobs: "CountUp",
    preview: { w: 560, h: 210 },
  },
  {
    name: "use-pointer-parallax",
    title: "usePointerParallax",
    type: "hook",
    family: "base",
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
    family: "efeitos",
    description:
      "Hierarquia de entradas por dobra: rise, drift, mask, settle, climax, invert e mist em vez de trinta entradas iguais. O esconderijo é aplicado pelo componente, nunca por CSS estático.",
    tags: ["scroll", "entrada", "reveal", "dobra", "hierarquia"],
    demo: FoldMotionDemo,
    knobs: "Fold",
    // palco-check: a folga de 12px é a baseline do canvas e cresce junto com a caixa
    preview: { w: 690, h: 300 },
  },
  {
    name: "line-reveal",
    title: "Line Reveal",
    type: "ui",
    family: "texto",
    description:
      "O título que sobe de dentro do próprio corte de linha: mede a quebra depois da fonte carregar, re-quebra ao redimensionar, e o esconderijo é aplicado por JS pra página nunca sumir sem script.",
    tags: ["título", "reveal", "linha", "split", "gsap", "herói", "tipografia"],
    demo: LineRevealDemo,
    knobs: "LineReveal",
    // 1280 de largura porque a peça revela POR LINHA: num palco estreito a
    // frase quebra em duas e a cascata some. A demo agora traz frase longa e
    // as variantes lado a lado — é essa medida que faz o corte aparecer.
    preview: { w: 1280, h: 230 },
  },
  {
    name: "gleam",
    title: "Gleam",
    type: "ui",
    family: "efeitos",
    description:
      "A superfície que sabe onde o cursor está: luz sob o ponteiro, borda acesa do lado da luz e inclinação de 5 graus. Quatro números por quadro no JS, o desenho inteiro no CSS.",
    tags: ["hover", "card", "ponteiro", "tilt", "luz", "spotlight", "magnético"],
    demo: GleamDemo,
    knobs: "Gleam",
    preview: { w: 690, h: 390 },
  },
  {
    name: "photo-frame",
    title: "Photo Frame",
    type: "ui",
    family: "midia",
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
    family: "secoes",
    description:
      "A dobra alternada foto ↔ texto: a moldura revela a imagem, o texto entra deslizando da borda externa e o lado inverte a cada dobra sem ninguém escrever nada.",
    tags: ["dobra", "seção", "foto", "texto", "alternado", "scroll", "gsap"],
    demo: PhotoSplitDemo,
    knobs: "PhotoSplitStack",
    preview: { w: 900, h: 700 },
  },
  {
    name: "photo-flip",
    title: "Photo Flip",
    type: "ui",
    family: "midia",
    description:
      "A foto atravessa da grade para a tela cheia — mesmo nó do DOM, reparentado e animado por GSAP Flip com ease-in-out. A vaga segura a proporção pra grade não desabar, e o foco volta pra foto que abriu.",
    tags: ["foto", "galeria", "lightbox", "flip", "morph", "grade", "gsap"],
    demo: (a) => <PhotoFlipDemo {...a} />,
    knobs: "PhotoFlip",
    preview: { w: 1360, h: 300 },
  },
  {
    name: "photo-compare",
    title: "Photo Compare",
    type: "ui",
    family: "midia",
    description:
      "A cortina entre o antes e o depois: a camada de cima é RECORTADA, nunca redimensionada, então as duas fotos ficam na mesma escala. O arrasto, o teclado e o leitor de tela vêm de um input range invisível.",
    tags: ["foto", "antes", "depois", "comparar", "cortina", "rebrand", "slider"],
    demo: PhotoCompareDemo,
    knobs: "PhotoCompare",
    preview: { w: 700, h: 440 },
  },
  {
    name: "reels-rail",
    title: "Reels Rail",
    type: "ui",
    family: "midia",
    description:
      "O trilho de vídeo vertical: cartões 9:16 com encaixe, tocando o do meio ou o que está sob o cursor. Som opcional, um card por vez, e fora da tela pausa tudo.",
    tags: ["vídeo", "reels", "shorts", "vertical", "carrossel", "trilho"],
    demo: ReelsRailDemo,
    knobs: "ReelsRail",
    preview: { w: 1000, h: 540 },
  },
  {
    name: "measure-bar",
    title: "Measure Bar",
    type: "ui",
    family: "dados",
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
    family: "controles",
    description:
      "A dobra que deixa o visitante fazer a conta: controle acessível, projeção derivada do próprio valor, curva sem transição (pra não discordar do número) e premissa obrigatória por escrito.",
    tags: ["simulador", "calculadora", "slider", "projeção", "roi", "curva", "premissa"],
    demo: () => <SimSliderDemo />,
    preview: { w: 640, h: 420 },
  },
  {
    name: "carousel-3d",
    title: "Carousel 3D",
    type: "ui",
    family: "3d",
    description:
      "Capas num carrossel circular em WebGL: o card da frente cresce no hover, o botão central abre o item e o canvas só nasce perto da dobra. Aposentado da listagem — bom em vitrine de poucas peças.",
    tags: ["carrossel", "3d", "webgl", "portfólio", "capa", "vitrine"],
    demo: Carousel3DDemo,
    knobs: "Carousel3D",
    preview: { w: 640, h: 460 },
  },
  {
    name: "book-3d",
    title: "Book 3D",
    type: "ui",
    family: "3d",
    description:
      "O item de catálogo como objeto: capa dura em WebGL com lombada curva, espessura vinda da contagem de páginas e praça. Cor derivada dos tokens da marca e do matiz da própria arte, sem asset baixado.",
    tags: ["livro", "3d", "webgl", "catálogo", "capa", "objeto"],
    demo: Book3DDemo,
    knobs: "Book3D",
    // Palco em retrato (330×430), igual ao `cover-art`: o livro é 0.68 de
    // largura por 1 de altura, e numa caixa larga ele vira uma peça pequena no
    // meio de dois corredores de vazio.
    preview: { w: 330, h: 430 },
  },
  {
    name: "mist-text", title: "Mist Text", type: "ui", family: "texto",
    description: "Texto que sai da névoa por palavra ou letra (desfoque, opacidade e subida mínima): entra uma vez ao chegar na tela, ou acompanha a rolagem ida e volta com mola que não erra a faixa dentro de sticky.",
    tags: ["texto", "blur", "névoa", "reveal", "scroll", "palavra", "letra", "tipografia"],
    demo: MistTextDemo,
    preview: { w: 560, h: 300 },
  },
  {
    name: "mist-swap", title: "Mist Swap", type: "ui", family: "midia",
    description: "Troca de slides em névoa: o que sai se desfaz no desfoque enquanto o próximo assenta no mesmo lugar, só gira em tela e para sob movimento reduzido; preenche o pai, que precisa ter tamanho.",
    tags: ["foto", "slideshow", "crossfade", "blur", "névoa", "troca", "atmosfera"],
    demo: MistSwapDemo,
    preview: { w: 690, h: 440 },
  },
  {
    name: "dot-cursor", title: "Dot Cursor", type: "ui", family: "efeitos",
    description: "Ponto de 6px que segue o ponteiro com mola calma e abre num anel vazado sobre link, botão ou [data-cursor], em mix-blend-difference; só existe em ponteiro fino e sem movimento reduzido.",
    tags: ["cursor", "ponteiro", "hover", "mola", "blend", "minimal"],
    demo: DotCursorDemo,
    preview: { w: 480, h: 240 },
  },
  {
    name: "mist-dialog", title: "Mist Dialog", type: "ui", family: "feedback",
    description: "Modal em <dialog> nativo que entra e sai em névoa só com CSS (@starting-style + allow-discrete), controlado, fecha no Esc e no clique fora, com ganchos onOpen/onClose para pausar o scroll suave.",
    tags: ["modal", "dialog", "névoa", "blur", "vitrine", "starting-style", "overlay"],
    demo: MistDialogDemo,
    preview: { w: 690, h: 240 },
  },
  {
    name: "ink-wordmark",
    title: "Ink Wordmark",
    type: "ui",
    family: "texto",
    description: "Assinatura de ponta a ponta que condensa da fumaça conforme entra na tela, respira como tinta e se agita com a velocidade do ponteiro, só com filtro SVG.",
    tags: ["assinatura", "logo", "rodapé", "fumaça", "tinta", "svg", "scroll"],
    demo: InkWordmarkDemo,
    preview: { w: 640, h: 400 },
  },
  {
    name: "fog-hero",
    title: "Fog Hero",
    type: "block",
    family: "shaders",
    description: "Hero de tela cheia que abre uma clareira na névoa, troca uma playlist de vídeo P&B pela própria fumaça e sai em desfoque no scroll, com papel e tinta vindos dos tokens.",
    tags: ["hero", "névoa", "webgl", "shader", "vídeo", "abertura", "grão"],
    demo: FogHeroDemo,
    preview: { w: 640, h: 400 },
  },
  {
    name: "lathe-object",
    title: "Lathe Object",
    type: "ui",
    family: "3d",
    description: "Produto de revolução em WebGL a partir de um perfil de meia silhueta (frasco, vela, pote, difusor com varetas), com giro sozinho, arrasto para orbitar e vento no hover.",
    tags: ["3d", "webgl", "produto", "embalagem", "objeto", "difusor"],
    demo: LatheObjectDemo,
    // Palco em retrato, como o book-3d: o objeto é alto e estreito.
    preview: { w: 360, h: 440 },
  },
  {
    name: "fog-tree",
    title: "Fog Tree",
    type: "ui",
    family: "3d",
    description:
      "Uma árvore procedural sozinha na névoa, em duotone da marca: a cena é cinza e o último passe pinta com --background e --foreground, então o tema escuro inverte a foto sem segunda paleta.",
    tags: ["3d", "webgl", "névoa", "árvore", "scroll", "duotone", "ez-tree"],
    demo: FogTreeDemo,
    knobs: "FogTree",
    preview: { w: 640, h: 520 },
  },
  {
    name: "fog-garden",
    title: "Fog Garden",
    type: "block",
    family: "3d",
    description:
      "A caminhada por um jardim na névoa presa ao scroll: cada parada de texto sai da névoa e volta para ela, em mix-blend-difference sobre as copas, com clareiras derivadas das paradas e plantio semeado.",
    tags: ["3d", "webgl", "scroll", "sticky", "névoa", "storytelling", "jardim"],
    demo: FogGardenDemo,
    knobs: "FogGarden",
    preview: { w: 760, h: 440 },
  },
  {
    name: "book-shelf",
    title: "Book Shelf",
    type: "ui",
    family: "3d",
    description:
      "Estante em vez de vitrine: os itens soltos, sem moldura, e o rótulo só no hover — porque o objeto já tem silhueta e a moldura passa a competir com ela.",
    tags: ["estante", "prateleira", "catálogo", "grade", "hover"],
    demo: BookShelfDemo,
    knobs: "BookShelf",
    // Palco largo e baixo: o argumento da peça é a FILEIRA. Um palco em retrato
    // mostraria dois livros empilhados, que é a grade de ícones que ela evita.
    preview: { w: 560, h: 340 },
  },
  {
    name: "spine-card",
    title: "Spine Card",
    type: "ui",
    family: "cards",
    description:
      "O retângulo que lê como objeto: lombada de luz na borda, tombo apoiado na base que endireita no hover, e capa em duotone que só ganha cor onde a atenção está.",
    tags: ["card", "livro", "estante", "produto", "lombada"],
    demo: SpineCardDemo,
    knobs: "SpineCard",
    preview: { w: 670, h: 420 },
  },
  {
    name: "cover-art",
    title: "Cover Art",
    type: "ui",
    family: "midia",
    description:
      "Capa determinística em CSS pra item sem arte: três famílias (livro, app, placa), monograma, e rampa tonal derivada da marca por color-mix. Zero byte de imagem, SSR igual ao cliente.",
    tags: ["capa", "placeholder", "catálogo", "determinístico", "sem imagem"],
    demo: CoverArtDemo,
    knobs: "CoverArt",
    // Palco em retrato (330×430): a capa é 3/4, e numa caixa larga ela vira
    // faixa. A demo mostra uma família por vez, então o que precisa caber é a
    // altura de uma capa inteira, não três lado a lado.
    preview: { w: 400, h: 400 },
  },
  {
    name: "empty-state",
    title: "Empty State",
    type: "ui",
    family: "feedback",
    description:
      "O estado vazio canônico: arte por slot, frase do que vai aparecer ali e no máximo uma ação; com ou sem caixa.",
    tags: ["vazio", "empty", "onboarding", "primeiro uso"],
    demo: EmptyStateDemo,
    knobs: "EmptyArt",
    // Duas caixas lado a lado, e por isso `duplo` e não ladrilho: "generativo" é
    // uma afirmação sobre variação, e uma caixa sozinha prova que a arte existe,
    // não que ela nasce da semente.
    preview: { w: 420, h: 340 },
  },
  {
    name: "skeleton-rail",
    title: "Skeleton Rail",
    type: "ui",
    family: "feedback",
    description:
      "Esqueletos com as medidas do que substituem (trilho, card, lista, texto, mídia), em quatro movimentos: pulse, shimmer, wave ou parado.",
    tags: ["skeleton", "carregando", "trilho", "espera"],
    demo: SkeletonRailDemo,
    knobs: "SkeletonRail",
    preview: { w: 680, h: 340 },
  },
  {
    name: "use-local-search",
    title: "useLocalSearch",
    type: "hook",
    family: "base",
    description:
      "Busca em memória tolerante a acento: índice montado uma vez por lista, todos os termos batendo em qualquer ordem, e termo vazio devolvendo a lista inteira.",
    tags: ["busca", "filtro", "acento", "catálogo"],
  },
  {
    name: "magnetic-cta",
    title: "Magnetic CTA",
    type: "ui",
    family: "controles",
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
    family: "navegacao",
    description:
      "O menu mobile feito uma vez direito, em dois desenhos: gaveta lateral ou página inteira brutalista com imagem. Foco preso, Escape, retorno do foco e trava de rolagem vindos do Radix Dialog.",
    tags: ["menu", "mobile", "drawer", "navegação", "acessibilidade"],
    demo: NavDrawerDemo,
    preview: { w: 420, h: 220 },
  },
  {
    name: "pinned-scene",
    title: "Pinned Scene",
    type: "ui",
    family: "secoes",
    description:
      "A dobra que prende a arte e avança em passos. O pin é position:sticky, não ScrollTrigger.pin — o GSAP entra só pra relatar progresso em --p, --sp e --near, sem tocar no DOM.",
    tags: ["scroll", "sticky", "passos", "storytelling", "gsap"],
    demo: PinnedSceneDemoCard,
    knobs: "PinnedScene",
    preview: { w: 1360, h: 620 },
  },
  {
    name: "activity-heatmap",
    title: "Activity Heatmap",
    type: "ui",
    family: "dados",
    description:
      "Um quadrado por dia mostra o ritmo de meses de trabalho, com bolha que desliza entre os dias e teclado de calendário.",
    tags: ["dados","calendario","heatmap","ritmo","grafico"],
    demo: ActivityHeatmapColheitaDemo,
    knobs: "ActivityHeatmap",
    preview: { w: 480, h: 290 },
  },
  {
    name: "billing-toggle",
    title: "Billing Toggle",
    type: "ui",
    family: "controles",
    description:
      "Interruptor mensal e anual com o selo de desconto que vira recibo quando o anual é escolhido, e o preço rolando junto.",
    tags: ["preço","pricing","toggle","assinatura","desconto","radiogroup"],
    demo: BillingToggleColheitaDemo,
    knobs: "BillingToggle",
    preview: { w: 420, h: 200 },
  },
  {
    name: "card-stack",
    title: "Card Stack",
    type: "ui",
    family: "cards",
    description:
      "Pilha de cards em que o de cima vai pro fundo quando você arrasta e solta, como baralho de verdade.",
    tags: ["pilha","arrastar","gesto","depoimentos","cards"],
    demo: CardStackColheitaDemo,
    knobs: "CardStack",
    preview: { w: 420, h: 420 },
  },
  {
    name: "confirm-morph",
    title: "Confirm Morph",
    type: "ui",
    family: "controles",
    description:
      "Botão de apagar que vira a pergunta no próprio lugar, depois o andamento e o resultado com desfazer.",
    tags: ["botão","confirmação","destrutivo","desfazer"],
    demo: ConfirmMorphColheitaDemo,
    knobs: "ConfirmMorph",
    preview: { w: 500, h: 120 },
  },
  {
    name: "elastic-slider",
    title: "Elastic Slider",
    type: "ui",
    family: "controles",
    description:
      "Slider que estica feito elástico quando você puxa além do limite e volta com a velocidade da soltura.",
    tags: ["slider","range","física","mola","formulário","teclado"],
    demo: ElasticSliderColheitaDemo,
    knobs: "ElasticSlider",
    preview: { w: 368, h: 140 },
  },
  {
    name: "expandable-card",
    title: "Expandable Card",
    type: "ui",
    family: "cards",
    description:
      "Card de resumo que cresce pros lados e pra baixo ao abrir, e rola só a palavra que mudou no resumo.",
    tags: ["card","expandir","detalhe","resumo","layout"],
    demo: ExpandableCardColheitaDemo,
    knobs: "ExpandableCard",
    preview: { w: 520, h: 320 },
  },
  {
    name: "expanding-search",
    // palco-check: a barra fica no terço de cima de propósito, os resultados abrem pra baixo
    title: "Expanding Search",
    type: "ui",
    family: "controles",
    description:
      "Busca que fica guardada num ícone de lupa e só abre o campo quando alguém vai mesmo buscar.",
    tags: ["busca","search","combobox","cabeçalho","barra de ferramentas"],
    demo: ExpandingSearchColheitaDemo,
    knobs: "ExpandingSearch",
    preview: { w: 450, h: 350 },
  },
  {
    name: "gauge",
    title: "Gauge",
    type: "ui",
    family: "dados",
    description:
      "Medidor em arco com ponteiro que enche quando entra em vista e troca o nome da faixa na hora em que a contagem cruza o limite.",
    tags: ["dados","medidor","cota","grafico","meter"],
    demo: GaugeColheitaDemo,
    knobs: "Gauge",
    preview: { w: 340, h: 250 },
  },
  {
    name: "hold-to-confirm",
    title: "Hold to Confirm",
    type: "ui",
    family: "controles",
    description:
      "Botão que só confirma se você segurar, com o preenchimento enchendo e voltando se soltar antes.",
    tags: ["botão","confirmação","destrutivo","gesto"],
    demo: HoldToConfirmColheitaDemo,
    knobs: "HoldToConfirm",
    preview: { w: 400, h: 200 },
  },
  {
    name: "icon-morph",
    title: "Icon Morph",
    type: "ui",
    family: "controles",
    description:
      "Ícone de dois estados que vira o outro em vez de trocar, como menu e fechar ou copiar e copiado.",
    tags: ["ícone","botão","estado","micro-interação"],
    demo: IconMorphColheitaDemo,
    knobs: "IconMorph",
    preview: { w: 340, h: 120 },
  },
  {
    name: "morph-select",
    // palco-check: o gatilho fica no terço de cima de propósito, a lista abre pra baixo e precisa do espaço
    title: "Morph Select",
    type: "ui",
    family: "controles",
    description:
      "Select em que o próprio gatilho cresce e vira a lista, sem uma segunda caixa aparecendo embaixo.",
    tags: ["select","listbox","formulário","morph","teclado"],
    demo: MorphSelectColheitaDemo,
    knobs: "MorphSelect",
    preview: { w: 320, h: 330 },
  },
  {
    name: "slot-text",
    title: "Slot Text",
    type: "ui",
    family: "texto",
    description:
      "Número ou palavra que gira como rolo de caça-níquel e assenta da esquerda pra direita, sem passar do alvo.",
    tags: ["texto","numero","preco","contador","slot"],
    demo: SlotTextColheitaDemo,
    knobs: "SlotText",
    preview: { w: 360, h: 230 },
  },
  {
    name: "swipe-actions",
    title: "Swipe Actions",
    type: "ui",
    family: "cards",
    description:
      "Lista em que a linha arrasta pro lado e mostra as ações, com o mesmo menu pra quem usa teclado.",
    tags: ["lista","gesto","arrastar","triagem"],
    demo: SwipeActionsColheitaDemo,
    knobs: "SwipeActions",
    preview: { w: 420, h: 160 },
  },
  {
    name: "text-morph",
    title: "Text Morph",
    type: "ui",
    family: "texto",
    description:
      "Rótulo que vira a próxima palavra letra por letra, com as letras em comum deslizando e a largura indo junto numa mola.",
    tags: ["texto","morph","botao","estado","micro-interacao"],
    demo: TextMorphColheitaDemo,
    knobs: "TextMorph",
    preview: { w: 300, h: 150 },
  },
  {
    name: "toast-stack",
    title: "Toast Stack",
    type: "ui",
    family: "feedback",
    description:
      "Avisos que se empilham no canto e abrem em leque quando o ponteiro chega, com o carregando que vira feito no lugar.",
    tags: ["avisos","toast","notificacao","pilha","feedback"],
    demo: ToastStackColheitaDemo,
    knobs: "ToastStack",
    preview: { w: 480, h: 340 },
  },
  {
    name: "dynamic-island",
    // palco-check: o seletor de modo mora no pé do palco, embaixo da ilha
    title: "Dynamic Island",
    type: "ui",
    family: "feedback",
    description:
      "A pílula que mostra a atividade em curso e cresce no lugar com os controles quando alguém toca nela.",
    tags: ["pílula","atividade","morph","spring","timer","player","chamada"],
    demo: DynamicIslandColheitaDemo,
    knobs: "DynamicIsland",
    preview: { w: 380, h: 200 },
  },
  {
    name: "folding-bill",
    title: "Folding Bill",
    type: "ui",
    family: "cards",
    description:
      "Uma conta que dobra em três como papel e abre quando você puxa ou toca, com o total sempre à vista no cabeçalho.",
    tags: ["recibo","pedido","3d","arrastar","acordeão"],
    demo: FoldingBillColheitaDemo,
    knobs: "FoldingBill",
    preview: { w: 300, h: 320 },
  },
  {
    name: "heat-word",
    title: "Heat Word",
    type: "ui",
    family: "texto",
    description:
      "Uma grade de gotas ou uma palavra que derrete num mapa de calor por onde o cursor passa, pintada com as cores da marca.",
    tags: ["canvas","cursor","hover","calor","efeito"],
    demo: HeatWordColheitaDemo,
    knobs: "HeatWord",
    preview: { w: 520, h: 280 },
  },
  {
    name: "liquid-toggle",
    title: "Liquid Toggle",
    type: "ui",
    family: "controles",
    description:
      "Um interruptor cuja bolinha escorre como gota de um lado pro outro, esticando no caminho e se recolhendo ao chegar.",
    tags: ["switch","toggle","formulário","mola"],
    demo: LiquidToggleColheitaDemo,
    knobs: "LiquidToggle",
    preview: { w: 300, h: 150 },
  },
  {
    name: "magnetic-select",
    title: "Magnetic Select",
    type: "ui",
    family: "controles",
    description:
      "Um cacho de opções redondas em que a escolhida incha e empurra as outras, e o cursor puxa a opção que está debaixo dele.",
    tags: ["seleção","radio","ímã","hover","escolha"],
    demo: MagneticSelectColheitaDemo,
    knobs: "MagneticSelect",
    preview: { w: 240, h: 260 },
  },
  {
    name: "magnify-dock",
    title: "Magnify Dock",
    type: "ui",
    family: "navegacao",
    description:
      "A barra de atalhos em que os ícones crescem em onda conforme o cursor chega perto, com o nome em cima do mais próximo.",
    tags: ["dock","navegação","toolbar","ícones","ampliação","spring"],
    demo: MagnifyDockColheitaDemo,
    knobs: "MagnifyDock",
    preview: { w: 420, h: 180 },
  },
  {
    name: "slosh-slider",
    title: "Slosh Slider",
    type: "ui",
    family: "controles",
    description:
      "Um slider em que o preenchimento tem peso: arrastou rápido, a tinta passa do polegar, balança e assenta.",
    tags: ["slider","range","volume","física","spring","teclado"],
    demo: SloshSliderColheitaDemo,
    knobs: "SloshSlider",
    preview: { w: 400, h: 120 },
  },
  {
    name: "tilt-card",
    title: "Tilt Card",
    type: "ui",
    family: "efeitos",
    description:
      "O card que inclina em 3D seguindo o mouse, com um brilho que corre pela superfície.",
    tags: ["card","3d","tilt","hover","brilho","foto"],
    demo: TiltCardColheitaDemo,
    knobs: "TiltCard",
    preview: { w: 320, h: 420 },
  },
  {
    name: "eclipse-switch",
    title: "Eclipse Switch",
    type: "ui",
    family: "controles",
    description:
      "Chave de tema claro e escuro em que a lua cobre o sol num eclipse, sem mexer na página por conta própria.",
    tags: ["tema","modo escuro","chave","eclipse","toggle"],
    demo: EclipseSwitchColheitaDemo,
    knobs: "EclipseSwitch",
    preview: { w: 460, h: 220 },
  },
  {
    name: "black-hole",
    // palco-check: a barra de desfazer nasce embaixo depois de apagar, e a caixa reserva o lugar dela
    title: "Black Hole",
    type: "ui",
    family: "cards",
    description:
      "Apagar em lote com as linhas sugadas para um ponto só, a lista se inclinando em volta e o desfazer devolvendo tudo do mesmo lugar.",
    tags: ["lista","apagar","desfazer","inbox","canvas","transição"],
    demo: BlackHoleColheitaDemo,
    knobs: "BlackHole",
    preview: { w: 380, h: 377 },
  },
  {
    name: "countdown",
    title: "Countdown",
    type: "ui",
    family: "dados",
    description:
      "Contagem regressiva em que cada dígito gira pelo caminho curto e vira o aviso de ao vivo quando chega a zero.",
    tags: ["contagem","lancamento","prazo","timer","evento"],
    demo: CountdownColheitaDemo,
    knobs: "Countdown",
    preview: { w: 400, h: 180 },
  },
  {
    name: "cover-flow",
    // palco-check: a perspectiva das capas laterais puxa o centro medido; a capa da vez está no meio
    title: "Cover Flow",
    type: "ui",
    family: "midia",
    description:
      "Uma prateleira de capas em perspectiva: a da vez fica de frente, as vizinhas giram de lado e você arrasta ou joga pra trocar.",
    tags: ["galeria","carrossel","3d","portfólio","arrastar","capas"],
    demo: CoverFlowColheitaDemo,
    knobs: "CoverFlow",
    preview: { w: 640, h: 420 },
  },
  {
    name: "date-reel",
    title: "Date Reel",
    type: "ui",
    family: "controles",
    description:
      "Seletor de data em rolos de dia, mês e ano que encaixam sozinhos, como no telefone.",
    tags: ["data","calendário","rolo","seletor","agendar"],
    demo: DateReelColheitaDemo,
    knobs: "DateReel",
    preview: { w: 412, h: 379 },
  },
  {
    name: "eye-tracker",
    title: "Eye Tracker",
    type: "ui",
    family: "efeitos",
    description:
      "Um rosto de dois olhos que segue o cursor e o foco do teclado, pisca sozinho e dá oi no clique.",
    tags: ["mascote","estado vazio","cursor","personalidade"],
    demo: EyeTrackerColheitaDemo,
    knobs: "EyeTracker",
    preview: { w: 320, h: 240 },
  },
  {
    name: "orbit-menu",
    title: "Orbit Menu",
    type: "ui",
    family: "navegacao",
    description:
      "Botão que abre as ações em arco ao redor dele, com mola, pra escolher arrastando o dedo ou clicando.",
    tags: ["menu","ações","gesto","arco","mola"],
    demo: OrbitMenuColheitaDemo,
    knobs: "OrbitMenu",
    preview: { w: 332, h: 246 },
  },
  {
    name: "page-curl",
    title: "Page Curl",
    type: "ui",
    family: "midia",
    description:
      "Uma revistinha que você folheia puxando o canto da página, com a dobra, o verso do papel e a próxima página aparecendo por baixo.",
    tags: ["revista","catálogo","página","dobra","arrastar","editorial"],
    demo: PageCurlColheitaDemo,
    knobs: "PageCurl",
    preview: { w: 400, h: 470 },
  },
  {
    name: "pull-to-refresh",
    title: "Pull to Refresh",
    type: "ui",
    family: "feedback",
    description:
      "Painel que estica quando você puxa pra baixo, conta os pontos até a marca e gira enquanto atualiza.",
    tags: ["atualizar","arrasto","widget","carregando"],
    demo: PullToRefreshColheitaDemo,
    knobs: "PullToRefresh",
    preview: { w: 340, h: 300 },
  },
  {
    name: "reactions",
    title: "Reactions",
    type: "ui",
    family: "controles",
    description:
      "Barra de reações em que a contagem rola pro lado que andou e o ícone dá um pulinho quando você reage.",
    tags: ["reacao","comentario","contador","emoji","feedback"],
    demo: ReactionsColheitaDemo,
    knobs: "Reactions",
    preview: { w: 340, h: 170 },
  },
  {
    name: "signature-pad",
    title: "Signature Pad",
    type: "ui",
    family: "controles",
    description:
      "Campo de assinatura com tinta que engrossa e afina como caneta de verdade, com desfazer e limpar.",
    tags: ["assinatura","formulario","contrato","aceite","desenho"],
    demo: SignaturePadColheitaDemo,
    knobs: "SignaturePad",
    preview: { w: 440, h: 320 },
  },
  {
    name: "slide-to-confirm",
    title: "Slide to Confirm",
    type: "ui",
    family: "controles",
    description:
      "Trilho que só confirma quando você arrasta o polegar até o fim, e volta com mola se soltar antes.",
    tags: ["confirmação","arrasto","pagamento","gesto"],
    demo: SlideToConfirmColheitaDemo,
    knobs: "SlideToConfirm",
    preview: { w: 420, h: 200 },
  },
  {
    name: "sticker-peel",
    title: "Sticker Peel",
    type: "ui",
    family: "efeitos",
    description:
      "Um adesivo que levanta o canto quando o mouse chega perto, descola ao arrastar mostrando o verso e cola onde você soltar.",
    tags: ["adesivo","arrastar","dobra","papel","sticker"],
    demo: StickerPeelColheitaDemo,
    knobs: "StickerPeel",
    preview: { w: 380, h: 280 },
  },
  {
    name: "streamgraph",
    title: "Streamgraph",
    type: "ui",
    family: "dados",
    description:
      "Gráfico de fluxo empilhado que mostra como a mistura de várias partes muda no tempo, com camadas que ligam e desligam.",
    tags: ["grafico","dados","serie temporal","camadas","dashboard"],
    demo: StreamgraphColheitaDemo,
    knobs: "Streamgraph",
    preview: { w: 580, h: 330 },
  },
  {
    name: "time-dial",
    title: "Time Dial",
    type: "ui",
    family: "controles",
    description:
      "Mostrador de 24 horas que você gira com o dedo ou com as setas, com a faixa do expediente desenhada no aro.",
    tags: ["hora","relógio","fuso","seletor","agenda"],
    demo: TimeDialColheitaDemo,
    knobs: "TimeDial",
    preview: { w: 300, h: 300 },
  },
  {
    name: "voice-note",
    title: "Voice Note",
    type: "ui",
    family: "midia",
    description:
      "Nota de voz de chat com forma de onda, play e pausa, e busca clicando ou arrastando na onda.",
    tags: ["áudio","chat","player","forma de onda"],
    demo: VoiceNoteColheitaDemo,
    knobs: "VoiceNote",
    preview: { w: 340, h: 130 },
  },
  {
    name: "wallet-stack",
    // palco-check: o detalhe do cartão abre embaixo da pilha, e a caixa reserva o lugar dele
    title: "Wallet Stack",
    type: "ui",
    family: "cards",
    description:
      "Carteira de cartões empilhados em que um sobe pra mostrar saldo e movimento e os outros se recolhem no pé.",
    tags: ["carteira","cartões","fintech","pilha","saldo"],
    demo: WalletStackColheitaDemo,
    knobs: "WalletStack",
    preview: { w: 352, h: 516 },
  },
  {
    name: "shader-ascii",
    title: "Shader ASCII",
    type: "ui",
    family: "shaders",
    description:
      "Uma imagem redesenhada em caracteres, com seis jogos de glifo e as células mais cheias na cor da marca.",
    tags: ["shader","webgl","imagem","ascii","caracteres"],
    demo: ShaderAsciiColheitaDemo,
    knobs: "ShaderAscii",
    preview: { w: 440, h: 440 },
  },
  {
    name: "shader-halftone",
    title: "Shader Halftone",
    type: "ui",
    family: "shaders",
    description:
      "Retícula de uma tinta só sobre uma imagem, em pontos, quadrados ou linhas, com uma lupa que amplia debaixo do cursor.",
    tags: ["shader","webgl","imagem","retícula","impressão"],
    demo: ShaderHalftoneColheitaDemo,
    knobs: "ShaderHalftone",
    preview: { w: 440, h: 440 },
  },
  {
    name: "shader-neon",
    title: "Shader Neon",
    type: "ui",
    family: "shaders",
    description:
      "Fios de luz que ondulam num campo liso na cor da marca e engrossam quando o ponteiro passa rápido.",
    tags: ["shader","webgl","fundo","neon","onda"],
    demo: ShaderNeonColheitaDemo,
    knobs: "ShaderNeon",
    preview: { w: 600, h: 390 },
  },
  {
    name: "shader-riso",
    title: "Shader Riso",
    type: "ui",
    family: "shaders",
    description:
      "Uma imagem impressa em duas tintas de risografia, com grão, ângulo próprio por tinta e registro fora do lugar.",
    tags: ["shader","webgl","imagem","riso","impressão"],
    demo: ShaderRisoColheitaDemo,
    knobs: "ShaderRiso",
    preview: { w: 440, h: 440 },
  },
  {
    name: "shader-tunnel",
    title: "Shader Tunnel",
    type: "ui",
    family: "shaders",
    description:
      "Túnel de anéis em espiral que corre pro centro na cor da marca e acelera com o ponteiro.",
    tags: ["shader","webgl","fundo","tunel","espiral"],
    demo: ShaderTunnelColheitaDemo,
    knobs: "ShaderTunnel",
    preview: { w: 600, h: 390 },
  },
  {
    name: "shader-voronoi",
    title: "Shader Voronoi",
    type: "ui",
    family: "shaders",
    description:
      "Mosaico de células que derivam devagar com um núcleo aceso na cor da marca, empurradas pelo ponteiro.",
    tags: ["shader","webgl","fundo","voronoi","textura"],
    demo: ShaderVoronoiColheitaDemo,
    knobs: "ShaderVoronoi",
    preview: { w: 600, h: 390 },
  },
  // ---- anatomia: as figuras didáticas (branch anatomia, 2026-10-20)
  {
    name: "anatomia",
    title: "Anatomia",
    type: "ui",
    family: "anatomia",
    description:
      "O núcleo das figuras didáticas: o web component <visant-anatomia> (pinos, painel de peças, passo a passo, pausa, tela cheia, teclado) e o wrapper React. A figura em si vem de um item anatomia-<nome>.",
    tags: ["didática", "aula", "isométrico", "explicação", "web component", "passo a passo"],
  },
  {
    name: "anatomia-como-sobe",
    title: "Anatomia: como a ferramenta sobe",
    type: "lib",
    family: "anatomia",
    description:
      "Fig 1.4 do curso IA para Designers: o que sobe pro GitHub, o que o .gitignore segura no computador e quando a Vercel põe no ar.",
    tags: ["didática", "aula", "git", "github", "gitignore", "vercel"],
    demo: AnatomiaComoSobeDemo,
    preview: { w: 1080, h: 680 },
  },
  {
    name: "anatomia-fichario",
    title: "Anatomia: o fichário de receitas",
    type: "lib",
    family: "anatomia",
    description:
      "Fig 2.6 do curso IA para Designers: o agente lê só as etiquetas das skills e abre a receita que casa com o pedido; a pasta references/ só sobe quando a receita pede.",
    tags: ["didática", "aula", "skill", "receita", "claude"],
    demo: AnatomiaFicharioDemo,
    preview: { w: 1080, h: 710 },
  },
  {
    name: "anatomia-tomadas",
    title: "Anatomia: conector e chave de API",
    type: "lib",
    family: "anatomia",
    description:
      "Fig 2.2 do curso IA para Designers: os programas entram pelo conector do claude.ai, com a tua conta; o serviço pago entra pela chave de API, que mora no .env e conta cada chamada.",
    tags: ["didática", "aula", "conector", "chave de api", "mcp", "claude"],
    demo: AnatomiaTomadasDemo,
    preview: { w: 1080, h: 680 },
  },
  {
    name: "anatomia-memoria",
    title: "Anatomia: a memória do agente",
    type: "lib",
    family: "anatomia",
    description:
      "Fig 2.7 do curso IA para Designers: o agente esquece a conversa quando a janela fecha e lembra o que está no CLAUDE.md, com regra parafusada e fato com data.",
    tags: ["didática", "aula", "memória", "CLAUDE.md"],
    demo: AnatomiaMemoriaDemo,
    preview: { w: 1080, h: 680 },
  },
  {
    name: "anatomia-tokens",
    title: "Anatomia: o tanque da conversa",
    type: "lib",
    family: "anatomia",
    description:
      "Fig B.7 do curso IA para Designers: cada mensagem fica na conversa e o agente relê tudo a cada volta; um print resolve em uma volta o que o parágrafo leva três.",
    tags: ["didática", "aula", "tokens", "contexto"],
    demo: AnatomiaTokensDemo,
    preview: { w: 1080, h: 710 },
  },
  {
    name: "anatomia-script",
    title: "Anatomia: do briefing ao script",
    type: "lib",
    family: "anatomia",
    description:
      "Fig B.8 do curso IA para Designers: o agente resolve o pedido novo e gasta uso; o que se repete vira script, que roda sem IA e para quando não entende.",
    tags: ["didática", "aula", "script", "automação"],
    demo: AnatomiaScriptDemo,
    preview: { w: 1080, h: 680 },
  },
  {
    name: "anatomia-permissao",
    title: "Anatomia: a caixa de permissão",
    type: "lib",
    family: "anatomia",
    description:
      "Fig 2.3b do curso IA para Designers: nada do agente entra na tua pasta sem Yes, Yes and don't ask again ou No, e só o don't ask again fica escrito.",
    tags: ["didática", "aula", "terminal", "permissão"],
    demo: AnatomiaPermissaoDemo,
    preview: { w: 1080, h: 680 },
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

