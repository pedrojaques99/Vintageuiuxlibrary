"use client";

/**
 * Brand Studio — a prova de que o registry é multi-marca de verdade.
 *
 * Tudo nesta página lê token. Nada aqui sabe o nome de uma cor. Trocar a marca
 * no seletor repinta hero, tokens, tipografia e os componentes colhidos sem
 * recarregar, sem remontar e sem um `if (cliente === "x")` em lugar nenhum.
 */

import * as React from "react";
import { useBrandTheme } from "@/lib/brand-theme";
import { CopyCommand } from "./copy-command";
import { DEFAULT_BRAND, installCommand } from "./registry-meta";
import { Chip } from "../../registry/visant/ui/chip";
import { Plate } from "../../registry/visant/ui/plate";
import { Marquee } from "../../registry/visant/ui/marquee";
import { StatusTicker } from "../../registry/visant/ui/status-ticker";
import { WorkingGlyph } from "../../registry/visant/ui/working-glyph";

// --- leitura dos tokens vivos ------------------------------------------------

const TOKENS = [
  "background",
  "card",
  "muted",
  "border",
  "foreground",
  "muted-foreground",
  "brand",
  "accent-ink",
] as const;

/**
 * Lê os tokens do `:root` DEPOIS de a folha da marca entrar.
 *
 * `getComputedStyle` é a única fonte honesta aqui: mostra o que o browser
 * resolveu, não o que o JSON prometeu. Se um token não chegar, a página mostra
 * o buraco em vez de repetir o valor do índice.
 */
function useLiveTokens(dep: unknown) {
  const [vals, setVals] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let raf = 0;
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const t of TOKENS) next[t] = cs.getPropertyValue(`--${t}`).trim();
      next["font-display"] = cs.getPropertyValue("--font-display").trim();
      next["font-sans"] = cs.getPropertyValue("--font-sans").trim();
      setVals(next);
    };
    // Dois quadros: um para a folha entrar, outro para a View Transition acabar.
    raf = requestAnimationFrame(() => requestAnimationFrame(read));
    const t = setTimeout(read, 320);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [dep]);
  return vals;
}

// --- peças da página ---------------------------------------------------------

