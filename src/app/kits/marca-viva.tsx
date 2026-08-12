"use client";

/**
 * Marca viva — o kit que faz os outros quatro trocarem de cor.
 *
 * Este é o kit mais difícil de vender numa vitrine de peça solta, porque quase
 * nada nele TEM superfície: são um provider, um tema compilado, três hooks e
 * uma base de CSS. Card escrito "provider e hook que aplicam em runtime o tema
 * compilado" não convence ninguém de nada.
 *
 * O que convence é ver: troque a marca no seletor aqui dentro e os tokens
 * mudam na tela, na frente da pessoa, sem recarregar. Por isso esta sala não
 * mostra as peças — ela mostra o EFEITO delas, e os hooks aparecem com o valor
 * que estão devolvendo neste instante.
 */

import * as React from "react";

import { useBrandTheme } from "@/lib/brand-theme";
import { BrandSelector } from "../../../registry/visant/ui/brand-selector";
import { SfxToggle } from "../../../registry/visant/ui/sfx-toggle";
import { EmptyState } from "../../../registry/visant/ui/empty-state";
import { CoverArt } from "../../../registry/visant/ui/cover-art";
import { Chip } from "../../../registry/visant/ui/chip";
import { CtaSurface, CtaAction } from "../../../registry/visant/ui/cta-surface";
import { useMediaQuery } from "../../../registry/visant/hooks/use-media-query";
import { useLocalSearch } from "../../../registry/visant/hooks/use-local-search";
import { CATALOG } from "../catalog";

/** Os tokens que uma marca de fato move. Cor de fundo e de texto entram porque
 *  é onde o tema costuma errar sem ninguém ver — contraste é o teste. */
const TOKENS = [
  { css: "--brand", nome: "brand" },
  { css: "--background", nome: "background" },
  { css: "--foreground", nome: "foreground" },
  { css: "--muted", nome: "muted" },
  { css: "--card", nome: "card" },
  { css: "--border", nome: "border" },
];

