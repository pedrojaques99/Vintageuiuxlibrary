"use client";

/**
 * A vitrine do registry: todo item, com demo viva, busca, filtro e vista de foco.
 *
 * O que a página precisa responder em cinco segundos: *o que existe aqui, e
 * isso serve para o meu caso?* Por isso a busca casa também com tag e descrição
 * — quem procura "arrastar" tem de achar o `scrub-input` sem saber o nome dele —
 * e por isso o comando de instalação fica em cada card, não numa página de doc
 * separada: o passo seguinte ao reconhecer a peça é instalar a peça.
 *
 * Três coisas que a versão anterior errava e que mandam no desenho desta:
 *
 * - **Palco de altura fixa cortava as peças grandes.** Agora cada item declara
 *   seu tamanho natural no catálogo e o palco escala pra caber (`FitStage`).
 *   A altura do card passa a ser consequência da peça, e é daí que vem o ritmo
 *   da grade — não de um `h-48` chutado igual pra board e pra knob.
 * - **45 demos montavam juntas no load**, uma dúzia delas em `setInterval`
 *   eterno. Agora a demo monta ao entrar na tela e o relógio dela para quando
 *   sai (ou quando a aba é escondida).
 * - **Não dava pra usar a peça.** O card mostra; a vista de foco deixa usar,
 *   em tamanho real e nos presets de viewport.
 *
 * Os controles desta página são componentes do próprio registry (`Chip`,
 * `SegmentedControl`). Vitrine que desenha o próprio filtro à mão está dizendo
 * que a library não serve nem para a casa.
 */

import * as React from "react";
import { Expand, LayoutGrid, List, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandTheme } from "@/lib/brand-theme";
import { Chip } from "../../registry/visant/ui/chip";
import { SegmentedControl } from "../../registry/visant/ui/segmented-control";
import {
  CATALOG,
  COUNT_BY_FAMILY,
  FAMILIES,
  TYPE_LABEL,
  fold,
  matches,
  previewOf,
  type CatalogItem,
  type Family,
} from "./catalog";
import { REGISTRY_PUBLIC_LABEL, installCommand } from "./registry-meta";
import { CopyCommand } from "./copy-command";
import { FitStage, LazyMount } from "./stage";
import { ComponentFocus } from "./ComponentFocus";

type Mode = "grade" | "lista";
type FamilyFilter = Family | "todos";

/** Spans degradam por breakpoint: no celular ninguém tem duas colunas pra dar. */
const SPAN_CLASS: Record<number, string> = {
  1: "",
  2: "sm:col-span-2",
  3: "sm:col-span-2 xl:col-span-3",
};

const MODES = [
  { value: "grade" as const, icon: LayoutGrid, ariaLabel: "Ver em grade" },
  { value: "lista" as const, icon: List, ariaLabel: "Ver em lista" },
];

function TypeBadge({ type }: { type: CatalogItem["type"] }) {
  return (
    <span className="shrink-0 rounded-full border border-border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
      {TYPE_LABEL[type]}
    </span>
  );
}

const Card = React.memo(function Card({
  item,
  onOpen,
  index,
}: {
  item: CatalogItem;
  onOpen: () => void;
  index: number;
}) {
  const Demo = item.demo;
  const { w, h } = previewOf(item);

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card",
        "transition-[border-color,box-shadow] duration-[var(--dur-fast,160ms)] ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
        "hover:border-[var(--brand)] focus-within:border-[var(--brand)]",
        "hover:shadow-[var(--e-raised,0_1px_2px_rgba(0,0,0,0.06))]",
        SPAN_CLASS[item.span ?? 1],
      )}
      // O navegador pula a pintura do que está fora da tela; com 45 cards de
      // altura variável é isso que mantém o scroll liso.
      style={{ contentVisibility: "auto", containIntrinsicSize: `${h}px` }}
    >
      {/* palco: a demo é interativa aqui dentro, então nada de overlay clicável
          por cima dela — abrir o foco é o botão do canto e o nome no rodapé. */}
      <div className="relative overflow-hidden border-b border-border bg-background">
        {Demo ? (
          <LazyMount
            fallback={<div className="animate-pulse bg-muted/40" style={{ height: h * 0.5 }} />}
          >
            {(active) => (
              <FitStage w={w} h={h} active={active}>
                <Demo />
              </FitStage>
            )}
          </LazyMount>
        ) : (
          <div className="grid h-[120px] place-items-center px-6 text-center">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              sem superfície visual própria
              <br />
              <span className="font-mono">{TYPE_LABEL[item.type]}</span>
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onOpen}
          aria-label={`Abrir ${item.title} em foco`}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-[var(--r-control,0.5rem)] border border-border bg-background/85 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Expand className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-card-index={index}
            onClick={onOpen}
            className="truncate font-mono text-[12px] outline-none hover:text-[var(--brand)] focus-visible:text-[var(--brand)] focus-visible:underline"
          >
            {item.name}
          </button>
          <TypeBadge type={item.type} />
          <span className="ml-auto opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <CopyCommand variant="chip" text={installCommand(item.name)} />
          </span>
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">{item.description}</p>
      </div>
    </article>
  );
});

function Row({ item, onOpen, index }: { item: CatalogItem; onOpen: () => void; index: number }) {
  return (
    <div className="group flex items-center gap-3 border-b border-border px-2 py-2.5 transition-colors hover:bg-muted/40">
      <button
        type="button"
        data-card-index={index}
        onClick={onOpen}
        className="min-w-0 flex-1 text-left outline-none"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12px] group-hover:text-[var(--brand)]">{item.name}</span>
          <TypeBadge type={item.type} />
        </span>
        <span className="mt-0.5 line-clamp-1 block text-[12px] text-muted-foreground">
          {item.description}
        </span>
      </button>
      <CopyCommand
        variant="chip"
        text={installCommand(item.name)}
        className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
      />
    </div>
  );
}

