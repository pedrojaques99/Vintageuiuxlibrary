#!/usr/bin/env node
/**
 * O catálogo da vitrine e o registry.json têm de falar do mesmo conjunto.
 *
 * São duas listas por necessidade: o `registry.json` descreve o que o
 * `shadcn add` instala (arquivos, dependências), e o `src/app/catalog.tsx`
 * descreve o que a vitrine mostra (demo viva, família, tamanho do palco). O que
 * não pode é uma crescer sem a outra:
 *
 * - item no registry e fora do catálogo → invisível. Alguém vai reescrever a
 *   peça sem saber que ela existe, que é exatamente o problema que a vitrine
 *   nasceu para resolver.
 * - item no catálogo e fora do registry → a vitrine mostra um `add` que falha.
 *   Pior que não mostrar: quebra a confiança no comando.
 *
 * Este script é o portão. Roda sozinho (`npm run check:catalog`) e dentro do
 * `npm run ship`. Não conserta nada — só diz onde as duas listas divergiram.
 *
 * Exceções conscientes vão em ALLOW_UNPUBLISHED, com o porquê escrito.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Itens que aparecem na vitrine sem existir no registry, de propósito.
 * Cada linha precisa de um motivo — sem motivo, é divergência, não exceção.
 */
const ALLOW_UNPUBLISHED = {
  "theme-visant": "cartão-guarda-chuva dos 21 temas de marca, publicados um a um pelo sync",
};

const FIX = process.argv.includes("--fix");

const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));
const catalogSrc = readFileSync(join(ROOT, "src", "app", "catalog.tsx"), "utf8");

// Só os `name:` de dentro do array CATALOG — o arquivo tem outros objetos acima.
const catalogBlock = catalogSrc.slice(catalogSrc.indexOf("export const CATALOG"));
const catalogNames = [...catalogBlock.matchAll(/^\s{4}name: "([^"]+)"/gm)].map((m) => m[1]);
const registryNames = registry.items.map((i) => i.name);

/*
 * A descrição é a mesma frase em dois arquivos — e divergiu.
 *
 * O `registry.json` é o que o mundo lê: aparece no `shadcn add`, na meta tag da
 * página do item e na imagem de prévia que circula no chat. O `catalog.tsx` é o
 * que a vitrine mostra. Escrever a frase duas vezes fez o público ficar com a
 * versão pior — sem acento e com recado interno ("colhido do visant-board").
 *
 * Aqui a versão do catálogo manda, porque é a escrita para gente ler. `--fix`
 * copia para o registry.
 */
const descricaoDoCatalogo = new Map(
  [...catalogBlock.matchAll(/^\s{4}name: "([^"]+)",[\s\S]*?^\s{4}description:\s*\n?\s*"((?:[^"\\]|\\.)*)"/gm)].map(
    (m) => [m[1], m[2].replace(/\\"/g, '"')],
  ),
);

const divergentes = [];
for (const item of registry.items) {
  const doCatalogo = descricaoDoCatalogo.get(item.name);
  if (!doCatalogo || doCatalogo === item.description) continue;
  if (FIX) item.description = doCatalogo;
  else divergentes.push(`${item.name}\n        registry: ${item.description}\n        catálogo: ${doCatalogo}`);
}

if (FIX && descricaoDoCatalogo.size) {
  writeFileSync(join(ROOT, "registry.json"), JSON.stringify(registry, null, 2) + "\n");
  console.log("descrições sincronizadas do catálogo para o registry.");
}

const dupes = catalogNames.filter((n, i) => catalogNames.indexOf(n) !== i);
const missingFromCatalog = registryNames.filter((n) => !catalogNames.includes(n));
const missingFromRegistry = catalogNames.filter(
  (n) => !registryNames.includes(n) && !ALLOW_UNPUBLISHED[n],
);

const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

const problems = [];
if (dupes.length) problems.push(["Nome repetido no catálogo", dupes]);
if (missingFromCatalog.length)
  problems.push(["No registry, invisível na vitrine (falta entrada em catalog.tsx)", missingFromCatalog]);
if (divergentes.length)
  problems.push(["Descrição diferente entre catálogo e registry", divergentes]) && null;
if (missingFromRegistry.length)
  problems.push(["Na vitrine, sem item no registry (o `add` vai falhar)", missingFromRegistry]);

console.log(
  c.dim(
    `catálogo: ${catalogNames.length} entradas · registry: ${registryNames.length} itens · exceções: ${
      Object.keys(ALLOW_UNPUBLISHED).length
    }`,
  ),
);

if (!problems.length) {
  console.log(c.green("✓ catálogo e registry combinam"));
  process.exit(0);
}

for (const [title, names] of problems) {
  console.error(c.red(`✗ ${title}:`));
  for (const n of names) console.error(`    ${n}`);
}
process.exit(1);
