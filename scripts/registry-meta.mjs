#!/usr/bin/env node
/**
 * O que o agente precisa pra ESCOLHER a peça, escrito no `registry.json`.
 *
 * O MCP do shadcn busca no registry por nome e descrição. Isso acha o que a
 * pessoa pediu pelo nome, mas não ajuda o agente a decidir sozinho entre o
 * `confirm-morph`, o `hold-to-confirm` e o `slide-to-confirm`. Dois campos do
 * schema oficial resolvem:
 *
 *   categories  a família da peça (`controles`, `dados`, `3d`…) e as tags,
 *               pra busca por assunto.
 *   meta.uso    { quando, evite }, de `src/app/uso.json`: quando usar e qual
 *               peça usar no lugar. É o que as fichas `/r/<nome>.md` e o
 *               `llms.txt` mostram (ver `llms.mjs`).
 *
 * Roda no `build`, DEPOIS do `colheita-merge` (que regera os itens de colheita
 * e apagaria os campos). `--check` só confere, sem escrever.
 *
 *   node scripts/registry-meta.mjs
 *   node scripts/registry-meta.mjs --check
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const regPath = join(ROOT, "registry.json");
const original = readFileSync(regPath, "utf8");
const registry = JSON.parse(original);
const usoPath = join(ROOT, "src", "app", "uso.json");
const uso = existsSync(usoPath) ? JSON.parse(readFileSync(usoPath, "utf8")) : {};

const cat = readFileSync(join(ROOT, "src", "app", "catalog.tsx"), "utf8");
const bloco = cat.slice(cat.indexOf("export const CATALOG"));
const doCatalogo = new Map(
  [...bloco.matchAll(/^\s{4}name: "([^"]+)",([\s\S]*?)(?=^\s{4}name: "|^\];)/gm)].map(([, nome, corpo]) => [
    nome,
    {
      family: /family: "([^"]+)"/.exec(corpo)?.[1],
      tags: JSON.parse(/tags: (\[[^\]]*\])/.exec(corpo)?.[1] ?? "[]"),
    },
  ]),
);

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, "-");

const semUso = [];
for (const item of registry.items) {
  const c = doCatalogo.get(item.name);
  if (c?.family) item.categories = [...new Set([c.family, ...c.tags.map(slug)])];
  const u = uso[item.name];
  if (u?.quando) item.meta = { ...(item.meta ?? {}), uso: { quando: u.quando, evite: u.evite } };
  else semUso.push(item.name);
}

const novo = JSON.stringify(registry, null, 2) + "\n";
if (CHECK) {
  if (novo !== original) {
    console.error("✗ registry.json sem categories/meta.uso em dia. Rode: node scripts/registry-meta.mjs");
    process.exit(1);
  }
} else if (novo !== original) {
  writeFileSync(regPath, novo);
}
console.log(
  `registry-meta: ${registry.items.length} itens · ${registry.items.length - semUso.length} com "quando usar"` +
    (semUso.length ? ` · faltam: ${semUso.join(", ")}` : ""),
);
