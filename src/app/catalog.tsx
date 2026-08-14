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
import { Media, proporcao, type Papel } from "./media";
import { depKeysOf } from "./deps";
import { PAD_VOICES, PEOPLE, SCOPE_PHOSPHOR, SCOPE_SAMPLES } from "./demo-fixtures";

import { Chip } from "../../registry/visant/ui/chip";
import { Plate } from "../../registry/visant/ui/plate";
import { Rail } from "../../registry/visant/ui/rail";
import { SegmentedControl } from "../../registry/visant/ui/segmented-control";
import { StoreStatus } from "../../registry/visant/ui/store-status";
import { MeasurePicker } from "../../registry/visant/ui/measure-picker";
import { StatusTicker } from "../../registry/visant/ui/status-ticker";
import { GlitchChars } from "../../registry/visant/ui/glitch-chars";
import { WorkingGlyph } from "../../registry/visant/ui/working-glyph";
import { PaperShuttle } from "../../registry/visant/ui/paper-shuttle";
import { GeneratingTile } from "../../registry/visant/ui/generating-tile";
import { TurbulenceField } from "../../registry/visant/ui/turbulence-field";
import { GridDots } from "../../registry/visant/ui/grid-dots";
import { DropOverlay } from "../../registry/visant/ui/drop-overlay";
import { OctahedronLoader } from "../../registry/visant/ui/octahedron-loader";
import { AssigneeStack } from "../../registry/visant/ui/assignee-stack";
import { MasonryGallery } from "../../registry/visant/ui/masonry-gallery";
import { ScrubInput } from "../../registry/visant/ui/scrub-input";
import { InlineEdit } from "../../registry/visant/ui/inline-edit";
import { RepulsiveHover } from "../../registry/visant/ui/repulsive-hover";
import { Timeline } from "../../registry/visant/ui/timeline";
import { StickyFilterbar, FilterRow } from "../../registry/visant/ui/sticky-filterbar";
import { SectionIntro } from "../../registry/visant/ui/section-intro";
import { CtaSurface, CtaAction } from "../../registry/visant/ui/cta-surface";
import { ShowcaseCard } from "../../registry/visant/ui/showcase-card";
import { EraseField } from "../../registry/visant/ui/erase-field";
import { SpringDots } from "../../registry/visant/ui/spring-dots";
import { SfxToggle } from "../../registry/visant/ui/sfx-toggle";
import { CountUp } from "../../registry/visant/ui/count-up";
import { MeasureBar } from "../../registry/visant/ui/measure-bar";
import { SpineCard } from "../../registry/visant/ui/spine-card";
import { CoverArt } from "../../registry/visant/ui/cover-art";
import { EmptyState } from "../../registry/visant/ui/empty-state";
import { SkeletonRail } from "../../registry/visant/ui/skeleton-rail";
import { Fold, FoldPart } from "../../registry/visant/lib/fold-motion";
import { usePointerParallax } from "../../registry/visant/hooks/use-pointer-parallax";
import { LineReveal } from "../../registry/visant/ui/line-reveal";
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
import { Gleam } from "../../registry/visant/ui/gleam";
import { SimSlider } from "../../registry/visant/ui/sim-slider";
import { StepCards } from "../../registry/visant/blocks/step-cards";
import { TestimonialWall } from "../../registry/visant/blocks/testimonial-wall";

import { VintageKnob } from "../../registry/vintage/ui/vintage-knob";
import { VintageLargeKnob } from "../../registry/vintage/ui/vintage-large-knob";
import { VintageMeter } from "../../registry/vintage/ui/vintage-meter";
import { VintageButton } from "../../registry/vintage/ui/vintage-button";
import { VintageSlider } from "../../registry/vintage/ui/vintage-slider";
import { VintageToggle } from "../../registry/vintage/ui/vintage-toggle";
import { VintageEQ } from "../../registry/vintage/ui/vintage-eq";
import { VintageLed } from "../../registry/vintage/ui/vintage-led";
import { VintageTvFrame } from "../../registry/vintage/ui/vintage-tv-frame";
import { VintageSoundboardPad } from "../../registry/vintage/ui/vintage-soundboard-pad";
import { VintageXYPad } from "../../registry/vintage/ui/vintage-xy-pad";
import { VintageOscilloscope } from "../../registry/vintage/ui/vintage-oscilloscope";
import { VintageCommandPalette } from "../../registry/vintage/ui/vintage-command-palette";

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

function ChipsDemo() {
  const [on, setOn] = React.useState<Set<string>>(new Set(["Sênior"]));
  return (
    <Frame className="flex-wrap gap-2">
      {[
        { l: "Sênior", c: 24 },
        { l: "Júnior", c: 8 },
        { l: "Goleiro", c: 0 },
      ].map(({ l, c }) => (
        <Chip
          key={l}
          pressed={on.has(l)}
          count={c}
          onClick={() =>
            setOn((p) => {
              const n = new Set(p);
              n.has(l) ? n.delete(l) : n.add(l);
              return n;
            })
          }
        >
          {l}
        </Chip>
      ))}
    </Frame>
  );
}

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