function Section({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-14">
      <div className="mb-7 flex items-baseline gap-3">
        <span className="font-mono text-micro uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <h2
          className="text-destaque font-medium"
          style={{ fontFamily: "var(--font-display, inherit)" }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

// --- studio ------------------------------------------------------------------

export function BrandStudioBody() {
  const { active, brand, status } = useBrandTheme();
  const tokens = useLiveTokens(active?.slug ?? "none");
  const [filters, setFilters] = React.useState<Set<string>>(new Set(["Tudo"]));

  const shown = active ?? brand;

  return (
    <main className="shell pb-24">
        {/* hero */}
        <section className="py-16">
          <p className="mb-4 font-mono text-micro uppercase tracking-[0.18em] text-muted-foreground">
            {status === "loading"
              ? "lendo o vault…"
              : shown
                ? `brand guideline · v${shown.version ?? "?"} · vault ${shown.completeness ?? "?"}%`
                : "nenhuma marca aplicada"}
          </p>
          <h1
            className="text-[clamp(2.6rem,7vw,5rem)] font-semibold leading-[0.95] tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-display, inherit)" }}
          >
            {shown?.name ?? "Escolha uma marca"}
          </h1>
          <p className="mt-5 max-w-2xl text-destaque leading-relaxed text-muted-foreground">
            {shown?.tagline ??
              "Os componentes abaixo não sabem a cor de ninguém. Trocar a marca no seletor troca só os tokens — e a interface inteira responde."}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center gap-2 rounded-[var(--r-pill,9999px)] px-4 py-2 text-corpo font-medium"
              style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}
            >
              Ação principal
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-[var(--r-pill,9999px)] border border-border px-4 py-2 text-corpo font-medium"
              style={{ color: "var(--accent-ink)" }}
            >
              Ação secundária
            </span>
            {shown && <StatusTicker className="ml-1" />}
          </div>
        </section>

        {/* tokens */}
        <Section label="01" title="Tokens resolvidos no browser">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TOKENS.map((t) => (
              <div
                key={t}
                className="overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card"
              >
                <div
                  className="h-14 w-full border-b border-border"
                  style={{ background: `var(--${t})` }}
                />
                <div className="px-3 py-2.5">
                  <div className="font-mono text-rotulo">--{t}</div>
                  <div className="truncate font-mono text-micro text-muted-foreground">
                    {tokens[t] || "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* tipografia */}
        <Section label="02" title="Par tipográfico da marca">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="mb-3 font-mono text-micro uppercase tracking-[0.14em] text-muted-foreground">
                display · {shown?.fonts.display ?? "—"}
              </p>
              <p
                className="text-[2.6rem] leading-[1.05] tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-display, inherit)" }}
              >
                Uma decisão por tela
              </p>
            </div>
            <div>
              <p className="mb-3 font-mono text-micro uppercase tracking-[0.14em] text-muted-foreground">
                sans · {shown?.fonts.sans ?? "—"}
              </p>
              <p className="text-destaque leading-relaxed text-muted-foreground">
                O corpo de texto herda a face de leitura da guideline. Quando a face é
                licenciada fora do Google Fonts, a pilha de fallback do token assume e a
                hierarquia continua de pé — muda o desenho da letra, não a estrutura.
              </p>
            </div>
          </div>
        </Section>

        {/* componentes */}
        <Section label="03" title="Componentes colhidos, repintados">
          <div className="mb-6 flex flex-wrap gap-2">
            {["Tudo", "Superfície de trabalho", "Aquisição", "Motion"].map((f) => (
              <Chip
                key={f}
                pressed={filters.has(f)}
                onClick={() =>
                  setFilters((prev) => {
                    const next = new Set(prev);
                    next.has(f) ? next.delete(f) : next.add(f);
                    return next;
                  })
                }
              >
                {f}
              </Chip>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { t: "Plate", d: "placa de catálogo" },
              { t: "Rail", d: "trilho horizontal" },
              { t: "Kanban", d: "board com marquee" },
            ].map((c) => (
              <Plate key={c.t} ratio="4/3">
                <div className="flex h-full flex-col items-start justify-end p-5">
                  <WorkingGlyph size={18} />
                  <p
                    className="mt-3 text-destaque font-medium"
                    style={{ fontFamily: "var(--font-display, inherit)" }}
                  >
                    {c.t}
                  </p>
                  <p className="text-rotulo text-muted-foreground">{c.d}</p>
                </div>
              </Plate>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border">
            <Marquee
              band
              speed={38}
              items={(shown?.palette ?? []).map((c, i) => (
                <span key={i} className="flex items-center gap-2 whitespace-nowrap">
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-background"
                    style={{ background: c.hex }}
                  />
                  <span className="font-mono text-rotulo uppercase tracking-[0.1em]">
                    {c.name ?? c.hex}
                  </span>
                </span>
              ))}
            />
          </div>
        </Section>

        {/* instalação */}
        <Section label="04" title="Instalar esta marca num projeto">
          <div className="grid gap-3 md:grid-cols-2">
            <CopyCommand text={installCommand(`theme-${shown?.slug ?? DEFAULT_BRAND}`)} />
            <CopyCommand text={installCommand("brand-selector")} />
          </div>
          <p className="mt-4 max-w-2xl text-apoio leading-relaxed text-muted-foreground">
            O primeiro escreve os tokens da marca no <code>globals.css</code> — é o caminho
            de quem tem um cliente só. O segundo instala este seletor e o runtime, para o
            app trocar de marca com ele no ar.
          </p>
        </Section>
    </main>
  );
}

