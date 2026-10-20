"use client";

/**
 * Marca viva: o kit montado como a tela de marca de um app de exemplo.
 *
 * A versão anterior explicava o kit em cinco trechos ("o tema que a marca
 * compila", "o provider aplica em runtime", "os hooks respondem ao
 * ambiente"...), com nome de token e media query crua na tela. Era a aula de
 * como o kit funciona. Aqui é a tela de configurações que um app de verdade
 * teria: navegação das configurações, a marca ativa com o seletor, a paleta e
 * as fontes lidas da folha aplicada, a prévia repintando, o que este aparelho
 * pede, a busca nos componentes e a gaveta de marcas arquivadas, vazia.
 *
 * Os valores da paleta são LIDOS do `getComputedStyle`, nunca escritos aqui:
 * se o provider quebrar, a tela quebra junto, que é o comportamento honesto.
 * Quem quer o nome da peça passa o mouse.
 */

import * as React from "react";
import { Bell, CreditCard, Palette, Search, Settings, Users } from "lucide-react";

import { useBrandTheme } from "@/lib/brand-theme";
import { BrandSelector } from "../../../registry/visant/ui/brand-selector";
import { SfxToggle } from "../../../registry/visant/ui/sfx-toggle";
import { EmptyState } from "../../../registry/visant/ui/empty-state";
import { CoverArt } from "../../../registry/visant/ui/cover-art";
import { Chip } from "../../../registry/visant/ui/chip";
import { CtaSurface, CtaAction } from "../../../registry/visant/ui/cta-surface";
import { SideNav, SideNavGroup, SideNavItem } from "../../../registry/visant/ui/side-nav";
import { useMediaQuery } from "../../../registry/visant/hooks/use-media-query";
import { useLocalSearch } from "../../../registry/visant/hooks/use-local-search";
import { CATALOG } from "../catalog";
import { Janela, Pecas } from "./sala";

const TOKENS = [
  { css: "--brand", nome: "Principal" },
  { css: "--background", nome: "Fundo" },
  { css: "--foreground", nome: "Texto" },
  { css: "--muted", nome: "Apoio" },
  { css: "--card", nome: "Superfície" },
  { css: "--border", nome: "Linhas" },
];

const ESTADO: Record<string, string> = {
  idle: "Esperando o índice",
  loading: "Baixando o índice",
  ready: "Aplicada agora",
  error: "O vault não respondeu",
};

const NAV = [
  { id: "geral", rotulo: "Geral", icone: <Settings /> },
  { id: "marca", rotulo: "Marca", icone: <Palette /> },
  { id: "time", rotulo: "Time", icone: <Users />, meta: "5" },
  { id: "cobranca", rotulo: "Cobrança", icone: <CreditCard /> },
  { id: "avisos", rotulo: "Avisos", icone: <Bell /> },
];