function MeasureDemo() {
  const [v, setV] = React.useState(152);
  return (
    // `accent-color` no palco, não no componente: o item não deve decidir a cor
    // do range nativo — quem instala escolhe, e aqui a escolha é o token da marca.
    <Frame className="[&_input[type=range]]:accent-[var(--brand)]">
      <MeasurePicker
        min={130}
        max={200}
        value={v}
        onValueChange={setV}
        label="Altura do jogador"
        edgeLabels={["130 cm", "200 cm"]}
        formatValue={(x) => `${x} cm`}
        bands={[
          { max: 150, value: "Youth 46", note: "cabo curto" },
          { max: 168, value: "Junior 52" },
          { max: 200, value: "Senior 60", note: "flex 85" },
        ]}
      >
        {(band) => (
          <span className="text-apoio text-muted-foreground">
            taco sugerido: <strong className="text-foreground">{String(band.value)}</strong>
          </span>
        )}
      </MeasurePicker>
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

function MeterDemo() {
  const [v, setV] = React.useState(5);
  useTick(140, React.useCallback(() => setV((p) => Math.max(0, Math.min(10, p + (Math.random() * 2 - 1)))), []));
  return (
    <Frame>
      <VintageMeter label="SIGNAL" value={v} />
    </Frame>
  );
}

function KnobDemo() {
  const [v, setV] = React.useState(5);
  return (
    <Frame>
      <VintageKnob label="BASS" value={v} onChange={setV} />
    </Frame>
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

function SliderDemo() {
  const [v, setV] = React.useState(6);
  return (
    <Frame>
      <VintageSlider label="GAIN" value={v} onChange={setV} />
    </Frame>
  );
}

function OscilloscopeDemo() {
  const t = React.useRef(0);
  const [data, setData] = React.useState(() => new Float32Array(SCOPE_SAMPLES));
  useTick(
    60,
    React.useCallback(() => {
      t.current += 0.12;
      const d = new Float32Array(SCOPE_SAMPLES);
      for (let i = 0; i < d.length; i++) {
        const p = (i / d.length) * Math.PI * 2;
        d[i] = Math.sin(p * 3 + t.current) * 0.5 + Math.sin(p * 7 + t.current * 1.7) * 0.2;
      }
      setData(d);
    }, []),
  );
  return (
    <Frame>
      <VintageOscilloscope data={data} width={280} height={130} color={SCOPE_PHOSPHOR} />
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

function DropDemo() {
  const [over, setOver] = React.useState(false);
  return (
    <div
      className="relative h-full w-full p-3"
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => setOver(false)}
    >
      <div className="grid h-full place-items-center rounded-[var(--r-control,0.5rem)] border border-dashed border-border text-rotulo text-muted-foreground">
        passe o mouse
      </div>
      <DropOverlay visible={over} message="Solte os arquivos" />
    </div>
  );
}

function GeneratingDemo() {
  const active = useStageActive();
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setLoading((v) => !v), 4200);
    return () => clearInterval(id);
  }, [active]);
  return (
    <Frame>
      <div className="w-[160px]">
        <GeneratingTile isLoading={loading} aspectRatio="1/1">
          <div className="grid h-full place-items-center bg-muted text-rotulo text-muted-foreground">
            resultado
          </div>
        </GeneratingTile>
      </div>
    </Frame>
  );
}

function PaperShuttleDemo() {
  const [p, setP] = React.useState(0.1);
  useTick(90, React.useCallback(() => setP((v) => (v > 0.98 ? 0.02 : v + 0.02)), []));
  return (
    <Frame>
      <PaperShuttle progress={p} label="exportando" />
    </Frame>
  );
}

/**
 * A malha com acervo de verdade — porque é a única forma de julgá-la.
 *
 * Com seis retângulos cinza de altura arbitrária, qualquer malha parece certa.
 * O que quebra um masonry é foto real: proporção que não se repete, retrato
 * junto de paisagem, uma peça mais alta que a coluna inteira. As proporções
 * vêm do manifesto do banco, então a coluna é montada com o número que o
 * arquivo tem — e não com um `h` chutado que sempre fecha.
 */
function MasonryDemo() {
  const items = React.useMemo(
    () =>
      [
        { papel: "cena" as const, indice: 0 },
        { papel: "retrato" as const, indice: 1 },
        { papel: "textura" as const, indice: 0 },
        { papel: "cena" as const, indice: 3 },
        { papel: "retrato" as const, indice: 4 },
        { papel: "cena" as const, indice: 5 },
      ].map((it, i) => ({ ...it, i, ratio: proporcao(it.papel, it.indice) })),
    [],
  );
  return (
    <div className="h-full w-full overflow-hidden p-3">
      <MasonryGallery
        items={items}
        cols={3}
        gap={8}
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
  );
}

function FilterbarDemo() {
  return (
    // O componente MEDE um cabeçalho e publica a altura em `--header-h`. Dentro
    // do card ele apontaria para o cabeçalho da vitrine e escreveria na raiz do
    // documento — demo não pode mexer na página que a hospeda. Aqui ele mede um
    // cabeçalho de mentira, que é justamente o que a demo tem de mostrar.
    // A demo antiga não rolava: três linhas curtas num card sem scroll. A peça
    // inteira é sobre o que acontece AO ROLAR — grudar, condensar, mostrar o
    // quanto da lista já passou — e nada disso podia acontecer. Vitrine que não
    // deixa mexer na peça é captura de tela com passos extras.
    <div className="h-full w-full overflow-y-auto">
      <div
        data-demo-header
        className="sticky top-0 z-40 h-6 border-b border-border bg-background"
      />
      {/* Respiro entre o cabeçalho e a barra. Sem ele a barra já nasce na
          própria linha de grude, e a demo abre no estado condensado — ou seja,
          nunca se vê a barra SOLTA nem o momento em que ela gruda, que é a
          peça inteira. */}
      <p className="px-3 py-3 text-apoio text-muted-foreground">
        Ao rolar, a barra encosta no cabeçalho, a linha secundária recolhe e o fio embaixo
        conta quanto da lista já passou.
      </p>
      <StickyFilterbar headerSelector="[data-demo-header]">
        <FilterRow>
          <Chip pressed>Todos</Chip>
          <Chip count={12}>Em produção</Chip>
          <Chip count={3}>Rascunho</Chip>
        </FilterRow>
        <FilterRow label="Cor" collapsible>
          <Chip>Quente</Chip>
          <Chip>Fria</Chip>
          <Chip>Neutra</Chip>
        </FilterRow>
      </StickyFilterbar>
      <div className="space-y-2 p-3">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="h-6 rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

function TimelineDemo() {
  const data = React.useMemo(
    () => [
      { meta: "seg 04", title: "Briefing", content: <p className="text-apoio text-muted-foreground">Guideline lida do vault.</p> },
      { meta: "qua 06", title: "Tokens", content: <p className="text-apoio text-muted-foreground">Cor e tipo compilados.</p> },
      { meta: "sex 08", title: "Entrega", content: <p className="text-apoio text-muted-foreground">Tema publicado no registry.</p> },
    ],
    [],
  );
  /* Sem o `[&_h2]:text-base` que morava aqui: ele existia pra domar um título
     que a peça escrevia sozinha, em inglês e de outra marca. Agora a cabeça é
     slot, então a demo passa a dela e a caixa não precisa desmentir a peça. */
  return (
    <div className="h-full w-full overflow-hidden">
      <Timeline data={data} title="A semana do projeto" />
    </div>
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

/**
 * Duas demos precisam de estado próprio, e por isso são componentes em vez de
 * JSX inline como as outras. Ficam aqui, ao lado do catálogo, e não em
 * `demos/`: são dez linhas cada, e um arquivo por demo de dez linhas espalha o
 * catálogo por três pastas sem ganhar nada.
 */

/** O hook escreve `--px`/`--py`; o CSS decide por objeto, via `--d`. */
function ParallaxDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  usePointerParallax(ref);
  const objetos = [
    { d: 26, cls: "left-[12%] top-[18%] size-16" },
    { d: 14, cls: "right-[16%] top-[26%] size-24" },
    { d: 38, cls: "left-[38%] bottom-[14%] size-12" },
  ];
  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden rounded-[var(--r-surface)]">
      {objetos.map((o) => (
        <div
          key={o.cls}
          className={`absolute rounded-[var(--r-control)] border border-border bg-card ${o.cls}`}
          style={{
            // `var(--px, 0)` com default: se o hook não rodar, a composição é
            // uma imagem parada — que é o repouso correto, não um estado quebrado.
            transform:
              `translate3d(calc(var(--px, 0) * ${o.d}px), calc(var(--py, 0) * ${o.d}px), 0)`,
          }}
        />
      ))}
      <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[length:var(--text-micro,0.68rem)] text-muted-foreground">
        mova o ponteiro
      </span>
    </div>
  );
}

/** Remonta a dobra a cada troca de variante — é o único jeito de ver a entrada
 *  mais de uma vez, já que a entrada é deliberadamente uma vez só. */
function FoldDemo() {
  const variantes = ["rise", "drift-l", "mask", "settle", "climax"] as const;
  const [v, setV] = React.useState<(typeof variantes)[number]>("mask");
  const [n, setN] = React.useState(0);
  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {variantes.map((k) => (
          <Chip
            key={k}
            pressed={v === k}
            onClick={() => {
              setV(k);
              setN((x) => x + 1);
            }}
          >
            {k}
          </Chip>
        ))}
      </div>
      <Fold key={`${v}-${n}`} variant={v} className="rounded-[var(--r-surface)] border border-border p-5">
        <FoldPart>
          <h3 className="text-[1.1rem] font-semibold tracking-tight">A dobra que decide</h3>
          <p className="mt-2 text-[length:var(--text-apoio,0.82rem)] text-muted-foreground">
            Trinta entradas idênticas o olho lê como uma.
          </p>
        </FoldPart>
      </Fold>
    </div>
  );
}

/**
 * A contagem acontece UMA vez, quando o número entra em tela — que é o certo no
 * produto e péssimo na vitrine: quem chega no card depois da primeira rolagem
 * nunca vê o efeito, e não tinha como pedir de novo.
 *
 * O replay remonta a peça por `key`, em vez de expor um método imperativo que
 * não existe no componente publicado. E o botão é um `Chip` de verdade, com
 * `alvo-toque` pra fechar os 44px do dedo: gesto de demonstração não pode ser
 * um alvo que só o mouse acerta.
 */
function CountUpDemo() {
  const [n, setN] = React.useState(0);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5">
      <div className="flex items-center justify-center gap-8" key={n}>
        <CountUp className="text-[2rem] font-semibold tracking-tight">R$450k</CountUp>
        <CountUp className="text-[2rem] font-semibold tracking-tight" delay={120}>
          1.200
        </CountUp>
        <span className="text-[2rem] font-semibold tracking-tight text-muted-foreground">—</span>
      </div>
      <Chip className="alvo-toque" onClick={() => setN((x) => x + 1)}>
        contar de novo
      </Chip>
    </div>
  );
}

/**
 * A revelação é uma vez só, por contrato — então a vitrine remonta a peça por
 * `key`, mesmo padrão do `CountUpDemo`. E aqui ela roda em `immediate`: dentro
 * de um palco de 520px que já nasce visível, um gatilho de rolagem nunca
 * dispararia, e o card ficaria com um título parado prometendo animação.
 */
function LineRevealDemo() {
  const [n, setN] = React.useState(0);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6">
      {/* Medida curta de propósito: a peça revela POR LINHA, e num palco de
          1500px a frase caberia numa linha só — a demo mostraria uma cascata de
          um elemento, que é o mesmo que não mostrar nada. */}
      <LineReveal
        key={n}
        as="h3"
        immediate
        className="max-w-[20ch] text-center text-[1.6rem] font-medium leading-[1.15]"
      >
        A quebra de linha é do navegador. O corte, do desenho.
      </LineReveal>
      <Chip className="alvo-toque" onClick={() => setN((x) => x + 1)}>
        revelar de novo
      </Chip>
    </div>
  );
}

/** Três cards lado a lado: é a grade que prova que a luz é local a cada peça. */
function GleamDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center gap-4 px-5">
      {["Marca", "Motion", "Medida"].map((t) => (
        <Gleam key={t} className="w-[9.5rem] p-5">
          <span className="text-[0.95rem] font-medium">{t}</span>
          <p className="mt-1.5 text-[length:var(--text-micro,0.68rem)] text-muted-foreground">
            passe o ponteiro
          </p>
        </Gleam>
      ))}
    </div>
  );
}

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

