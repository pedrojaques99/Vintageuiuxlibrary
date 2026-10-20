"use client";

/**
 * A vitrine do registry: o acervo em foto, as fatias vivas e a porta pra ficha.
 *
 * O que a página precisa responder em cinco segundos: *o que existe aqui?* A
 * resposta é a própria grade. Tudo o que não é peça saiu do caminho até ela:
 *
 * - **Uma busca só.** Havia duas na mesma tela (a do cabeçalho e uma da grade),
 *   escrevendo em lugares diferentes — a pessoa escolhia por sorte. Ficou a do
 *   cabeçalho, `⌘K`, que já casa nome, tag e descrição; `/` abre a mesma.
 * - **Filtro em texto, não em chip.** Categoria é a pergunta que todo mundo faz
 *   e fica à vista como uma linha de palavras. Tipo, peso de bundle e mídia são
 *   perguntas de quem já está decidindo, e ficam atrás de um ícone.
 * - **O ladrilho é o palco.** Nome, categoria, tipo, "add" e selo saíram do
 *   card: são da ficha, que abre num clique. O nome aparece no hover.
 *
 * Três decisões antigas continuam mandando aqui:
 *
 * - **Palco de moldura fixa** (`PalcoFixo`): a peça cabe na moldura em vez de a
 *   moldura medir a peça. É o que deixa sessenta peças comparáveis numa varrida.
 * - **Foto em repouso, peça viva no hover** no acervo inteiro: oitenta demos
 *   vivas numa rota davam 26.253px e uma dúzia de `setInterval` competindo.
 * - **A fatia por categoria é viva**: lá são dez ou vinte demos, o número em que
 *   montar tudo ainda é barato.
 */

import * as React from "react";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATALOG,
  FAMILIES,
  TYPE_LABEL,
  familyLabel,
  previewOf,
  stageSurfaceOf,
  type CatalogItem,
  type Family,
} from "./catalog";
import { installCommand } from "./registry-meta";
import { CopyCommand } from "./copy-command";
import { DepLogo } from "./dep-badges";
import { SEM_DEPS, allDeps, matchesDep } from "./deps";
import { PalcoFixo, useInView, useLazyDemo } from "./stage";
import { GRID_GAP, useFundoEscuro } from "./mosaic";
import { ehNovo } from "./novidades";
import { WireframeToggle } from "./media";
import { Aba } from "./casa-ui";
import { Miniatura } from "./miniatura";
import { BugButton } from "./bug-report";

type Mode = "vitrine" | "lista";
type TipoFilter = CatalogItem["type"] | null;

/**
 * A distância da tela em que a peça do acervo monta (e além da qual desmonta).
 *
 * Uma tela inteira acima e abaixo: quem rola em velocidade normal nunca alcança
 * uma peça que ainda está montando, e o que fica vivo de uma vez são umas três
 * fileiras — o custo que a página aguenta, mesmo com as peças WebGL.
 */
const PERTO = "100% 0px";

/**
 * A ordem do acervo: o que entrou por último primeiro.
 *
 * A ordem do arquivo é a ordem em que as peças foram escritas, que não diz nada
 * a quem lê. Quem volta à vitrine volta pra ver o que mudou.
 */
const porNovidade = (lista: CatalogItem[]) =>
  [...lista].sort((a, b) => Number(ehNovo(b.name)) - Number(ehNovo(a.name)));

/**
 * O nome curto de cada categoria, na linha de filtro.
 *
 * O rótulo longo ("Superfície de trabalho", "Motion e estado") continua sendo o
 * título da fatia; na linha de sete palavras ele virava a palavra mais comprida
 * da tela e empurrava as outras pra segunda linha no laptop.
 */
const CURTO: Record<Family, string> = {
  trabalho: "Trabalho",
  aquisicao: "Aquisição",
  motion: "Motion",
  marca: "Marca",
  vintage: "Vintage",
  fundacao: "Fundação",
};

/**
 * Avisa quando a peça viva já pintou.
 *
 * Mora DENTRO do `Suspense`, depois da demo: só monta quando o chunk dela
 * resolveu e a árvore foi commitada. Dois quadros depois disso a peça está na
 * tela — e só aí a foto pode sair, senão a troca passa por um quadro vazio.
 */
