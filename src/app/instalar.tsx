"use client";

/**
 * O bloco de instalar — o comando no gerenciador de quem está lendo.
 *
 * A ficha mostrava só `npx`. Parece inofensivo e não é: quem trabalha em pnpm
 * copia o `npx`, o comando roda, e o `add` grava dependência no `package.json`
 * de um projeto cujo lockfile é de outro gerenciador. O estrago não aparece na
 * hora — aparece no CI de outra pessoa, dias depois, e ninguém liga uma coisa à
 * outra.
 *
 * A aba "manual" existe pela mesma razão que a aba Código existe: nem todo
 * projeto tem `components.json`, e quem está avaliando a peça antes de adotar o
 * registry inteiro precisa de um caminho que não exija adotar nada.
 *
 * A escolha do gerenciador fica no `localStorage`: quem usa pnpm usa pnpm em
 * todas as peças, e reobrigar o clique a cada item seria pedir a mesma
 * informação oitenta vezes.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { CopyCommand } from "./copy-command";
import {
  GERENCIADORES,
  REGISTRY_NAMESPACE,
  REGISTRY_PUBLIC_LABEL,
  REGISTRY_PUBLIC_URL,
  installCommandFor,
  registryItemUrl,
  type Gerenciador,
} from "./registry-meta";

const CHAVE = "visant:ui:gerenciador";

function useGerenciador() {
  const [g, setG] = React.useState<Gerenciador>(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      return (GERENCIADORES as readonly string[]).includes(salvo ?? "")
        ? (salvo as Gerenciador)
        : "npm";
    } catch {
      // Janela anônima, cookies bloqueados: a preferência não persiste e tudo
      // bem — o que não pode é a ficha não abrir por causa disso.
      return "npm";
    }
  });

  const escolher = React.useCallback((v: Gerenciador) => {
    setG(v);
    try {
      localStorage.setItem(CHAVE, v);
    } catch {
      /* idem */
    }
  }, []);

  return [g, escolher] as const;
}

type Modo = "cli" | "manual";

export function Instalar({ name, className }: { name: string; className?: string }) {
  const [modo, setModo] = React.useState<Modo>("cli");
  const [gerenciador, setGerenciador] = useGerenciador();

  /*
   * Uma linha de palavras e o comando. O gerenciador é texto, não segmentado:
   * quatro palavras curtas que ninguém precisa ler duas vezes. "Manual" fica no
   * canto, no tom mais baixo — é a porta de quem não tem `components.json`.
   */
  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center gap-4">
        {modo === "cli"
          ? GERENCIADORES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGerenciador(g)}
                aria-pressed={gerenciador === g}
                className={cn(
                  "rounded-control text-casa-sm transition-colors [transition-duration:var(--dur-fast)]",
                  gerenciador === g ? "text-casa-fg" : "text-casa-fg-3 hover:text-casa-fg",
                )}
              >
                {g}
              </button>
            ))
          : null}
        <button
          type="button"
          onClick={() => setModo(modo === "cli" ? "manual" : "cli")}
          className="ml-auto rounded-control text-casa-sm text-casa-fg-3 transition-colors [transition-duration:var(--dur-fast)] hover:text-casa-fg"
        >
          {modo === "cli" ? "Manual" : "Pela CLI"}
        </button>
      </div>

      {modo === "cli" ? (
        <CopyCommand variant="cta" text={installCommandFor(name, gerenciador)} />
      ) : (
        <div className="space-y-2">
          <p className="text-casa-sm text-casa-fg-2">
            Sem <code>components.json</code>, os arquivos estão na aba de código, prontos pra
            colar. O JSON do item também é público:
          </p>
          <CopyCommand text={registryItemUrl(name, REGISTRY_PUBLIC_URL)} />
          <p className="text-casa-sm text-casa-fg-2">
            Pra usar o <code>{REGISTRY_NAMESPACE}</code> nos próximos, aponte o{" "}
            <code>components.json</code> pra <code>{REGISTRY_PUBLIC_LABEL}</code>.
          </p>
        </div>
      )}
    </section>
  );
}