/**
 * A moldura revela UMA vez, na rolagem — e num palco que já nasce visível o
 * gatilho nunca arma. O replay por `key` é o mesmo recurso do `CountUpDemo`, e
 * a demo dispara na montagem chamando o `ScrollTrigger.refresh` de graça: a peça
 * remontada recalcula o próprio gatilho.
 */
function PhotoFrameDemo() {
  const [n, setN] = React.useState(0);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="flex items-start gap-4" key={n}>
        <PhotoFrame ratio="4/5" className="w-[150px]" caption="sem paralaxe">
          <Media papel="cena" indice={1} className="size-full" />
        </PhotoFrame>
        <PhotoFrame ratio="4/5" className="w-[150px]" parallax={10} caption="paralaxe 10%">
          <Media papel="cena" indice={3} className="size-full" />
        </PhotoFrame>
        <PhotoFrame ratio="4/5" className="w-[150px]" from="left" caption="abre da esquerda">
          <Media papel="retrato" indice={2} className="size-full" />
        </PhotoFrame>
      </div>
      <Chip className="alvo-toque" onClick={() => setN((x) => x + 1)}>
        revelar de novo
      </Chip>
    </div>
  );
}

/** Clicar leva a foto pra tela cheia — mesmo nó, percurso visível. */
function PhotoFlipDemo() {
  const items = React.useMemo(
    () =>
      [4, 5, 6, 7, 8, 9].map((i) => ({
        id: `f${i}`,
        media: <Media papel="cena" indice={i} className="size-full" />,
        caption: `Foto ${i}`,
      })),
    [],
  );
  // Largura fixa, e não `w-full`: o palco da vitrine escala a demo pra caber, e
  // uma grade elástica dentro de um palco elástico vira seis fotos gigantes com
  // a segunda fileira fora da tela.
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <PhotoFlip items={items} className="grid w-[420px] grid-cols-3 gap-2" />
      <span className="text-[length:var(--text-micro,0.68rem)] text-muted-foreground">
        clique pra ampliar · Esc fecha
      </span>
    </div>
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
    demo: () => (
      <Frame className="flex-col gap-2 text-center">
        <span className="text-rotulo text-muted-foreground">está na barra do topo →</span>
        <span className="font-mono text-rotulo">⌘B</span>
      </Frame>
    ),
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
    // 760 de largura porque o board tem duas colunas e uma barra de rolagem
    // horizontal dentro de um card de vitrine é sempre defeito; 210 de altura
    // porque o que sobrava era buraco, não respiro.
    preview: { w: 760, h: 210 },
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
    demo: () => (
      <Frame>
        <AssigneeStack assignees={PEOPLE} max={3} size="md" />
      </Frame>
    ),
  },
  {
    name: "sticky-filterbar",
    title: "Sticky Filterbar",
    type: "ui",
    family: "trabalho",
    description:
      "Barra de filtro que gruda abaixo do cabeçalho sem medir altura na mão e sem pular no scroll.",
    tags: ["filtro", "scroll"],
    demo: FilterbarDemo,
    preview: { w: 420, h: 240 },
  },
  {
    name: "measure-picker",
    title: "Measure Picker",
    type: "ui",
    family: "trabalho",
    description:
      "Escolher por medida e receber a recomendação. A faixa traduz o número em produto.",
    tags: ["slider", "recomendação"],
    demo: MeasureDemo,
    preview: { w: 560, h: 240 },
  },
  {
    name: "timeline",
    title: "Timeline",
    type: "ui",
    family: "trabalho",
    description: "Linha do tempo com progresso amarrado ao scroll.",
    tags: ["scroll", "narrativa"],
    demo: TimelineDemo,
    preview: { w: 460, h: 300 },
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
    name: "rail",
    title: "Rail",
    type: "ui",
    family: "aquisicao",
    description:
      "Trilho horizontal com snap, setas que somem nas pontas e scroll por teclado.",
    tags: ["carrossel", "snap"],
    /*
     * Foto do acervo, e não seis caixas cinzas escritas "item 1".
     *
     * Trilho é peça de vitrine: o que ele resolve — o card cortado na borda que
     * promete que a gama continua, o encaixe que para no item inteiro, a ponta
     * que esmaece enquanto há lista — só se julga com imagem de verdade dentro.
     * Com retângulo cinza a demo mostrava que o scroll funciona, que é a única
     * coisa que ninguém duvidava.
     *
     * `bleed={12}` casa com o `px-3` do palco: a fileira encosta na borda e o
     * título continua alinhado com o primeiro card.
     */
    demo: () => (
      <div className="w-full px-3">
        <Rail
          itemWidth={116}
          gap={10}
          label="Coleção"
          bleed={12}
          fade
          heading="Coleção"
          hint="8 peças"
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <figure key={i} className="min-w-0">
              <Media
                papel="cena"
                indice={i}
                ratio="4/5"
                className="rounded-[var(--r-control,0.5rem)] border border-border"
              />
              <figcaption className="mt-1.5 truncate text-rotulo text-muted-foreground">
                Peça {String(i + 1).padStart(2, "0")}
              </figcaption>
            </figure>
          ))}
        </Rail>
      </div>
    ),
    preview: { w: 620, h: 240 },
  },
  {
    name: "plate",
    title: "Plate",
    type: "ui",
    family: "aquisicao",
    description:
      "A placa onde a foto de catálogo senta. Resolve o recorte branco sobre fundo colorido.",
    tags: ["produto", "foto"],
    /*
     * A demo mostrava uma caixa cinza escrita "foto do produto" — numa peça
     * cujo trabalho inteiro é o que acontece ENTRE a foto e a placa. Sem foto
     * não dá pra ver o multiply casar o recorte com o fundo, nem o chão fazer o
     * produto pousar, nem a etiqueta sobreviver ao blend. Agora são duas placas
     * com arte de verdade e a diferença entre elas é a decisão que a peça pede:
     * recorte sobre branco (multiply, com chão) contra foto de cena (normal).
     */
    demo: () => (
      <Frame>
        <div className="flex items-end gap-4">
          {(
            [
              { blend: "multiply", ground: true, nota: "multiply, com chão", i: 0 },
              { blend: "normal", ground: false, nota: "normal, etiqueta", i: 5 },
            ] as const
          ).map((p) => (
            <div key={p.nota} className="w-[132px]">
              <Plate
                ratio="4/5"
                blend={p.blend}
                ground={p.ground}
                badge={
                  p.blend === "normal" ? (
                    <span className="rounded-[var(--r-pill,9999px)] bg-[var(--brand)] px-2 py-0.5 font-mono text-micro uppercase tracking-[0.12em] text-[var(--brand-foreground)]">
                      novo
                    </span>
                  ) : undefined
                }
              >
                <Media papel="cena" indice={p.i} className="h-full w-full" />
              </Plate>
              <p className="mt-1.5 font-mono text-micro uppercase tracking-wider text-muted-foreground">
                {p.nota}
              </p>
            </div>
          ))}
        </div>
      </Frame>
    ),
    preview: { w: 420, h: 260 },
  },
  {
    name: "chip",
    title: "Chip",
    type: "ui",
    family: "aquisicao",
    description: "Pastilha de filtro com contagem que nunca renderiza zero.",
    tags: ["filtro", "loja"],
    demo: ChipsDemo,
  },
  {
    name: "store-status",
    title: "Store Status",
    type: "ui",
    family: "aquisicao",
    description:
      "Aberto/fechado calculado no fuso da loja, não no do visitante. Quem está do outro lado do mundo vê a resposta certa.",
    tags: ["loja", "fuso"],
    demo: () => (
      <Frame className="flex-col gap-1 text-center">
        <StoreStatus timeZone="America/Sao_Paulo" openHour={9} closeHour={18} />
        <span className="text-micro text-muted-foreground">America/Sao_Paulo, 9h às 18h</span>
      </Frame>
    ),
  },
  {
    name: "masonry-gallery",
    title: "Masonry Gallery",
    type: "ui",
    family: "aquisicao",
    description:
      "Mosaico por round-robin: anexar página nova não reordena o que já estava na tela.",
    tags: ["galeria", "grid"],
    demo: MasonryDemo,
    // 420×430 e não 420×250: com foto de verdade a coluna tem a altura que o
    // ARQUIVO tem, e um retrato 720×900 sozinho come 250px. O palco corta o que
    // passa do declarado — declarar de menos aqui era a peça aparecer sem a
    // última fileira, que é justamente o que um mosaico precisa mostrar.
    preview: { w: 420, h: 430 },
  },
  {
    name: "repulsive-hover",
    title: "Repulsive Hover",
    type: "ui",
    family: "aquisicao",
    description: "O elemento foge do cursor com mola. Gesto de hero, fora de formulário.",
    tags: ["hover", "mola"],
    demo: () => (
      <Frame>
        <RepulsiveHover strength={8} radius={160}>
          <span
            className="rounded-[var(--r-pill,9999px)] px-5 py-2.5 text-corpo font-medium"
            style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}
          >
            tente clicar
          </span>
        </RepulsiveHover>
      </Frame>
    ),
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
    demo: GeneratingDemo,
    preview: { w: 380, h: 230 },
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
      <Frame className="[&>[role=status]]:min-h-0">
        <OctahedronLoader size={72} />
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
    demo: () => (
      <div className="relative h-full w-full">
        <TurbulenceField intensity={0.4} />
      </div>
    ),
  },
  {
    name: "grid-dots",
    title: "Grid Dots",
    type: "ui",
    family: "motion",
    description: "Malha de pontos de fundo, o papel milimetrado que dá profundidade sem competir.",
    tags: ["fundo", "grid"],
    demo: () => (
      <div className="relative h-full w-full">
        <GridDots opacity={0.35} spacing={16} />
      </div>
    ),
  },
  {
    name: "drop-overlay",
    title: "Drop Overlay",
    type: "ui",
    family: "motion",
    description: "A camada que aparece quando um arquivo está sendo arrastado sobre a área.",
    tags: ["upload", "dnd"],
    demo: DropDemo,
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
    demo: KnobDemo,
    preview: { w: 340, h: 200 },
  },
  {
    name: "vintage-large-knob",
    title: "Vintage Large Knob",
    type: "ui",
    family: "vintage",
    description: "O irmão grande: marcação de escala e leitura de valor.",
    tags: ["áudio", "knob"],
    demo: LargeKnobDemo,
    preview: { w: 540, h: 470 },
  },
  {
    name: "vintage-meter",
    title: "Vintage Meter",
    type: "ui",
    family: "vintage",
    description: "VU analógico com balística de ponteiro.",
    tags: ["áudio", "medidor"],
    demo: MeterDemo,
    preview: { w: 440, h: 230 },
  },
  {
    name: "vintage-slider",
    title: "Vintage Slider",
    type: "ui",
    family: "vintage",
    description: "Fader de console com curso e trilho gravados.",
    tags: ["áudio", "fader"],
    demo: SliderDemo,
    preview: { w: 440, h: 300 },
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
    demo: () => (
      <Frame className="gap-3">
        <VintageLed color="green" active label="PWR" />
        <VintageLed color="yellow" active label="BYP" />
        <VintageLed color="red" label="CLIP" />
      </Frame>
    ),
    preview: { w: 440, h: 190 },
  },
  {
    name: "vintage-eq",
    title: "Vintage EQ",
    type: "ui",
    family: "vintage",
    description: "Banco de faders com curva desenhada.",
    tags: ["áudio", "eq"],
    demo: () => (
      <Frame>
        <VintageEQ />
      </Frame>
    ),
    preview: { w: 560, h: 540 },
  },
  {
    name: "vintage-oscilloscope",
    title: "Vintage Oscilloscope",
    type: "ui",
    family: "vintage",
    description: "Traço de osciloscópio alimentado por um buffer de amostras.",
    tags: ["áudio", "canvas"],
    demo: OscilloscopeDemo,
    preview: { w: 580, h: 240 },
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
    demo: () => (
      // Largura travada, mas não fixa: sem o teto o card cresce até a mídia
      // estourar a altura declarada do palco; com largura FIXA ele estoura a tela
      // de 360px — foi o que a suíte de responsivo pegou.
      <div className="w-full max-w-[360px]">
        <ShowcaseCard
          href="#/c/showcase-card"
          title="Identidade que quer dizer alguma coisa"
          media={<DemoSurface papel="video" />}
          tags={["Estratégia", "Naming", "Logo", "Identidade visual"]}
        />
      </div>
    ),
    preview: { w: 380, h: 400 },
  },
  {
    name: "step-cards",
    title: "Step Cards",
    type: "block",
    family: "aquisicao",
    description:
      "Como funciona, em passos numerados. Sai como lista ordenada no HTML, e a arte de cada passo entra por slot.",
    tags: ["passos", "como funciona", "onboarding"],
    demo: () => (
      <StepCards
        columns={3}
        visualHeight={140}
        steps={[
          {
            title: "Envie o pedido",
            description: "Conte o que precisa e suba os arquivos da marca.",
            visual: <DemoSurface indice={1} ratio="4/3" />,
          },
          {
            title: "O time entra",
            description: "Cruzamos o projeto com quem tem a mão certa para ele.",
            visual: <DemoSurface papel="retrato" indice={3} ratio="4/3" />,
          },
          {
            title: "Você comenta",
            description: "Feedback direto na plataforma até ficar de pé.",
            visual: <DemoSurface indice={4} ratio="4/3" />,
          },
        ]}
      />
    ),
    preview: { w: 720, h: 250 },
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
    demo: () => <CountUpDemo />,
  },
  {
    name: "use-pointer-parallax",
    title: "usePointerParallax",
    type: "hook",
    family: "motion",
    description:
      "Escreve --px e --py uma vez por quadro e deixa o CSS decidir a profundidade de cada objeto. Só em ponteiro fino, volta ao repouso ao sair da janela.",
    tags: ["paralaxe", "ponteiro", "profundidade", "colagem", "hero"],
    demo: () => <ParallaxDemo />,
    preview: { w: 460, h: 240 },
  },
  {
    name: "fold-motion",
    title: "Fold Motion",
    type: "lib",
    family: "motion",
    description:
      "Hierarquia de entradas por dobra: rise, drift, mask, settle, climax e invert em vez de trinta entradas iguais. O esconderijo é aplicado pelo componente, nunca por CSS estático.",
    tags: ["scroll", "entrada", "reveal", "dobra", "hierarquia"],
    demo: () => <FoldDemo />,
    preview: { w: 520, h: 300 },
  },
  {
    name: "line-reveal",
    title: "Line Reveal",
    type: "ui",
    family: "motion",
    description:
      "O título que sobe de dentro do próprio corte de linha: mede a quebra depois da fonte carregar, re-quebra ao redimensionar, e o esconderijo é aplicado por JS pra página nunca sumir sem script.",
    tags: ["título", "reveal", "linha", "split", "gsap", "herói", "tipografia"],
    demo: () => <LineRevealDemo />,
    preview: { w: 560, h: 260 },
  },
  {
    name: "gleam",
    title: "Gleam",
    type: "ui",
    family: "motion",
    description:
      "A superfície que sabe onde o cursor está: luz sob o ponteiro, borda acesa do lado da luz e inclinação de 5 graus. Quatro números por quadro no JS, o desenho inteiro no CSS.",
    tags: ["hover", "card", "ponteiro", "tilt", "luz", "spotlight", "magnético"],
    demo: () => <GleamDemo />,
    preview: { w: 600, h: 240 },
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
    preview: { w: 620, h: 330 },
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
    preview: { w: 900, h: 420 },
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
    demo: () => (
      // `flex-wrap`: a estante tem que caber no celular também — a demo roda
      // sozinha num viewport de 360px no teste de peça responsiva.
      //
      // Sem `h-full`: com ele a estante colava no rodapé de um palco que cresce
      // (a vista de foco dá 1500px de largura ao palco), e a linha do título
      // ficava cortada embaixo. A altura da demo agora é a da estante, e o palco
      // se ajusta a ela — que é o contrato do FitStage.
      <div className="flex flex-wrap items-end justify-center gap-5 py-2">
        {["Marca em 9 etapas", "O método do lote", "Imersão"].map((t, i) => (
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
    ),
    preview: { w: 540, h: 330 },
  },
  {
    name: "cover-art",
    title: "Cover Art",
    type: "ui",
    family: "trabalho",
    description:
      "Capa determinística em CSS pra item sem arte: três famílias (livro, app, placa), monograma, e rampa tonal derivada da marca por color-mix. Zero byte de imagem, SSR igual ao cliente.",
    tags: ["capa", "placeholder", "catálogo", "determinístico", "sem imagem"],
    demo: () => (
      // Retrato, e não paisagem: numa caixa 4/3 de 150px sobravam 112px de
      // altura pro título, e a capa aparecia mais como faixa do que como capa.
      // Sem `h-full`, a demo tem a altura das capas e o palco acompanha.
      <div className="flex flex-wrap items-center justify-center gap-[18px] py-1">
        {(
          [
            ["Marca em 9 etapas", "book"],
            ["Brand Machine", "app"],
            ["Live de outubro", "plate"],
          ] as const
        ).map(([t, f]) => (
          <div key={t} className="relative aspect-[3/4] w-[160px] overflow-hidden rounded">
            <CoverArt title={t} seed={t} family={f} />
          </div>
        ))}
      </div>
    ),
    preview: { w: 550, h: 240 },
  },
  {
    name: "empty-state",
    title: "Empty State",
    type: "ui",
    family: "fundacao",
    description:
      "O estado vazio canônico: arte por slot com véu de contraste garantido, eyebrow, frase que diz o que vai aparecer ali, e no máximo uma ação.",
    tags: ["vazio", "empty", "onboarding", "primeiro uso"],
    demo: () => (
      <EmptyState
        /* `w-full max-w-[340px]` e não `w-[340px]`: medido, a largura cravada
           estourava 80px numa coluna de 260px — e coluna estreita é justamente
           onde estado vazio mora. O teto continua, o piso deixa de existir. */
        className="mx-auto w-full max-w-[340px]"
        eyebrow="Biblioteca"
        title="Nada por aqui ainda."
        action={<Chip pressed>Importar acervo</Chip>}
        /* Foto de verdade no slot, e não a capa tonal que estava aqui: o véu
           existe pra garantir contraste sobre imagem com luz de janela, e uma
           rampa de duas cores nunca ameaça o texto. Com a foto dá pra ver se o
           véu está fazendo o trabalho ou só apagando a arte — era exatamente
           esse o defeito. */
        art={<Media papel="cena" indice={2} className="h-[120px] w-full" />}
      >
        O que você salvar aparece aqui, com o trecho e o minuto do vídeo.
      </EmptyState>
    ),
    preview: { w: 380, h: 300 },
  },
  {
    name: "skeleton-rail",
    title: "Skeleton Rail",
    type: "ui",
    family: "trabalho",
    description:
      "O esqueleto do trilho com as mesmas medidas do trilho: mesmos nomes de prop, overflow hidden em vez de auto, e pulse em vez de shimmer.",
    tags: ["skeleton", "carregando", "trilho", "espera"],
    demo: () => <SkeletonRail cards={4} itemWidth={150} gap={14} />,
    preview: { w: 620, h: 220 },
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
    demo: () => (
      <Frame className="gap-8">
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
    preview: { w: 700, h: 500 },
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
function DemoSurface({
  papel = "cena",
  indice = 0,
  ratio,
}: {
  papel?: Papel;
  indice?: number;
  /**
   * Só onde o slot da peça NÃO fixa a altura.
   *
   * O `testimonial-wall` reserva a caixa do retrato e a mídia preenche; o
   * `step-cards` deixa a altura para o conteúdo, e sem proporção declarada cada
   * passo ficava com uma altura diferente — três cards desalinhados por causa da
   * proporção do arquivo, não do componente.
   */
  ratio?: string;
}) {
  return <Media papel={papel} indice={indice} ratio={ratio} className="size-full" />;
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
