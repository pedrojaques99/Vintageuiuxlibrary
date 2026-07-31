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
 * **A URL é a fonte da verdade da navegação.** Aba e item em foco moram no hash,
 * e o estado do React é derivado dele — não o contrário. É o que faz o botão
 * voltar do navegador funcionar de dentro da vista de foco e o que torna
 * `#/c/kanban` um link que pode ser mandado no chat.
 */

import * as React from "react";
import { Moon, Sun, Rows3, Rows4 } from "lucide-react";
import { BrandThemeProvider } from "@/lib/brand-theme";
import { BrandSelector } from "../../registry/visant/ui/brand-selector";
import { SegmentedControl } from "../../registry/visant/ui/segmented-control";
import { Gallery } from "./Gallery";
import { BrandStudioBody } from "./BrandStudio";
import VintageRig from "./VintageRig";
import { DEFAULT_BRAND, REGISTRY_URL } from "./registry-meta";

type View = "catalogo" | "marca" | "rig";

interface Route {
  view: View;
  /** Item aberto em foco. Só existe no catálogo. */
  focus: string | null;
}

const VIEWS: { value: View; label: string; short: string }[] = [
  { value: "catalogo", label: "Catálogo", short: "Catálogo" },
  { value: "marca", label: "Marca", short: "Marca" },
  { value: "rig", label: "Rig vintage", short: "Rig" },
];

const DENSITIES = [
  { value: "comfortable" as const, icon: Rows3, ariaLabel: "Densidade confortável" },
  { value: "compact" as const, icon: Rows4, ariaLabel: "Densidade compacta" },
];

// --- rota --------------------------------------------------------------------

function parseHash(hash: string): Route {
  if (hash.startsWith("#/c/")) {
    return { view: "catalogo", focus: decodeURIComponent(hash.slice(4)) || null };
  }
  const view = VIEWS.find((v) => v.value !== "catalogo" && hash.startsWith(`#/${v.value}`));
  return { view: view?.value ?? "catalogo", focus: null };
}

function formatHash({ view, focus }: Route): string {
  if (focus) return `#/c/${encodeURIComponent(focus)}`;
  return view === "catalogo" ? "" : `#/${view}`;
}

function useHashRoute() {
  const [route, setRoute] = React.useState<Route>(() => parseHash(window.location.hash));

  // O navegador manda: voltar/avançar e link colado atualizam o estado.
  React.useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  /*
   * `pushState`, e não `location.hash = …`.
   *
   * Fechar o foco a partir de `#/c/kanban` precisa voltar para a URL *sem* hash;
   * atribuir string vazia ao `location.hash` deixa um `#` pendurado e nem sempre
   * dispara o evento. Com `pushState` a URL fica limpa, cada passo entra no
   * histórico (é o que faz o botão voltar significar "voltar pra grade") e o
   * estado é atualizado na hora, sem depender do round-trip do evento.
   */
  const navigate = React.useCallback((next: Route) => {
    const hash = formatHash(next);
    if ((window.location.hash || "") !== hash) {
      window.history.pushState(null, "", hash || window.location.pathname + window.location.search);
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
  const [route, navigate] = useHashRoute();
  const [dark, setDark] = useDarkMode();
  const [density, setDensity] = React.useState<"comfortable" | "compact">("comfortable");

  React.useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const setView = React.useCallback(
    (view: View) => navigate({ view, focus: null }),
    [navigate],
  );
  const setFocus = React.useCallback(
    (focus: string | null) => navigate({ view: "catalogo", focus }),
    [navigate],
  );

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "var(--font-sans, ui-sans-serif, system-ui)" }}
    >
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="shell flex h-[var(--header-h)] items-center gap-3">
          <button
            type="button"
            onClick={() => setView("catalogo")}
            className="flex items-center gap-2"
          >
            <span
              className="h-5 w-5 rounded-[6px]"
              style={{ background: "var(--brand, var(--foreground))" }}
            />
            <span className="font-mono text-[12px] tracking-tight">@visant/ui</span>
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
            <SegmentedControl
              value={density}
              onChange={setDensity}
              variant="compact"
              aria-label="Densidade"
              options={DENSITIES}
            />
            <button
              type="button"
              onClick={() => setDark(!dark)}
              aria-label={dark ? "Tema claro" : "Tema escuro"}
              className="grid h-8 w-8 place-items-center rounded-[var(--r-control,0.5rem)] border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <BrandSelector />
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

      {route.view === "catalogo" && <Gallery focus={route.focus} onFocus={setFocus} />}
      {route.view === "marca" && <BrandStudioBody />}
      {route.view === "rig" && <VintageRig />}
    </div>
  );
}

export default function App() {
  return (
    <BrandThemeProvider registryUrl={REGISTRY_URL} defaultBrand={DEFAULT_BRAND}>
      <Shell />
    </BrandThemeProvider>
  );
}
