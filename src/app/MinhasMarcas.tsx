"use client";

/**
 * "Minhas marcas" — o vault de quem entrou, e de mais ninguém.
 *
 * Fica ao lado do seletor de marcas públicas, não dentro dele, por uma razão de
 * desenho: o seletor público é do produto (quatro marcas de demonstração, iguais
 * para todo visitante); isto é da SESSÃO. Misturar os dois faria a pessoa
 * deslogar e ver a lista encolher sem entender por quê.
 *
 * Aplicar compila a guideline aqui mesmo, no browser, com o MESMO motor que o
 * build usa para publicar os temas (`@visant/brand-tokens`). Não é uma segunda
 * implementação "de preview": é a de verdade, então o que se vê na tela é
 * exatamente o que o `shadcn add` instalaria. E o vault não passa por servidor
 * nenhum nosso — a guideline vai da API do Visant direto para a memória da aba.
 */

import * as React from "react";
import { Check, LogIn, LogOut, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyBrandThemeAnimated, loadBrandFonts } from "@/lib/brand-theme";
import { useVisantAuth, type MarcaDoUsuario } from "./visant-auth";

export function MinhasMarcas() {
  const { estado, erro, marcas, carregandoMarcas, entrar, sair, buscarMarcas } = useVisantAuth();
  const [aberto, setAberto] = React.useState(false);
  const [aplicada, setAplicada] = React.useState<string | null>(null);
  const [falhaAoAplicar, setFalhaAoAplicar] = React.useState<string | null>(null);

  /*
   * O motor entra sob demanda.
   *
   * São ~90KB entre Leonardo e culori, para uma função que só interessa a quem
   * fez login e clicou em aplicar. Quem chega para ver o catálogo não paga por
   * isso.
   */
  const aplicar = React.useCallback(async (marca: MarcaDoUsuario) => {
    setFalhaAoAplicar(null);
    try {
      const { buildBrandThemeItem } = await import("@visant/brand-tokens/registry-item");
      const item = buildBrandThemeItem({
        id: marca.id,
        name: marca.name,
        colors: marca.colors,
        typography: marca.typography,
      });
      loadBrandFonts([marca.typography[0]?.family, marca.typography[1]?.family].filter(Boolean) as string[]);
      applyBrandThemeAnimated(item, item.name.replace(/^theme-/, ""));
      setAplicada(marca.id);
    } catch (e) {
      // Guideline incompleta falha alto no motor (sem cor de fundo, sem
      // tipografia). É informação, não bug: a marca precisa ser preenchida.
      setFalhaAoAplicar(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // A lista só é buscada quando o painel abre: ninguém precisa do vault de
  // ninguém para ler o catálogo.
  React.useEffect(() => {
    if (aberto && estado === "dentro" && !marcas && !carregandoMarcas) void buscarMarcas();
  }, [aberto, estado, marcas, carregandoMarcas, buscarMarcas]);

  React.useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aberto]);

  if (estado === "carregando") {
    return <div className="h-8 w-8" aria-hidden />;
  }

  if (estado !== "dentro") {
    return (
      <button
        type="button"
        onClick={() => void entrar()}
        className="alvo-toque flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--r-control,0.5rem)] border border-border px-2.5 text-rotulo text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:text-foreground"
      >
        <LogIn className="h-3.5 w-3.5" />
        {/* Sem `nowrap` o rótulo quebrava em três linhas na barra apertada e
            esticava a altura do cabeçalho inteiro. */}
        {/* Só a partir de `lg`: em 768 o cabeçalho já carrega logo, seções,
            densidade, tema e seletor de marca — o rótulo era o que estourava a
            linha (a suíte pega isso em 768 exato, onde `md:` já vale). */}
        <span className="hidden lg:inline">Entrar com Visant</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="alvo-toque flex h-8 items-center gap-1.5 rounded-[var(--r-control,0.5rem)] border border-border px-2.5 text-rotulo transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--brand)]"
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: "var(--brand, currentColor)" }}
          aria-hidden
        />
        <span className="hidden sm:inline">Minhas marcas</span>
        {marcas ? <span className="tabular-nums opacity-60">{marcas.length}</span> : null}
      </button>

      {aberto ? (
        <>
          {/* clicar fora fecha, sem prender ninguém dentro do painel */}
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,340px)] overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card [box-shadow:var(--e-overlay)]">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <span className="text-rotulo text-muted-foreground">vault da sua conta</span>
              <button
                type="button"
                onClick={() => void buscarMarcas()}
                aria-label="Recarregar"
                className="alvo-toque ml-auto text-muted-foreground transition-colors hover:text-foreground"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", carregandoMarcas && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={() => {
                  sair();
                  setAberto(false);
                }}
                aria-label="Sair"
                className="alvo-toque text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-[min(60vh,420px)] overflow-auto">
              {erro ? (
                <p className="p-3 text-apoio text-muted-foreground">
                  Não deu para ler o vault: <span className="font-mono">{erro}</span>
                </p>
              ) : null}

              {carregandoMarcas && !marcas
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="m-3 h-9 animate-pulse rounded bg-muted/40" />
                  ))
                : null}

              {marcas?.length === 0 ? (
                <p className="p-3 text-apoio text-muted-foreground">
                  Nenhuma brand guideline nesta conta ainda.
                </p>
              ) : null}

              {marcas?.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5">
                  <span className="flex shrink-0 -space-x-1" aria-hidden>
                    {m.colors.slice(0, 3).map((c, i) => (
                      <span
                        key={i}
                        className="h-4 w-4 rounded-full ring-1 ring-background"
                        style={{ background: c.hex }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-apoio">{m.name}</span>
                    <span className="block truncate text-micro text-muted-foreground">
                      {m.typography[0]?.family ?? "sem tipografia"}
                      {m.completeness != null ? ` · vault ${m.completeness}%` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void aplicar(m)}
                    className="flex shrink-0 items-center gap-1 rounded-[var(--r-control,0.5rem)] border border-border px-2 py-1 font-mono text-micro text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--brand)] hover:text-foreground"
                  >
                    {aplicada === m.id ? <Check className="h-3 w-3" /> : null}
                    {aplicada === m.id ? "no ar" : "aplicar"}
                  </button>
                </div>
              ))}
            </div>

            {falhaAoAplicar ? (
              <p className="border-t border-border px-3 py-2 text-micro leading-relaxed text-muted-foreground">
                Essa marca não compila ainda: <span className="font-mono">{falhaAoAplicar}</span>.
                Falta preencher a guideline no vault — o motor recusa em vez de inventar a cor que
                falta.
              </p>
            ) : (
              <p className="border-t border-border px-3 py-2 text-micro leading-relaxed text-muted-foreground">
                Compilado no seu navegador, com o mesmo motor do build. Estas marcas não passam por
                servidor nenhum desta vitrine.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
