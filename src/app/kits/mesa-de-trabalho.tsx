"use client";

/**
 * Mesa de trabalho — o kit montado como o app que ele serve.
 *
 * Cada peça deste kit, sozinha num card, é um controle sem contexto: um
 * `inline-edit` no vazio é uma caixa de texto, um `assignee-stack` é três
 * bolinhas. O que vende é a tela: o nome do board que se renomeia onde se lê,
 * a barra que gruda quando a lista passa, a mesma lista em três formatos
 * diferentes — porque é assim que o app de verdade usa as onze peças juntas.
 *
 * Regra desta sala (e das outras três): **nada é reimplementado aqui**. Todo
 * componente vem do mesmo arquivo que o `shadcn add` entrega. Se a composição
 * precisa de algo que a peça não faz, a peça é que está incompleta.
 */

import * as React from "react";
import { Flame } from "lucide-react";

import { Chip } from "../../../registry/visant/ui/chip";
import { SegmentedControl } from "../../../registry/visant/ui/segmented-control";
import { InlineEdit } from "../../../registry/visant/ui/inline-edit";
import { AssigneeStack } from "../../../registry/visant/ui/assignee-stack";
import { StickyFilterbar, FilterRow } from "../../../registry/visant/ui/sticky-filterbar";
import { ScrubInput } from "../../../registry/visant/ui/scrub-input";
import { Timeline } from "../../../registry/visant/ui/timeline";
import { Rail } from "../../../registry/visant/ui/rail";
import { SkeletonRail } from "../../../registry/visant/ui/skeleton-rail";
import { CoverArt } from "../../../registry/visant/ui/cover-art";
import { EmptyState } from "../../../registry/visant/ui/empty-state";
import { PEOPLE } from "../demo-fixtures";

const Kanban = React.lazy(() => import("../demos/kanban-demo"));

type Vista = "board" | "trilho" | "linha";

const VISTAS = [
  { value: "board" as const, label: "Board" },
  { value: "trilho" as const, label: "Trilho" },
  { value: "linha" as const, label: "Linha" },
];

const PROJETOS = [
  { titulo: "Marca Kastrup", familia: "book" as const },
  { titulo: "Site Casa Vinte", familia: "app" as const },
  { titulo: "Campanha Verão", familia: "plate" as const },
  { titulo: "Rebrand Ribalta", familia: "book" as const },
  { titulo: "Loja Bandeira", familia: "app" as const },
];

const ETAPAS = [
  {
    title: "Briefing",
    content: (
      <p className="text-apoio text-muted-foreground">
        Guideline lida do vault, tokens compilados, e o time cruzado com o projeto.
      </p>
    ),
  },
  {
    title: "Produção",
    content: (
      <p className="text-apoio text-muted-foreground">
        Board aberto, revisão direto na plataforma, sem ida e volta por e-mail.
      </p>
    ),
  },
  {
    title: "Entrega",
    content: (
      <p className="text-apoio text-muted-foreground">
        Arquivos, tema e componentes publicados no registry da marca.
      </p>
    ),
  },
];

