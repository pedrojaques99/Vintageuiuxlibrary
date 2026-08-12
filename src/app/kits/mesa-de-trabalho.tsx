"use client";

/**
 * Mesa de trabalho — o kit montado como o app que ele serve.
 *
 * Cada peça deste kit, sozinha num card, é um controle sem contexto: um
 * `inline-edit` no vazio é uma caixa de texto, um `assignee-stack` é três
 * bolinhas. O que vende é a tela: o nome do board que se renomeia onde se lê,
 * a barra que gruda quando a lista passa, a mesma lista em dois formatos
 * diferentes, porque é assim que o app de verdade usa as peças juntas.
 *
 * ── O que mudou aqui, e por quê ────────────────────────────────────────────
 *
 * 1. **A composição não se embrulha mais.** Ela abria com
 *    `rounded + border + bg-card`, DENTRO da sala, que já é uma superfície com
 *    fundo próprio. Era a quarta moldura da página antes da primeira peça, e
 *    numa página assim o olho conta borda, não componente. Agora a única
 *    moldura desta sala é o `Painel` do board, e ela existe porque o board de
 *    fato É uma janela de app. Agrupar o resto é trabalho de espaço e rótulo.
 *
 * 2. **Começo, meio e fim.** `Abertura` diz em que tela do produto isto
 *    acontece; os três atos mostram a coisa funcionando com estado real (cheio,
 *    vazio, carregando); `Fecho` diz o que o kit resolve. Antes a sala
 *    terminava no ar, e quem rolava até o fim concluía que faltou carregar.
 *
 * 3. **O nome da peça virou o botão que instala ela.** É o `PecaTag` de
 *    `sala.tsx`: o rótulo que era legenda de catálogo colada num produto agora
 *    copia o `add` daquela peça. A linha que identifica é a linha que instala.
 *
 * 4. **O board acabava em ~200px de vazio morto.** Ele vivia num `h-[300px]`
 *    dentro de um `min-h-[320px]`, e o kanban precisa de bem menos que isso:
 *    as colunas têm `min-height` própria e os cartões empilham por cima. Dois
 *    números chutados fazendo o container parecer mal medido. Agora a altura
 *    sai do conteúdo, com um piso baixo só para a troca de vista não fazer o
 *    painel encolher e voltar a crescer embaixo do dedo de quem clicou.
 *
 * Regra desta sala (e das outras quatro): **nada é reimplementado aqui**. Todo
 * componente vem do mesmo arquivo que o `shadcn add` entrega. Se a composição
 * precisa de algo que a peça não faz, a peça é que está incompleta.
 */

import * as React from "react";
import { Flame, RotateCw } from "lucide-react";

import { Chip } from "../../../registry/visant/ui/chip";
import { SegmentedControl } from "../../../registry/visant/ui/segmented-control";
import { InlineEdit } from "../../../registry/visant/ui/inline-edit";
import { AssigneeStack } from "../../../registry/visant/ui/assignee-stack";
import { StickyFilterbar, FilterRow } from "../../../registry/visant/ui/sticky-filterbar";
import { ScrubInput } from "../../../registry/visant/ui/scrub-input";
import { MeasurePicker } from "../../../registry/visant/ui/measure-picker";
import { Timeline } from "../../../registry/visant/ui/timeline";
import { Rail } from "../../../registry/visant/ui/rail";
import { SkeletonRail } from "../../../registry/visant/ui/skeleton-rail";
import { CoverArt } from "../../../registry/visant/ui/cover-art";
import { EmptyState } from "../../../registry/visant/ui/empty-state";
import { PEOPLE } from "../demo-fixtures";
import { Atos, Bloco, Faixa, Fecho, Painel, PecaTag } from "./sala";

const Kanban = React.lazy(() => import("../demos/kanban-demo"));

type Vista = "board" | "trilho";

const VISTAS = [
  { value: "board" as const, label: "Board" },
  { value: "trilho" as const, label: "Trilho" },
];

