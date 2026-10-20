"use client";

/**
 * A casa do @visant/ui.
 *
 * Antes, a home era a bancada de áudio vintage — 13 dos 45 itens. Quem chegava
 * concluía que a library era um kit de knobs e ia reescrever o resto. Agora a
 * home é o catálogo inteiro, e a bancada virou uma das abas: continua sendo a
 * melhor demo do kit, só não é mais a fachada.
 *
 * O `BrandThemeProvider` fica na raiz de propósito: as três abas leem os mesmos
 * tokens, então trocar de marca no seletor repinta catálogo, studio e bancada
 * ao mesmo tempo. Se só o studio respondesse, a promessa seria demo, não sistema.
 *
 * **A URL é a fonte da verdade da navegação.** Aba e item em foco moram no
 * caminho, e o estado do React é derivado dele — não o contrário. É o que faz o
 * botão voltar do navegador funcionar de dentro da vista de foco e o que torna
 * `/c/kanban` um link que pode ser mandado no chat e abrir com prévia.
 */

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandThemeProvider } from "@/lib/brand-theme";
import { Solo, fundoDoSolo, propsDaQuery } from "./Solo";
import { Busca, BotaoDeBusca, useAtalhoDeBusca } from "./busca";
import { ComponentFocus } from "./ComponentFocus";
import { BrandSelector } from "../../registry/visant/ui/brand-selector";
import { SfxToggle } from "../../registry/visant/ui/sfx-toggle";
import { Conectar } from "./conectar";
import { useSfxWiring, SFX_DEFAULT_SELECTOR } from "@/lib/sfx-bus";
import { Gallery } from "./Gallery";
import { CATALOG, FAMILIA_ANTIGA, FAMILIES, type Family } from "./catalog";

/*
 * Studio e bancada chegam quando alguém abre a aba.
 *
 * Eram 620KB num arquivo só: quem entrava para ver o catálogo baixava também o
 * kit vintage inteiro (13 peças skeuomórficas, canvas de osciloscópio, lottie) e
 * o studio de marca, sem nunca abrir nenhum dos dois. O catálogo é a porta de
 * entrada de praticamente todo mundo; ele não pode pagar o pedágio das outras
 * duas seções.
 */
const BrandStudioBody = React.lazy(() =>
  import("./BrandStudio").then((m) => ({ default: m.BrandStudioBody })),
);
import { KitRoom } from "./KitRoom";
import { KITS } from "./kits";
import { DEFAULT_BRAND, REGISTRY_URL } from "./registry-meta";
import { VisantAuthProvider } from "./visant-auth";
import { MinhasMarcas } from "./MinhasMarcas";

type View = "kits" | "catalogo" | "marca";

interface Route {
  view: View;
  /** Item aberto em foco. Só existe no catálogo. */
  focus: string | null;
  /** Sala aberta. Só existe nos kits. */
  kit: string | null;
  /** Fatia do catálogo. `null` = o índice das seis categorias. */
  familia: Family | null;
}

/**
 * A aba `marca` e a família `marca` são coisas diferentes, e a URL diz qual.
 *
 * `/marca` é o Brand Studio — a seção que repinta a interface inteira. A família
 * `marca` do catálogo (logo, cover, brand-selector) mora em `/catalogo/marca`,
 * porque família é sempre segmento de dentro do catálogo. Não há colisão: a
 * primeira parte do caminho decide a seção, e a segunda só é lida quando a
 * primeira é `catalogo`. Dar à família um endereço de primeiro nível é que
 * criaria ambiguidade — e roubaria o endereço curto de uma seção inteira.
 */
const familiaDe = (parte: string | undefined): Family | null =>
  FAMILIES.find((f) => f.key === parte)?.key ?? (parte ? FAMILIA_ANTIGA[parte] : undefined) ?? null;

/**
 * Link direto de peça (`/c/kanban`) abre dentro da fatia dela.
 *
 * `/c/<item>` não carrega família no caminho, e sem esta linha a peça abriria
 * por cima do ÍNDICE de categorias: as setas não teriam lista para percorrer e
 * fechar devolveria a pessoa a uma página de capas, sem nenhuma relação com o
 * que ela veio ver. Com a família derivada do item, o link de chat entrega a
 * peça em cima da vizinhança dela — que é o contexto que faz o `add` acontecer.
 */
const familiaDaPeca = (nome: string | null): Family | null =>
  (nome ? CATALOG.find((i) => i.name === nome)?.family : null) ?? null;

