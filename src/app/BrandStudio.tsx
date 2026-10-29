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
import { cn } from "@/lib/utils";
import { Marquee } from "../../registry/visant/ui/marquee";
import { StatusTicker } from "../../registry/visant/ui/status-ticker";

/* As demos da vitrine, lazy: só esta página paga por elas. */
const GaugeDemo = React.lazy(() => import("./demos/gauge-demo"));
const BillingDemo = React.lazy(() => import("./demos/billing-toggle-demo"));
const HeatmapDemo = React.lazy(() => import("./demos/activity-heatmap-demo"));

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

/**
 * Uma seção da casa: título em texto, sem numeral nem rótulo em caixa-alta.
 * "01 · Tokens resolvidos no browser" dizia a ordem duas vezes — a página já
 * está na ordem.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-16">
      <h2 className="casa mb-5 text-casa-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

/** O ladrilho onde a marca acontece. Fora dele, tudo é casa. */
function Palco({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("palco overflow-hidden rounded-tile", className)}>{children}</div>;
}

/*
 * As duas ações do espécime. Ficam aqui, nomeadas, porque são a única coisa da
 * página que pinta com a cor e o raio da marca por escrito.
 */
// casa-lint/marca-na-casca,raio-da-marca: o espécime é palco; os botões SÃO a marca aplicada
const ACAO_PRINCIPAL: React.CSSProperties = {
  background: "var(--brand)",
  color: "var(--brand-foreground)",
  borderRadius: "var(--r-control)",
};
// casa-lint/raio-da-marca: idem, a secundária mostra o raio de controle da marca
const ACAO_SECUNDARIA: React.CSSProperties = {
  color: "var(--accent-ink)",
  boxShadow: "inset 0 0 0 1px var(--border)",
  borderRadius: "var(--r-control)",
};

// --- studio ------------------------------------------------------------------

export function BrandStudioBody() {
  const { active, brand, status } = useBrandTheme();
  const tokens = useLiveTokens(active?.slug ?? "none");

  const shown = active ?? brand;

  return (
    <main className="shell pb-24">
      {/* A dobra é da casa: o nome da marca e a frase dela. A prova vem logo
          abaixo, no palco. */}
      <section className="casa pb-8 pt-12 sm:pt-16">
        <h1 className="text-casa-xl font-medium">
          {status === "loading" ? "Lendo o vault" : (shown?.name ?? "Escolha uma marca")}
        </h1>
        <p className="mt-3 max-w-2xl text-casa-lg text-casa-fg-2">
          {shown?.tagline ??
            "Os componentes não sabem a cor de ninguém. Trocar a marca troca só os tokens, e a interface inteira responde."}
        </p>
      </section>

      {/*
        O espécime: a marca inteira numa tela — a face de título, a de texto e
        as duas ações. É o que a pessoa compara ao trocar de marca no seletor.
      */}
      <Palco className="px-6 py-16 sm:px-12 sm:py-24">
        <p
          className="max-w-3xl text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.98] tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display, inherit)" }}
        >
          Uma decisão por tela
        </p>
        <p className="mt-5 max-w-xl leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          O corpo de texto herda a face de leitura da guideline. Quando a face é licenciada fora
          do Google Fonts, a pilha de fallback do token assume e a hierarquia continua de pé.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center px-4 py-2 font-medium" style={ACAO_PRINCIPAL}>
            Ação principal
          </span>
          <span className="inline-flex items-center px-4 py-2 font-medium" style={ACAO_SECUNDARIA}>
            Ação secundária
          </span>
          {shown ? <StatusTicker className="ml-1" /> : null}
        </div>
      </Palco>

      <Section title="Tokens">
        {/*
          O valor resolvido pelo browser, não o do JSON: se um token não chegar,
          a página mostra o buraco em vez de repetir o índice.
        */}
        {/* A amostra fica FORA de `.casa`: lá dentro `--brand` é redeclarado com o
            tom da casa, e a amostra mostraria a casca em vez da marca. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TOKENS.map((t) => (
            <div key={t} className="overflow-hidden rounded-tile bg-casa-tile">
              <div className="h-16 w-full" style={{ background: `var(--${t})` }} />
              <div className="casa px-4 py-3">
                <code className="block text-casa-sm text-casa-fg">--{t}</code>
                <code className="block truncate text-casa-sm text-casa-fg-3">
                  {tokens[t] || "—"}
                </code>
              </div>
            </div>
          ))}
        </div>
        <p className="casa mt-3 text-casa-sm text-casa-fg-3">
          {shown?.fonts.display ?? "—"} nos títulos, {shown?.fonts.sans ?? "—"} no texto
          {shown?.version ? `. Guideline v${shown.version}` : ""}
          {shown?.completeness != null ? `, vault ${shown.completeness}% completo.` : "."}
        </p>
      </Section>

      <Section title="Componentes, repintados">
        <Palco className="p-4 sm:p-6">
          {/*
            Peças de verdade, não placas com nome. Eram três `Plate` vazias com
            "Plate", "Rail" e "Kanban" escritos — duas delas nem eram o que
            diziam ser. A promessa da seção é "os componentes repintam", e a
            prova é trocar a marca no seletor e ver o arco do medidor, o selo
            de desconto e os dias do heatmap mudarem de cor. São as mesmas
            demos da vitrine, carregadas só quando esta página abre.
          */}
          <React.Suspense fallback={<div className="h-[420px]" aria-busy="true" />}>
            {/* casa-lint/raio-da-marca: estas superfícies estão no palco; vestir o raio da marca é a prova */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid h-60 place-items-center rounded-[var(--r-surface)] bg-card">
                <GaugeDemo props={{}} />
              </div>
              <div className="grid h-60 place-items-center rounded-[var(--r-surface)] bg-card">
                <BillingDemo props={{}} />
              </div>
              <div className="grid min-h-60 place-items-center overflow-x-auto rounded-[var(--r-surface)] bg-card p-4 md:col-span-2">
                <HeatmapDemo props={{}} />
              </div>
            </div>
          </React.Suspense>

          <div className="mt-4">
            <Marquee
              band
              speed={38}
              items={(shown?.palette ?? []).map((c, i) => (
                <span key={i} className="flex items-center gap-2 whitespace-nowrap">
                  <span className="h-3 w-3 rounded-[4px]" style={{ background: c.hex }} />
                  <span className="text-sm">{c.name ?? c.hex}</span>
                </span>
              ))}
            />
          </div>
        </Palco>
      </Section>

      <Section title="Levar pra um projeto">
        <div className="casa grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <CopyCommand variant="cta" text={installCommand(`theme-${shown?.slug ?? DEFAULT_BRAND}`)} />
            <p className="text-casa-sm text-casa-fg-2">
              Escreve os tokens da marca no <code>globals.css</code>. É o caminho de quem tem um
              cliente só.
            </p>
          </div>
          <div className="space-y-2">
            <CopyCommand text={installCommand("brand-selector")} />
            <p className="text-casa-sm text-casa-fg-2">
              Instala o seletor e o runtime, pro app trocar de marca no ar.
            </p>
          </div>
        </div>
      </Section>
    </main>
  );
}