export function Gallery({
  focus,
  onFocus,
}: {
  focus: string | null;
  onFocus: (name: string | null) => void;
}) {
  const [q, setQ] = React.useState("");
  const [family, setFamily] = React.useState<FamilyFilter>("todos");
  const [mode, setMode] = React.useState<Mode>("grade");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const { brands } = useBrandTheme();

  const results = React.useMemo(() => {
    const needle = fold(q.trim());
    return CATALOG.filter(
      (i) => (family === "todos" || i.family === family) && matches(i, needle),
    );
  }, [q, family]);

  const focusIndex = focus ? results.findIndex((i) => i.name === focus) : -1;
  const focusItem = focusIndex >= 0 ? results[focusIndex] : CATALOG.find((i) => i.name === focus);

  const step = React.useCallback(
    (delta: number) => {
      if (!results.length) return;
      const from = focusIndex >= 0 ? focusIndex : 0;
      onFocus(results[(from + delta + results.length) % results.length].name);
    },
    [results, focusIndex, onFocus],
  );

  // Atalhos da grade. `/` foca a busca — convenção de quem usa o teclado — e as
  // setas percorrem os cards a partir do que estiver focado, com o número de
  // colunas lido do próprio grid em vez de chutado por breakpoint.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (e.key === "Escape" && typing) {
        if (q) setQ("");
        else inputRef.current?.blur();
        return;
      }
      if (typing || !listRef.current) return;

      const cards = Array.from(listRef.current.querySelectorAll<HTMLElement>("[data-card-index]"));
      if (!cards.length) return;
      const current = cards.findIndex((b) => b === el);
      const cols =
        mode === "lista"
          ? 1
          : getComputedStyle(listRef.current).gridTemplateColumns.split(" ").filter(Boolean)
              .length || 1;

      const move = (delta: number) => {
        e.preventDefault();
        const target =
          current < 0 ? 0 : Math.min(Math.max(current + delta, 0), cards.length - 1);
        cards[target]?.focus();
        cards[target]?.scrollIntoView({ block: "nearest" });
      };

      if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowDown") move(cols);
      else if (e.key === "ArrowUp") move(-cols);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [q, mode]);

  return (
    <div className="shell pb-24">
      <section className="pt-10 pb-7 sm:pt-14 sm:pb-8">
        <h1
          className="text-[clamp(1.75rem,5vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display, inherit)" }}
        >
          A library da Visant
        </h1>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
          {/* Conta a lista que está na tela, e não um número escrito à mão que
              envelhece: o portão `npm run check:catalog` garante que esta lista
              e o registry.json não divergem. */}
          {CATALOG.length} peças nesta vitrine, servidas por{" "}
          <code className="font-mono text-[13px]">{REGISTRY_PUBLIC_LABEL}</code>
          {/* O número de temas vem do índice do vault, não de um número escrito
              aqui — o sync publica marca nova e esta frase acompanha sozinha. */}
          {brands.length ? `, mais ${brands.length} temas compilados do vault` : null}. Nenhum
          componente sabe a cor de um cliente — trocar a marca no seletor repinta esta página
          inteira.
        </p>
      </section>

      {/* controles */}
      <div className="shell-bleed sticky top-[var(--header-h)] z-30 border-b border-border bg-background/85 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="relative flex min-w-0 flex-1 items-center gap-2 rounded-[var(--r-pill,9999px)] border border-border bg-card px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, uso ou tag…"
              aria-label="Buscar no catálogo"
              className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Limpar busca"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground sm:block">
                /
              </kbd>
            )}
          </div>

          <SegmentedControl
            value={mode}
            onChange={setMode}
            variant="compact"
            aria-label="Modo de visualização"
            options={MODES}
          />
        </div>

        {/* famílias: rolam na horizontal no celular em vez de virar quatro linhas */}
        <div className="shell-bleed mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          <Chip
            pressed={family === "todos"}
            count={CATALOG.length}
            onClick={() => setFamily("todos")}
            className="rounded-[var(--r-pill,9999px)] py-1.5 text-[12px]"
          >
            Todos
          </Chip>
          {FAMILIES.map((f) => (
            <Chip
              key={f.key}
              pressed={family === f.key}
              count={COUNT_BY_FAMILY[f.key] ?? 0}
              onClick={() => setFamily(f.key)}
              className="rounded-[var(--r-pill,9999px)] py-1.5 text-[12px]"
            >
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {results.length ? (
        mode === "grade" ? (
          <div
            ref={listRef}
            className="mt-6 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {results.map((item, i) => (
              <Card key={item.name} item={item} index={i} onOpen={() => onFocus(item.name)} />
            ))}
          </div>
        ) : (
          <div ref={listRef} className="mt-6 border-t border-border">
            {results.map((item, i) => (
              <Row key={item.name} item={item} index={i} onOpen={() => onFocus(item.name)} />
            ))}
          </div>
        )
      ) : (
        <div className="mt-16 text-center">
          <p className="text-[15px]">Nada com “{q}”.</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-muted-foreground">
            Se a peça não existe aqui e você está prestes a escrevê-la, ela provavelmente deveria
            virar item — é assim que o registry cresce.
          </p>
        </div>
      )}

      {focusItem && (
        <ComponentFocus
          key={focusItem.name}
          item={focusItem}
          index={focusIndex >= 0 ? focusIndex : 0}
          total={results.length}
          onClose={() => onFocus(null)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />
      )}
    </div>
  );
}