function Pronto({ onPronto }: { onPronto: () => void }) {
  React.useEffect(() => {
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(onPronto);
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [onPronto]);
  return null;
}

/**
 * O ladrilho da grade: o palco, e mais nada.
 *
 * A moldura é fixa e a peça cabe dentro dela (`PalcoFixo`). O fundo é o da
 * MARCA (`.palco`): a peça foi desenhada para viver sobre ele.
 *
 * O nome aparece no canto quando o cursor chega (e fica fixo no toque, via
 * `no-hover`). Ele é o botão de verdade do card: é por ele que o teclado entra e
 * que as setas percorrem a grade.
 *
 * ── A peça acorda ANTES de aparecer, não no hover ───────────────────────────
 *
 * A primeira versão do acervo mostrava foto em repouso e montava a peça viva no
 * hover. A troca pulava duas vezes: a foto vinha de outro enquadramento (escala
 * e centro diferentes) e de outra marca (a captura sai na padrão, o ladrilho
 * veste a escolhida). Por mais bem feita que fosse a transição, o hover era o
 * instante em que a pessoa olhava fixo pro card — o pior momento pra qualquer
 * coisa mudar.
 *
 * Agora a troca acontece fora da tela. A peça monta quando o ladrilho chega a
 * uma tela de distância do viewport (`PERTO`) e desmonta quando se afasta além
 * disso — então quem rola encontra a peça já viva, na marca certa, e o hover
 * não troca nada: só mostra o nome. O custo continua limitado ao que está perto
 * da tela (umas três fileiras), e os relógios das peças param fora do viewport
 * (`active`).
 *
 * A foto sobra como espera do primeiro carregamento. Ela é capturada no mesmo
 * enquadramento da caixa do palco e sem fundo (`?solo=1&caixa=1`), mora dentro
 * do mesmo `PalcoFixo`, e só desbota quando a peça já pintou (`Pronto`) —
 * nenhum quadro mostra as duas fora de registro, e nenhum mostra o palco vazio.
 */
const Ladrilho = React.memo(function Ladrilho({
  item,
  onOpen,
  index,
  foto = false,
}: {
  item: CatalogItem;
  onOpen: () => void;
  index: number;
  /** Acervo inteiro: a peça monta e desmonta com a distância da tela. */
  foto?: boolean;
}) {
  const Demo = item.demo;
  const { w, h } = previewOf(item);
  const { ref: refLazy, mounted, active } = useLazyDemo<HTMLElement>();
  const [refPerto, perto] = useInView<HTMLElement>(PERTO);
  const ref = React.useCallback(
    (el: HTMLElement | null) => {
      refLazy.current = el;
      refPerto.current = el;
    },
    [refLazy, refPerto],
  );
  const escuro = useFundoEscuro();
  // Foto que ainda não foi gerada não pode virar moldura vazia: a peça fica viva.
  const [semFoto, setSemFoto] = React.useState(false);
  const [pronto, setPronto] = React.useState(false);
  const marcarPronto = React.useCallback(() => setPronto(true), []);

  const comFoto = foto && Boolean(Demo) && !semFoto;
  // Na fatia a peça monta uma vez e fica; no acervo ela vive enquanto está perto.
  const viva = Boolean(Demo) && (foto ? perto : mounted);

  React.useEffect(() => {
    if (!viva) setPronto(false);
  }, [viva]);

  const fotoVisivel = comFoto && !(viva && pronto);

  return (
    <article
      ref={ref}
      /* Âncora é atributo, não texto: o card mostra o TÍTULO, e o nome do
         registry é o que a suíte usa pra achar a peça. */
      data-name={item.name}
      /* Peça viva montada agora. A foto mora no mesmo `PalcoFixo`, então o
         `data-palco` dele não distingue mais as duas: é por aqui que a suíte
         prova que só o que está perto da tela fica montado. */
      data-viva={viva ? "" : undefined}
      className="palco group relative isolate overflow-hidden rounded-tile [contain:paint] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--casa-fg-2)]"
    >
      {Demo ? (
        /*
          A moldura abre a ficha enquanto mostra a foto. Com a peça viva, o
          clique é DELA (arrastar o knob de dentro da grade) — e o nome no canto
          continua sendo o botão que sempre abre.
        */
        <div onClick={fotoVisivel ? onOpen : undefined} className={fotoVisivel ? "cursor-pointer" : undefined}>
          <PalcoFixo w={w} h={h} ratio={16 / 10} active={active} style={stageSurfaceOf(item)}>
            {viva ? (
              <React.Suspense fallback={null}>
                <Demo />
                {comFoto ? <Pronto onPronto={marcarPronto} /> : null}
              </React.Suspense>
            ) : null}
            {comFoto ? (
              <img
                src={`/shots/${item.name}-${escuro ? "escuro" : "claro"}.webp`}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={() => setSemFoto(true)}
                className="pointer-events-none absolute inset-0 h-full w-full transition-opacity [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-out)]"
                style={{ opacity: fotoVisivel ? 1 : 0 }}
              />
            ) : null}
          </PalcoFixo>
        </div>
      ) : null}

      {/* Reportar bug: só existe com o reporte ligado (modo dev), e aparece
          junto com o nome. Nunca é ação de quem visita a vitrine. */}
      <div className="casa no-hover absolute right-3 top-3 rounded-[10px] bg-casa-bg empty:hidden">
        <BugButton item={item.name} />
      </div>

      <div className="casa no-hover pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-24px)]">
        <button
          type="button"
          data-card-index={index}
          onClick={onOpen}
          className="pointer-events-auto flex max-w-full items-center gap-1.5 rounded-[8px] bg-casa-bg px-2 py-1 text-casa-sm text-casa-fg outline-none"
        >
          <span className="truncate">{item.title}</span>
          {/* O que entrou por último ganha um ponto, não um selo gritado. */}
          {ehNovo(item.name) ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-[2px] bg-casa-fg-2" aria-label="novo" />
          ) : null}
        </button>
      </div>
    </article>
  );
});

