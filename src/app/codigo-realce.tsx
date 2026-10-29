"use client";

/**
 * O motor do realce. Quem importa é o `codigo.tsx`, e sob demanda — ver lá.
 *
 * ── O código com realce ────────────────────────────────────────────────────
 *
 * A aba Código mostrava o arquivo do registry num `<pre>` cru. Não é uma
 * questão de enfeite: numa peça de 300 linhas sem cor nenhuma, achar onde a prop
 * é lida exige ler tudo. E a vitrine existe pra encurtar exatamente essa
 * distância — o código que ela mostra é o mesmo que o `add` grava, então ele
 * merece ser legível aqui e não só depois de instalado.
 *
 * ── Por que a paleta não vem de um tema pronto ──────────────────────────────
 *
 * Todo tema de realce traz o próprio fundo e as próprias cores. Numa página que
 * REPINTA INTEIRA quando se troca a marca no seletor, esse bloco seria a única
 * coisa na tela com cor própria — o mesmo problema que fez os logos de
 * dependência virarem máscara com `currentColor` em vez de `<img>` colorido.
 *
 * Então o fundo e o texto base saem dos tokens (`--card`, `--foreground`,
 * `--muted-foreground`), e só os tokens de sintaxe têm cor fixa. Essas são
 * funcionais, não decorativas: string tem de se distinguir de número em
 * qualquer marca, e é por isso que elas não obedecem à marca.
 *
 * ── E por que a escolha claro/escuro não olha a classe `.dark` ──────────────
 *
 * Marca de tema escuro não liga `.dark` — ela troca `--background` por uma cor
 * escura e pronto. Um par `dark:` aqui mostraria a paleta clara sobre papel
 * preto, que é o mesmo defeito que as capas do catálogo tiveram. Quem decide é
 * a luminância medida do fundo (`useFundoEscuro`).
 */

import * as React from "react";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { cn } from "@/lib/utils";
import { useFundoEscuro } from "./mosaic";
import type { CodigoProps } from "./codigo";

/** O que muda entre as duas paletas. O resto sai dos tokens da marca. */
const CLARO = {
  comentario: "#6a737d",
  palavra: "#8250df",
  texto: "#0a7d3f",
  numero: "#0550ae",
  funcao: "#6639ba",
  tag: "#116329",
  atributo: "#0550ae",
};

const ESCURO = {
  comentario: "#8b949e",
  palavra: "#ff7b72",
  texto: "#a5d6ff",
  numero: "#79c0ff",
  funcao: "#d2a8ff",
  tag: "#7ee787",
  atributo: "#79c0ff",
};

function temaDe(p: typeof CLARO): PrismTheme {
  return {
    // `transparent`: o fundo é do bloco, que é do tema da marca.
    plain: { color: "var(--foreground)", backgroundColor: "transparent" },
    styles: [
      { types: ["comment", "prolog", "doctype", "cdata"], style: { color: p.comentario, fontStyle: "italic" } },
      { types: ["punctuation", "operator"], style: { color: "var(--muted-foreground)" } },
      { types: ["keyword", "builtin", "atrule"], style: { color: p.palavra } },
      { types: ["string", "char", "attr-value", "inserted"], style: { color: p.texto } },
      { types: ["number", "boolean", "constant", "symbol"], style: { color: p.numero } },
      { types: ["function", "class-name", "maybe-class-name"], style: { color: p.funcao } },
      { types: ["tag", "selector"], style: { color: p.tag } },
      { types: ["attr-name", "property", "variable"], style: { color: p.atributo } },
      { types: ["deleted"], style: { color: "var(--destructive)" } },
    ],
  };
}

export default function CodigoRealcado({
  codigo,
  linguagem = "tsx",
  numerado = false,
  className,
}: CodigoProps) {
  const escuro = useFundoEscuro();
  const tema = React.useMemo(() => temaDe(escuro ? ESCURO : CLARO), [escuro]);

  return (
    <Highlight code={codigo.replace(/\n$/, "")} language={linguagem} theme={tema}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className={cn("overflow-auto text-casa-sm leading-relaxed", className)}>
          <code className="font-casa-mono">
            {tokens.map((linha, i) => (
              <div key={i} {...getLineProps({ line: linha })}>
                {numerado ? (
                  <span
                    aria-hidden
                    className="mr-4 inline-block w-8 select-none text-right text-casa-fg-3 tabular-nums"
                  >
                    {i + 1}
                  </span>
                ) : null}
                {linha.map((token, j) => (
                  <span key={j} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}
