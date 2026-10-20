"use client";

/**
 * Mesa de trabalho: o kit montado como um app de demandas de verdade.
 *
 * A versão anterior empilhava trechos com legenda ("a semana aberta", "quanto
 * cabe na semana", "do briefing à entrega"), e o dono leu do jeito certo: um
 * monte de componente solto, do kanban pra um slider que ninguém entendia. Aqui
 * é UMA tela, a de um app tipo Linear: barra lateral, cabeçalho do ciclo com
 * busca e vista, filtros, o board (ou a lista) e o detalhe da demanda abrindo
 * por cima, com dado rico em cada cartão. Nenhuma legenda: quem quer saber qual
 * peça desenha o quê passa o mouse (`Pecas`, em `sala.tsx`).
 *
 * Os dados são de mentira e genéricos (estúdio "Norte", projetos sem cliente).
 * As contagens dos filtros saem dos dados, nunca escritas à mão: número de
 * enfeite num filtro é a UI mentindo sobre o banco.
 */

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleDot,
  Inbox,
  LayoutGrid,
  ListTodo,
  MessageSquare,
  Rows3,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Archive,
  Heart,
  ThumbsUp,
  Eye,
  X,
  CalendarDays,
  Target,
} from "lucide-react";

import { SideNav, SideNavGroup, SideNavItem } from "../../../registry/visant/ui/side-nav";
import { Chip } from "../../../registry/visant/ui/chip";
import { SegmentedControl } from "../../../registry/visant/ui/segmented-control";
import { InlineEdit } from "../../../registry/visant/ui/inline-edit";
import { AssigneeStack } from "../../../registry/visant/ui/assignee-stack";
import { StickyFilterbar, FilterRow } from "../../../registry/visant/ui/sticky-filterbar";
import { ScrubInput } from "../../../registry/visant/ui/scrub-input";
import { CoverArt } from "../../../registry/visant/ui/cover-art";
import { EmptyState } from "../../../registry/visant/ui/empty-state";
import { ExpandingSearch } from "../../../registry/visant/ui/expanding-search";
import { ConfirmMorph } from "../../../registry/visant/ui/confirm-morph";
import { Reactions } from "../../../registry/visant/ui/reactions";
import {
  ToastStack,
  ToastStackProvider,
  useToastStack,
} from "../../../registry/visant/ui/toast-stack";
import { Kanban } from "../../../registry/visant/blocks/kanban";
import type { KanbanItem } from "../../../registry/visant/blocks/kanban/types";
import { cn } from "@/lib/utils";
import { Janela, Pecas } from "./sala";

/* -------------------------------------------------------------------------- */
/* dados do mock                                                               */
/* -------------------------------------------------------------------------- */

const TIME = [
  { id: "1", name: "Ana Reis" },
  { id: "2", name: "Caio Duarte" },
  { id: "3", name: "Marina Alves" },
  { id: "4", name: "Rafa Lima" },
  { id: "5", name: "Bruno Sato" },
];
const EU = TIME[0];

type Status = "fila" | "fazendo" | "revisao" | "pronto";
type Prioridade = "urgente" | "alta" | "media" | "baixa";

const STATUS: { id: Status; rotulo: string; Icone: typeof Circle }[] = [
  { id: "fila", rotulo: "Fila", Icone: CircleDashed },
  { id: "fazendo", rotulo: "Fazendo", Icone: CircleDot },
  { id: "revisao", rotulo: "Em revisão", Icone: Circle },
  { id: "pronto", rotulo: "Pronto", Icone: CheckCircle2 },
];
const ROTULO_STATUS = Object.fromEntries(STATUS.map((s) => [s.id, s])) as Record<
  Status,
  (typeof STATUS)[number]
>;

const PRIORIDADE: Record<Prioridade, { rotulo: string; Icone: typeof Circle }> = {
  urgente: { rotulo: "Urgente", Icone: AlertTriangle },
  alta: { rotulo: "Alta", Icone: SignalHigh },
  media: { rotulo: "Média", Icone: SignalMedium },
  baixa: { rotulo: "Baixa", Icone: SignalLow },
};

