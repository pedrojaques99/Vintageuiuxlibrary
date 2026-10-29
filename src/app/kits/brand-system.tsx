"use client";

/**
 * Brand system: o kit montado como o portal de marca de um time.
 *
 * O dono pediu "troque por brand system e redesenhe pra ficar mais pica e
 * coerente". A versão anterior era uma tela de configurações com seis seções do
 * mesmo peso, e a marca aparecia como dado de formulário. Aqui ela aparece como
 * SISTEMA, do jeito que um brand book mostra: a capa na cor da marca, a cor com
 * contraste medido, a tipografia em escala, a forma, o movimento e os
 * componentes repintando ao vivo. Trocar a marca no seletor repinta o portal
 * inteiro sem recarregar, que é a prova do kit.
 *
 * Nada aqui é escrito à mão: os valores saem da folha aplicada
 * (`getComputedStyle`), a cor vira sRGB pelo `css-color` e o contraste é
 * calculado. Se o provider quebrar, o portal mostra o que a página tem de fato.
 * Quem quer o nome da peça passa o mouse.
 */

import * as React from "react";
import { Search } from "lucide-react";

import { useBrandTheme } from "../../../registry/visant/lib/brand-theme";
import { resolveCssColor, onThemeChange, type RGB } from "../../../registry/visant/lib/css-color";
import { BrandSelector } from "../../../registry/visant/ui/brand-selector";
import { SfxToggle } from "../../../registry/visant/ui/sfx-toggle";
import { EmptyState } from "../../../registry/visant/ui/empty-state";
import { CoverArt } from "../../../registry/visant/ui/cover-art";
import { Chip } from "../../../registry/visant/ui/chip";
import { SegmentedControl } from "../../../registry/visant/ui/segmented-control";
import { CtaSurface, CtaAction } from "../../../registry/visant/ui/cta-surface";
import { SideNav, SideNavGroup, SideNavItem } from "../../../registry/visant/ui/side-nav";
import { useMediaQuery } from "../../../registry/visant/hooks/use-media-query";
import { useLocalSearch } from "../../../registry/visant/hooks/use-local-search";
import { CATALOG } from "../catalog";
import { cn } from "@/lib/utils";
import { Janela, Pecas } from "./sala";

/* -------------------------------------------------------------------------- */
/* leitura                                                                     */
/* -------------------------------------------------------------------------- */

const CORES = [
  { css: "--background", nome: "Fundo" },
  { css: "--foreground", nome: "Texto" },
  { css: "--card", nome: "Superfície" },
  { css: "--muted", nome: "Apoio" },
  { css: "--border", nome: "Linha" },
];

const LIDOS = [
  "--brand",
  "--brand-foreground",
  ...CORES.map((c) => c.css),
  "--font-sans",
  "--font-display",
  "--font-mono",
  "--r-control",
  "--r-surface",
  "--r-pill",
  "--dur-fast",
  "--dur-base",
  "--dur-slow",
];

