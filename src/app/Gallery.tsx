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
import { Expand, List, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandTheme } from "@/lib/brand-theme";
import { Chip } from "../../registry/visant/ui/chip";
import { SegmentedControl } from "../../registry/visant/ui/segmented-control";
import {
  CATALOG,
  FAMILIES,
  TYPE_LABEL,
  fold,
  matches,
  previewOf,
  stageSurfaceOf,
  type CatalogItem,
  type Family,
} from "./catalog";
import { REGISTRY_PUBLIC_LABEL, installCommand } from "./registry-meta";
import { CopyCommand } from "./copy-command";
import { DepBadges, DepLogo } from "./dep-badges";
import { SEM_DEPS, allDeps, matchesDep } from "./deps";
import { FitStage, useLazyDemo } from "./stage";
import { WireframeToggle } from "./media";
import { ComponentFocus } from "./ComponentFocus";
import { BugButton } from "./bug-report";

type Mode = "vitrine" | "lista";
type FamilyFilter = Family | "todos";
type TipoFilter = CatalogItem["type"] | null;

const MODES = [
  { value: "vitrine" as const, icon: Rows3, ariaLabel: "Ver uma peça por linha" },
  { value: "lista" as const, icon: List, ariaLabel: "Ver em lista" },
];

/**
 * Quem tem demo ganha palco; quem não tem entra como LINHA, na mesma lista.
 *
 * Isto já foi uma aba separada ("Sem interface"), e a razão original era boa: na
 * grade de quatro colunas, uma peça desenhada ao lado de um cartão escrito "sem
 * superfície visual própria" dava o mesmo peso visual pro que se olha e pro que
 * só se instala.
 *
 * O que mudou é que **a grade acabou** — hoje é uma peça por linha. Numa coluna
 * vertical, a linha densa ao lado do card grande JÁ é a diferença de peso que a
 * aba tentava criar, e sem o custo dela: um hook escondido atrás de um segundo
 * clique é um hook que ninguém acha, e a aba era um eixo de filtro a mais
 * competindo com a categoria, que é o eixo que importa.
 *
 * Quem quiser só os hooks agora filtra por **tipo**, que é a pergunta que a aba
 * estava tentando responder por aproximação.
 */
const TEM_INTERFACE = (i: CatalogItem) => Boolean(i.demo);

/*
 * Sem `uppercase tracking-wider`: o selo de tipo aparece uma vez por linha numa
 * lista de 65, e caixa-alta com tracking transforma a coluna inteira em
 * textura. O mono miúdo já separa o selo do nome da peça.
 */
function TypeBadge({ type }: { type: CatalogItem["type"] }) {
  return (
    <span className="shrink-0 rounded-full border border-border px-1.5 py-px font-mono text-micro text-muted-foreground">
      {TYPE_LABEL[type]}
    </span>
  );
}

/**
 * A placa da vitrine: uma peça por linha, e nada disputando a linha com ela.
 *
 * A grade de quatro colunas tratava 52 itens como resultado de busca — três ou
 * quatro peças na mesma linha, cada uma escalada até caber numa coluna, e as de
 * `span` maior deixando buracos entre as vizinhas. Peça de biblioteca não é
 * resultado de busca: ou ela aparece no tamanho em que foi desenhada, ou não
 * dá para julgar se serve.
 *
 * Os dois botões ficam **sempre visíveis**, não no hover. Focar e copiar o
 * comando são as duas únicas coisas que se faz aqui; esconder as duas atrás de
 * um `group-hover` custa uma descoberta e não devolve nada — e no toque não
 * existe hover nenhum.
 */