const PROJETOS = [
  { id: "site", nome: "Site novo", familia: "app" as const },
  { id: "app", nome: "App de reservas", familia: "app" as const },
  { id: "marca", nome: "Identidade 2027", familia: "book" as const },
  { id: "inverno", nome: "Campanha de inverno", familia: "plate" as const },
];
const PROJETO = Object.fromEntries(PROJETOS.map((p) => [p.id, p]));

interface Demanda {
  codigo: string;
  titulo: string;
  prioridade: Prioridade;
  projeto: string;
  etiquetas: string[];
  pessoas: number[];
  prazo: string;
  estimativa: number;
  gastas: number;
  comentarios: number;
  sub: [number, number];
  descricao: string;
}

const DEMANDAS: KanbanItem<Demanda>[] = [
  {
    id: "a",
    columnId: "fila",
    data: {
      codigo: "NRT-148",
      titulo: "Fotografar a linha nova para a home",
      prioridade: "media",
      projeto: "site",
      etiquetas: ["Foto"],
      pessoas: [3],
      prazo: "4 nov",
      estimativa: 12,
      gastas: 0,
      comentarios: 1,
      sub: [0, 3],
      descricao: "Doze produtos em fundo neutro, mais três cenas de uso. A lista fechada está no anexo.",
    },
  },
  {
    id: "b",
    columnId: "fila",
    data: {
      codigo: "NRT-151",
      titulo: "Tema escuro do painel de reservas",
      prioridade: "baixa",
      projeto: "app",
      etiquetas: ["UI"],
      pessoas: [1],
      prazo: "11 nov",
      estimativa: 8,
      gastas: 0,
      comentarios: 0,
      sub: [0, 2],
      descricao: "Inverter os tokens de superfície e conferir contraste dos estados de reserva.",
    },
  },
  {
    id: "c",
    columnId: "fila",
    data: {
      codigo: "NRT-152",
      titulo: "Naming da linha de inverno",
      prioridade: "alta",
      projeto: "inverno",
      etiquetas: ["Estratégia", "Texto"],
      pessoas: [0, 4],
      prazo: "28 out",
      estimativa: 6,
      gastas: 1,
      comentarios: 5,
      sub: [1, 4],
      descricao: "Três rotas de nome com teste de domínio e de marca registrada antes da reunião.",
    },
  },
  {
    id: "d",
    columnId: "fazendo",
    data: {
      codigo: "NRT-139",
      titulo: "Fluxo de checkout em três passos",
      prioridade: "urgente",
      projeto: "app",
      etiquetas: ["UI", "Produto"],
      pessoas: [0, 1, 2],
      prazo: "Hoje",
      estimativa: 16,
      gastas: 13,
      comentarios: 8,
      sub: [4, 5],
      descricao:
        "Juntar endereço e pagamento numa tela só. O passo de revisão fica, porque é onde a pessoa confere o horário.",
    },
  },
  {
    id: "e",
    columnId: "fazendo",
    data: {
      codigo: "NRT-142",
      titulo: "Landing da campanha de inverno",
      prioridade: "alta",
      projeto: "inverno",
      etiquetas: ["Site"],
      pessoas: [2, 3],
      prazo: "25 out",
      estimativa: 20,
      gastas: 9,
      comentarios: 3,
      sub: [2, 6],
      descricao: "Uma página, uma chamada. O depoimento em vídeo entra se a cliente aprovar o corte.",
    },
  },
  {
    id: "f",
    columnId: "revisao",
    data: {
      codigo: "NRT-131",
      titulo: "Manual de marca, versão 2",
      prioridade: "media",
      projeto: "marca",
      etiquetas: ["Marca"],
      pessoas: [4],
      prazo: "24 out",
      estimativa: 24,
      gastas: 22,
      comentarios: 12,
      sub: [7, 8],
      descricao: "Revisar o capítulo de aplicações e trocar os mockups antigos pelos da sessão nova.",
    },
  },
  {
    id: "g",
    columnId: "revisao",
    data: {
      codigo: "NRT-136",
      titulo: "Ícones do app em 24 e 16 px",
      prioridade: "baixa",
      projeto: "app",
      etiquetas: ["UI"],
      pessoas: [1],
      prazo: "30 out",
      estimativa: 6,
      gastas: 5,
      comentarios: 2,
      sub: [3, 3],
      descricao: "Quarenta ícones, dois tamanhos, traço de 1,5 px. Falta a revisão em tela pequena.",
    },
  },
  {
    id: "h",
    columnId: "pronto",
    data: {
      codigo: "NRT-120",
      titulo: "Assinatura de e-mail do time",
      prioridade: "baixa",
      projeto: "marca",
      etiquetas: ["Marca"],
      pessoas: [3],
      prazo: "18 out",
      estimativa: 2,
      gastas: 2,
      comentarios: 1,
      sub: [2, 2],
      descricao: "Versão em HTML e em imagem, testada nos três clientes de e-mail mais usados.",
    },
  },
];

