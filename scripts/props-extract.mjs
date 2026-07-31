#!/usr/bin/env node
/**
 * A tabela de props sai do fonte, não da mão de ninguém.
 *
 * Documentação escrita à mão para 47 itens envelhece na primeira semana: alguém
 * adiciona uma prop, esquece a tabela, e a doc passa a mentir — que é pior do
 * que não ter doc, porque quem lê confia. Aqui o `react-docgen-typescript` lê os
 * mesmos arquivos que o `shadcn add` entrega e extrai nome, tipo, obrigatoriedade,
 * padrão e o comentário que já está no código.
 *
 * Saída: `src/app/props.generated.json`, versionado de propósito — assim o build
 * do site não depende de rodar o TypeScript inteiro, e o diff do git mostra
 * quando a API pública de um item mudou. Roda no `ship`, antes do build.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import docgen from "react-docgen-typescript";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));

const parser = docgen.withCompilerOptions(
  {
    // `ts.JsxEmit.ReactJSX`, e não a string "react-jsx": o compilador aceita a
    // string só quando o tsconfig passa pelo parser dele. Passando o enum, o
    // programa é criado direto — sem isso, TODO item falhava com uma mensagem
    // sobre `parseJsonSourceFileConfigFileContent` e a saída vinha vazia.
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    skipLibCheck: true,
    baseUrl: ROOT,
    paths: { "@/*": ["./src/*"] },
  },
  {
    savePropValueAsString: true,
    // Props herdadas de HTMLAttributes são centenas e não dizem nada sobre a
    // peça: o que interessa é o que ESTE componente inventou.
    propFilter: (prop) =>
      !prop.parent || !/node_modules|@types\/react/.test(prop.parent.fileName),
    shouldExtractLiteralValuesFromEnum: true,
    shouldRemoveUndefinedFromOptional: true,
  },
);

const saida = {};
let comProps = 0;

for (const item of registry.items) {
  const arquivos = (item.files ?? [])
    .map((f) => f.path)
    .filter((p) => p.endsWith(".tsx") || p.endsWith(".ts"))
    .map((p) => join(ROOT, p));
  if (!arquivos.length) continue;

  let docs = [];
  try {
    docs = parser.parse(arquivos);
  } catch (err) {
    console.error(`  ! ${item.name}: ${err.message}`);
    continue;
  }

  const componentes = docs
    .map((d) => ({
      nome: d.displayName,
      descricao: d.description || null,
      props: Object.values(d.props ?? {})
        .map((p) => ({
          nome: p.name,
          tipo: p.type?.name ?? "unknown",
          obrigatoria: p.required,
          padrao: p.defaultValue?.value ?? null,
          descricao: p.description || null,
        }))
        .sort((a, b) => Number(b.obrigatoria) - Number(a.obrigatoria) || a.nome.localeCompare(b.nome)),
    }))
    .filter((c) => c.props.length || c.descricao);

  if (componentes.length) {
    saida[item.name] = componentes;
    comProps++;
  }
}

const destino = join(ROOT, "src", "app", "props.generated.json");
writeFileSync(destino, JSON.stringify(saida, null, 2) + "\n");

const totalProps = Object.values(saida).flatMap((cs) => cs.flatMap((c) => c.props)).length;
console.log(`props extraídas: ${totalProps} em ${comProps} itens → src/app/props.generated.json`);