export default function MesaDeTrabalho() {
  const [vista, setVista] = React.useState<Vista>("board");
  const [filtro, setFiltro] = React.useState("producao");
  const [carga, setCarga] = React.useState(64);
  const [nome, setNome] = React.useState("Semana 33 · produção");
  const [editando, setEditando] = React.useState(false);
  const [rascunho, setRascunho] = React.useState(nome);
  /* O trilho começa carregando de propósito: o esqueleto tem as mesmas medidas
     do trilho, e isso só se vê quando um vira o outro na frente da pessoa. */
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    if (vista !== "trilho" || !carregando) return;
    const id = setTimeout(() => setCarregando(false), 1100);
    return () => clearTimeout(id);
  }, [vista, carregando]);

  return (
    <div
      data-kit-app
      className="overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card"
    >
      {/* cabeçalho do app */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
        {/* `whitespace-nowrap`: sem isto o nome do board quebrava em duas linhas
            e o cabeçalho do app crescia de altura no meio da composição. */}
        <InlineEdit
          isEditing={editando}
          value={<span className="whitespace-nowrap text-destaque font-medium">{nome}</span>}
          onStartEdit={() => {
            setRascunho(nome);
            setEditando(true);
          }}
          onSave={async () => {
            setNome(rascunho);
            setEditando(false);
          }}
          onCancel={() => setEditando(false)}
        >
          <input
            autoFocus
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            className="w-full rounded-[var(--r-control,0.5rem)] border border-border bg-background px-2 py-1 text-destaque outline-none"
          />
        </InlineEdit>

        <div className="ml-auto flex items-center gap-3">
          <AssigneeStack assignees={PEOPLE} max={3} size="md" />
          <SegmentedControl
            value={vista}
            onChange={setVista}
            aria-label="Vista do board"
            options={VISTAS}
          />
        </div>
      </div>

      {/*
        A barra gruda abaixo do cabeçalho DESTE painel, não do cabeçalho da
        página: `headerSelector` aponta para o header acima. É o que a peça
        resolve — medir a altura certa sem número mágico.
      */}
      <div data-mesa-header className="h-px" />
      <StickyFilterbar headerSelector="[data-mesa-header]">
        <FilterRow>
          {[
            { k: "todos", l: "Todos", c: 18 },
            { k: "producao", l: "Em produção", c: 7 },
            { k: "revisao", l: "Revisão", c: 4 },
            { k: "parado", l: "Parado", c: 0 },
          ].map(({ k, l, c }) => (
            <Chip key={k} pressed={filtro === k} count={c} onClick={() => setFiltro(k)}>
              {l}
            </Chip>
          ))}
          <span className="ml-auto hidden w-[190px] sm:block">
            <ScrubInput
              label="Carga da semana"
              value={carga}
              min={0}
              max={100}
              suffix="%"
              hint="arraste"
              icon={<Flame className="h-3.5 w-3.5" />}
              onChange={setCarga}
            />
          </span>
        </FilterRow>
      </StickyFilterbar>

      <div className="min-h-[320px] px-4 py-4 sm:px-5">
        {filtro === "parado" ? (
          /* Filtro que não devolve nada é o estado mais comum de um board real,
             e o único que costuma ficar sem desenho. Aqui ele é uma peça. */
          <div className="grid place-items-center py-8">
            <EmptyState
              className="w-[340px]"
              eyebrow="Parado"
              title="Nada travado agora."
              action={
                <Chip pressed onClick={() => setFiltro("producao")}>
                  Ver produção
                </Chip>
              }
              art={
                <div className="relative h-[110px] w-full">
                  <CoverArt title="Parado" seed="board-vazio" family="plate" titleless />
                </div>
              }
            >
              Card que passar de três dias sem mover aparece aqui, com o motivo.
            </EmptyState>
          </div>
        ) : vista === "board" ? (
          <React.Suspense
            fallback={<div className="h-[260px] w-full animate-pulse rounded bg-muted/40" />}
          >
            <div className="h-[300px]">
              <Kanban denso />
            </div>
          </React.Suspense>
        ) : vista === "trilho" ? (
          carregando ? (
            <SkeletonRail cards={5} itemWidth={170} gap={14} />
          ) : (
            <Rail itemWidth={170} gap={14} label="Projetos da semana">
              {PROJETOS.map((p) => (
                <article
                  key={p.titulo}
                  className="overflow-hidden rounded-[var(--r-control,0.5rem)] border border-border"
                >
                  <div className="relative aspect-[4/3] w-full">
                    <CoverArt title={p.titulo} seed={p.titulo} family={p.familia} />
                  </div>
                  <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                    <span className="truncate text-apoio">{p.titulo}</span>
                    <AssigneeStack assignees={PEOPLE.slice(0, 2)} max={2} size="sm" />
                  </div>
                </article>
              ))}
            </Rail>
          )
        ) : (
          <div className="[&_h2]:text-base">
            <Timeline data={ETAPAS} />
          </div>
        )}
      </div>
    </div>
  );
}