const Showcase = React.memo(function Showcase({
  item,
  onOpen,
  index,
}: {
  item: CatalogItem;
  onOpen: () => void;
  index: number;
}) {
  const Demo = item.demo!;
  const { w, h } = previewOf(item);
  const { ref, mounted, active } = useLazyDemo<HTMLElement>();

  return (
    <article
      ref={ref}
      className={cn(
        // `group`: o botão de bug só aparece quando a mão (ou o teclado) chega
        // ao card — ver `bug-report.tsx`.
        "group overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card",
        "transition-[border-color,box-shadow] [transition-duration:var(--dur-fast,160ms)] [transition-timing-function:var(--ease-out)]",
        "focus-within:border-[var(--brand)] hover:border-[var(--brand)]",
        // A placa levanta um degrau no hover. Sem mover nada: a peça viva lá
        // dentro é que manda no palco, e um card que desliza rouba a cena dela.
        "hover:[box-shadow:var(--e-raised)]",
      )}
    >
      {/*
        Uma linha, não três.

        No celular ela vira coluna: identificação em cima, ações embaixo em
        linha cheia. Espremer nome, descrição, comando e botão na mesma faixa de
        390px reduz os dois alvos de toque a nada.

        O cabeçalho carregava nome, tipo, ícones de dependência, descrição em
        parágrafo próprio e mais duas ações — cinco informações antes da peça,
        que é o que a pessoa veio ver. Tipo e dependências continuam existindo:
        moram na ficha de foco, onde a decisão de instalar é tomada. Aqui fica o
        que identifica (nome), o que situa em uma frase (descrição) e o que se
        faz (copiar, focar).
      */}
      <header className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:px-5">
        <div className="flex min-w-0 flex-1 flex-col gap-x-3 sm:flex-row sm:items-baseline">
          <button
            type="button"
            data-card-index={index}
            onClick={onOpen}
            className="shrink-0 truncate text-left font-mono text-destaque outline-none hover:text-[var(--brand)] focus-visible:text-[var(--brand)] focus-visible:underline"
          >
            {item.name}
          </button>
          {/* `line-clamp-1`: a descrição situa, não explica. Quem quer o texto
              inteiro abre o foco — e assim nenhum card fica mais alto que o
              vizinho por ter frase comprida. */}
          <p className="min-w-0 line-clamp-1 text-apoio text-muted-foreground">
            {item.description}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          {/* `min-w-0` + `truncate` no código: o comando é longo e, sem isso, ele
              empurra o botão de foco para fora da tela em vez de encurtar. */}
          {/* Borda transparente em repouso: o comando precisa estar à mão, mas
              não pode brigar com o nome da peça pela primeira leitura. Ele ganha
              contorno quando a mão chega perto. */}
          <CopyCommand
            variant="line"
            text={installCommand(item.name)}
            className="min-w-0 flex-1 border-transparent bg-muted/60 hover:border-[var(--brand)] sm:w-[min(22rem,26vw)] sm:flex-none"
          />
          <button
            type="button"
            onClick={onOpen}
            className="alvo-toque inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-control,0.5rem)] border border-border px-2.5 py-1.5 text-apoio text-muted-foreground outline-none transition-[color,border-color,transform] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--brand)] hover:text-foreground focus-visible:border-[var(--brand)] focus-visible:text-foreground active:scale-[0.97] active:[transition-duration:var(--dur-press)] motion-reduce:active:scale-100"
          >
            <Expand className="h-3.5 w-3.5" />
            Focar
          </button>
          {/* Terceira ação, e a única que não é sobre usar a peça — por isso
              some em repouso e volta no hover. */}
          <BugButton item={item.name} />
        </div>
      </header>

      {/*
        O palco divide a superfície do card — não tem fundo nem borda próprios.

        Antes ele era uma caixa `bg-background` dentro de uma caixa `bg-card`, e
        a peça aparecia com duas molduras em volta antes da própria. Numa página
        de 50 cards isso vira grade de janelinhas: o olho conta as bordas, não as
        peças. A única exceção é o kit vintage, que é skeuomórfico e precisa do
        painel escuro para o metal e o LED existirem (`stageSurfaceOf`).

        `overflow-hidden`, e nunca `auto`: barra de rolagem horizontal dentro de
        um card de vitrine é sempre defeito. Ou a peça cabe, ou ela ENCOLHE até
        caber — daí o piso de escala mais baixo. O que não pode é a pessoa
        descobrir que faltava conteúdo arrastando de lado.
      */}
      <div
        className="overflow-hidden px-4 pb-5 pt-1 sm:px-6 sm:pb-7"
        style={stageSurfaceOf(item)}
      >
        <div className="mx-auto w-full" style={{ maxWidth: Math.max(w, 720) }}>
          <FitStage w={w} h={h} minScale={0.42} active={active} label={item.name}>
            {mounted ? <Demo /> : <div className="h-full w-full animate-pulse bg-muted/40" />}
          </FitStage>
        </div>
      </div>
    </article>
  );
});

