#!/usr/bin/env node
/**
 * As peças de cada kit, lidas do que a sala IMPORTA — não da família.
 *
 * O kit derivava as peças da família do catálogo (`familias: ["trabalho"]`).
 * Valia enquanto família e sala eram a mesma lista. A colheita de 2026-10 pôs
 * 24 peças novas nas famílias, e o comando único da Mesa de trabalho passou a
 * instalar 34 peças — carrossel 3D, livro, torno — que a sala nem monta. A
 * promessa do kit é "estas são as peças desta tela"; a única fonte honesta disso
 * é o import da composição.
 *
 * Lê cada composição, resolve cada import de `registry/` para o item do
 * `registry.json` que declara aquele arquivo, e grava
 * `src/app/kits.generated.json`: `{ "<slug>": ["item", …] }`.
 *
 *   node scripts/kits-pecas.mjs           # grava
 *   node scripts/kits-pecas.mjs --check   # falha se o gerado envelheceu
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = join(ROOT, "src", "app", "kits.generated.json");

/* Sala → arquivo da composição. Lido de `kits.tsx` (o `import()` de cada uma). */
const kitsSrc = readFileSync(join(ROOT, "src", "app", "kits.tsx"), "utf8");
const salas = [
  ...kitsSrc.matchAll(/slug: "([^"]+)"[\s\S]*?Composicao: React\.lazy\(\(\) => import\("([^"]+)"\)\)/g),
].map(([, slug, caminho]) => ({ slug, arquivo: join(ROOT, "src", "app", `${caminho}.tsx`) }));

/* Caminho de arquivo do registry → nome do item. */
const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));
const dono = new Map();
for (const item of registry.items)
  for (const f of item.files ?? []) dono.set(normalize(join(ROOT, f.path)).toLowerCase(), item.name);

const resolver = (base, spec) => {
  const bruto = normalize(join(dirname(base), spec));
  for (const c of [bruto, `${bruto}.tsx`, `${bruto}.ts`, join(bruto, "index.tsx"), join(bruto, "index.ts")])
    if (dono.has(c.toLowerCase())) return dono.get(c.toLowerCase());
  return null;
};

const saida = {};
for (const { slug, arquivo } of salas) {
  if (!existsSync(arquivo)) {
    console.error(`kit ${slug}: composição não encontrada (${arquivo})`);
    process.exit(1);
  }
  const nomes = new Set();
  const lerImports = (arq) => {
    const src = readFileSync(arq, "utf8");
    for (const [, spec] of src.matchAll(/from "([^"]*registry\/[^"]+)"/g)) {
      const nome = resolver(arq, spec);
      if (nome) nomes.add(nome);
    }
    return src;
  };
  const src = lerImports(arquivo);
  /* Um nível de demo: a Mesa monta o board pelo `import("../demos/kanban-demo")`,
     e é a demo que importa o kanban do registry. */
  for (const [, spec] of src.matchAll(/(?:from |import\()"(\.\.?\/[^"]*demos\/[^"]+)"/g)) {
    const demo = normalize(join(dirname(arquivo), spec));
    const alvo = [`${demo}.tsx`, `${demo}.ts`].find((c) => existsSync(c));
    if (alvo) lerImports(alvo);
  }
  saida[slug] = [...nomes].sort();
}

const texto = JSON.stringify(saida, null, 2) + "\n";
if (process.argv.includes("--check")) {
  const atual = existsSync(SAIDA) ? readFileSync(SAIDA, "utf8") : "";
  if (atual !== texto) {
    console.error("kits.generated.json envelheceu: rode node scripts/kits-pecas.mjs");
    process.exit(1);
  }
  console.log("✓ peças dos kits batem com os imports das salas");
} else {
  writeFileSync(SAIDA, texto);
  for (const [slug, nomes] of Object.entries(saida)) console.log(`${slug}: ${nomes.length} peças`);
}
