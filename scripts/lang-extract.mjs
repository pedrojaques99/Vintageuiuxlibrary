#!/usr/bin/env node
/**
 * Em que linguagem cada item chega: React ou vanilla (TS/JS/CSS sem framework).
 *
 * A vitrine filtra por isso, e rótulo escrito à mão apodrece — a tag "vanilla"
 * já faltava no `css-color`, nos `anatomia-*` e no `motion-layer`. Então sai do
 * que o `registry.json` já diz:
 *
 * - **react**   algum arquivo é `.tsx`, importa `react`, ou o item declara
 *               `react` em `dependencies` (é o caso dos hooks `.ts`).
 * - **vanilla** tem código (`.ts`/`.js`/`.css`) ou é tema/base CSS, e nada acima.
 * - **outro**   sem código (as regras do agente, `.md`).
 *
 * Saída: `src/app/lang.generated.json` — `{ "<item>": "react" | "vanilla" | "outro" }`.
 * Item novo que ainda não passou por aqui cai em "react" na vitrine (é a maioria).
 *
 *   node scripts/lang-extract.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));

const IMPORTA_REACT = /from\s+["']react(?:\/[^"']*)?["']|from\s+["']@react-three\//;
const CODIGO = /\.(tsx?|jsx?|mjs|css)$/;

const ler = (p) => {
  try {
    return readFileSync(join(ROOT, p), "utf8");
  } catch {
    return "";
  }
};

const linguagem = (item) => {
  const paths = (item.files ?? []).map((f) => f.path);
  if (paths.some((p) => p.endsWith(".tsx") || p.endsWith(".jsx"))) return "react";
  if ((item.dependencies ?? []).some((d) => d === "react" || d.startsWith("@react-three/"))) return "react";
  if (paths.some((p) => CODIGO.test(p) && IMPORTA_REACT.test(ler(p)))) return "react";
  if (paths.some((p) => CODIGO.test(p))) return "vanilla";
  if (item.type === "registry:theme" || item.type === "registry:base") return "vanilla";
  return "outro";
};

const saida = Object.fromEntries(registry.items.map((i) => [i.name, linguagem(i)]));
writeFileSync(join(ROOT, "src", "app", "lang.generated.json"), JSON.stringify(saida, null, 2) + "\n");

const conta = Object.values(saida).reduce((acc, l) => ((acc[l] = (acc[l] ?? 0) + 1), acc), {});
console.log("lang-extract:", conta);