/*
 * As contagens dos filtros batem com o fixture do board (8 cartões, sendo 5 em
 * andamento, 2 em revisão e 1 pronto). Número de enfeite num filtro é a UI
 * mentindo sobre o banco, e é o tipo de mentira que ninguém confere numa demo.
 *
 * "Parado" fica com zero de propósito: é a porta do estado vazio, e a contagem
 * é justamente o motivo de a lista voltar sem nada.
 */
const FILTROS = [
  { k: "todos", l: "Todos", c: 8 },
  { k: "producao", l: "Em produção", c: 5 },
  { k: "revisao", l: "Revisão", c: 2 },
  { k: "parado", l: "Parado", c: 0 },
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
      <p className="max-w-md text-apoio leading-relaxed text-muted-foreground">
        Guideline lida do vault, tokens compilados, e o time cruzado com o projeto.
      </p>
    ),
  },
  {
    title: "Produção",
    content: (
      <p className="max-w-md text-apoio leading-relaxed text-muted-foreground">
        Board aberto, revisão direto na plataforma, sem ida e volta por e-mail.
      </p>
    ),
  },
  {
    title: "Entrega",
    content: (
      <p className="max-w-md text-apoio leading-relaxed text-muted-foreground">
        Arquivos, tema e componentes publicados no registry da marca.
      </p>
    ),
  },
];

/*
 * As faixas da carga da semana. Elas param onde a decisão muda (o que cabe
 * numa rodada, o que cabe numa peça nova, o que cabe num sprint), e não em
 * múltiplos redondos: o número redondo é bonito e não decide nada.
 */
const CABE = [
  { max: 8, value: "uma rodada de revisão", note: "sem peça nova" },
  { max: 20, value: "uma peça nova", note: "com uma revisão" },
  { max: 40, value: "um sprint fechado", note: "com apresentação" },
];

