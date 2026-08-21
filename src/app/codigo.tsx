"use client";

/**
 * O bloco de código — texto na hora, cor quando o realce chega.
 *
 * O realce vale a pena e não vale o preço de todo mundo pagar por ele. O Prism
 * são ~91 kB (29 gzip) e só serve a duas telas que ficam atrás de um clique: a
 * aba Código da ficha e o snippet de uso do painel. Colocado no chunk principal,
 * ele entrava na conta de quem abre a home pra olhar a grade e vai embora — que
 * é a maioria das visitas.
 *
 * Então o motor chega por `import()`, e enquanto ele não chega o mesmo código
 * aparece em `<pre>` cru, na mesma tipografia e no mesmo lugar. Não é um
 * esqueleto pulsando: é o conteúdo, sem cor. Quem quer LER não espera nada; a
 * cor entra depois e nada se move.
 *
 * `linguagemDe` fica aqui de propósito — é uma função de string, não pesa nada,
 * e quem a chama (`ItemDocs`) não deve ter de esperar o Prism pra saber o nome
 * de uma linguagem.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

const CodigoRealcado = React.lazy(() => import("./codigo-realce"));

/**
 * A linguagem, pelo nome do arquivo.
 *
 * Prism não adivinha, e passar `tsx` num arquivo `.css` produz um bloco sem
 * realce nenhum — silencioso, que é a pior forma de errar aqui.
 */
export function linguagemDe(caminho: string) {
  const ext = caminho.split(".").pop()?.toLowerCase();
  if (ext === "css") return "css";
  if (ext === "json") return "json";
  if (ext === "js" || ext === "jsx") return "jsx";
  return "tsx";
}

export interface CodigoProps {
  codigo: string;
  linguagem?: string;
  /**
   * Numera as linhas.
   *
   * Ligado no arquivo inteiro do registry, onde a numeração é o que permite
   * dizer "olha a linha 84" pra outra pessoa. Desligado no snippet de uso, que
   * tem cinco linhas e serve pra ser copiado — número ali só suja o `Ctrl+C` de
   * quem seleciona à mão em vez de usar o botão.
   */
  numerado?: boolean;
  className?: string;
}

/** O mesmo bloco, sem cor. É o que aparece enquanto o Prism não chegou. */
function Cru({ codigo, numerado, className }: CodigoProps) {
  const linhas = codigo.replace(/\n$/, "").split("\n");
  return (
    <pre className={cn("overflow-auto text-apoio leading-relaxed", className)}>
      <code className="font-mono">
        {linhas.map((linha, i) => (
          <div key={i}>
            {numerado ? (
              <span
                aria-hidden
                className="mr-4 inline-block w-8 select-none text-right text-muted-foreground/60 tabular-nums"
              >
                {i + 1}
              </span>
            ) : null}
            {linha || " "}
          </div>
        ))}
      </code>
    </pre>
  );
}

export function Codigo(props: CodigoProps) {
  return (
    <React.Suspense fallback={<Cru {...props} />}>
      <CodigoRealcado {...props} />
    </React.Suspense>
  );
}
