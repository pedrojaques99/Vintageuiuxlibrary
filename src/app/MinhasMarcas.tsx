"use client";

/**
 * "Minhas marcas" — o vault de quem entrou, e de mais ninguém.
 *
 * Fica ao lado do seletor de marcas públicas, não dentro dele, por uma razão de
 * desenho: o seletor público é do produto (quatro marcas de demonstração, iguais
 * para todo visitante); isto é da SESSÃO. Misturar os dois faria a pessoa
 * deslogar e ver a lista encolher sem entender por quê.
 *
 * O que este painel NÃO faz ainda: aplicar o tema. Compilar guideline em tokens
 * é trabalho do `@visant/brand-tokens`, que hoje só existe como pacote local do
 * `visantlabs-os` e roda no build. Enquanto ele não for publicado, o botão
 * mostra o porquê em vez de fingir que funciona — vitrine que mente é pior que
 * vitrine nenhuma, e vale para a nossa também.
 */

import * as React from "react";
import { LogIn, LogOut, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVisantAuth } from "./visant-auth";

export function MinhasMarcas() {
  const { estado, erro, marcas, carregandoMarcas, entrar, sair, buscarMarcas } = useVisantAuth();
  const [aberto, setAberto] = React.useState(false);

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
        className="alvo-toque flex h-8 items-center gap-1.5 rounded-[var(--r-control,0.5rem)] border border-border px-2.5 text-rotulo text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:text-foreground"
      >
        <LogIn className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Entrar com Visant</span>
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
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,340px)] overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card shadow-[var(--e-overlay,0_12px_32px_rgba(0,0,0,0.14))]">
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
                    disabled
                    title="Aplicar exige o motor de tokens publicado (@visant/brand-tokens)"
                    className="shrink-0 rounded-[var(--r-control,0.5rem)] border border-border px-2 py-1 font-mono text-micro text-muted-foreground opacity-50"
                  >
                    aplicar
                  </button>
                </div>
              ))}
            </div>

            <p className="border-t border-border px-3 py-2 text-micro leading-relaxed text-muted-foreground">
              Aplicar o tema depende do compilador de tokens rodar no browser — ele ainda mora no
              build. Estas marcas nunca chegam ao servidor desta vitrine.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