/**
 * A linha da lista: nome, frase e o comando, e nada que a grade já não diga.
 *
 * Copiar fica atrás do hover (e visível no toque, via `no-hover`): uma palavra
 * "add" repetida em cada uma das noventa linhas era textura, não ação.
 */
function Row({ item, onOpen, index }: { item: CatalogItem; onOpen: () => void; index: number }) {
  return (
    <div className="group flex items-center gap-4 rounded-control px-3 py-2.5 transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:bg-casa-tile">
      <button
        type="button"
        data-card-index={index}
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-baseline gap-3 text-left outline-none"
      >
        <Miniatura item={item} className="h-10 w-16 self-center" />
        <span className="w-40 shrink-0 truncate text-casa-base text-casa-fg">{item.title}</span>
        <span className="min-w-0 flex-1 truncate text-casa-base text-casa-fg-2">
          {item.description}
        </span>
        <span className="hidden shrink-0 text-casa-sm text-casa-fg-3 sm:inline">
          {TYPE_LABEL[item.type]}
        </span>
      </button>
      <CopyCommand variant="chip" text={installCommand(item.name)} className="no-hover" />
    </div>
  );
}

/**
 * O catálogo, em dois modos — e é a rota que decide qual.
 *
 * `familia = null` é o acervo inteiro, em foto. `familia = "motion"` é aquela
 * família, viva. Quem chama é o `App.tsx` (a rota); quem desenha é este arquivo.
 */
export interface GalleryProps {
  onFocus: (name: string | null) => void;
  /** `null` = o acervo inteiro. Uma família = aquela fatia, com demo viva. */
  familia?: Family | null;
  onFamilia?: (f: Family | null) => void;
  /** Abre a busca do cabeçalho — a única da casa. */
  onBuscar?: () => void;
}