const ATIVIDADE = [
  { quem: TIME[2].name, oque: "mudou o status para Fazendo", quando: "há 2 h" },
  { quem: TIME[1].name, oque: "subiu 3 arquivos", quando: "ontem" },
  { quem: TIME[0].name, oque: "criou a demanda", quando: "seg" },
];

const OPCOES_REACAO = [
  { id: "ok", label: "Concordo", icon: ThumbsUp },
  { id: "amei", label: "Amei", icon: Heart },
  { id: "vendo", label: "Estou vendo", icon: Eye },
];

type Filtro = "todas" | "minhas" | "urgentes" | "bloqueadas";
type Vista = "board" | "lista";

/* -------------------------------------------------------------------------- */
/* pedaços                                                                     */
/* -------------------------------------------------------------------------- */

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[var(--r-control,0.5rem)] bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] px-1.5 py-px text-micro text-muted-foreground">
      {children}
    </span>
  );
}

function IconePrioridade({ p }: { p: Prioridade }) {
  const { Icone, rotulo } = PRIORIDADE[p];
  return (
    <Icone
      aria-label={`Prioridade ${rotulo.toLowerCase()}`}
      className={cn("h-3.5 w-3.5 shrink-0", p === "urgente" ? "text-foreground" : "text-muted-foreground")}
    />
  );
}