/** Luminância relativa da WCAG a partir de sRGB 0..1. */
function luminancia([r, g, b]: RGB) {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contraste(a: RGB, b: RGB) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const UMA_CASA = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** Lê os tokens da folha aplicada e os contrastes, e relê quando o tema muda. */
function useSistema() {
  const [v, setV] = React.useState<Record<string, string>>({});
  const [pares, setPares] = React.useState<{ texto: number; marca: number; sobreMarca: number } | null>(
    null,
  );

  React.useEffect(() => {
    const ler = () => {
      const cs = getComputedStyle(document.documentElement);
      const lidos: Record<string, string> = {};
      for (const t of LIDOS) lidos[t] = cs.getPropertyValue(t).trim();
      setV((antes) => (LIDOS.every((k) => antes[k] === lidos[k]) ? antes : lidos));
      const fundo = resolveCssColor("var(--background)");
      setPares({
        texto: contraste(resolveCssColor("var(--foreground)"), fundo),
        marca: contraste(resolveCssColor("var(--brand)"), fundo),
        sobreMarca: contraste(resolveCssColor("var(--brand-foreground)"), resolveCssColor("var(--brand)")),
      });
    };
    // Dois quadros: o valor computado só vale depois de o estilo assentar.
    const id = requestAnimationFrame(() => requestAnimationFrame(ler));
    const sair = onThemeChange(ler);
    return () => {
      cancelAnimationFrame(id);
      sair();
    };
  }, []);

  return { v, pares };
}

const fonte = (v?: string) => (v ? v.split(",")[0].replace(/['"]/g, "").trim() : "a do sistema");

/* -------------------------------------------------------------------------- */
/* pedaços                                                                     */
/* -------------------------------------------------------------------------- */

const SECOES = [
  { id: "bs-cor", rotulo: "Cor" },
  { id: "bs-tipo", rotulo: "Tipografia" },
  { id: "bs-forma", rotulo: "Forma e movimento" },
  { id: "bs-componentes", rotulo: "Componentes" },
];

function Secao({
  id,
  numero,
  titulo,
  children,
}: {
  id: string;
  numero: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 border-t border-border px-5 py-10 sm:px-8 sm:py-12">
      <div className="mb-7 flex items-baseline gap-3">
        <span className="font-mono text-micro tabular-nums text-muted-foreground">{numero}</span>
        <h3 className="text-titulo font-semibold tracking-[-0.02em]" style={{ fontFamily: "var(--font-display, inherit)" }}>
          {titulo}
        </h3>
      </div>
      {children}
    </section>
  );
}

function Selo({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-[var(--r-pill,9999px)] border px-2 py-px font-mono text-micro",
        ok ? "border-[var(--brand)] text-foreground" : "border-border text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function Busca() {
  const [q, setQ] = React.useState("");
  const achados = useLocalSearch(CATALOG, {
    fields: (i) => [i.name, i.title, i.description, ...i.tags],
    query: q,
  });
  return (
    <div className="relative w-full max-w-[17rem]">
      <label className="flex items-center gap-2 rounded-[var(--r-control,0.5rem)] border border-border bg-background px-2.5 py-1.5 transition-[border-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] focus-within:border-[var(--brand)]">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar no sistema"
          aria-label="Buscar componentes do sistema"
          className="min-w-0 flex-1 bg-transparent text-apoio outline-none placeholder:text-muted-foreground"
        />
      </label>
      {q.trim() ? (
        <ul className="absolute inset-x-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-[var(--r-control,0.5rem)] border border-border bg-card p-1 [box-shadow:var(--e-overlay,0_12px_32px_color-mix(in_oklab,var(--foreground)_18%,transparent))]">
          {achados.length === 0 ? (
            <li className="px-2 py-2 text-apoio text-muted-foreground">Nada com esse nome.</li>
          ) : (
            achados.slice(0, 7).map((i) => (
              <li key={i.name} className="flex min-w-0 items-baseline gap-2 rounded-[var(--r-control,0.5rem)] px-2 py-1.5">
                <span className="truncate text-apoio">{i.title}</span>
                <span className="ml-auto truncate font-mono text-micro text-muted-foreground">{i.name}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* a tela                                                                      */
/* -------------------------------------------------------------------------- */

export default function BrandSystem() {
  const { active, status } = useBrandTheme();
  const { v, pares } = useSistema();
  const [secao, setSecao] = React.useState(SECOES[0].id);
  const [densidade, setDensidade] = React.useState<"conforto" | "compacto">("conforto");
  const menosMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const nome = active?.name ?? "Marca padrão";
  const slug = active?.slug ?? "padrao";
  const paleta = (active?.palette ?? []).slice(0, 6);

  return (
    <Janela endereco={`marca.app/${slug}/sistema`}>
      {/* barra do portal */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 sm:px-6">
        <span className="flex min-w-0 items-center gap-2 text-apoio">
          <span className="size-3 shrink-0 rounded-full bg-[var(--brand)]" aria-hidden="true" />
          <span className="truncate font-medium">{nome}</span>
          <span className="hidden text-muted-foreground sm:inline">/ Brand system</span>
        </span>
        <span className="ml-auto flex w-full items-center gap-2 sm:w-auto">
          <Pecas nomes={["use-local-search"]} canto="base-fim" className="min-w-0 flex-1 sm:flex-none">
            <Busca />
          </Pecas>
          <Pecas nomes={["brand-selector", "brand-theme"]} canto="base-fim">
            <BrandSelector shortcut={null} />
          </Pecas>
        </span>
      </div>

      <div className="flex">
        <Pecas nomes={["side-nav"]} className="hidden shrink-0 lg:block">
          <SideNav
            storageKey={false}
            shortcut={false}
            toggle={false}
            width={11.5}
            label="Seções do sistema"
            className="sticky top-0 h-auto min-h-full"
          >
            <SideNavGroup label="Sistema">
              {SECOES.map((s) => (
                <SideNavItem
                  key={s.id}
                  href={`#${s.id}`}
                  active={secao === s.id}
                  onClick={(e) => {
                    e.preventDefault();
                    setSecao(s.id);
                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {s.rotulo}
                </SideNavItem>
              ))}
            </SideNavGroup>
          </SideNav>
        </Pecas>

        <main className="min-w-0 flex-1">
          {/* capa: a marca na cor dela */}
          <Pecas nomes={["brand-theme", "cover-art"]} canto="topo-fim">
            <div className="grid gap-8 bg-[var(--brand)] px-5 py-10 text-[var(--brand-foreground)] sm:px-8 sm:py-14 md:grid-cols-[1fr_auto] md:items-end">
              <div className="min-w-0">
                <p className="font-mono text-micro opacity-75">
                  Sistema de marca{active?.version ? ` · versão ${active.version}` : ""}
                  {status === "loading" ? " · carregando" : ""}
                </p>
                <h2
                  className="mt-3 text-[clamp(2.6rem,7vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.04em] [overflow-wrap:anywhere]"
                  style={{ fontFamily: "var(--font-display, inherit)" }}
                >
                  {nome}
                </h2>
                <p className="mt-4 max-w-md text-corpo leading-relaxed opacity-85">
                  {active?.tagline ?? "Cor, tipo, forma e movimento num lugar só, e cada tela do produto lendo daqui."}
                </p>
              </div>
              <div className="flex gap-3" aria-hidden="true">
                {(["book", "app", "plate"] as const).map((f, i) => (
                  <div
                    key={f}
                    className={cn(
                      "relative aspect-[3/4] w-[5.5rem] overflow-hidden rounded-[var(--r-control,0.5rem)] sm:w-28",
                      i === 1 && "-translate-y-3",
                    )}
                  >
                    <CoverArt title={nome} seed={`${slug}-${f}`} family={f} />
                  </div>
                ))}
              </div>
            </div>
          </Pecas>

          {/* 01 cor */}
          <Secao id="bs-cor" numero="01" titulo="Cor">
            <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
              <Pecas nomes={["brand-theme", "css-color"]}>
                <div className="flex min-h-[13rem] flex-col justify-between rounded-[var(--r-surface,0.875rem)] bg-[var(--brand)] p-5 text-[var(--brand-foreground)]">
                  <p className="text-corpo font-medium">Principal</p>
                  <div>
                    <p className="truncate font-mono text-micro opacity-80">{v["--brand"] || "não lido"}</p>
                    <p className="mt-1 text-apoio opacity-85">
                      Texto sobre ela {pares ? `${UMA_CASA.format(pares.sobreMarca)}:1` : "..."}
                    </p>
                  </div>
                </div>
              </Pecas>
              <div className="grid grid-cols-2 gap-3">
                {CORES.map((c, i) => (
                  <div
                    key={c.css}
                    className={cn(
                      "flex min-h-[6.25rem] min-w-0 flex-col justify-end rounded-[var(--r-control,0.5rem)] border border-border p-3",
                      i === 0 && "col-span-2",
                    )}
                    style={{ background: `var(${c.css})` }}
                  >
                    <span
                      className={cn(
                        "w-fit max-w-full truncate rounded-[var(--r-control,0.5rem)] bg-background/85 px-1.5 py-0.5 text-micro text-foreground",
                      )}
                    >
                      {c.nome} <span className="font-mono text-muted-foreground">{v[c.css] || ""}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {paleta.length ? (
              <div className="mt-6">
                <p className="text-micro text-muted-foreground">Paleta da guideline</p>
                <div className="mt-2 flex h-12 overflow-hidden rounded-[var(--r-control,0.5rem)] border border-border">
                  {paleta.map((p) => (
                    <div
                      key={p.hex + (p.name ?? "")}
                      className="flex-1"
                      style={{ background: p.hex }}
                      title={[p.name, p.role, p.hex].filter(Boolean).join(" · ")}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <ul className="mt-6 grid gap-x-8 sm:grid-cols-3">
              {[
                { rotulo: "Texto sobre fundo", valor: pares?.texto, regra: 4.5, nota: "leitura" },
                { rotulo: "Principal sobre fundo", valor: pares?.marca, regra: 3, nota: "borda e fundo" },
                { rotulo: "Texto sobre a principal", valor: pares?.sobreMarca, regra: 4.5, nota: "botão" },
              ].map((p) => (
                <li key={p.rotulo} className="flex items-center justify-between gap-3 border-b border-border py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-apoio">{p.rotulo}</span>
                    <span className="block text-micro text-muted-foreground">uso: {p.nota}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-apoio tabular-nums">
                      {p.valor ? `${UMA_CASA.format(p.valor)}:1` : "..."}
                    </span>
                    {p.valor ? <Selo ok={p.valor >= p.regra}>{p.valor >= p.regra ? "passa" : "não passa"}</Selo> : null}
                  </span>
                </li>
              ))}
            </ul>
          </Secao>

          {/* 02 tipografia */}
          <Secao id="bs-tipo" numero="02" titulo="Tipografia">
            <div className="grid gap-8 md:grid-cols-[auto_1fr] md:gap-12">
              <div>
                <p
                  className="text-[7rem] font-semibold leading-[0.8] tracking-[-0.05em] sm:text-[9rem]"
                  style={{ fontFamily: "var(--font-display, inherit)" }}
                  aria-hidden="true"
                >
                  Aa
                </p>
                <p className="mt-3 text-apoio">{fonte(v["--font-display"])}</p>
                <p className="text-micro text-muted-foreground">títulos · texto em {fonte(v["--font-sans"])}</p>
              </div>
              <ol className="min-w-0">
                {[
                  { n: "Display", px: 44, peso: 600, display: true, t: "Uma marca, todas as telas." },
                  { n: "Título", px: 28, peso: 600, display: true, t: "O sistema lê a guideline" },
                  { n: "Subtítulo", px: 19, peso: 500, display: false, t: "e cada peça herda o que precisa." },
                  { n: "Corpo", px: 15, peso: 400, display: false, t: "Nenhuma cor escrita dentro do componente, nenhum tamanho no olho." },
                  { n: "Mono", px: 13, peso: 400, display: false, mono: true, t: "brand · 1,0 · 2026" },
                ].map((e) => (
                  <li key={e.n} className="grid grid-cols-[5.5rem_1fr] items-baseline gap-3 border-b border-border py-3 last:border-b-0">
                    <span className="text-micro text-muted-foreground">
                      {e.n} <span className="tabular-nums">{e.px}</span>
                    </span>
                    <span
                      className={cn("min-w-0 leading-tight [overflow-wrap:anywhere]", e.mono && "font-mono")}
                      style={{
                        fontSize: `clamp(${Math.round(e.px * 0.62)}px, ${(e.px / 9).toFixed(2)}vw, ${e.px}px)`,
                        fontWeight: e.peso,
                        fontFamily: e.display ? "var(--font-display, inherit)" : undefined,
                        letterSpacing: e.px > 24 ? "-0.03em" : undefined,
                      }}
                    >
                      {e.t}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Secao>

          {/* 03 forma e movimento */}
          <Secao id="bs-forma" numero="03" titulo="Forma e movimento">
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <p className="text-micro text-muted-foreground">Raio</p>
                <div className="mt-3 flex items-end gap-4">
                  {[
                    { css: "--r-control", nome: "Controle", w: "w-20 h-12" },
                    { css: "--r-surface", nome: "Superfície", w: "w-28 h-20" },
                    { css: "--r-pill", nome: "Pílula", w: "w-24 h-10" },
                  ].map((r) => (
                    <div key={r.css} className="min-w-0">
                      <div
                        className={cn(r.w, "border border-[var(--brand)] bg-[color-mix(in_oklab,var(--brand)_14%,transparent)]")}
                        style={{ borderRadius: `var(${r.css})` }}
                      />
                      <p className="mt-2 text-micro">{r.nome}</p>
                      <p className="font-mono text-micro text-muted-foreground">{v[r.css] || "padrão"}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-micro text-muted-foreground">Tempo</p>
                <ul className="mt-3">
                  {[
                    { css: "--dur-fast", nome: "Resposta ao toque" },
                    { css: "--dur-base", nome: "Troca de estado" },
                    { css: "--dur-slow", nome: "Entrada de tela" },
                  ].map((d) => {
                    const ms = parseFloat(v[d.css] || "0");
                    return (
                      <li key={d.css} className="flex items-center gap-3 py-1.5">
                        <span className="w-36 shrink-0 truncate text-apoio">{d.nome}</span>
                        <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]">
                          <span
                            className="absolute inset-y-0 left-0 rounded-full bg-[var(--brand)]"
                            style={{ width: `${Math.min(100, (ms / 400) * 100)}%` }}
                          />
                        </span>
                        <span className="w-14 shrink-0 text-right font-mono text-micro tabular-nums text-muted-foreground">
                          {v[d.css] || "..."}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                  <Pecas nomes={["use-media-query"]} canto="base-fim">
                    <span className="flex items-center gap-2 text-apoio">
                      Este aparelho pede menos movimento
                      <Selo ok={menosMotion}>{menosMotion ? "sim" : "não"}</Selo>
                    </span>
                  </Pecas>
                  <Pecas nomes={["sfx-toggle"]} canto="base-fim">
                    <span className="flex items-center gap-2 text-apoio">
                      Som da interface <SfxToggle />
                    </span>
                  </Pecas>
                </div>
              </div>
            </div>
          </Secao>

          {/* 04 componentes, repintando */}
          <Secao id="bs-componentes" numero="04" titulo="Componentes">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4 rounded-[var(--r-surface,0.875rem)] border border-border bg-card p-5">
                <Pecas nomes={["chip"]} className="w-fit">
                  <div className="flex flex-wrap gap-2">
                    {["Estratégia", "Identidade", "Site"].map((t, i) => (
                      <Chip key={t} size={densidade === "compacto" ? "sm" : "md"} pressed={i === 0} count={[12, 7, 4][i]}>
                        {t}
                      </Chip>
                    ))}
                  </div>
                </Pecas>
                <Pecas nomes={["segmented-control"]} className="w-fit">
                  <SegmentedControl
                    value={densidade}
                    onChange={setDensidade}
                    aria-label="Densidade"
                    options={[
                      { value: "conforto", label: "Conforto" },
                      { value: "compacto", label: "Compacto" },
                    ]}
                  />
                </Pecas>
                <Pecas nomes={["cta-surface"]}>
                  <CtaSurface
                    variant="bar"
                    tone="brand"
                    title="Tudo isso num plano só."
                    actions={<CtaAction>Assinar</CtaAction>}
                  />
                </Pecas>
              </div>
              <Pecas nomes={["empty-state", "cover-art"]}>
                <EmptyState
                  className="h-full"
                  eyebrow="Aplicações"
                  title="Nenhuma peça publicada ainda."
                  action={<Chip pressed>Publicar a primeira</Chip>}
                  art={
                    <div className="relative h-[96px] w-full">
                      <CoverArt title={nome} seed={`${slug}-vazio`} family="plate" titleless />
                    </div>
                  }
                >
                  Cartaz, post e apresentação aparecem aqui, já na cor da marca.
                </EmptyState>
              </Pecas>
            </div>
          </Secao>
        </main>
      </div>
    </Janela>
  );
}