/*
 * Kits primeiro, e não por ordem alfabética.
 *
 * A home era o catálogo: 65 peças soltas numa coluna, que é a organização do
 * repositório e não a da decisão de quem chega. Ninguém instala um `chip` — se
 * instala uma mesa de trabalho inteira. O catálogo continua a um clique, para
 * quem já sabe o nome do que quer.
 */
const VIEWS: { value: View; label: string }[] = [
  { value: "catalogo", label: "Catálogo" },
  { value: "kits", label: "Kits" },
  { value: "marca", label: "Marca" },
];

// --- rota --------------------------------------------------------------------

/*
 * Caminho de verdade, não hash.
 *
 * `#/c/kanban` funcionava para navegar e não servia para mais nada: servidor
 * nenhum vê o que vem depois do `#`, então não havia como entregar título,
 * descrição ou imagem por item — link colado no Slack aparecia como "Vintage UI
 * UX Library" para os 47 itens. Com `/c/kanban` o build gera um HTML por item
 * (`scripts/prerender.mjs`) e a página passa a existir para quem não é browser.
 *
 * O hash antigo continua entrando: quem tem link salvo é redirecionado.
 */
function parsePath(loc: Location): Route {
  if (loc.hash.startsWith("#/")) return parseLegacyHash(loc.hash);

  const partes = loc.pathname.split("/").filter(Boolean);
  if (partes[0] === "c" && partes[1]) {
    const focus = decodeURIComponent(partes[1]);
    return { view: "catalogo", focus, kit: null, familia: familiaDaPeca(focus) };
  }
  if (partes[0] === "kit" && partes[1]) {
    return { view: "kits", focus: null, kit: decodeURIComponent(partes[1]), familia: null };
  }
  /* `/rig` era a aba da bancada. Hoje a bancada é uma sala, e o link antigo
     entra nela em vez de dar 404 em quem tinha o endereço salvo. */
  if (partes[0] === "rig")
    return { view: "kits", focus: null, kit: "rig-vintage", familia: null };
  /* `/` é o catálogo. Os kits ficam em `/kits` enquanto não forem redesenhados:
     eram a porta de entrada e ainda não se explicam sozinhos. */
  const view = VIEWS.find((v) => v.value === partes[0]);
  /* A família só é lida sob `catalogo`: é o que mantém `/marca` (o estúdio)
     separado de `/catalogo/marca` (a fatia do catálogo). Nome de família que não
     existe cai no índice, em vez de mostrar uma fatia vazia. */
  const familia = view?.value === "catalogo" ? familiaDe(partes[1]) : null;
  return { view: view?.value ?? "catalogo", focus: null, kit: null, familia };
}