function Cartao({ item, onAbrir }: { item: KanbanItem<Demanda>; onAbrir: (id: string) => void }) {
  const d = item.data;
  return (
    <div
      onClick={() => onAbrir(item.id)}
      className="cursor-pointer rounded-[var(--r-control,0.5rem)] border border-border bg-card px-3 py-2.5 transition-[border-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[color-mix(in_oklab,var(--foreground)_25%,transparent)]"
    >
      <div className="flex items-center gap-2 text-micro text-muted-foreground">
        <span className="font-mono tabular-nums">{d.codigo}</span>
        <span className="ml-auto">
          <IconePrioridade p={d.prioridade} />
        </span>
      </div>
      {/* Texto, não botão: o cartão inteiro já é o alvo focável do arraste, e
          botão dentro dele seria controle aninhado. Pelo teclado a demanda abre
          pela lista ou pela busca. */}
      <p className="mt-1 text-apoio font-medium leading-snug text-foreground">{d.titulo}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {d.etiquetas.map((t) => (
          <Etiqueta key={t}>{t}</Etiqueta>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-3 text-micro tabular-nums text-muted-foreground">
        <span className={cn("inline-flex items-center gap-1", d.prazo === "Hoje" && "text-foreground")}>
          <CalendarDays className="h-3 w-3" aria-hidden="true" />
          {d.prazo}
        </span>
        <span className="inline-flex items-center gap-1" title="Subtarefas feitas">
          <ListTodo className="h-3 w-3" aria-hidden="true" />
          {d.sub[0]}/{d.sub[1]}
        </span>
        {d.comentarios ? (
          <span className="inline-flex items-center gap-1" title="Comentários">
            <MessageSquare className="h-3 w-3" aria-hidden="true" />
            {d.comentarios}
          </span>
        ) : null}
        <span className="ml-auto">
          <AssigneeStack assignees={d.pessoas.map((i) => TIME[i])} max={2} size="sm" />
        </span>
      </div>
    </div>
  );
}

function Lista({
  itens,
  onAbrir,
}: {
  itens: KanbanItem<Demanda>[];
  onAbrir: (id: string) => void;
}) {
  return (
    <div className="pb-4">
      {STATUS.map(({ id, rotulo, Icone }) => {
        const doGrupo = itens.filter((i) => i.columnId === id);
        if (!doGrupo.length) return null;
        return (
          <section key={id}>
            <h4 className="flex items-center gap-2 bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)] px-4 py-1.5 text-micro text-muted-foreground sm:px-5">
              <Icone className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">{rotulo}</span>
              <span className="tabular-nums">{doGrupo.length}</span>
            </h4>
            <ul>
              {doGrupo.map((it) => (
                <li key={it.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onAbrir(it.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)] focus-visible:[box-shadow:var(--focus)] focus-visible:relative sm:px-5"
                  >
                    <IconePrioridade p={it.data.prioridade} />
                    <span className="hidden w-16 shrink-0 font-mono text-micro tabular-nums text-muted-foreground sm:block">
                      {it.data.codigo}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-apoio text-foreground">
                      {it.data.titulo}
                    </span>
                    <span className="hidden gap-1 md:flex">
                      {it.data.etiquetas.map((t) => (
                        <Etiqueta key={t}>{t}</Etiqueta>
                      ))}
                    </span>
                    <span className="hidden w-14 shrink-0 text-right text-micro tabular-nums text-muted-foreground sm:block">
                      {it.data.prazo}
                    </span>
                    <AssigneeStack assignees={it.data.pessoas.map((i) => TIME[i])} max={2} size="sm" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Propriedade({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="py-1.5 text-apoio text-muted-foreground">{rotulo}</dt>
      <dd className="flex min-w-0 items-center gap-2 py-1.5 text-apoio text-foreground">{children}</dd>
    </>
  );
}

function Detalhe({
  item,
  onFechar,
  onRenomear,
  onEstimar,
  onArquivar,
}: {
  item: KanbanItem<Demanda>;
  onFechar: () => void;
  onRenomear: (titulo: string) => void;
  onEstimar: (h: number) => void;
  onArquivar: () => void;
}) {
  const d = item.data;
  const [editando, setEditando] = React.useState(false);
  const [rascunho, setRascunho] = React.useState(d.titulo);
  const [feitas, setFeitas] = React.useState(() =>
    Array.from({ length: d.sub[1] }, (_, i) => i < d.sub[0]),
  );
  const st = ROTULO_STATUS[item.columnId as Status];
  const proj = PROJETO[d.projeto];

  return (
    <aside
      aria-label={`Demanda ${d.codigo}`}
      className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[25rem] flex-col border-l border-border bg-background [box-shadow:-24px_0_48px_-24px_color-mix(in_oklab,var(--foreground)_30%,transparent)]"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="font-mono text-micro tabular-nums text-muted-foreground">{d.codigo}</span>
        <span className="text-micro text-muted-foreground">em {proj.nome}</span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar a demanda"
          className="ml-auto grid size-7 place-items-center rounded-[var(--r-control,0.5rem)] text-muted-foreground outline-none transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:bg-muted hover:text-foreground focus-visible:[box-shadow:var(--focus)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Pecas nomes={["inline-edit"]}>
          <InlineEdit
            isEditing={editando}
            value={<span className="text-destaque font-medium leading-snug">{d.titulo}</span>}
            onStartEdit={() => {
              setRascunho(d.titulo);
              setEditando(true);
            }}
            onSave={async () => {
              onRenomear(rascunho);
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
        </Pecas>

        <dl className="mt-4 grid grid-cols-[6.5rem_1fr] items-center">
          <Propriedade rotulo="Status">
            <st.Icone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {st.rotulo}
          </Propriedade>
          <Propriedade rotulo="Prioridade">
            <IconePrioridade p={d.prioridade} />
            {PRIORIDADE[d.prioridade].rotulo}
          </Propriedade>
          <Propriedade rotulo="Pessoas">
            <Pecas nomes={["assignee-stack"]} canto="topo-inicio">
              <AssigneeStack assignees={d.pessoas.map((i) => TIME[i])} max={3} size="sm" />
            </Pecas>
          </Propriedade>
          <Propriedade rotulo="Prazo">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {d.prazo}
          </Propriedade>
          <Propriedade rotulo="Projeto">
            <span className="relative size-4 shrink-0 overflow-hidden rounded-[3px]">
              <CoverArt title={proj.nome} seed={proj.id} family={proj.familia} titleless />
            </span>
            {proj.nome}
          </Propriedade>
        </dl>

        <Pecas nomes={["scrub-input"]} className="mt-3">
          <ScrubInput
            label="Estimativa"
            value={d.estimativa}
            min={1}
            max={40}
            suffix=" h"
            hint="arraste"
            icon={<Target className="h-3.5 w-3.5" />}
            layout="row"
            onChange={onEstimar}
          />
        </Pecas>
        <p className="mt-1.5 text-micro tabular-nums text-muted-foreground">
          {d.gastas} h gastas de {d.estimativa} h
        </p>

        <p className="mt-5 text-apoio leading-relaxed text-foreground">{d.descricao}</p>

        <h4 className="mt-6 text-micro text-muted-foreground">
          Subtarefas <span className="tabular-nums">{feitas.filter(Boolean).length}/{feitas.length}</span>
        </h4>
        <ul className="mt-1.5">
          {feitas.map((ok, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-center gap-2.5 py-1 text-apoio [&_input]:accent-[var(--brand)]">
                <input
                  type="checkbox"
                  checked={ok}
                  onChange={() => setFeitas((f) => f.map((v, j) => (j === i ? !v : v)))}
                />
                <span className={ok ? "text-muted-foreground line-through" : "text-foreground"}>
                  {["Rascunho", "Revisão interna", "Ajustes", "Aprovação", "Arquivos finais", "Publicar", "Medir", "Fechar"][i]}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <h4 className="mt-6 text-micro text-muted-foreground">Atividade</h4>
        <div className="mt-2 rounded-[var(--r-control,0.5rem)] bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)] p-3">
          <p className="text-apoio">
            <span className="font-medium">{TIME[1].name}</span>
            <span className="text-muted-foreground"> · há 40 min</span>
          </p>
          <p className="mt-1 text-apoio leading-relaxed text-foreground">
            Subi a versão com o resumo do pedido fixo no topo. Se aprovarem, fecho hoje.
          </p>
          <Pecas nomes={["reactions"]} canto="topo-fim" className="mt-2 inline-block">
            <Reactions
              options={OPCOES_REACAO}
              defaultValue={[
                { id: "ok", count: 2, reacted: false },
                { id: "amei", count: 1, reacted: true },
              ]}
              label="Reações ao comentário"
            />
          </Pecas>
        </div>
        <ul className="mt-3 space-y-1.5">
          {ATIVIDADE.map((a) => (
            <li key={a.oque} className="text-micro text-muted-foreground">
              <span className="text-foreground">{a.quem}</span> {a.oque} · {a.quando}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border px-4 py-3">
        <Pecas nomes={["confirm-morph"]} canto="base-fim">
          <ConfirmMorph
            label="Arquivar demanda"
            icon={<Archive className="h-3.5 w-3.5" />}
            prompt="Arquivar?"
            confirmLabel="Arquivar"
            cancelLabel="Manter"
            doneLabel="Arquivada"
            tone="danger"
            onConfirm={() => new Promise((r) => setTimeout(r, 600)).then(() => setTimeout(onArquivar, 700))}
          />
        </Pecas>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* a tela                                                                      */
/* -------------------------------------------------------------------------- */

function App() {
  const { toast } = useToastStack();
  const [itens, setItens] = React.useState(DEMANDAS);
  const [vista, setVista] = React.useState<Vista>("board");
  const [filtro, setFiltro] = React.useState<Filtro>("todas");
  const [aberta, setAberta] = React.useState<string | null>(null);
  const [nav, setNav] = React.useState("ciclo");
  const [ciclo, setCiclo] = React.useState("Ciclo 33 · lançamento do site");
  const [editandoCiclo, setEditandoCiclo] = React.useState(false);
  const [rascunho, setRascunho] = React.useState(ciclo);

  const contagem: Record<Filtro, number> = {
    todas: itens.length,
    minhas: itens.filter((i) => i.data.pessoas.includes(0)).length,
    urgentes: itens.filter((i) => i.data.prioridade === "urgente" || i.data.prioridade === "alta").length,
    bloqueadas: 0,
  };
  const visiveis = itens.filter((i) =>
    filtro === "minhas"
      ? i.data.pessoas.includes(0)
      : filtro === "urgentes"
        ? i.data.prioridade === "urgente" || i.data.prioridade === "alta"
        : true,
  );
  const prontas = itens.filter((i) => i.columnId === "pronto").length;
  const atual = itens.find((i) => i.id === aberta) ?? null;

  const editar = (id: string, patch: Partial<Demanda>) =>
    setItens((xs) => xs.map((x) => (x.id === id ? { ...x, data: { ...x.data, ...patch } } : x)));

  const mover = ({ itemId, toColumnId, fromColumnId, columnOrder }: {
    itemId: string;
    toColumnId: string;
    fromColumnId: string;
    columnOrder: string[];
  }) => {
    setItens((prev) => {
      const movido = prev.map((it) => (it.id === itemId ? { ...it, columnId: toColumnId } : it));
      const pos = new Map(columnOrder.map((id, i) => [id, i]));
      const daColuna = movido
        .filter((it) => it.columnId === toColumnId)
        .sort((x, y) => (pos.get(x.id) ?? 0) - (pos.get(y.id) ?? 0));
      let k = 0;
      return movido.map((it) => (it.columnId === toColumnId ? daColuna[k++]! : it));
    });
    if (toColumnId !== fromColumnId) {
      const d = itens.find((i) => i.id === itemId)?.data;
      toast({
        type: "success",
        title: `${d?.codigo ?? "Demanda"} foi para ${ROTULO_STATUS[toColumnId as Status].rotulo}`,
        description: d?.titulo,
        action: {
          label: "Desfazer",
          onClick: () =>
            setItens((xs) => xs.map((x) => (x.id === itemId ? { ...x, columnId: fromColumnId } : x))),
        },
      });
    }
  };

  const buscaItens = React.useMemo(
    () =>
      itens.map((i) => ({
        id: i.id,
        title: i.data.titulo,
        meta: i.data.codigo,
        keywords: [...i.data.etiquetas, PROJETO[i.data.projeto].nome],
      })),
    [itens],
  );

  return (
    <Janela endereco="norte.app/ciclos/33">
      <div className="relative flex h-[44rem] max-h-[85vh] min-h-[34rem]">
        {/* A barra lateral do app. Some no celular, como some num app de verdade. */}
        <Pecas nomes={["side-nav", "cover-art"]} className="hidden h-full shrink-0 md:block">
          <SideNav
            storageKey={false}
            shortcut={false}
            toggle={false}
            width={13}
            label="Navegação do app"
            brand={
              <span className="flex items-center gap-2 text-apoio font-medium">
                <span className="relative size-6 overflow-hidden rounded-[var(--r-control,0.5rem)]">
                  <CoverArt title="Norte" seed="norte-ws" family="plate" titleless />
                </span>
                Norte
              </span>
            }
            footer={
              <div className="flex items-center gap-2 px-1 pb-1">
                <AssigneeStack assignees={[EU]} max={1} size="sm" />
                <span className="min-w-0 truncate text-apoio">{EU.name}</span>
              </div>
            }
          >
            <SideNavGroup>
              {[
                { id: "entrada", rotulo: "Caixa de entrada", icone: <Inbox />, meta: "4" },
                { id: "minhas", rotulo: "Minhas demandas", icone: <ListTodo />, meta: String(contagem.minhas) },
                { id: "ciclo", rotulo: "Ciclo atual", icone: <Target />, meta: `${prontas}/${itens.length}` },
              ].map((n) => (
                <SideNavItem
                  key={n.id}
                  href="#"
                  icon={n.icone}
                  meta={n.meta}
                  active={nav === n.id}
                  onClick={(e) => {
                    e.preventDefault();
                    setNav(n.id);
                  }}
                >
                  {n.rotulo}
                </SideNavItem>
              ))}
            </SideNavGroup>
            <SideNavGroup label="Projetos" className="mt-4">
              {PROJETOS.map((p) => (
                <SideNavItem
                  key={p.id}
                  href="#"
                  active={nav === p.id}
                  onClick={(e) => {
                    e.preventDefault();
                    setNav(p.id);
                  }}
                  icon={
                    <span className="relative block size-4 overflow-hidden rounded-[3px]">
                      <CoverArt title={p.nome} seed={p.id} family={p.familia} titleless />
                    </span>
                  }
                >
                  {p.nome}
                </SideNavItem>
              ))}
            </SideNavGroup>
          </SideNav>
        </Pecas>

        <main className="flex min-w-0 flex-1 flex-col">
          {/* Cabeçalho do ciclo: nome editável, busca, time e vista. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5 sm:px-5">
            <Pecas nomes={["inline-edit"]} canto="base-inicio" className="min-w-0">
              <InlineEdit
                isEditing={editandoCiclo}
                value={<span className="whitespace-nowrap text-corpo font-medium">{ciclo}</span>}
                onStartEdit={() => {
                  setRascunho(ciclo);
                  setEditandoCiclo(true);
                }}
                onSave={async () => {
                  setCiclo(rascunho);
                  setEditandoCiclo(false);
                }}
                onCancel={() => setEditandoCiclo(false)}
              >
                <input
                  autoFocus
                  value={rascunho}
                  onChange={(e) => setRascunho(e.target.value)}
                  className="w-full rounded-[var(--r-control,0.5rem)] border border-border bg-background px-2 py-1 text-corpo outline-none"
                />
              </InlineEdit>
            </Pecas>
            <span className="hidden text-micro tabular-nums text-muted-foreground lg:inline">
              {prontas} de {itens.length} prontas · termina em 6 dias
            </span>
            <span className="ml-auto flex items-center gap-2">
              <Pecas nomes={["expanding-search"]} canto="base-fim">
                <ExpandingSearch
                  label="Buscar demandas"
                  placeholder="Buscar no ciclo"
                  items={buscaItens}
                  expandedWidth={260}
                  onSelect={(it) => setAberta(it.id)}
                />
              </Pecas>
              <Pecas nomes={["assignee-stack"]} canto="base-fim" className="hidden sm:block">
                <AssigneeStack assignees={TIME} max={3} size="sm" />
              </Pecas>
              <Pecas nomes={["segmented-control"]} canto="base-fim">
                <SegmentedControl
                  value={vista}
                  onChange={setVista}
                  aria-label="Vista"
                  size="sm"
                  options={[
                    { value: "board", icon: LayoutGrid, ariaLabel: "Board" },
                    { value: "lista", icon: Rows3, ariaLabel: "Lista" },
                  ]}
                />
              </Pecas>
            </span>
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto">
            <div data-mesa-header aria-hidden="true" className="h-px" />
            <Pecas nomes={["sticky-filterbar", "chip"]} canto="topo-fim" className="sticky top-0 z-10">
              <StickyFilterbar headerSelector="[data-mesa-header]" hideProgress className="px-3 sm:px-4">
                <FilterRow>
                  {(
                    [
                      ["todas", "Todas"],
                      ["minhas", "Minhas"],
                      ["urgentes", "Prioridade alta"],
                      ["bloqueadas", "Bloqueadas"],
                    ] as [Filtro, string][]
                  ).map(([k, l]) => (
                    <Chip key={k} pressed={filtro === k} count={contagem[k]} onClick={() => setFiltro(k)}>
                      {l}
                    </Chip>
                  ))}
                </FilterRow>
              </StickyFilterbar>
            </Pecas>

            {filtro === "bloqueadas" ? (
              <Pecas nomes={["empty-state", "cover-art"]} className="grid place-items-center px-4 py-8">
                <EmptyState
                  className="w-full max-w-[22rem]"
                  eyebrow="Bloqueadas"
                  title="Nada travado neste ciclo."
                  action={
                    <Chip pressed onClick={() => setFiltro("todas")}>
                      Ver todas
                    </Chip>
                  }
                  art={
                    <div className="relative h-[110px] w-full">
                      <CoverArt title="Bloqueadas" seed="board-vazio" family="plate" titleless />
                    </div>
                  }
                >
                  Demanda parada há mais de três dias aparece aqui, com o motivo.
                </EmptyState>
              </Pecas>
            ) : vista === "board" ? (
              <Pecas nomes={["kanban"]} canto="base-fim" className="px-3 py-3 sm:px-4">
                <Kanban
                  className="[--kanban-col-min:236px]! [--kanban-gap:0.75rem]! [--kanban-card-gap:0.5rem]!"
                  columns={STATUS.map((s) => ({ id: s.id, data: s }))}
                  items={visiveis}
                  onMove={mover}
                  renderColumnHeader={(c) => {
                    const s = c.data as (typeof STATUS)[number];
                    return (
                      <span className="flex items-center gap-2 text-micro text-muted-foreground">
                        <s.Icone className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="text-foreground">{s.rotulo}</span>
                        <span className="tabular-nums">
                          {visiveis.filter((i) => i.columnId === c.id).length}
                        </span>
                      </span>
                    );
                  }}
                  renderCard={({ item }) => <Cartao item={item} onAbrir={setAberta} />}
                />
              </Pecas>
            ) : (
              <Lista itens={visiveis} onAbrir={setAberta} />
            )}
          </div>
        </main>

        {atual ? (
          <Detalhe
            key={atual.id}
            item={atual}
            onFechar={() => setAberta(null)}
            onRenomear={(t) => editar(atual.id, { titulo: t })}
            onEstimar={(h) => editar(atual.id, { estimativa: h })}
            onArquivar={() => {
              const guardado = atual;
              setItens((xs) => xs.filter((x) => x.id !== guardado.id));
              setAberta(null);
              toast({
                type: "info",
                title: `${guardado.data.codigo} arquivada`,
                description: guardado.data.titulo,
                action: { label: "Desfazer", onClick: () => setItens((xs) => [...xs, guardado]) },
              });
            }}
          />
        ) : null}

        <Pecas nomes={["toast-stack"]} canto="base-fim" className="absolute inset-x-0 bottom-0 z-50 h-0">
          <ToastStack contained position="bottom-right" label="Avisos do app" />
        </Pecas>
      </div>
    </Janela>
  );
}

export default function MesaDeTrabalho() {
  return (
    <ToastStackProvider duration={6000}>
      <App />
    </ToastStackProvider>
  );
}