function Row({ item, onOpen, index }: { item: CatalogItem; onOpen: () => void; index: number }) {
  return (
    <div className="group flex items-center gap-3 border-b border-border px-2 py-2.5 transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:bg-muted/40">
      <button
        type="button"
        data-card-index={index}
        onClick={onOpen}
        className="min-w-0 flex-1 text-left outline-none"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-apoio group-hover:text-[var(--brand)]">{item.name}</span>
          <TypeBadge type={item.type} />
          {/* Sem `onPick` aqui: a linha inteira já é um botão, e um botão dentro
              de outro é HTML inválido antes de ser problema de teclado. */}
          <DepBadges name={item.name} variant="icones" />
        </span>
        <span className="mt-0.5 line-clamp-1 block text-apoio text-muted-foreground">
          {item.description}
        </span>
      </button>
      {/*
        Sem `no-hover`: numa linha de item que não tem o que mostrar, copiar o
        comando é a ÚNICA ação que existe. Escondê-la atrás do hover é esconder
        a linha inteira — e no toque não há hover para revelar nada.
      */}
      <CopyCommand variant="chip" text={installCommand(item.name)} />
      <BugButton item={item.name} variant="chip" />
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
  /** `null` = não filtra por dependência. `SEM_DEPS` = só o que não puxa nada. */
  const [dep, setDep] = React.useState<string | null>(null);
  const [tipo, setTipo] = React.useState<TipoFilter>(null);
  const [mode, setMode] = React.useState<Mode>("vitrine");
  /**
   * Os dois eixos secundários ficam recolhidos.
   *
   * A barra tinha três linhas permanentes — busca, categoria e npm — e com 65
   * itens a terceira linha empurrava o primeiro card pra baixo da dobra em
   * qualquer laptop. Categoria é a pergunta que quase todo mundo faz e fica à
   * vista; tipo e peso de bundle são perguntas de quem já está decidindo, e
   * cabem atrás de um clique. O botão diz quantos filtros estão ligados, então
   * recolher nunca esconde um filtro ATIVO.
   */
  const [abertos, setAbertos] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const heroRef = React.useRef<HTMLElement>(null);
  const { brands } = useBrandTheme();

  const pool = CATALOG;

  const results = React.useMemo(() => {
    const needle = fold(q.trim());
    return pool.filter(
      (i) =>
        (family === "todos" || i.family === family) &&
        (tipo === null || i.type === tipo) &&
        matchesDep(i.name, dep) &&
        matches(i, needle),
    );
  }, [q, family, dep, tipo, pool]);

  /*
   * O filtro de dependência se monta do que EXISTE ali, com a contagem junto.
   *
   * A alternativa era uma lista fixa de libs escrita à mão — e ela envelheceria
   * no dia em que alguém colhesse a primeira peça com `three`, oferecendo um
   * filtro que não existe e escondendo o que passou a existir.
   *
   * O escopo é a categoria E o tipo escolhidos, pelo mesmo motivo que a contagem
   * de categoria não olha o catálogo inteiro: número de chip que o clique
   * seguinte desmente contamina a confiança em todos os outros.
   */
  const escopoDep = React.useMemo(
    () => pool.filter((i) => (family === "todos" || i.family === family) && (tipo === null || i.type === tipo)),
    [pool, family, tipo],
  );
  const depsDoEscopo = React.useMemo(() => allDeps(escopoDep.map((i) => i.name)), [escopoDep]);
  const semDepsCount = React.useMemo(
    () => escopoDep.filter((i) => matchesDep(i.name, SEM_DEPS)).length,
    [escopoDep],
  );

  /* Dependência que sumiu do escopo deixaria a pessoa olhando lista vazia sem pedir. */
  React.useEffect(() => {
    if (!dep) return;
    const existe =
      dep === SEM_DEPS ? semDepsCount > 0 : depsDoEscopo.some((d) => d.info.key === dep);
    if (!existe) setDep(null);
  }, [depsDoEscopo, semDepsCount, dep]);

  const pickDep = React.useCallback((chave: string) => {
    // Clicar de novo na mesma dependência desfaz: o ícone do card é o mesmo
    // controle, ligado e desligado, e não um caminho só de ida.
    setDep((atual) => (atual === chave ? null : chave));
    // E abre o painel: filtrar pelo ícone do card com o painel fechado mudaria
    // a lista sem mostrar QUAL controle mudou, que é como filtro vira mágica.
    setAbertos(true);
  }, []);

  /*
   * A contagem de cada categoria já obedece aos outros dois filtros.
   *
   * Um chip escrito "Fundação 8" que entrega 1 porque o filtro de tipo está
   * ligado é uma promessa que a própria tela desmente no clique seguinte — e
   * some com a confiança no resto dos números.
   */
  const escopoFamilia = React.useMemo(
    () => pool.filter((i) => matchesDep(i.name, dep) && (tipo === null || i.type === tipo)),
    [pool, dep, tipo],
  );

  /** Idem para o eixo de tipo: conta dentro da categoria e do npm escolhidos. */
  const countByTipo = React.useMemo(() => {
    const escopo = pool.filter(
      (i) => (family === "todos" || i.family === family) && matchesDep(i.name, dep),
    );
    return escopo.reduce<Record<string, number>>((acc, i) => {
      acc[i.type] = (acc[i.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [pool, family, dep]);

  /* Tipo que sumiu do escopo deixaria a pessoa olhando lista vazia sem pedir. */
  React.useEffect(() => {
    if (tipo && !countByTipo[tipo]) setTipo(null);
  }, [countByTipo, tipo]);

  /** Quantos eixos secundários estão ligados — é o que o botão recolhido diz. */
  const secundariosAtivos = (tipo ? 1 : 0) + (dep ? 1 : 0);

  const countByFamily = React.useMemo(
    () =>
      escopoFamilia.reduce<Record<string, number>>((acc, i) => {
        acc[i.family] = (acc[i.family] ?? 0) + 1;
        return acc;
      }, {}),
    [escopoFamilia],
  );

  /* Família vazia na aba nova deixaria a pessoa olhando um nada que ela não pediu. */
  React.useEffect(() => {
    if (family !== "todos" && !countByFamily[family]) setFamily("todos");
  }, [countByFamily, family]);

  /*
   * Filtrar encolhe a página embaixo de quem está rolando.
   *
   * Sair de "Todos" (46 itens, ~5100px) para uma família de 9 corta o documento
   * para ~1500px. O navegador prende o scroll no novo fim e a pessoa fica
   * centenas de pixels ABAIXO do primeiro resultado, olhando um vazio — parece
   * bug de layout e é só posição de scroll órfã. Então, quando o resultado muda
   * e a barra de controle já saiu por cima, a página volta para ela (não para o
   * topo absoluto: o herói já foi lido, os controles é que precisam estar à mão).
   */
  const first = React.useRef(true);
  React.useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const hero = heroRef.current;
    if (!hero) return;

    /*
     * `useLayoutEffect`, e não `useEffect` + `requestAnimationFrame`.
     *
     * Roda depois de o DOM novo existir e ANTES da pintura, então a pessoa nunca
     * vê o quadro errado. A versão com rAF parecia equivalente e não é: quadro
     * não é entregue em aba de segundo plano, e o corretivo simplesmente não
     * acontecia (foi assim que o bug sobreviveu ao primeiro conserto).
     *
     * Medimos o HERÓI, não a barra de controle: a barra é `sticky`, e no Chrome
     * tanto o `getBoundingClientRect` quanto o `offsetTop` dela já vêm deslocados
     * pela grudada — a conta se anulava e o alvo saía igual ao scroll atual. O
     * fim do herói é onde a barra começa no layout, e ele não gruda.
     */
    const headerH = document.querySelector("header")?.offsetHeight ?? 0;
    const target = Math.max(0, hero.getBoundingClientRect().bottom + window.scrollY - headerH);
    // Salto seco: a lista mudou inteira, rolagem suave aqui só atrasaria o que a
    // pessoa pediu — e ainda seria cancelada pelo reflow do próprio filtro.
    if (window.scrollY > target) window.scrollTo({ top: target, behavior: "auto" });
  }, [family, dep, tipo, mode, results.length]);

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

      const move = (delta: number) => {
        e.preventDefault();
        const target =
          current < 0 ? 0 : Math.min(Math.max(current + delta, 0), cards.length - 1);
        cards[target]?.focus();
        cards[target]?.scrollIntoView({ block: "nearest" });
      };

      // Uma peça por linha nos dois modos: percorrer é sempre para cima e para
      // baixo, e não há mais coluna para ler do grid.
      if (e.key === "ArrowRight" || e.key === "ArrowDown") move(1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") move(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [q, mode]);

  return (
    <div className="shell pb-24">
      <section ref={heroRef} className="pt-10 pb-7 sm:pt-14 sm:pb-8">
        <h1
          className="text-[clamp(1.75rem,5vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display, inherit)" }}
        >
          A library da Visant
        </h1>
        {/* Duas frases, e a segunda é a tese. A versão anterior tinha quatro e
            explicava também onde ficam as marcas reais — informação de conta,
            que pertence à tela de conta, não à primeira dobra do catálogo. */}
        <p className="mt-4 max-w-2xl text-corpo leading-relaxed text-muted-foreground sm:text-destaque">
          {/* Conta a lista que está na tela, e não um número escrito à mão que
              envelhece: o portão `npm run check:catalog` garante que esta lista
              e o registry.json não divergem. */}
          {CATALOG.length} peças servidas por{" "}
          <code className="font-mono text-corpo">{REGISTRY_PUBLIC_LABEL}</code>, em{" "}
          {/*
            O número de temas vem do índice do vault — o sync publica marca nova e
            a frase acompanha sozinha. A frase inteira fica no ar desde o primeiro
            quadro, com o número reservado num slot de largura fixa: antes ela
            APARECIA quando o vault respondia, e o parágrafo ganhava uma linha
            com a pessoa já lendo.
          */}
          <span className="inline-block min-w-[1.6ch] tabular-nums">{brands.length || "…"}</span>{" "}
          marcas. Nenhum componente sabe a cor de um cliente. Trocar a marca no seletor repinta
          esta página inteira.
        </p>
      </section>

      {/* controles */}
      <div className="shell-bleed sticky top-[var(--shell-header-h)] z-30 border-b border-border bg-background/85 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="relative flex min-w-0 flex-1 items-center gap-2 rounded-[var(--r-pill,9999px)] border border-border bg-card px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, uso ou tag…"
              aria-label="Buscar no catálogo"
              className="w-full min-w-0 bg-transparent text-corpo outline-none placeholder:text-muted-foreground"
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
              <kbd className="hidden rounded border border-border px-1.5 font-mono text-micro text-muted-foreground sm:block">
                /
              </kbd>
            )}
          </div>

          {/* Ao lado do modo de visualização porque é a mesma natureza: as duas
              mudam COMO se olha o catálogo, não O QUE ele mostra. Filtro tira
              peça da lista; estes dois não tiram nenhuma. */}
          <WireframeToggle />

          <SegmentedControl
            value={mode}
            onChange={setMode}
            variant="compact"
            aria-label="Modo de visualização"
            options={MODES}
          />
        </div>

        {/* A ÚNICA linha permanente de filtro: a categoria. Rola na horizontal
            no celular em vez de virar quatro linhas. */}
        <div className="shell-bleed mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          <Chip
            pressed={family === "todos"}
            // A contagem do "Todos" também obedece aos eixos recolhidos — senão
            // ele anuncia 65 e entrega 5, que é o tipo de número que ensina a
            // pessoa a não confiar em nenhum outro na barra.
            count={escopoFamilia.length}
            onClick={() => setFamily("todos")}
            className="rounded-[var(--r-pill,9999px)] py-1.5 text-apoio"
          >
            Todos
          </Chip>
          {FAMILIES.filter((f) => countByFamily[f.key]).map((f) => (
            <Chip
              key={f.key}
              pressed={family === f.key}
              count={countByFamily[f.key] ?? 0}
              onClick={() => setFamily(f.key)}
              className="rounded-[var(--r-pill,9999px)] py-1.5 text-apoio"
            >
              {f.label}
            </Chip>
          ))}

          {/* O botão dos eixos secundários. Carrega a contagem do que está
              ligado, então recolhido nunca esconde filtro ativo — o modo de
              falha clássico de disclosure em barra de filtro. */}
          <span className="shrink-0 sm:ml-auto sm:pl-3">
            <Chip
              pressed={abertos || secundariosAtivos > 0}
              count={secundariosAtivos}
              onClick={() => setAbertos((v) => !v)}
              icon={<SlidersHorizontal className="h-3 w-3" />}
              aria-expanded={abertos}
              className="gap-1.5 rounded-[var(--r-pill,9999px)] py-1.5 text-apoio"
            >
              Tipo e peso
            </Chip>
          </span>
        </div>

        {/*
          Os dois eixos secundários, recolhidos.

          "Que tipo de peça é essa?" e "isso pesa no meu bundle?" são perguntas
          de quem JÁ escolheu a categoria e está decidindo. Elas ocupavam duas
          linhas permanentes da barra — com 65 itens, isso empurrava o primeiro
          card pra baixo da dobra em qualquer laptop, e a página abria mostrando
          controle em vez de componente.
        */}
        {abertos ? (
          <div className="shell-bleed mt-2 space-y-1.5 border-t border-border pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="w-8 shrink-0 font-mono text-micro text-muted-foreground">
                tipo
              </span>
              {(Object.keys(TYPE_LABEL) as CatalogItem["type"][])
                .filter((t) => countByTipo[t])
                .map((t) => (
                  <Chip
                    key={t}
                    pressed={tipo === t}
                    count={countByTipo[t]}
                    // Clicar de novo desfaz: o mesmo controle ligado e
                    // desligado, e não um caminho só de ida.
                    onClick={() => setTipo((atual) => (atual === t ? null : t))}
                    className="rounded-[var(--r-pill,9999px)] px-2.5 py-1 font-mono text-micro font-normal"
                  >
                    {TYPE_LABEL[t]}
                  </Chip>
                ))}
            </div>

            {depsDoEscopo.length ? (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="w-8 shrink-0 font-mono text-micro text-muted-foreground">
                  npm
                </span>
                {semDepsCount ? (
                  <Chip
                    pressed={dep === SEM_DEPS}
                    count={semDepsCount}
                    onClick={() => pickDep(SEM_DEPS)}
                    className="rounded-[var(--r-pill,9999px)] px-2.5 py-1 text-micro font-normal"
                  >
                    Nenhuma
                  </Chip>
                ) : null}
                {depsDoEscopo.map(({ info, count }) => (
                  <Chip
                    key={info.key}
                    pressed={dep === info.key}
                    count={count}
                    onClick={() => pickDep(info.key)}
                    icon={info.icon ? <DepLogo icon={info.icon} className="h-3 w-3" /> : undefined}
                    title={info.packages.join(", ")}
                    className="gap-1.5 rounded-[var(--r-pill,9999px)] px-2.5 py-1 text-micro font-normal"
                  >
                    {info.label}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {results.length ? (
        mode === "vitrine" ? (
          <div
            ref={listRef}
            // `overflow-anchor: none`: o Chrome tenta manter na tela o elemento
            // "âncora" quando o conteúdo acima muda, e ao filtrar ele desfaz a
            // reposição logo depois de nós a fazermos — a página voltava para o
            // fim do documento novo. Aqui a âncora não ajuda: os itens de cima
            // não mudaram de tamanho, sumiram.
            style={{ overflowAnchor: "none" }}
            className="mt-6 flex flex-col gap-5"
          >
            {/* Peça com demo ganha palco; lib, hook e tema entram como LINHA na
                mesma coluna. A diferença de peso é o que a aba "Sem interface"
                tentava criar, e aqui ela sai de graça — sem eixo de filtro a
                mais e sem esconder metade da library atrás de um clique. */}
            {results.map((item, i) =>
              TEM_INTERFACE(item) ? (
                <Showcase
                  key={item.name}
                  item={item}
                  index={i}
                  onOpen={() => onFocus(item.name)}
                />
              ) : (
                <div key={item.name} className="rounded-[var(--r-surface,0.875rem)] border border-border bg-card px-2">
                  <Row item={item} index={i} onOpen={() => onFocus(item.name)} />
                </div>
              ),
            )}
          </div>
        ) : (
          <div ref={listRef} style={{ overflowAnchor: "none" }} className="mt-6 border-t border-border">
            {results.map((item, i) => (
              <Row key={item.name} item={item} index={i} onOpen={() => onFocus(item.name)} />
            ))}
          </div>
        )
      ) : (
        <div className="mt-16 text-center">
          <p className="text-destaque">Nada com “{q}”.</p>
          <p className="mx-auto mt-2 max-w-md text-corpo text-muted-foreground">
            Se a peça não existe aqui e você está prestes a escrevê-la, ela provavelmente deveria
            virar item. É assim que o registry cresce.
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
