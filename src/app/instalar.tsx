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
import { SegmentedControl } from "../../registry/visant/ui/segmented-control";
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

  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <h3 className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
          instalar
        </h3>
        <SegmentedControl
          value={modo}
          onChange={setModo}
          size="sm"
          aria-label="Como instalar"
          className="ml-auto"
          options={[
            { value: "cli" as const, label: "CLI" },
            { value: "manual" as const, label: "manual" },
          ]}
        />
      </div>

      {modo === "cli" ? (
        <>
          <SegmentedControl
            value={gerenciador}
            onChange={setGerenciador}
            size="sm"
            aria-label="Gerenciador de pacotes"
            options={GERENCIADORES.map((g) => ({ value: g, label: g }))}
          />
          <CopyCommand text={installCommandFor(name, gerenciador)} />
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-rotulo leading-relaxed text-muted-foreground">
            Sem <span className="font-mono">components.json</span>: os arquivos estão na aba
            Código, prontos pra colar. O JSON do item também é público —
          </p>
          <CopyCommand text={registryItemUrl(name, REGISTRY_PUBLIC_URL)} />
          <p className="text-rotulo leading-relaxed text-muted-foreground">
            Pra usar o <span className="font-mono">{REGISTRY_NAMESPACE}</span> nos próximos, aponte
            o <span className="font-mono">components.json</span> pra{" "}
            <span className="font-mono">{REGISTRY_PUBLIC_LABEL}</span>.
          </p>
        </div>
      )}
    </section>
  );
}