function Painel({
  titulo,
  nota,
  children,
  className = "",
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card ${className}`}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <h3 className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
          {titulo}
        </h3>
        {nota ? <span className="font-mono text-micro text-muted-foreground">{nota}</span> : null}
      </header>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

export default function MarcaViva() {
  const { active, brands, status } = useBrandTheme();
  const [valores, setValores] = React.useState<Record<string, string>>({});
  const [busca, setBusca] = React.useState("");

  const estreito = useMediaQuery("(max-width: 640px)");
  const finoPointer = useMediaQuery("(pointer: fine)");
  const menosMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  /*
   * Os valores são LIDOS da folha aplicada, não escritos aqui.
   *
   * Uma lista de cores digitada à mão nesta sala seria uma mentira confortável:
   * ela continuaria bonita no dia em que o tema parasse de ser aplicado. Lendo
   * do `getComputedStyle`, a amostra é o que a página tem — e se o provider
   * quebrar, a sala quebra junto, que é o comportamento honesto.
   */
  React.useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const lidos: Record<string, string> = {};
    for (const t of TOKENS) lidos[t.css] = cs.getPropertyValue(t.css).trim();
    lidos["--font-sans"] = cs.getPropertyValue("--font-sans").trim();
    lidos["--font-display"] = cs.getPropertyValue("--font-display").trim();
    setValores(lidos);
    // `active` é a marca sendo espiada; muda a cada hover no seletor, e é
    // exatamente nesse instante que a amostra tem de acompanhar.
  }, [active, status]);

  const achados = useLocalSearch(CATALOG, {
    fields: (i) => [i.name, i.title, i.description, ...i.tags],
    query: busca,
  });

  const fonte = (v?: string) => (v ? v.split(",")[0].replace(/['"]/g, "") : "—");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Painel titulo="a marca aplicada" nota="brand-selector · brand-theme">
          <div className="flex flex-wrap items-center gap-3">
            {/* `shortcut={null}`: o ⌘B já é do seletor da barra do topo. Dois
                ouvintes no mesmo atalho abrem e fecham no mesmo gesto. */}
            <BrandSelector shortcut={null} />
            <div className="min-w-0">
              <p className="truncate text-destaque font-medium">{active?.name ?? "Visant®"}</p>
              <p className="text-apoio text-muted-foreground">
                {brands.length} marca(s) no vault · {status}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {TOKENS.map((t) => (
              <div key={t.css} className="min-w-0">
                <div
                  className="h-12 w-full rounded-[var(--r-control,0.5rem)] border border-border"
                  style={{ background: `var(${t.css})` }}
                />
                <p className="mt-1 truncate font-mono text-micro text-muted-foreground">{t.nome}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--r-control,0.5rem)] border border-border p-3">
              <p className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
                display
              </p>
              <p
                className="mt-1 truncate text-[1.5rem] leading-tight"
                style={{ fontFamily: "var(--font-display, inherit)" }}
              >
                {fonte(valores["--font-display"])}
              </p>
            </div>
            <div className="rounded-[var(--r-control,0.5rem)] border border-border p-3">
              <p className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
                texto
              </p>
              <p className="mt-1 truncate text-[1.5rem] leading-tight">
                {fonte(valores["--font-sans"])}
              </p>
            </div>
          </div>
        </Painel>

        {/* A prova: a MESMA peça, sem uma cor escrita dentro dela. Trocar a marca
            acima repinta este bloco — é a frase da home, aqui demonstrada em vez
            de afirmada. */}
        <Painel titulo="a mesma peça, outra marca" nota="theme-visant">
          <div className="flex flex-wrap gap-2">
            {["Estratégia", "Identidade", "Site"].map((t, i) => (
              <Chip key={t} pressed={i === 0} count={[12, 7, 4][i]}>
                {t}
              </Chip>
            ))}
          </div>
          <div className="mt-3.5">
            <CtaSurface
              variant="bar"
              tone="brand"
              title="Tudo isso em um plano só."
              actions={<CtaAction>Agendar</CtaAction>}
            />
          </div>
          <div className="mt-3.5 flex items-center gap-3 rounded-[var(--r-control,0.5rem)] border border-border p-3">
            <SfxToggle />
            <p className="text-apoio text-muted-foreground">
              O som da casa: dois tons em WebAudio, mudo sob{" "}
              <code className="font-mono text-micro">prefers-reduced-motion</code>.
            </p>
          </div>
        </Painel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
        {/* Hook não tem superfície — então mostra o valor que está devolvendo
            AGORA. Redimensione a janela e a linha muda; é a demo possível. */}
        <Painel titulo="o que os hooks respondem" nota="use-media-query">
          <ul className="space-y-2 font-mono text-apoio">
            {[
              ["(max-width: 640px)", estreito],
              ["(pointer: fine)", finoPointer],
              ["(prefers-reduced-motion)", menosMotion],
            ].map(([q, v]) => (
              <li key={String(q)} className="flex items-center justify-between gap-3">
                <span className="truncate text-muted-foreground">{String(q)}</span>
                <span
                  className="shrink-0 rounded-[var(--r-pill,9999px)] border px-2 py-0.5 text-micro"
                  style={
                    v
                      ? { borderColor: "var(--brand)", color: "var(--brand)" }
                      : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
                  }
                >
                  {v ? "true" : "false"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-apoio text-muted-foreground">
            Leitura síncrona no primeiro render, via <code className="font-mono">useSyncExternalStore</code> — sem piscar.
          </p>
        </Painel>

        <Painel titulo="busca tolerante a acento" nota="use-local-search">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="tente “animacao”, “vintage”, “arrastar”…"
            aria-label="Buscar no catálogo"
            className="w-full rounded-[var(--r-control,0.5rem)] border border-border bg-background px-2.5 py-2 text-apoio outline-none placeholder:text-muted-foreground focus:border-[var(--brand)]"
          />
          <p className="mt-2 font-mono text-micro text-muted-foreground">
            {achados.length} de {CATALOG.length}
          </p>
          <ul className="mt-2 max-h-[132px] space-y-1 overflow-y-auto">
            {achados.slice(0, 8).map((i) => (
              <li key={i.name} className="truncate font-mono text-apoio">
                {i.name}
              </li>
            ))}
          </ul>
        </Painel>

        <Painel titulo="quando não há nada" nota="empty-state">
          <div className="grid place-items-center">
            <EmptyState
              className="w-full"
              eyebrow="Vault"
              title="Nenhuma marca ainda."
              action={<Chip pressed>Conectar vault</Chip>}
              art={
                <div className="relative h-[92px] w-full">
                  <CoverArt title="Vault" seed="vault-vazio" family="plate" titleless />
                </div>
              }
            >
              As marcas da sua conta aparecem aqui e repintam o app inteiro.
            </EmptyState>
          </div>
        </Painel>
      </div>
    </div>
  );
}