function parseLegacyHash(hash: string): Route {
  if (hash.startsWith("#/c/")) {
    const focus = decodeURIComponent(hash.slice(4)) || null;
    return { view: "catalogo", focus, kit: null, familia: familiaDaPeca(focus) };
  }
  if (hash.startsWith("#/rig"))
    return { view: "kits", focus: null, kit: "rig-vintage", familia: null };
  const view = VIEWS.find((v) => v.value !== "kits" && hash.startsWith(`#/${v.value}`));
  const familia =
    view?.value === "catalogo" ? familiaDe(hash.replace(/^#\//, "").split("/")[1]) : null;
  return { view: view?.value ?? "catalogo", focus: null, kit: null, familia };
}

function formatPath({ view, focus, kit, familia }: Route): string {
  if (focus) return `/c/${encodeURIComponent(focus)}`;
  if (view === "kits") return kit ? `/kit/${encodeURIComponent(kit)}` : "/kits";
  if (view === "catalogo") return familia ? `/catalogo/${familia}` : "/";
  return `/${view}`;
}

function useRoute() {
  const [route, setRoute] = React.useState<Route>(() => parsePath(window.location));

  // Link antigo com hash entra e sai limpo, sem entulhar o histórico.
  React.useEffect(() => {
    if (window.location.hash.startsWith("#/")) {
      window.history.replaceState(null, "", formatPath(parseLegacyHash(window.location.hash)));
    }
  }, []);

  // O navegador manda: voltar/avançar e link colado atualizam o estado.
  React.useEffect(() => {
    const sync = () => setRoute(parsePath(window.location));
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const navigate = React.useCallback((next: Route) => {
    const caminho = formatPath(next);
    if (window.location.pathname !== caminho) {
      // Cada passo vira entrada no histórico — é o que faz o botão voltar
      // significar "voltar pra grade" de dentro da vista de foco.
      window.history.pushState(null, "", caminho);
    }
    setRoute(next);
  }, []);

  return [route, navigate] as const;
}

/*
 * Escuro por padrão, e a escolha fica.
 *
 * A vitrine é de peça sobre fundo escuro — é onde componente de interface se lê
 * melhor e é a referência (Bench, Apple Developer). Quem prefere claro troca uma
 * vez; sem guardar, a casa voltava ao padrão a cada visita. A classe é aplicada
 * no `main.tsx` antes do primeiro quadro, então aqui só se lê e se grava.
 */
const CHAVE_TEMA = "visant:ui:tema";

function useDarkMode() {
  const [dark, setDark] = React.useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(CHAVE_TEMA, dark ? "escuro" : "claro");
    } catch {
      /* janela anônima: a escolha vale só pra esta visita */
    }
  }, [dark]);
  return [dark, setDark] as const;
}

// --- casca -------------------------------------------------------------------

function Shell() {
  const [route, navigate] = useRoute();
  const [dark, setDark] = useDarkMode();
  /*
   * O som da casa: só clique, nunca hover. Passar o ponteiro pela grade não é
   * agir, e sessenta cards estalando sob o mouse é o som que faz desligar.
   * Armado por padrão, mudo sob reduced-motion, e a escolha salva vence.
   */
  useSfxWiring(SFX_DEFAULT_SELECTOR, { hover: false });

  const setView = React.useCallback(
    // Clicar na aba "Catálogo" volta ao índice das categorias, nunca à última
    // fatia aberta: aba é começo de caminho, não retomada de estado.
    (view: View) => navigate({ view, focus: null, kit: null, familia: null }),
    [navigate],
  );
  /* Fechar o foco devolve à fatia de onde a peça foi aberta — se ela foi aberta
     por link direto (`/c/kanban`), não há fatia e o retorno é o índice. */
  const familiaAtual = route.familia;
  const setFocus = React.useCallback(
    (focus: string | null) =>
      navigate({ view: "catalogo", focus, kit: null, familia: familiaAtual }),
    [navigate, familiaAtual],
  );
  const setFamilia = React.useCallback(
    (familia: Family | null) => navigate({ view: "catalogo", focus: null, kit: null, familia }),
    [navigate],
  );
  const setKit = React.useCallback(
    (kit: string) => navigate({ view: "kits", focus: null, kit, familia: null }),
    [navigate],
  );

  /*
   * A busca abre em qualquer seção e entrega na ficha da peça.
   *
   * Ela não muda a fatia aberta atrás: quem estava na família "marca" e buscou
   * um item de "trabalho" volta pra "marca" ao fechar. A busca é um atalho pra
   * uma peça, não uma mudança de lugar.
   */
  /*
   * A vizinhança da peça em foco: a família dela, na ordem do catálogo.
   *
   * É o que dá sentido a `←`/`→` e ao contador "13/20" — e é derivado da peça,
   * então o mesmo endereço percorre a mesma lista pra qualquer pessoa.
   */
  const pecaEmFoco = React.useMemo(
    () => (route.focus ? (CATALOG.find((i) => i.name === route.focus) ?? null) : null),
    [route.focus],
  );
  const irmas = React.useMemo(
    () => (pecaEmFoco ? CATALOG.filter((i) => i.family === pecaEmFoco.family) : []),
    [pecaEmFoco],
  );
  const indiceEmFoco = pecaEmFoco ? irmas.findIndex((i) => i.name === pecaEmFoco.name) : 0;

  const andarNaFamilia = React.useCallback(
    (passo: number) => {
      if (!irmas.length) return;
      const alvo = irmas[(indiceEmFoco + passo + irmas.length) % irmas.length];
      setFocus(alvo.name);
    },
    [irmas, indiceEmFoco, setFocus],
  );

  const [buscando, setBuscando] = React.useState(false);
  const abrirBusca = React.useCallback(() => setBuscando(true), []);
  useAtalhoDeBusca(abrirBusca);
  const escolherNaBusca = React.useCallback(
    (name: string) => {
      setBuscando(false);
      setFocus(name);
    },
    [setFocus],
  );

  return (
    <div className="min-h-screen bg-casa-bg text-casa-fg">
      {/*
       * O cabeçalho da casa.
       *
       * Logo, as três seções, a busca, o tema, a marca e entrar — e nada mais.
       * Era o lugar de nove controles: densidade, dois segmentados, um seletor de
       * marca com cinco informações e uma tecla de atalho anunciada. Fundo sólido
       * e sem linha embaixo: o que separa o cabeçalho do resto é o próprio scroll.
       */}
      <header className="casa sticky top-0 z-40 bg-casa-bg">
        <div className="shell flex h-[var(--shell-header-h)] items-center gap-6">
          <button
            type="button"
            onClick={() => setView("catalogo")}
            className="flex shrink-0 items-center gap-2 rounded-control text-casa-base font-medium"
          >
            <span className="h-4 w-4 rounded-[5px] bg-casa-fg" aria-hidden />
            visant/ui
          </button>

          {/*
            As três portas, em texto: Catálogo primeiro (é a home), Kits (as
            telas montadas) e Marca (a prova do multi-marca). Kits e Marca
            saíram do menu e voltaram depois do audit de 2026-10-20.
          */}
          <Secoes view={route.view} onView={setView} className="hidden sm:flex" />

          <div className="ml-auto flex items-center gap-1.5">
            <BotaoDeBusca onClick={abrirBusca} />
            {/* O liga e desliga do som, no tom dos outros ícones da casa. */}
            {/* O catálogo no agente de IA de quem chegou: MCP do shadcn + @visant. */}
            <Conectar className="max-lg:!hidden" />
            <SfxToggle className={SOM_DA_CASA} />
            <button
              type="button"
              onClick={() => setDark(!dark)}
              aria-label={dark ? "Tema claro" : "Tema escuro"}
              className="casa-icone alvo-toque"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {/*
              O seletor do registry, em versão de cabeçalho: a marca e o nome.
              A fonte, a versão, as amostras e o atalho continuam lá dentro do
              diálogo, que é onde se escolhe; no gatilho eram ruído. O atalho
              segue valendo, só não é anunciado.
            */}
            <BrandSelector className={GATILHO_DE_MARCA} />
            <MinhasMarcas />
          </div>
        </div>
        {/* No celular as seções descem para uma segunda linha em vez de sumirem. */}
        <div className="shell pb-2 sm:hidden">
          <Secoes view={route.view} onView={setView} />
        </div>
      </header>

      {route.view === "kits" && (
        <KitRoom
          slug={route.kit ?? KITS[0].slug}
          onSlug={setKit}
          onFocus={setFocus}
        />
      )}

      {/*
       * A ficha é uma ROTA, não um estado por cima da grade.
       *
       * `/c/<item>` renderiza a ficha no lugar do catálogo, dentro da mesma
       * casca. Enquanto ela era um diálogo, a grade continuava montada atrás do
       * overlay: oitenta demos vivas gastando CPU embaixo de uma peça que ninguém
       * estava vendo.
       *
       * A lista que as setas percorrem é a FAMÍLIA da peça, e não o resultado do
       * filtro que estava na grade. Filtro é estado da outra página; herdá-lo
       * faria `→` levar a lugares diferentes dependendo de como a pessoa chegou,
       * e o mesmo endereço tem de significar a mesma coisa pra quem colou o link
       * no chat.
       */}
      {route.view === "catalogo" &&
        (route.focus && pecaEmFoco ? (
          <ComponentFocus
            key={pecaEmFoco.name}
            item={pecaEmFoco}
            index={indiceEmFoco}
            total={irmas.length}
            onClose={() => navigate({ view: "catalogo", focus: null, kit: null, familia: route.familia })}
            onPrev={() => andarNaFamilia(-1)}
            onNext={() => andarNaFamilia(1)}
          />
        ) : (
          <Gallery
            onFocus={setFocus}
            familia={route.familia}
            onFamilia={setFamilia}
            onBuscar={abrirBusca}
          />
        ))}

      {/* A espera é a altura de uma tela, não um "carregando…": trocar de aba não
          deve fazer a página encolher e voltar a crescer. */}
      <React.Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
        {route.view === "marca" && <BrandStudioBody />}
      </React.Suspense>

      <Busca aberto={buscando} onAberto={setBuscando} onEscolher={escolherNaBusca} />
    </div>
  );
}

/*
 * O gatilho do seletor de marca, enxuto por fora.
 *
 * O `BrandSelector` é peça publicada: clientes instalam aquele botão com nome,
 * fonte, versão, amostras e atalho, e está certo para um painel de produto. No
 * cabeçalho de uma vitrine ele era o controle mais barulhento da tela. Em vez de
 * editar a peça (o que mudaria o que o `add` entrega), a casa esconde por fora o
 * que não decide nada aqui: a linha de fonte e versão, as amostras e a tecla.
 */
// casa-lint/vidro: aqui o blur é DESLIGADO — a peça publicada traz o vidro de fábrica
/** O `SfxToggle` do registry vestido de ícone da casa: tom e raio da casca,
 *  nunca os da marca. As ondas recolhendo continuam dizendo o estado. Some
 *  abaixo de lg: no toque o bus não toca, e no tablet o cabeçalho não tem folga. */
const SOM_DA_CASA =
  "max-lg:!hidden size-8 rounded-control text-casa-fg-2 hover:border-transparent hover:bg-casa-tile hover:text-casa-fg data-[state=on]:text-casa-fg-2 focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]";

const GATILHO_DE_MARCA = [
  "h-8 gap-2 !rounded-control !border-0 !bg-transparent !py-0 !pl-1 !pr-2.5 !backdrop-blur-none",
  "hover:!bg-casa-tile hover:![box-shadow:none] active:!scale-100",
  "[&>span:first-child]:!h-5 [&>span:first-child]:!w-5 [&>span:first-child]:!rounded-[6px] [&>span:first-child]:!border-0",
  "[&>span:nth-child(2)>span:last-child]:hidden [&>span:nth-child(2)>span:first-child]:!text-casa-base [&>span:nth-child(2)>span:first-child]:!font-normal",
  "[&>span:nth-child(3)]:!hidden [&>kbd]:!hidden",
].join(" ");

/**
 * As portas da casa, em texto: a ativa em tom cheio, as outras no tom de
 * apoio. Sem fundo, sem borda, sem pílula.
 */
function Secoes({
  view,
  onView,
  className,
}: {
  view: View;
  onView: (v: View) => void;
  className?: string;
}) {
  return (
    <nav aria-label="Seção" className={cn("flex items-center gap-5", className)}>
      {VIEWS.map((v) => (
        <button
          key={v.value}
          type="button"
          onClick={() => onView(v.value)}
          aria-current={view === v.value ? "page" : undefined}
          className={cn(
            "rounded-control text-casa-base transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] focus-visible:[box-shadow:var(--focus)]",
            view === v.value ? "text-casa-fg" : "text-casa-fg-2 hover:text-casa-fg",
          )}
        >
          {v.label}
        </button>
      ))}
    </nav>
  );
}

/**
 * `?solo=1` corta a casca inteira: cabeçalho, abas, grade, tudo.
 *
 * É a rota que roda dentro do iframe do preset de viewport. Ela precisa do
 * `BrandThemeProvider` (a peça lê `--brand`) e de nada mais — e a marca e o tema
 * chegam por query, porque iframe é outro documento e não herda o que o pai
 * aplicou no `<html>` dele.
 */
function useSolo() {
  const [solo, setSolo] = React.useState(() => new URLSearchParams(window.location.search));
  React.useEffect(() => {
    const sync = () => setSolo(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return solo;
}

function Raiz() {
  const params = useSolo();
  const ehSolo = params.get("solo") === "1";

  React.useEffect(() => {
    if (ehSolo) document.documentElement.classList.toggle("dark", params.get("dark") === "1");
  }, [ehSolo, params]);

  if (ehSolo) {
    const nome = decodeURIComponent(window.location.pathname.split("/").filter(Boolean)[1] ?? "");
    const fundo = fundoDoSolo(params);
    if (params.get("caixa") === "1") {
      // A captura no enquadramento do palco: sem fundo nenhum, nem o da casa.
      document.documentElement.style.background = "transparent";
      document.body.style.background = "transparent";
      return (
        <div className="palco" style={{ background: "transparent" }}>
          <Solo name={nome} props={propsDaQuery(params)} caixa />
        </div>
      );
    }
    return (
      <div
        className={fundo ? "text-foreground" : "bg-background text-foreground"}
        style={{ fontFamily: "var(--font-sans, ui-sans-serif, system-ui)", background: fundo }}
      >
        <Solo name={nome} props={propsDaQuery(params)} />
      </div>
    );
  }

  return <Shell />;
}

export default function App() {
  const marca = new URLSearchParams(window.location.search).get("brand");

  return (
    <VisantAuthProvider>
      <BrandThemeProvider registryUrl={REGISTRY_URL} defaultBrand={marca || DEFAULT_BRAND}>
        <Raiz />
      </BrandThemeProvider>
    </VisantAuthProvider>
  );
}
