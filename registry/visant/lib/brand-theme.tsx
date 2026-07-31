"use client";

/**
 * Runtime de marca — cola entre o vault de brand guidelines do Visant Labs e os
 * tokens CSS que os componentes já leem.
 *
 * A ideia inteira do registry é que nenhum componente saiba a cor da marca: ele
 * lê `var(--brand)`, `var(--card)`, `var(--font-display)`. Um tema instalado por
 * `npx shadcn add @visant/theme-kastrup` escreve esses tokens no `globals.css`
 * em tempo de build. Este arquivo faz a MESMA coisa em tempo de execução, para
 * o caso em que a marca só se decide com o app no ar: showroom, preview de
 * proposta, um app multi-cliente.
 *
 * O que ele NÃO faz: derivar cor. A derivação (rampa neutra, contraste AA
 * garantido, tipo por papel) acontece no `@visant/brand-tokens` e chega aqui já
 * compilada em `/r/theme-<slug>.json`. Um mesmo item serve os dois caminhos —
 * é o mesmo JSON que o shadcn instala.
 */

import * as React from "react";

// --- tipos (espelham public/r/brands.json e os registry-items de tema) -------

export interface BrandPaletteEntry {
  hex: string;
  name: string | null;
  role: string | null;
}

export interface BrandSummary {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo: { url: string; thumbnailUrl: string; variant: string | null } | null;
  palette: BrandPaletteEntry[];
  fonts: { display: string; sans: string };
  /** Amostra dos tokens compilados — pinta o card sem baixar o tema inteiro. */
  preview: { light: Record<string, string>; dark: Record<string, string> };
  theme: string;
  themeUrl: string;
  version: number | null;
  completeness: number | null;
  updatedAt: string | null;
}

export interface BrandIndex {
  generatedAt: string;
  source: string;
  count: number;
  brands: BrandSummary[];
}

export interface BrandThemeItem {
  name: string;
  title?: string;
  cssVars: {
    theme?: Record<string, string>;
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
  css?: Record<string, Record<string, string>>;
  meta?: Record<string, unknown>;
}

export const VISANT_REGISTRY_URL = "https://visant-ui.vercel.app/r";

// --- CSS ---------------------------------------------------------------------

const STYLE_ID = "visant-brand-theme";

/**
 * Item de tema → texto CSS.
 *
 * Um `<style>` único, e não `style.setProperty` no root: o item separa `light`
 * de `dark`, e escrever inline no elemento achataria os dois num só. Com uma
 * folha de estilo, alternar tema continua sendo trocar a classe `.dark`, igual
 * ao que o shadcn instala — o runtime não inventa um segundo mecanismo.
 *
 * Especificidade: `:root:not(.dark)` empata com `.dark` em peso, então a ordem
 * no arquivo decide, e as regras da marca vêm depois das do projeto por estarem
 * num `<style>` injetado no fim do `<head>`.
 */
export function brandThemeCss(item: BrandThemeItem): string {
  const block = (sel: string, vars?: Record<string, string>) => {
    if (!vars || !Object.keys(vars).length) return "";
    const body = Object.entries(vars)
      .map(([k, v]) => `  --${k}: ${v};`)
      .join("\n");
    return `${sel} {\n${body}\n}\n`;
  };

  // `:root:root` em vez de `:root` — peso 0,2,0 contra 0,1,0. Empatar em
  // especificidade com o `globals.css` do projeto deixaria a decisão para a
  // ORDEM das folhas, e em dev o HMR reinjeta a folha do projeto depois desta:
  // a marca aplicaria e desaplicaria conforme se salva um arquivo qualquer.
  let css = "";
  css += block(":root:root", item.cssVars.theme);
  css += block(":root:root, :root:root.light", item.cssVars.light);
  css += block(":root:root.dark", item.cssVars.dark);

  // Blocos livres do item (ex.: `[data-density="compact"]`).
  for (const [sel, vars] of Object.entries(item.css ?? {})) {
    const body = Object.entries(vars)
      .map(([k, v]) => `  ${k.startsWith("--") ? k : `--${k}`}: ${v};`)
      .join("\n");
    css += `${sel} {\n${body}\n}\n`;
  }
  return css;
}

/** Escreve (ou substitui) a folha da marca e marca o `<html>` com o slug. */
export function applyBrandTheme(item: BrandThemeItem, slug?: string): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = brandThemeCss(item);
  document.documentElement.dataset.brand = slug ?? item.name.replace(/^theme-/, "");
}

export function clearBrandTheme(): void {
  document.getElementById(STYLE_ID)?.remove();
  delete document.documentElement.dataset.brand;
}

/**
 * Troca de marca com View Transition quando o browser tem, direto quando não.
 *
 * A transição é o que faz a troca parecer uma decisão e não um flash. Respeita
 * `prefers-reduced-motion` — para quem pediu menos movimento, o corte seco é a
 * resposta certa, não uma versão mais lenta.
 */
export function applyBrandThemeAnimated(item: BrandThemeItem, slug?: string): void {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const start = (document as any).startViewTransition?.bind(document);
  if (reduced || !start) {
    applyBrandTheme(item, slug);
    return;
  }
  start(() => applyBrandTheme(item, slug));
}

// --- fontes ------------------------------------------------------------------

const loadedFonts = new Set<string>();

/**
 * Carrega as faces da marca pelo Google Fonts.
 *
 * Best-effort por natureza: parte do acervo das marcas é licenciada fora do
 * Google (Termina, Clash Grotesk, Helvetica Now). Quando a face não existe lá,
 * o link 404 e a pilha de fallback do token assume — a UI continua correta, só
 * não fica na face exata. Um `@font-face` próprio do projeto, se existir, ganha
 * de qualquer jeito por já estar declarado.
 */