export function Gallery({ onFocus, familia = null, onFamilia, onBuscar }: GalleryProps) {
  /** `null` = não filtra por dependência. `SEM_DEPS` = só o que não puxa nada. */
  const [dep, setDep] = React.useState<string | null>(null);
  const [tipo, setTipo] = React.useState<TipoFilter>(null);
  const [mode, setMode] = React.useState<Mode>("vitrine");
  /**
   * Os eixos secundários ficam recolhidos atrás de um ícone, que mostra quantos
   * estão ligados: recolher nunca esconde um filtro ATIVO.
   */
  const [abertos, setAbertos] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const heroRef = React.useRef<HTMLElement>(null);

  const pool = React.useMemo(
    () => porNovidade(familia ? CATALOG.filter((i) => i.family === familia) : CATALOG),
    [familia],
  );

  const results = React.useMemo(
    () => pool.filter((i) => (tipo === null || i.type === tipo) && matchesDep(i.name, dep)),
    [pool, dep, tipo],
  );
  const comPalco = React.useMemo(() => results.filter((i) => i.demo), [results]);
  const semPalco = React.useMemo(() => results.filter((i) => !i.demo), [results]);

  /*
   * O filtro de dependência se monta do que EXISTE ali, com a contagem junto —
   * uma lista fixa escrita à mão envelheceria no dia em que alguém colhesse a
   * primeira peça com `three`. O escopo é o tipo escolhido: número que o clique
   * seguinte desmente contamina a confiança em todos os outros.
   */
  const escopoDep = React.useMemo(
    () => pool.filter((i) => tipo === null || i.type === tipo),
    [pool, tipo],
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

  /** O eixo de tipo conta dentro do npm escolhido. */
  const countByTipo = React.useMemo(
    () =>
      pool
        .filter((i) => matchesDep(i.name, dep))
        .reduce<Record<string, number>>((acc, i) => {
          acc[i.type] = (acc[i.type] ?? 0) + 1;
          return acc;
        }, {}),
    [pool, dep],
  );

  React.useEffect(() => {
    if (tipo && !countByTipo[tipo]) setTipo(null);
  }, [countByTipo, tipo]);

  const secundariosAtivos = (tipo ? 1 : 0) + (dep ? 1 : 0);

  /*
   * Filtrar encolhe a página embaixo de quem está rolando.
   *
   * Sair de uma lista longa para uma curta corta o documento, e o navegador
   * prende o scroll no novo fim: a pessoa fica centenas de pixels ABAIXO do
   * primeiro resultado, olhando um vazio. Então, quando o resultado muda e a
   * barra já saiu por cima, a página volta para ela.
   *
   * `useLayoutEffect`: roda antes da pintura, e (ao contrário de rAF) roda em
   * aba de segundo plano. Medimos o HERÓI, não a barra: a barra é `sticky` e o
   * Chrome já devolve a posição dela deslocada pela grudada.
   */
  const first = React.useRef(true);
  React.useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const hero = heroRef.current;
    if (!hero) return;
    const headerH = document.querySelector("header")?.offsetHeight ?? 0;
    const target = Math.max(0, hero.getBoundingClientRect().bottom + window.scrollY - headerH);
    if (window.scrollY > target) window.scrollTo({ top: target, behavior: "auto" });
  }, [familia, dep, tipo, mode, results.length]);

  // Atalhos da grade. `/` abre a busca — convenção de quem usa o teclado — e as
  // setas percorrem os cards a partir do que estiver focado, com o número de
  // colunas lido do próprio grid em vez de chutado por breakpoint.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;

      if (e.key === "/") {
        e.preventDefault();
        onBuscar?.();
        return;
      }
      if (!listRef.current) return;

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

      const grade = listRef.current.querySelector<HTMLElement>("[data-grade]");
      const cols =
        mode === "vitrine" && grade && el && grade.contains(el)
          ? getComputedStyle(grade).gridTemplateColumns.split(" ").length
          : 1;
      if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowDown") move(cols);
      else if (e.key === "ArrowUp") move(-cols);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode, onBuscar]);

  return (
    <div className="pb-24">
      {/*
       * A dobra: o título e, no acervo, uma frase. Nada mais antes da grade.
       *
       * Eram quatro blocos de texto antes do primeiro componente — volta,
       * título, tese com número de marcas e a contagem repetida na barra. Numa
       * página cuja única promessa é mostrar componente, a tese cabe numa linha.
       */}
      <section ref={heroRef} className="casa shell pt-12 pb-8 sm:pt-16">
        <h1 className="text-casa-xl font-medium">
          {familia ? familyLabel(familia) : "A library da Visant"}
        </h1>
        {familia ? null : (
          <p className="mt-3 max-w-xl text-casa-lg text-casa-fg-2">
            {CATALOG.length} peças pra React. Cada uma veste a marca que você escolher.
          </p>
        )}
      </section>

      {/* controles */}
      <div className="casa sticky top-[var(--shell-header-h)] z-30 bg-casa-bg">
        <div className="shell flex items-center gap-5 py-2">
          {/* No celular a linha rola de lado; o esmaecido na borda é o que diz
              que tem mais palavra depois da última visível. */}
          <div className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none] sm:[mask-image:none] [&::-webkit-scrollbar]:hidden">
            {/* A categoria NAVEGA: cada palavra é uma rota (`/catalogo/motion`),
                então o link de uma fatia pode ser mandado no chat. */}
            <Aba ativa={!familia} onClick={() => onFamilia?.(null)} count={CATALOG.length}>
              Tudo
            </Aba>
            {FAMILIES.map((f) => (
              <Aba
                key={f.key}
                ativa={familia === f.key}
                onClick={() => onFamilia?.(f.key)}
                count={CATALOG.filter((i) => i.family === f.key).length}
              >
                {CURTO[f.key]}
              </Aba>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setAbertos((v) => !v)}
              aria-expanded={abertos}
              aria-pressed={abertos || secundariosAtivos > 0}
              aria-label="Filtrar por tipo e dependência"
              title="Tipo e dependência"
              className="casa-icone alvo-toque relative"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {secundariosAtivos ? (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-[2px] bg-casa-fg" />
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "vitrine" ? "lista" : "vitrine")}
              aria-label={mode === "vitrine" ? "Ver em lista" : "Ver em grade"}
              title={mode === "vitrine" ? "Ver em lista" : "Ver em grade"}
              className="casa-icone alvo-toque"
            >
              {mode === "vitrine" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/*
          Os eixos secundários, recolhidos: "que tipo de peça é?", "isso pesa no
          meu bundle?" e "quero ver a mídia ou o wireframe?". Uma linha de texto
          cada, com o nome do eixo no tom mais baixo.
        */}
        {abertos ? (
          <div className="shell space-y-1 pb-3">
            <div className="flex items-center gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="w-16 shrink-0 text-casa-sm text-casa-fg-3">Tipo</span>
              {(Object.keys(TYPE_LABEL) as CatalogItem["type"][])
                .filter((t) => countByTipo[t])
                .map((t) => (
                  <Aba
                    key={t}
                    ativa={tipo === t}
                    count={countByTipo[t]}
                    // Clicar de novo desfaz: o mesmo controle, ligado e desligado.
                    onClick={() => setTipo((atual) => (atual === t ? null : t))}
                  >
                    {TYPE_LABEL[t]}
                  </Aba>
                ))}
            </div>

            {depsDoEscopo.length ? (
              <div className="flex items-center gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="w-16 shrink-0 text-casa-sm text-casa-fg-3">Pacotes</span>
                {semDepsCount ? (
                  <Aba
                    ativa={dep === SEM_DEPS}
                    count={semDepsCount}
                    onClick={() => setDep((d) => (d === SEM_DEPS ? null : SEM_DEPS))}
                  >
                    Nenhum
                  </Aba>
                ) : null}
                {depsDoEscopo.map(({ info, count }) => (
                  <Aba
                    key={info.key}
                    ativa={dep === info.key}
                    count={count}
                    onClick={() => setDep((d) => (d === info.key ? null : info.key))}
                  >
                    <span className="flex items-center gap-1.5" title={info.packages.join(", ")}>
                      {info.icon ? <DepLogo icon={info.icon} className="h-3.5 w-3.5" /> : null}
                      {info.label}
                    </span>
                  </Aba>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-4">
              <span className="w-16 shrink-0 text-casa-sm text-casa-fg-3">Mídia</span>
              <WireframeToggle className="-ml-2" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="shell">
        {results.length ? (
          mode === "vitrine" ? (
            <div ref={listRef} style={{ overflowAnchor: "none" }}>
              {/*
                Uma grade de verdade, e nada de mosaico: com a moldura fixa do
                `PalcoFixo` não há altura diferente pra encaixar. `overflow-anchor:
                none` fica — ao filtrar, a âncora do Chrome desfazia a reposição
                logo depois de nós a fazermos.

                Só entra na grade quem tem palco. Hook, lib, tema e base não têm
                superfície: num ladrilho viravam um nome em código no meio de
                fotos, e liam como peça quebrada.
              */}
              {comPalco.length ? (
                <div
                  data-grade
                  style={{ gap: GRID_GAP }}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {comPalco.map((item, i) => (
                    <Ladrilho
                      key={item.name}
                      item={item}
                      index={i}
                      foto={!familia}
                      onOpen={() => onFocus(item.name)}
                    />
                  ))}
                </div>
              ) : null}

              {/* O que não tem superfície: uma lista de texto depois da grade.
                  Continua na busca e na fatia da família — só não finge ser
                  uma imagem. */}
              {semPalco.length ? (
                <section className="casa mt-16">
                  <h2 className="flex items-baseline gap-2 text-casa-lg font-medium">
                    Hooks, temas e utilitários
                    <span className="text-casa-sm tabular-nums text-casa-fg-3">{semPalco.length}</span>
                  </h2>
                  <div className="-mx-3 mt-3">
                    {semPalco.map((item, i) => (
                      <Row
                        key={item.name}
                        item={item}
                        index={comPalco.length + i}
                        onOpen={() => onFocus(item.name)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <div ref={listRef} style={{ overflowAnchor: "none" }} className="casa mt-4 -mx-3">
              {results.map((item, i) => (
                <Row key={item.name} item={item} index={i} onOpen={() => onFocus(item.name)} />
              ))}
            </div>
          )
        ) : (
          <div className="casa mt-20 text-center">
            <p className="text-casa-lg">Nada com esses filtros.</p>
            <button
              type="button"
              onClick={() => {
                setTipo(null);
                setDep(null);
              }}
              className="mt-3 rounded-control text-casa-base text-casa-fg-2 underline-offset-4 hover:text-casa-fg hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