export default function MesaDeTrabalho() {
  const [vista, setVista] = React.useState<Vista>("board");
  const [filtro, setFiltro] = React.useState("producao");
  const [carga, setCarga] = React.useState(64);
  const [horas, setHoras] = React.useState(14);
  const [nome, setNome] = React.useState("Semana 33 em produção");
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

  const vazio = filtro === "parado";

  /*
   * O rodapé do painel: uma linha dizendo o que está na tela agora, e as peças
   * que desenham exatamente isso. É o que faz a sala ser copiável peça por
   * peça sem virar legenda de museu: o nome muda junto com o conteúdo, então
   * ele responde "o que é isso que eu estou vendo" no momento em que a
   * pergunta acontece.
   */
  const rodape: { linha: string; pecas: string[]; acao?: React.ReactNode } = vazio
    ? {
        linha: "Nada parado agora. O vazio tem desenho próprio, com arte e uma saída.",
        pecas: ["empty-state", "cover-art"],
      }
    : vista === "trilho"
      ? carregando
        ? {
            linha: "Carregando o trilho. O esqueleto tem as medidas exatas do que vem depois.",
            pecas: ["skeleton-rail"],
          }
        : {
            linha: `${PROJETOS.length} projetos da semana, com a capa gerada a partir do nome.`,
            pecas: ["rail", "cover-art"],
            /* Sem isto o esqueleto acontece uma vez e nunca mais: quem chegou
               na sala com o trilho já pronto não tem como ver a peça que
               segura a espera. Recarregar é chrome honesto de app. */
            acao: (
              <Chip
                icon={<RotateCw className="h-3.5 w-3.5" />}
                onClick={() => setCarregando(true)}
                className="shrink-0 rounded-[var(--r-pill,9999px)] px-2.5 py-1 text-apoio"
              >
                Recarregar
              </Chip>
            ),
          }
      : {
          /* A linha era instrução de arrastar ("solta fora do board e ele volta
             pro lugar"). Um cartão com cursor de mão que se move quando se
             puxa não precisa de legenda ensinando a puxar. Fica só o que a
             barra existe para dizer: qual peça está na tela agora. */
          linha: "",
          pecas: ["kanban"],
        };

  return (
    <Atos>
      {/* Uma linha, e ela diz o que a tese do kit não disse: que está vivo. A
          versão anterior listava o que fazer ("renomeia, arrasta, troca"), e a
          seguinte dizia "tudo aqui responde à mão". As duas morreram: a tese do
          kit, no cabeçalho, já situa a sala, e que os controles respondem se
          descobre movendo o mouse um centímetro. Dizer antes não acrescenta
          nada e custa o lugar mais caro da página. */}

      <Bloco
        titulo="a semana aberta"
        nota="O filtro é o eixo da lista. Aqui só Parado muda o resultado, e é ele que abre o vazio."
        pecas={["inline-edit", "assignee-stack", "segmented-control", "sticky-filterbar", "scrub-input"]}
      >
        <Painel
          barra={
            <>
              {/* O `whitespace-nowrap` era remendo de consumidor para um defeito
                  da peça: o `inline-edit` não segurava o texto em uma linha e o
                  nome do board quebrava em duas, esticando a barra do app no
                  meio da sala. A peça foi consertada (`truncate` mora nela
                  agora); isto fica como cinto e suspensório, e não como a única
                  coisa que impede a quebra. */}
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

              <span className="ml-auto flex items-center gap-3">
                <AssigneeStack assignees={PEOPLE} max={3} size="md" />
                <SegmentedControl
                  value={vista}
                  onChange={setVista}
                  aria-label="Vista da lista"
                  options={VISTAS}
                />
              </span>
            </>
          }
        >
          {/*
            O sentinela que a barra de filtro mede, e ele tem 1px por dois
            motivos que se somam.

            **Não pode medir o cabeçalho da página.** A altura dele é definida
            por `--shell-header-h` e a peça publica o que mediu em
            `--header-h`; medir o cabeçalho de verdade realimentaria a variável
            e a página inflaria alguns pixels por segundo, para sempre (a nota
            inteira está em `tailwind.css`).

            **E o `top` do sticky não conta a partir do viewport aqui.** O
            `Painel` tem `overflow-hidden`, então é ELE o scrollport do sticky:
            `top: var(--header-h)` empurra a barra esse tanto para baixo do
            topo do painel. Tentei declarar a cromagem da vitrine no sentinela
            (117px) e a barra desceu 117px por cima do board, cobrindo a
            primeira fileira de cartões. Dentro de um painel a referência da
            barra é o topo do painel, e é isso que 1px diz.
          */}
          <div data-mesa-header aria-hidden="true" className="h-px" />

          <StickyFilterbar headerSelector="[data-mesa-header]">
            <FilterRow>
              {FILTROS.map(({ k, l, c }) => (
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

          {/*
            Piso baixo, altura pelo conteúdo. O piso existe só para o painel não
            encolher e voltar a crescer quando a vista troca; quem manda na
            altura é o board, que sabe o tamanho que tem.
          */}
          <div className="min-h-[13rem] px-4 py-4 sm:px-5">
            {vazio ? (
              /* Filtro que não devolve nada é o estado mais comum de um board
                 real, e o único que costuma ficar sem desenho. Aqui ele é uma
                 peça, com arte e uma saída só. */
              <div className="grid place-items-center py-2">
                <EmptyState
                  className="w-full max-w-[21rem]"
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
                fallback={
                  <div
                    className="h-[11rem] w-full animate-pulse rounded-[var(--r-control,0.5rem)] bg-muted/40"
                    aria-busy="true"
                  />
                }
              >
                <Kanban denso />
              </React.Suspense>
            ) : carregando ? (
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
                      <span className="min-w-0 truncate text-apoio">{p.titulo}</span>
                      <AssigneeStack assignees={PEOPLE.slice(0, 2)} max={2} size="sm" />
                    </div>
                  </article>
                ))}
              </Rail>
            )}
          </div>

          {/* A barra de estado do app. Fecha o painel embaixo (era ali que a
              composição terminava no ar) e é onde a peça da vista atual vira
              botão de copiar o `add` dela. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-2.5 sm:px-5">
            <p className="min-w-0 flex-1 text-apoio text-muted-foreground">{rodape.linha}</p>
            {rodape.acao}
            <span className="flex flex-wrap items-center gap-1">
              {rodape.pecas.map((p) => (
                <PecaTag key={p} name={p} />
              ))}
            </span>
          </div>
        </Painel>
      </Bloco>

      <Bloco
        titulo="quanto cabe na semana"
        nota="Pergunta o que a pessoa sabe responder, e devolve o formato da entrega."
        pecas={["measure-picker"]}
      >
        {/*
          `accent-color` no consumidor, não na peça: quem instala escolhe a cor
          do range nativo, e aqui a escolha é o token da marca.

          A anatomia é a da casa e a ordem não muda: rótulo, valor, régua,
          evidência. O valor não anima enquanto a mão arrasta (ele segue o
          dedo, e animar ali é latência com boa aparência); o que muda de
          estado é a faixa, e a faixa é o evento.
        */}
        <div className="max-w-lg [&_input[type=range]]:accent-[var(--brand)]">
          <p className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
            horas livres do time
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-[1.75rem] font-semibold leading-none tabular-nums">{horas}</span>
            <span className="text-apoio text-muted-foreground">das 40 horas da semana</span>
          </p>

          {/* `hideReadout`: a peça ganhou leitura própria do valor, e o bloco
              acima já escreve "N das 40 horas da semana" em corpo grande. Sem
              isto o mesmo número aparece duas vezes, uma embaixo da outra —
              repetição que faz a pessoa procurar a diferença entre as duas. */}
          <MeasurePicker
            hideReadout
            className="mt-1"
            min={2}
            max={40}
            step={1}
            value={horas}
            onValueChange={setHoras}
            label="Horas livres do time nesta semana"
            edgeLabels={["2 h", "40 h"]}
            formatValue={(h) => `${h} horas livres`}
            bands={CABE}
          >
            {(banda) => (
              <p className="mt-1 text-corpo leading-relaxed text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]">
                Cabe <strong className="font-medium text-foreground">{String(banda.value)}</strong>
                {banda.note ? `, ${banda.note}` : ""}.
              </p>
            )}
          </MeasurePicker>
        </div>
      </Bloco>

      <Bloco
        titulo="do briefing à entrega"
        nota="A linha do tempo é de escala de página, então ela fecha a sala em vez de morar dentro do painel."
        pecas={["timeline"]}
      >
        {/*
          `Faixa` em vez de moldura: o chão muda, ninguém desenha caixa. É o
          mesmo jeito que uma landing separa dobra de dobra, e é o que permite
          a peça respirar sem virar a quinta borda da página.

          Aqui havia quatro seletores escondendo coisa da peça por fora: ela
          chegava com um cabeçalho escrito em inglês dentro do próprio arquivo
          ("Changelog from my journey") e com 160px de respiro antes do primeiro
          passo. Isso era defeito da peça sendo remendado no consumidor, e o
          remendo tinha prazo de validade — bastava a peça mudar a estrutura do
          DOM para os seletores esconderem a coisa errada, ou nada.

          A peça foi consertada: `title` e `description` viraram slot sem
          default, então `<Timeline data={ETAPAS} />` não renderiza cabeça
          nenhuma. Os seletores saíram.
        */}
        <Faixa tom="recuo" className="rounded-[var(--r-surface,0.875rem)] py-2">
          <Timeline data={ETAPAS} />
        </Faixa>
      </Bloco>

      <Fecho>
        É a tela de dentro do app, montada. O que falta é trocar o dado de exemplo pelo seu.
      </Fecho>
    </Atos>
  );
}