export function loadBrandFonts(families: string[]): void {
  if (typeof document === "undefined") return;
  for (const family of families) {
    const clean = family?.trim();
    if (!clean || loadedFonts.has(clean)) continue;
    loadedFonts.add(clean);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      clean,
    ).replace(/%20/g, "+")}:wght@300;400;500;600;700&display=swap`;
    link.dataset.visantFont = clean;
    document.head.appendChild(link);
  }
}

// --- fetch -------------------------------------------------------------------

const themeCache = new Map<string, BrandThemeItem>();

export async function fetchBrandIndex(registryUrl = VISANT_REGISTRY_URL): Promise<BrandIndex> {
  const res = await fetch(`${registryUrl}/brands.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`brands.json → HTTP ${res.status}`);
  return res.json();
}

export async function fetchBrandTheme(
  themeName: string,
  registryUrl = VISANT_REGISTRY_URL,
): Promise<BrandThemeItem> {
  const key = `${registryUrl}/${themeName}`;
  const hit = themeCache.get(key);
  if (hit) return hit;
  const res = await fetch(`${key}.json`);
  if (!res.ok) throw new Error(`${themeName} → HTTP ${res.status}`);
  const item = (await res.json()) as BrandThemeItem;
  themeCache.set(key, item);
  return item;
}

// --- React -------------------------------------------------------------------

export interface BrandThemeContextValue {
  brands: BrandSummary[];
  /** Marca efetivada (a que persiste). */
  brand: BrandSummary | null;
  /** Marca sendo espiada — `brand` quando não há preview em curso. */
  active: BrandSummary | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  setBrand: (slug: string | null) => Promise<void>;
  /** Aplica sem persistir; `null` volta para a efetivada. */
  previewBrand: (slug: string | null) => void;
  refresh: () => Promise<void>;
}

const BrandThemeContext = React.createContext<BrandThemeContextValue | null>(null);

export interface BrandThemeProviderProps {
  children: React.ReactNode;
  /** Base do registry. Em dev, `/r` serve os JSONs deste repo. */
  registryUrl?: string;
  /** Slug aplicado no primeiro carregamento se nada estiver salvo. */
  defaultBrand?: string;
  storageKey?: string;
}

export function BrandThemeProvider({
  children,
  registryUrl = VISANT_REGISTRY_URL,
  defaultBrand,
  storageKey = "visant-brand",
}: BrandThemeProviderProps) {
  const [brands, setBrands] = React.useState<BrandSummary[]>([]);
  const [slug, setSlug] = React.useState<string | null>(null);
  const [previewSlug, setPreviewSlug] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<BrandThemeContextValue["status"]>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const byId = React.useMemo(
    () => new Map(brands.map((b) => [b.slug, b])),
    [brands],
  );

  const apply = React.useCallback(
    async (target: BrandSummary, animated: boolean) => {
      const item = await fetchBrandTheme(target.theme, registryUrl);
      loadBrandFonts([target.fonts.display, target.fonts.sans]);
      if (animated) applyBrandThemeAnimated(item, target.slug);
      else applyBrandTheme(item, target.slug);
    },
    [registryUrl],
  );

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const index = await fetchBrandIndex(registryUrl);
      setBrands(index.brands);
      setStatus("ready");
      setError(null);

      const saved =
        typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
      const initial = index.brands.find((b) => b.slug === (saved ?? defaultBrand));
      if (initial) {
        setSlug(initial.slug);
        await apply(initial, false);
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [registryUrl, storageKey, defaultBrand, apply]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const setBrand = React.useCallback(
    async (next: string | null) => {
      setPreviewSlug(null);
      if (!next) {
        setSlug(null);
        clearBrandTheme();
        localStorage.removeItem(storageKey);
        return;
      }
      const target = byId.get(next);
      if (!target) return;
      setSlug(next);
      localStorage.setItem(storageKey, next);
      await apply(target, true);
    },
    [byId, apply, storageKey],
  );

  /*
   * Preview otimista: pinta assim que o tema estiver em cache e ignora a
   * resposta se o ponteiro já saiu da linha. Sem essa guarda, passar rápido por
   * dez marcas deixa a última resposta lenta pintando a tela depois de o mouse
   * ter ido embora — a UI "escolhe sozinha".
   */
  const previewRef = React.useRef<string | null>(null);
  const previewBrand = React.useCallback(
    (next: string | null) => {
      previewRef.current = next;
      setPreviewSlug(next);
      const target = next ? byId.get(next) : slug ? byId.get(slug) : null;
      if (!target) {
        if (!next && !slug) clearBrandTheme();
        return;
      }
      void fetchBrandTheme(target.theme, registryUrl)
        .then((item) => {
          if (previewRef.current !== next) return;
          loadBrandFonts([target.fonts.display, target.fonts.sans]);
          applyBrandTheme(item, target.slug);
        })
        .catch(() => {});
    },
    [byId, slug, registryUrl],
  );

  const value: BrandThemeContextValue = {
    brands,
    brand: slug ? byId.get(slug) ?? null : null,
    active: (previewSlug ? byId.get(previewSlug) : null) ?? (slug ? byId.get(slug) ?? null : null),
    status,
    error,
    setBrand,
    previewBrand,
    refresh: load,
  };

  return <BrandThemeContext.Provider value={value}>{children}</BrandThemeContext.Provider>;
}

export function useBrandTheme(): BrandThemeContextValue {
  const ctx = React.useContext(BrandThemeContext);
  if (!ctx) throw new Error("useBrandTheme precisa de <BrandThemeProvider>");
  return ctx;
}