/** Uma seção da tela de configurações: título à esquerda, conteúdo à direita. */
function Secao({
  titulo,
  apoio,
  children,
}: {
  titulo: string;
  apoio?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-b border-border py-7 last:border-b-0 lg:grid-cols-[13rem_1fr] lg:gap-8">
      <div>
        <h3 className="text-corpo font-medium">{titulo}</h3>
        {apoio ? <p className="mt-1 text-apoio text-muted-foreground">{apoio}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function SimNao({ sim }: { sim: boolean }) {
  return (
    <span
      className={
        "shrink-0 rounded-[var(--r-pill,9999px)] border px-2.5 py-0.5 text-micro transition-[border-color,color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] " +
        (sim ? "border-[var(--brand)] text-foreground" : "border-border text-muted-foreground")
      }
    >
      {sim ? "Sim" : "Não"}
    </span>
  );
}

export default function MarcaViva() {
  const { active, brands, status, error } = useBrandTheme();
  const [valores, setValores] = React.useState<Record<string, string>>({});
  const [busca, setBusca] = React.useState("");
  const [nav, setNav] = React.useState("marca");

  const estreito = useMediaQuery("(max-width: 640px)");
  const mouse = useMediaQuery("(pointer: fine)");
  const menosMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const ler = React.useCallback(() => {
    const cs = getComputedStyle(document.documentElement);
    const lidos: Record<string, string> = {};
    for (const t of TOKENS) lidos[t.css] = cs.getPropertyValue(t.css).trim();
    lidos["--font-sans"] = cs.getPropertyValue("--font-sans").trim();
    lidos["--font-display"] = cs.getPropertyValue("--font-display").trim();
    setValores((antes) => (Object.keys(lidos).every((k) => antes[k] === lidos[k]) ? antes : lidos));
  }, []);

  /* Observar, não fotografar: a leitura dispara quando a página muda de marca
     ou de tema, depois de dois quadros (o valor computado só vale depois). */
  React.useEffect(() => {
    let raf = 0;
    const agendar = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(ler);
      });
    };
    agendar();
    const obs = new MutationObserver(agendar);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-brand", "style"],
    });
    obs.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ler]);

  const achados = useLocalSearch(CATALOG, {
    fields: (i) => [i.name, i.title, i.description, ...i.tags],
    query: busca,
  });

  const fonte = (v?: string) => (v ? v.split(",")[0].replace(/['"]/g, "") : "a do sistema");

  return (
    <Janela endereco="norte.app/configuracoes/marca">
      <div className="flex">
        <Pecas nomes={["side-nav"]} className="hidden shrink-0 md:block">
          <SideNav
            storageKey={false}
            shortcut={false}
            toggle={false}
            width={12}
            label="Configurações"
            className="min-h-full"
            brand={<span className="text-apoio font-medium">Configurações</span>}
          >
            <SideNavGroup>
              {NAV.map((n) => (
                <SideNavItem
                  key={n.id}
                  href="#"
                  icon={n.icone}
                  meta={n.meta}
                  active={nav === n.id}
                  onClick={(e) => {
                    e.preventDefault();
                    setNav(n.id);
                  }}
                >
                  {n.rotulo}
                </SideNavItem>
              ))}
            </SideNavGroup>
          </SideNav>
        </Pecas>

        <main className="min-w-0 flex-1 px-5 pb-4 pt-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
            <div className="min-w-0">
              <h2 className="text-destaque font-medium">Marca</h2>
              <p className="mt-0.5 text-apoio text-muted-foreground">
                A cor, a fonte e o tom que o app inteiro usa.
              </p>
            </div>
            <Pecas nomes={["brand-selector", "brand-theme"]} canto="base-fim">
              <BrandSelector shortcut={null} />
            </Pecas>
          </div>

          <Secao titulo="Marca ativa" apoio="Troque e o app repinta sem recarregar.">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="truncate text-titulo font-semibold" style={{ fontFamily: "var(--font-display, inherit)" }}>
                {active?.name ?? "Padrão do app"}
              </span>
              <span className="text-apoio text-muted-foreground" title={error ?? undefined}>
                {ESTADO[status] ?? status} · {brands.length} {brands.length === 1 ? "marca" : "marcas"} na conta
              </span>
            </div>
          </Secao>

          <Secao titulo="Paleta" apoio="Lida da folha aplicada agora.">
            <Pecas nomes={["brand-theme"]}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(7rem,100%),1fr))] gap-x-3 gap-y-4">
                {TOKENS.map((t) => (
                  <div key={t.css} className="min-w-0">
                    <div
                      className="h-14 w-full rounded-[var(--r-control,0.5rem)] border border-border"
                      style={{ background: `var(${t.css})` }}
                    />
                    <p className="mt-1.5 truncate text-apoio">{t.nome}</p>
                    <p className="truncate font-mono text-micro text-muted-foreground">
                      {valores[t.css] || "não lido"}
                    </p>
                  </div>
                ))}
              </div>
            </Pecas>
          </Secao>

          <Secao titulo="Tipografia">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-micro text-muted-foreground">Títulos</p>
                <p className="mt-1 truncate text-[1.6rem] leading-tight" style={{ fontFamily: "var(--font-display, inherit)" }}>
                  {fonte(valores["--font-display"])}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-micro text-muted-foreground">Texto</p>
                <p className="mt-1 truncate text-[1.6rem] leading-tight">{fonte(valores["--font-sans"])}</p>
              </div>
            </div>
          </Secao>

          <Secao titulo="Prévia" apoio="Peças de outras telas, com a marca de agora.">
            <Pecas nomes={["chip"]} className="inline-block">
              <div className="flex flex-wrap gap-2">
                {["Estratégia", "Identidade", "Site"].map((t, i) => (
                  <Chip key={t} pressed={i === 0} count={[12, 7, 4][i]}>
                    {t}
                  </Chip>
                ))}
              </div>
            </Pecas>
            <Pecas nomes={["cta-surface"]} className="mt-4">
              <CtaSurface
                variant="bar"
                tone="brand"
                title="Tudo isso em um plano só."
                actions={<CtaAction>Assinar</CtaAction>}
              />
            </Pecas>
          </Secao>

          <Secao titulo="Este aparelho" apoio="O app se ajusta sozinho ao que ele pede.">
            <Pecas nomes={["use-media-query"]}>
              <ul className="max-w-lg">
                {(
                  [
                    ["Tela estreita", estreito],
                    ["Mouse ou trackpad", mouse],
                    ["Pede menos movimento", menosMotion],
                  ] as [string, boolean][]
                ).map(([rotulo, sim]) => (
                  <li key={rotulo} className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-apoio">
                    {rotulo}
                    <SimNao sim={sim} />
                  </li>
                ))}
              </ul>
            </Pecas>
            <Pecas nomes={["sfx-toggle"]} className="mt-3 max-w-lg">
              <div className="flex items-center justify-between gap-3 py-1 text-apoio">
                <span>
                  Sons da interface
                  <span className="block text-micro text-muted-foreground">Ficam mudos se o aparelho pede menos movimento.</span>
                </span>
                <SfxToggle />
              </div>
            </Pecas>
          </Secao>

          <Secao titulo="Componentes" apoio={`${CATALOG.length} peças herdam a marca.`}>
            <Pecas nomes={["use-local-search"]}>
              <label className="flex items-center gap-2 rounded-[var(--r-control,0.5rem)] border border-border bg-background px-2.5 py-1.5 transition-[border-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] focus-within:border-[var(--brand)]">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar, com ou sem acento: animacao, arrastar"
                  aria-label="Buscar componentes"
                  className="min-w-0 flex-1 bg-transparent text-apoio outline-none placeholder:text-muted-foreground"
                />
                <span className="shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
                  {achados.length}
                </span>
              </label>
              {achados.length === 0 ? (
                <p className="py-4 text-apoio text-muted-foreground">Nada com esse nome. Tenta uma palavra do que a peça faz.</p>
              ) : (
                <ul className="mt-2 max-h-[9.5rem] overflow-y-auto">
                  {achados.slice(0, 8).map((i) => (
                    <li key={i.name} className="flex min-w-0 items-baseline gap-2 py-1">
                      <span className="truncate text-apoio">{i.title}</span>
                      <span className="truncate font-mono text-micro text-muted-foreground">{i.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Pecas>
          </Secao>

          <Secao titulo="Arquivadas">
            <Pecas nomes={["empty-state", "cover-art"]} className="max-w-md">
              <EmptyState
                eyebrow="Arquivo"
                title="Nenhuma marca arquivada."
                action={<Chip pressed>Ver as ativas</Chip>}
                art={
                  <div className="relative h-[92px] w-full">
                    <CoverArt title="Arquivo" seed="vault-vazio" family="plate" titleless />
                  </div>
                }
              >
                Marca que sair de uso fica guardada aqui, com o tema intacto.
              </EmptyState>
            </Pecas>
          </Secao>
        </main>
      </div>
    </Janela>
  );
}
