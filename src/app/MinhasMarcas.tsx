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
import { Check, LogOut, RefreshCw } from "lucide-react";
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
        className="alvo-toque flex h-8 shrink-0 items-center whitespace-nowrap rounded-control px-2.5 text-casa-base text-casa-fg-2 transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:bg-casa-tile hover:text-casa-fg"
      >
        {/* "Entrar", e não "Entrar com Visant": no cabeçalho da Visant, o "com
            quem" é óbvio. A palavra curta cabe em qualquer largura, então o
            rótulo não precisa mais sumir abaixo de `lg`. */}
        Entrar
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="alvo-toque flex h-8 items-center gap-1.5 whitespace-nowrap rounded-control px-2.5 text-casa-base text-casa-fg-2 transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:bg-casa-tile hover:text-casa-fg aria-expanded:bg-casa-tile aria-expanded:text-casa-fg"
      >
        <span className="hidden sm:inline">Minhas marcas</span>
        <span className="sm:hidden">Marcas</span>
        {marcas ? <span className="tabular-nums text-casa-fg-3">{marcas.length}</span> : null}
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
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,340px)] overflow-hidden rounded-tile bg-casa-tile p-1.5 [box-shadow:var(--casa-shadow)]">
            <div className="flex items-center gap-1 py-1 pl-2.5 pr-1">
              <span className="text-casa-sm text-casa-fg-3">Vault da sua conta</span>
              <button
                type="button"
                onClick={() => void buscarMarcas()}
                aria-label="Recarregar"
                className="casa-icone alvo-toque ml-auto"
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
                title="Sair"
                className="casa-icone alvo-toque"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-[min(60vh,420px)] overflow-auto">
              {erro ? (
                <p className="px-2.5 py-2 text-casa-base text-casa-fg-2">
                  Não deu pra ler o vault: <code>{erro}</code>
                </p>
              ) : null}

              {carregandoMarcas && !marcas
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="m-1.5 h-10 animate-pulse rounded-control bg-casa-tile-2" />
                  ))
                : null}

              {marcas?.length === 0 ? (
                <p className="px-2.5 py-2 text-casa-base text-casa-fg-2">
                  Nenhuma marca nesta conta ainda.
                </p>
              ) : null}

              {marcas?.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void aplicar(m)}
                  className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:bg-casa-tile-2"
                >
                  <span className="flex shrink-0 -space-x-1" aria-hidden>
                    {m.colors.slice(0, 3).map((c, i) => (
                      <span
                        key={i}
                        className="h-4 w-4 rounded-[5px] ring-2 ring-[var(--casa-tile)]"
                        style={{ background: c.hex }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-casa-base">{m.name}</span>
                    <span className="block truncate text-casa-sm text-casa-fg-3">
                      {m.typography[0]?.family ?? "sem tipografia"}
                    </span>
                  </span>
                  {aplicada === m.id ? (
                    <Check className="h-4 w-4 shrink-0 text-casa-fg" aria-label="no ar" />
                  ) : null}
                </button>
              ))}
            </div>

            {/* A falha diz o que falta; o sucesso não precisa de legenda. */}
            {falhaAoAplicar ? (
              <p className="px-2.5 pb-1.5 pt-2 text-casa-sm text-casa-fg-2">
                Essa marca ainda não compila: falta <code>{falhaAoAplicar}</code> na guideline.
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
