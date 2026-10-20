#!/usr/bin/env node
/**
 * Registra uma colheita feita em paralelo: lê `colheita/*.json` e escreve nos
 * três arquivos compartilhados de uma vez — catálogo, registry e atribuições.
 *
 * Existe porque a colheita é feita por vários agentes ao mesmo tempo, e o
 * contrato deles é de posse exclusiva: cada um só cria os SEUS arquivos (peça,
 * demo, fragmento) e nenhum toca em `catalog.tsx`, `registry.json` ou
 * `ATTRIBUTIONS.md`. Dois agentes editando o catálogo é o `Edit` de um apagando
 * o do outro sem erro nenhum. Quem junta é este script, uma vez, no fim.
 *
 * Idempotente: rodar de novo substitui a entrada pelo nome, não duplica.
 *
 * Formato do fragmento (`colheita/<nome>.json`):
 *   { catalogo: { name, title, type, family, description, tags, demoImport,
 *                 knobs?, preview }, registry: { …item do registry… },
 *     atribuicao: string|null, inspiracao: string|null,
 *     palcoCheck?: string }   // exceção escrita do palco-check, com motivo
 *
 *   node scripts/colheita-merge.mjs            # aplica
 *   node scripts/colheita-merge.mjs --dry      # só mostra o que faria
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "colheita");
const SECO = process.argv.includes("--dry");
const AUTOR = "Visant Labs <visantsupply@gmail.com>";

if (!existsSync(DIR)) {
  console.error("sem pasta colheita/");
  process.exit(1);
}

const fragmentos = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ arquivo: f, ...JSON.parse(readFileSync(join(DIR, f), "utf8")) }));

const erros = [];
for (const f of fragmentos) {
  const c = f.catalogo;
  if (!c?.name || !c.title || !c.family || !c.description || !c.demoImport || !c.preview)
    erros.push(`${f.arquivo}: catálogo incompleto`);
  if (!f.registry?.files?.length) erros.push(`${f.arquivo}: registry sem files`);
  for (const arq of f.registry?.files ?? [])
    if (!existsSync(join(ROOT, arq.path))) erros.push(`${f.arquivo}: falta ${arq.path}`);
  if (!existsSync(join(ROOT, "src", "app", `${c?.demoImport?.replace("./", "")}.tsx`)))
    erros.push(`${f.arquivo}: falta a demo ${c?.demoImport}`);
  if (!f.atribuicao && !f.inspiracao) erros.push(`${f.arquivo}: sem atribuição nem inspiração`);
  if (/—/.test(c?.description ?? "")) erros.push(`${f.arquivo}: travessão na descrição`);
}
if (erros.length) {
  console.error(erros.join("\n"));
  process.exit(1);
}

const pascal = (s) => s.replace(/(^|-)(\w)/g, (_, __, l) => l.toUpperCase());
const js = (v) => JSON.stringify(v);

// --- catalog.tsx ------------------------------------------------------------

const catPath = join(ROOT, "src", "app", "catalog.tsx");
let cat = readFileSync(catPath, "utf8");

for (const f of fragmentos) {
  const c = f.catalogo;
  const demo = `${pascal(c.name)}ColheitaDemo`;
  const linhaImport = `const ${demo} = React.lazy(() => import(${js(c.demoImport)}));`;
  if (!cat.includes(linhaImport)) {
    const ultimas = [...cat.matchAll(/^const \w+ = React\.lazy\(\(\) => import\("\.\/demos\/[^"]+"\)\);$/gm)];
    const fim = ultimas.at(-1);
    const pos = fim.index + fim[0].length;
    cat = cat.slice(0, pos) + "\n" + linhaImport + cat.slice(pos);
  }

  const entrada = [
    "  {",
    // A exceção do `palco-check` mora no fragmento: rodar o merge de novo
    // regera a entrada, e um comentário escrito à mão no catálogo sumiria.
    `    name: ${js(c.name)},`,
    // Depois do `name`: o palco-check fatia o catálogo a partir dessa linha.
    f.palcoCheck ? `    // palco-check: ${f.palcoCheck}` : null,
    `    title: ${js(c.title)},`,
    `    type: ${js(c.type ?? "ui")},`,
    `    family: ${js(c.family)},`,
    `    description:\n      ${js(c.description)},`,
    `    tags: ${js(c.tags ?? [])},`,
    `    demo: ${demo},`,
    c.knobs ? `    knobs: ${js(c.knobs)},` : null,
    `    preview: { w: ${c.preview.w}, h: ${c.preview.h} },`,
    "  },",
  ]
    .filter(Boolean)
    .join("\n");

  const inicio = cat.indexOf("export const CATALOG");
  const existente = new RegExp(`\\n  \\{\\n    name: ${js(c.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},[\\s\\S]*?\\n  \\},`);
  const corpo = cat.slice(inicio);
  if (existente.test(corpo)) {
    cat = cat.slice(0, inicio) + corpo.replace(existente, "\n" + entrada);
  } else {
    const fimArray = cat.indexOf("\n];", inicio);
    cat = cat.slice(0, fimArray) + "\n" + entrada + cat.slice(fimArray);
  }
}

// --- registry.json ----------------------------------------------------------

const regPath = join(ROOT, "registry.json");
const reg = JSON.parse(readFileSync(regPath, "utf8"));
for (const f of fragmentos) {
  const item = { ...f.registry, author: AUTOR };
  const i = reg.items.findIndex((x) => x.name === item.name);
  if (i >= 0) reg.items[i] = item;
  else reg.items.push(item);
}

// --- ATTRIBUTIONS.md ---------------------------------------------------------

const attPath = join(ROOT, "ATTRIBUTIONS.md");
let att = readFileSync(attPath, "utf8");
const MARCA = "<!-- colheita-arc-bencho -->";
const mit = fragmentos.filter((f) => f.atribuicao).map((f) => `- \`${f.catalogo.name}\`: ${f.atribuicao}`);
const limpa = fragmentos.filter((f) => f.inspiracao && !f.atribuicao).map((f) => `- \`${f.catalogo.name}\`: ${f.inspiracao}`);
const bloco = [
  MARCA,
  "",
  "## Colheita Arc + Bencho (2026-10)",
  "",
  "Adaptados de componentes MIT, com o aviso de copyright mantido:",
  "",
  ...mit,
  "",
  "Refeitos em sala limpa (código próprio, a partir só da interação pública; nenhum código de origem lido):",
  "",
  ...limpa,
  "",
  "Licença dos originais adaptados (MIT, texto integral):",
  "",
  "```",
  "MIT License",
  "",
  "Copyright (c) 2026 Elia Kuratli",
  "",
  "Permission is hereby granted, free of charge, to any person obtaining a copy",
  "of this software and associated documentation files (the \"Software\"), to deal",
  "in the Software without restriction, including without limitation the rights",
  "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
  "copies of the Software, and to permit persons to whom the Software is",
  "furnished to do so, subject to the following conditions:",
  "",
  "The above copyright notice and this permission notice shall be included in all",
  "copies or substantial portions of the Software.",
  "",
  "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR",
  "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
  "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
  "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
  "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
  "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
  "SOFTWARE.",
  "```",
  MARCA,
].join("\n");
att = att.includes(MARCA)
  ? att.replace(new RegExp(`${MARCA}[\\s\\S]*${MARCA}`), bloco)
  : `${att.trimEnd()}\n\n${bloco}\n`;

if (SECO) {
  console.log(`[dry] ${fragmentos.length} fragmentos: ${fragmentos.map((f) => f.catalogo.name).join(", ")}`);
  process.exit(0);
}
writeFileSync(catPath, cat);
writeFileSync(regPath, JSON.stringify(reg, null, 2) + "\n");
writeFileSync(attPath, att);
console.log(`colheita: ${fragmentos.length} peças registradas (${mit.length} MIT, ${limpa.length} sala limpa)`);
console.log("próximo: npm run build:novidades, catalog-check, deps-check, tsc, check:palco, build:shots");
