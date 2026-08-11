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
import { depKeysOf } from "./deps";
import { PAD_VOICES, PEOPLE, SCOPE_PHOSPHOR, SCOPE_SAMPLES } from "./demo-fixtures";

import { Chip } from "../../registry/visant/ui/chip";
import { Plate } from "../../registry/visant/ui/plate";
import { Rail } from "../../registry/visant/ui/rail";
import { Marquee } from "../../registry/visant/ui/marquee";
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
import { SearchField } from "../../registry/visant/ui/search-field";
import { FilterMenu } from "../../registry/visant/ui/filter-menu";
import { FilterBar } from "../../registry/visant/ui/filter-bar";
import { SearchableSelect } from "../../registry/visant/ui/searchable-select";
import { CommandSearch } from "../../registry/visant/ui/command-search";
import { SectionIntro } from "../../registry/visant/ui/section-intro";
import { CtaSurface, CtaAction } from "../../registry/visant/ui/cta-surface";
import { ShowcaseCard } from "../../registry/visant/ui/showcase-card";
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
  const [v, setV] = React.useState(64);
  return (
    <Frame>
      <div className="w-full max-w-[240px]">
        <ScrubInput
          label="Intensidade"
          value={v}
          min={0}
          max={100}
          suffix="%"
          hint="arraste na horizontal"
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          onChange={setV}
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

function MasonryDemo() {
  const items = React.useMemo(
    () => [80, 120, 64, 100, 72, 140].map((h, i) => ({ h, i })),
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
          <div
            className="rounded-[var(--r-control,0.5rem)] border border-border"
            style={{ height: it.h * 0.55, background: "var(--muted)" }}
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
    <div className="h-full w-full overflow-hidden">
      <div data-demo-header className="h-6 border-b border-border bg-muted/40" />
      <StickyFilterbar headerSelector="[data-demo-header]">
        <FilterRow>
          <Chip pressed>Todos</Chip>
          <Chip count={12}>Em produção</Chip>
          <Chip count={3}>Rascunho</Chip>
        </FilterRow>
      </StickyFilterbar>
      <div className="space-y-2 p-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-6 rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

function TimelineDemo() {
  const data = React.useMemo(
    () => [
      { title: "Briefing", content: <p className="text-apoio text-muted-foreground">Guideline lida do vault.</p> },
      { title: "Tokens", content: <p className="text-apoio text-muted-foreground">Cor e tipo compilados.</p> },
    ],
    [],
  );
  return (
    <div className="h-full w-full overflow-hidden [&_h2]:text-base">
      <Timeline data={data} />
    </div>
  );
}

// --- busca e filtro ----------------------------------------------------------

/**
 * Uma fila de trabalho de mentira, mas com a forma da de verdade: é o mínimo
 * para a demo mostrar filtro FILTRANDO. Barra de filtro sobre lista estática
 * mostra o controle e esconde o que ele faz, que é o ponto inteiro da peça.
 */
const FILA = [
  { id: "1", nome: "Identidade Hockey Direct", status: "producao", prioridade: "urgente" },
  { id: "2", nome: "Landing Days n' Days", status: "revisao", prioridade: "alta" },
  { id: "3", nome: "Kit de mockups Visant", status: "producao", prioridade: "media" },
  { id: "4", nome: "Guideline Arbolt", status: "backlog", prioridade: "alta" },
  { id: "5", nome: "Catálogo de peças", status: "backlog", prioridade: "media" },
];

// A cor da bolinha vem do dado, como viria de uma API — por isso ela é token da
// marca aqui, e não hexadecimal cravado no componente.
const GRUPOS_FILTRO = [
  {
    key: "status",
    label: "Status",
    options: [
      { id: "backlog", label: "Backlog", dot: "var(--muted-foreground)" },
      { id: "producao", label: "Em produção", dot: "var(--brand, var(--foreground))" },
      { id: "revisao", label: "Em revisão", dot: "var(--accent-ink, var(--foreground))" },
    ],
  },
  {
    key: "prioridade",
    label: "Prioridade",
    mode: "single" as const,
    options: [
      { id: "urgente", label: "Urgente" },
      { id: "alta", label: "Alta" },
      { id: "media", label: "Média" },
    ],
  },
];

const ROTULO_FILTRO = Object.fromEntries(
  GRUPOS_FILTRO.flatMap((g) => g.options.map((o) => [o.id, o.label])),
);

function useFilaFiltrada() {
  const [busca, setBusca] = React.useState("");
  const [marcado, setMarcado] = React.useState<Record<string, string[]>>({});

  const alternar = React.useCallback((grupo: string, id: string) => {
    setMarcado((atual) => {
      const single = GRUPOS_FILTRO.find((g) => g.key === grupo)?.mode === "single";
      const antes = atual[grupo] ?? [];
      if (single) return { ...atual, [grupo]: antes[0] === id ? [] : [id] };
      return {
        ...atual,
        [grupo]: antes.includes(id) ? antes.filter((x) => x !== id) : [...antes, id],
      };
    });
  }, []);

  const filtrada = React.useMemo(() => {
    const needle = busca.toLowerCase().trim();
    return FILA.filter((linha) => {
      if (needle && !linha.nome.toLowerCase().includes(needle)) return false;
      return GRUPOS_FILTRO.every((g) => {
        const sel = marcado[g.key] ?? [];
        return sel.length === 0 || sel.includes(linha[g.key as "status" | "prioridade"]);
      });
    });
  }, [busca, marcado]);

  return { busca, setBusca, marcado, setMarcado, alternar, filtrada };
}

function SearchFieldDemo() {
  const { busca, setBusca, filtrada } = useFilaFiltrada();
  return (
    <div className="flex h-full w-full flex-col gap-2 p-3">
      <SearchField value={busca} onChange={setBusca} placeholder="Buscar na fila..." />
      <ul className="space-y-1">
        {filtrada.slice(0, 3).map((linha) => (
          <li key={linha.id} className="truncate rounded bg-muted px-2 py-1 text-apoio">
            {linha.nome}
          </li>
        ))}
        {filtrada.length === 0 && (
          <li className="px-2 py-1 text-apoio text-muted-foreground">Nada com esse texto.</li>
        )}
      </ul>
    </div>
  );
}

function FilterMenuDemo() {
  const { marcado, setMarcado, alternar } = useFilaFiltrada();
  return (
    <div className="flex h-full w-full items-start justify-center p-3">
      <FilterMenu
        groups={GRUPOS_FILTRO}
        selected={marcado}
        onToggle={alternar}
        onClear={() => setMarcado({})}
        align="start"
      />
    </div>
  );
}

function FilterBarKitDemo() {
  const { busca, setBusca, marcado, setMarcado, alternar, filtrada } = useFilaFiltrada();

  const chips = Object.entries(marcado).flatMap(([grupo, ids]) =>
    ids.map((id) => ({
      key: `${grupo}-${id}`,
      label: ROTULO_FILTRO[id] ?? id,
      onRemove: () => alternar(grupo, id),
    })),
  );

  return (
    <div className="flex h-full w-full flex-col gap-3 p-3">
      <FilterBar
        chips={chips}
        search={<SearchField value={busca} onChange={setBusca} placeholder="Buscar..." />}
        filters={
          <FilterMenu
            groups={GRUPOS_FILTRO}
            selected={marcado}
            onToggle={alternar}
            onClear={() => setMarcado({})}
          />
        }
        filteredCount={filtrada.length}
        totalCount={FILA.length}
        onClearAll={() => setMarcado({})}
      />
      <ul className="space-y-1">
        {filtrada.map((linha) => (
          <li key={linha.id} className="truncate rounded bg-muted px-2 py-1 text-apoio">
            {linha.nome}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchableSelectDemo() {
  const [valor, setValor] = React.useState("");
  const [extras, setExtras] = React.useState<{ value: string; label: string }[]>([]);

  const grupos = React.useMemo(
    () => [
      {
        label: "Clientes",
        options: [
          { value: "hockey", label: "Hockey Direct", keywords: "esporte loja" },
          { value: "days", label: "Days n' Days", keywords: "moda" },
        ],
      },
      { label: "Internos", options: [{ value: "visant", label: "Visant Labs" }, ...extras] },
    ],
    [extras],
  );

  return (
    <div className="flex h-full w-full items-start p-3">
      <SearchableSelect
        value={valor}
        onValueChange={setValor}
        groups={grupos}
        placeholder="Escolher cliente..."
        createEntityLabel="cliente"
        onCreate={async (label) => {
          const value = label.toLowerCase().replace(/\s+/g, "-");
          setExtras((atual) => [...atual, { value, label }]);
          return value;
        }}
      />
    </div>
  );
}

function CommandSearchDemo() {
  /*
   * `shortcut={null}`: o componente registra o atalho no `document`. Montado
   * aqui, ele roubaria o ⌘K de quem está só rolando o catálogo — e a peça tem a
   * prop justamente porque o mesmo choque acontece num app com duas buscas.
   * O gatilho continua sendo o de verdade, e abre o diálogo de verdade.
   */
  const buscar = React.useCallback(async (q: string) => {
    const needle = q.toLowerCase();
    return FILA.filter((l) => l.nome.toLowerCase().includes(needle)).map((l) => ({
      id: l.id,
      title: l.nome,
      subtitle: ROTULO_FILTRO[l.status],
      type: "job",
    }));
  }, []);

  return (
    <div className="flex h-full w-full items-start p-3">
      <CommandSearch
        shortcut={null}
        onSearch={buscar}
        onSelect={() => {}}
        quickLinks={[
          { id: "q1", title: "Fila de produção", subtitle: "Tudo que está aberto" },
          { id: "q2", title: "Criar job", subtitle: "Novo job com cliente" },
        ]}
      />
    </div>
  );
}

// --- catálogo ----------------------------------------------------------------

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
      "Tema compilado de uma brand guideline: cor com contraste AA por construção, par tipográfico e o esqueleto de craft invariante. O da casa é público; os de cliente saem do vault de cada conta.",
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
    preview: { w: 520, h: 300 },
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
    name: "filter-bar",
    title: "Filter Bar",
    type: "ui",
    family: "trabalho",
    description:
      "Esqueleto da barra de filtro: controles por slot, chips aplicados embaixo, e a contagem que some quando nada foi filtrado.",
    tags: ["filtro", "busca", "chips"],
    demo: FilterBarKitDemo,
    preview: { w: 520, h: 300 },
  },
  {
    name: "search-field",
    title: "Search Field",
    type: "ui",
    family: "trabalho",
    description:
      "Campo de busca com debounce que não se limpa sozinho: negocia o texto local com o valor de fora por referência acordada.",
    tags: ["busca", "debounce", "formulário"],
    demo: SearchFieldDemo,
    preview: { w: 420, h: 220 },
  },
  {
    name: "filter-menu",
    title: "Filter Menu",
    type: "ui",
    family: "trabalho",
    description:
      "Menu de facetas que não conhece o domínio: grupos múltiplos ou excludentes, e o contador conta grupos, não opções.",
    tags: ["filtro", "menu", "facetas"],
    demo: FilterMenuDemo,
    preview: { w: 420, h: 240 },
  },
  {
    name: "searchable-select",
    title: "Searchable Select",
    type: "ui",
    family: "trabalho",
    description:
      "Combobox com busca em rótulo e keywords ocultos, grupos, e criação no lugar que sobrevive à falha. Digita dentro de Dialog.",
    tags: ["combobox", "busca", "formulário"],
    demo: SearchableSelectDemo,
    preview: { w: 420, h: 240 },
  },
  {
    name: "command-search",
    title: "Command Search",
    type: "ui",
    family: "trabalho",
    description:
      "Busca ⌘K que não sabe buscar nem navegar: onSearch entra por prop, e resposta fora de ordem não repovoa a lista.",
    tags: ["busca", "comando", "teclado"],
    demo: CommandSearchDemo,
    preview: { w: 420, h: 200 },
  },
  {
    name: "measure-picker",
    title: "Measure Picker",
    type: "ui",
    family: "trabalho",
    description:
      "Escolher por medida e receber a recomendação — a faixa traduz o número em produto.",
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
      "Faixa infinita com duplicação medida, pausa no hover e bail-out em prefers-reduced-motion.",
    tags: ["faixa", "loop", "vitrine"],
    demo: () => (
      <div className="w-full">
        <Marquee
          band
          speed={40}
          items={["FRETE GRÁTIS", "NOVA COLEÇÃO", "ESTOQUE REAL", "TROCA EM 30 DIAS"].map((t, i) => (
            <span key={i} className="font-mono text-rotulo tracking-[0.14em]">
              {t}
            </span>
          ))}
        />
      </div>
    ),
    preview: { w: 640, h: 150 },
  },
  {
    name: "rail",
    title: "Rail",
    type: "ui",
    family: "aquisicao",
    description:
      "Trilho horizontal com snap, setas que somem nas pontas e scroll por teclado.",
    tags: ["carrossel", "snap"],
    demo: () => (
      <div className="w-full px-3">
        <Rail itemWidth={110} gap={10} label="Coleção">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="grid h-24 place-items-center rounded-[var(--r-control,0.5rem)] border border-border bg-muted text-rotulo text-muted-foreground"
            >
              item {i}
            </div>
          ))}
        </Rail>
      </div>
    ),
    preview: { w: 620, h: 210 },
  },
  {
    name: "plate",
    title: "Plate",
    type: "ui",
    family: "aquisicao",
    description:
      "A placa onde a foto de catálogo senta. Resolve o recorte branco sobre fundo colorido.",
    tags: ["produto", "foto"],
    demo: () => (
      <Frame>
        <div className="w-[150px]">
          <Plate ratio="4/5">
            <div className="grid h-full place-items-center text-rotulo text-muted-foreground">
              foto do produto
            </div>
          </Plate>
        </div>
      </Frame>
    ),
  },
  {
    name: "chip",
    title: "Chip",
    type: "ui",
    family: "aquisicao",
    description:
      "Pastilha de filtro com contagem que nunca renderiza zero. Com onRemove vira o chip do filtro já aplicado, sem aria-pressed.",
    tags: ["filtro", "loja"],
    demo: ChipsDemo,
  },
  {
    name: "store-status",
    title: "Store Status",
    type: "ui",
    family: "aquisicao",
    description:
      "Aberto/fechado calculado no fuso da loja, não no do visitante — a resposta certa para quem está do outro lado do mundo.",
    tags: ["loja", "fuso"],
    demo: () => (
      <Frame className="flex-col gap-1 text-center">
        <StoreStatus timeZone="America/Sao_Paulo" openHour={9} closeHour={18} />
        <span className="text-micro text-muted-foreground">America/Sao_Paulo · 9h–18h</span>
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
    preview: { w: 420, h: 250 },
  },
  {
    name: "repulsive-hover",
    title: "Repulsive Hover",
    type: "ui",
    family: "aquisicao",
    description: "O elemento foge do cursor com mola. Gesto de hero, não de formulário.",
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
      "Ícone que bate com faísca — o sistema mostrando esforço em vez de pedir paciência.",
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
    description: "Carregamento com sólido girando — a marca da casa em espera curta.",
    tags: ["loader", "lottie"],
    // O loader é de tela cheia por contrato (`min-h-screen` — ele ocupa a rota
    // inteira enquanto ela carrega). Dentro do card isso viraria um palco de 600px,
    // então a regra é desfeita aqui, na vitrine, e não no componente publicado.
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
    description: "Malha de pontos de fundo — o papel milimetrado que dá profundidade sem competir.",
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
    description: "Botão de painel com afundamento real no clique.",
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
        <div className="w-[190px]">
          <VintageTvFrame title="VISANT TV" width={190} showTimecode="00:12:34" signalActive>
            <div className="grid h-full place-items-center font-mono text-micro text-white/70">
              NO SIGNAL
            </div>
          </VintageTvFrame>
        </div>
      </Frame>
    ),
    preview: { w: 460, h: 335 },
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
    description: "O tema do kit de áudio — o contraponto escuro aos temas de marca.",
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
    name: "use-debounce",
    title: "useDebounce",
    type: "hook",
    family: "fundacao",
    description:
      "Atrasa um valor até ele parar de mudar. Só borda de saída, e o valor inicial não é atrasado.",
    tags: ["hook", "busca", "debounce"],
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
        lead="Da estratégia de marca ao desenvolvimento — sem repassar o trabalho para fora no meio do caminho."
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
          media={<DemoSurface />}
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
      "Como funciona, em passos numerados. Lista ordenada de verdade e a arte de cada passo por slot.",
    tags: ["passos", "como funciona", "onboarding"],
    demo: () => (
      <StepCards
        columns={3}
        visualHeight={140}
        steps={[
          {
            title: "Envie o pedido",
            description: "Conte o que precisa e suba os arquivos da marca.",
            visual: <DemoSurface />,
          },
          {
            title: "O time entra",
            description: "Cruzamos o projeto com quem tem a mão certa para ele.",
            visual: <DemoSurface />,
          },
          {
            title: "Você comenta",
            description: "Feedback direto na plataforma até ficar de pé.",
            visual: <DemoSurface />,
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
            media: <DemoSurface />,
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
    preview: { w: 760, h: 360 },
  },
];

/**
 * O lugar da foto nas demos de aquisição.
 *
 * Foto de verdade traria peso e uma dependência de rede que a vitrine não deve
 * ter. E colocar cor de exemplo aqui esconderia o ponto: essas peças leem o
 * token da marca. Isto é o `--muted` do tema ativo, e nada mais.
 */
function DemoSurface() {
  return <div className="size-full bg-[var(--muted)]" />;
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
