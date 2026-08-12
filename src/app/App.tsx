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
import { Moon, Sun, Rows3, Rows4 } from "lucide-react";
import { BrandThemeProvider } from "@/lib/brand-theme";
import { Solo, fundoDoSolo } from "./Solo";
import { BrandSelector } from "../../registry/visant/ui/brand-selector";
import { SegmentedControl } from "../../registry/visant/ui/segmented-control";
import { Gallery } from "./Gallery";

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
}

/*
 * Kits primeiro, e não por ordem alfabética.
 *
 * A home era o catálogo: 65 peças soltas numa coluna, que é a organização do
 * repositório e não a da decisão de quem chega. Ninguém instala um `chip` — se
 * instala uma mesa de trabalho inteira. O catálogo continua a um clique, para
 * quem já sabe o nome do que quer.
 */
const VIEWS: { value: View; label: string; short: string }[] = [
  { value: "kits", label: "Kits", short: "Kits" },
  { value: "catalogo", label: "Catálogo", short: "Catálogo" },
  { value: "marca", label: "Marca", short: "Marca" },
];

const DENSITIES = [
  { value: "comfortable" as const, icon: Rows3, ariaLabel: "Densidade confortável" },
  { value: "compact" as const, icon: Rows4, ariaLabel: "Densidade compacta" },
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
    return { view: "catalogo", focus: decodeURIComponent(partes[1]), kit: null };
  }
  if (partes[0] === "kit" && partes[1]) {
    return { view: "kits", focus: null, kit: decodeURIComponent(partes[1]) };
  }
  /* `/rig` era a aba da bancada. Hoje a bancada é uma sala, e o link antigo
     entra nela em vez de dar 404 em quem tinha o endereço salvo. */
  if (partes[0] === "rig") return { view: "kits", focus: null, kit: "rig-vintage" };
  const view = VIEWS.find((v) => v.value === partes[0]);
  return { view: view?.value ?? "kits", focus: null, kit: null };
}

function parseLegacyHash(hash: string): Route {
  if (hash.startsWith("#/c/")) {
    return { view: "catalogo", focus: decodeURIComponent(hash.slice(4)) || null, kit: null };
  }
  if (hash.startsWith("#/rig")) return { view: "kits", focus: null, kit: "rig-vintage" };
  const view = VIEWS.find((v) => v.value !== "kits" && hash.startsWith(`#/${v.value}`));
  return { view: view?.value ?? "kits", focus: null, kit: null };
}

function formatPath({ view, focus, kit }: Route): string {
  if (focus) return `/c/${encodeURIComponent(focus)}`;
  if (view === "kits") return kit ? `/kit/${encodeURIComponent(kit)}` : "/";
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

function useDarkMode() {
  const [dark, setDark] = React.useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return [dark, setDark] as const;
}

// --- casca -------------------------------------------------------------------

function Shell() {
  const [route, navigate] = useRoute();
  const [dark, setDark] = useDarkMode();
  const [density, setDensity] = React.useState<"comfortable" | "compact">("comfortable");

  React.useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const setView = React.useCallback(
    (view: View) => navigate({ view, focus: null, kit: null }),
    [navigate],
  );
  const setFocus = React.useCallback(
    (focus: string | null) => navigate({ view: "catalogo", focus, kit: null }),
    [navigate],
  );
  const setKit = React.useCallback(
    (kit: string) => navigate({ view: "kits", focus: null, kit }),
    [navigate],
  );

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "var(--font-sans, ui-sans-serif, system-ui)" }}
    >
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="shell flex h-[var(--shell-header-h)] items-center gap-3">
          <button
            type="button"
            onClick={() => setView("catalogo")}
            className="flex items-center gap-2"
          >
            <span
              className="h-5 w-5 rounded-[6px]"
              style={{ background: "var(--brand, var(--foreground))" }}
            />
            <span className="font-mono text-apoio tracking-tight">@visant/ui</span>
          </button>

          <div className="ml-2 hidden sm:block">
            <SegmentedControl
              value={route.view}
              onChange={setView}
              aria-label="Seção"
              options={VIEWS.map(({ value, label }) => ({ value, label }))}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* A densidade sai no celular: lá a grade é de uma coluna, onde
                densidade quase não muda nada — e o espaço que ela ocupava é o
                que faltava para o botão de entrar caber sem estourar a linha. */}
            <div className="hidden sm:block">
              <SegmentedControl
                value={density}
                onChange={setDensity}
                variant="compact"
                aria-label="Densidade"
                options={DENSITIES}
              />
            </div>
            <button
              type="button"
              onClick={() => setDark(!dark)}
              aria-label={dark ? "Tema claro" : "Tema escuro"}
              className="alvo-toque grid h-8 w-8 place-items-center rounded-[var(--r-control,0.5rem)] border border-border text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:text-foreground"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <BrandSelector />
            <MinhasMarcas />
          </div>
        </div>

        {/* no celular as abas descem para uma segunda linha em vez de sumirem */}
        <div className="shell pb-2 sm:hidden">
          <SegmentedControl
            value={route.view}
            onChange={setView}
            aria-label="Seção"
            options={VIEWS.map(({ value, short }) => ({ value, label: short }))}
          />
        </div>
      </header>

      {route.view === "kits" && (
        <KitRoom
          slug={route.kit ?? KITS[0].slug}
          onSlug={setKit}
          onFocus={setFocus}
          onCatalogo={() => setView("catalogo")}
        />
      )}

      {route.view === "catalogo" && <Gallery focus={route.focus} onFocus={setFocus} />}

      {/* A espera é a altura de uma tela, não um "carregando…": trocar de aba não
          deve fazer a página encolher e voltar a crescer. */}
      <React.Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
        {route.view === "marca" && <BrandStudioBody />}
      </React.Suspense>
    </div>
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
    return (
      <div
        className={fundo ? "text-foreground" : "bg-background text-foreground"}
        style={{ fontFamily: "var(--font-sans, ui-sans-serif, system-ui)", background: fundo }}
      >
        <Solo name={nome} />
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
