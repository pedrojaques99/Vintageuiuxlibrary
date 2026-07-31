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
import { Kanban } from "../../registry/visant/blocks/kanban";
import type { KanbanItem } from "../../registry/visant/blocks/kanban/types";

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
  /** Colunas que o card ocupa na grade larga (1–3). Degrada nos breakpoints menores. */
  span?: 1 | 2 | 3;
}

/** Palco padrão de quem não declara tamanho: cabe knob, chip, badge, loader. */
export const DEFAULT_PREVIEW = { w: 380, h: 190 };

export const previewOf = (item: CatalogItem) => item.preview ?? DEFAULT_PREVIEW;

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

/** O texto que a busca varre de um item. Um lugar só decide o que é buscável. */
export const haystack = (i: CatalogItem) =>
  fold([i.name, i.title, i.description, i.type, familyLabel(i.family), ...i.tags].join(" "));

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
          <span className="text-[12px] text-muted-foreground">
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
        value={<span className="text-[15px] font-medium">{value}</span>}
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
          className="w-full rounded-[var(--r-control,0.5rem)] border border-border bg-background px-2 py-1 text-[15px] outline-none"
        />
      </InlineEdit>
    </Frame>
  );
}

function KanbanDemo() {
  const columns = React.useMemo(
    () => [
      { id: "fila", data: { label: "Fila" } },
      { id: "fazendo", data: { label: "Fazendo" } },
    ],
    [],
  );
  const [items, setItems] = React.useState<KanbanItem<{ t: string }>[]>([
    { id: "a", columnId: "fila", data: { t: "Colher marquee" } },
    { id: "b", columnId: "fila", data: { t: "Tema Kastrup" } },
    { id: "c", columnId: "fazendo", data: { t: "Brand selector" } },
  ]);
  return (
    <div className="h-full w-full overflow-auto p-2 text-[11px]">
      <Kanban
        columns={columns}
        items={items}
        onMove={({ itemId, toColumnId }) =>
          setItems((prev) =>
            prev.map((it) => (it.id === itemId ? { ...it, columnId: toColumnId } : it)),
          )
        }
        renderColumnHeader={(c) => (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {(c.data as { label: string }).label}
          </span>
        )}
        renderCard={({ item, dragging }) => (
          <div
            className={`rounded-[var(--r-control,0.5rem)] border border-border bg-card px-2.5 py-2 ${
              dragging ? "opacity-40" : ""
            }`}
          >
            {item.data.t}
          </div>
        )}
      />
    </div>
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
      <div className="grid h-full place-items-center rounded-[var(--r-control,0.5rem)] border border-dashed border-border text-[11px] text-muted-foreground">
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
          <div className="grid h-full place-items-center bg-muted text-[11px] text-muted-foreground">
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
    <div className="h-full w-full overflow-hidden">
      <StickyFilterbar>
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
      { title: "Briefing", content: <p className="text-[12px] text-muted-foreground">Guideline lida do vault.</p> },
      { title: "Tokens", content: <p className="text-[12px] text-muted-foreground">Cor e tipo compilados.</p> },
    ],
    [],
  );
  return (
    <div className="h-full w-full overflow-hidden [&_h2]:text-base">
      <Timeline data={data} />
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
        <span className="text-[11px] text-muted-foreground">está na barra do topo →</span>
        <span className="font-mono text-[11px]">⌘B</span>
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
      "21 temas compilados do vault do Visant Labs: cor com contraste AA por construção, par tipográfico e o esqueleto de craft invariante.",
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
    span: 2,
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
      "Escolher por medida e receber a recomendação — a faixa traduz o número em produto.",
    tags: ["slider", "recomendação"],
    demo: MeasureDemo,
    preview: { w: 560, h: 240 },
    span: 2,
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
            <span key={i} className="font-mono text-[11px] tracking-[0.14em]">
              {t}
            </span>
          ))}
        />
      </div>
    ),
    preview: { w: 640, h: 150 },
    span: 2,
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
              className="grid h-24 place-items-center rounded-[var(--r-control,0.5rem)] border border-border bg-muted text-[11px] text-muted-foreground"
            >
              item {i}
            </div>
          ))}
        </Rail>
      </div>
    ),
    preview: { w: 620, h: 210 },
    span: 2,
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
            <div className="grid h-full place-items-center text-[11px] text-muted-foreground">
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
      "Aberto/fechado calculado no fuso da loja, não no do visitante — a resposta certa para quem está do outro lado do mundo.",
    tags: ["loja", "fuso"],
    demo: () => (
      <Frame className="flex-col gap-1 text-center">
        <StoreStatus timeZone="America/Sao_Paulo" openHour={9} closeHour={18} />
        <span className="text-[10px] text-muted-foreground">America/Sao_Paulo · 9h–18h</span>
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
            className="rounded-[var(--r-pill,9999px)] px-5 py-2.5 text-[13px] font-medium"
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
  },
  {
    name: "vintage-large-knob",
    title: "Vintage Large Knob",
    type: "ui",
    family: "vintage",
    description: "O irmão grande: marcação de escala e leitura de valor.",
    tags: ["áudio", "knob"],
    demo: LargeKnobDemo,
    preview: { w: 380, h: 410 },
  },
  {
    name: "vintage-meter",
    title: "Vintage Meter",
    type: "ui",
    family: "vintage",
    description: "VU analógico com balística de ponteiro.",
    tags: ["áudio", "medidor"],
    demo: MeterDemo,
  },
  {
    name: "vintage-slider",
    title: "Vintage Slider",
    type: "ui",
    family: "vintage",
    description: "Fader de console com curso e trilho gravados.",
    tags: ["áudio", "fader"],
    demo: SliderDemo,
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
    preview: { w: 380, h: 285 },
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
    preview: { w: 420, h: 470 },
  },
  {
    name: "vintage-oscilloscope",
    title: "Vintage Oscilloscope",
    type: "ui",
    family: "vintage",
    description: "Traço de osciloscópio alimentado por um buffer de amostras.",
    tags: ["áudio", "canvas"],
    demo: OscilloscopeDemo,
    preview: { w: 520, h: 200 },
    span: 2,
  },
  {
    name: "vintage-soundboard-pad",
    title: "Soundboard Pad",
    type: "ui",
    family: "vintage",
    description: "Pad de disparo com estado aceso e retorno tátil.",
    tags: ["áudio", "pad"],
    demo: PadDemo,
    preview: { w: 380, h: 230 },
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
    preview: { w: 380, h: 230 },
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
            <div className="grid h-full place-items-center font-mono text-[10px] text-white/70">
              NO SIGNAL
            </div>
          </VintageTvFrame>
        </div>
      </Frame>
    ),
    preview: { w: 380, h: 290 },
  },
  {
    name: "vintage-command-palette",
    title: "Vintage Command Palette",
    type: "ui",
    family: "vintage",
    description: "Paleta de comandos no vocabulário do painel.",
    tags: ["comando", "teclado"],
    demo: () => (
      <Frame className="flex-col gap-2 text-center">
        <span className="font-mono text-[11px] text-muted-foreground">abre no rig vintage</span>
        <span className="font-mono text-[11px]">⌘K</span>
      </Frame>
    ),
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
    name: "use-knob-drag",
    title: "useKnobDrag",
    type: "hook",
    family: "fundacao",
    description:
      "O gesto de arrastar um knob isolado do desenho: pointer capture, trava de curso e passo fino com shift.",
    tags: ["hook", "gesto"],
  },
];

/**
 * Índice de busca montado uma vez. A lista é estática; normalizar 45 strings a
 * cada tecla digitada é trabalho que não muda de resultado.
 */
const SEARCH_INDEX = new Map(CATALOG.map((i) => [i.name, haystack(i)] as const));

/** `needle` já vem passado por `fold`. */
export const matches = (item: CatalogItem, needle: string) =>
  !needle || (SEARCH_INDEX.get(item.name) ?? haystack(item)).includes(needle);

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
