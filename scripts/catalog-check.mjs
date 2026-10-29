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

/*
 * A família é o eixo "o que é isso?" (ver FAMILIES em catalog.tsx). Duas
 * regras seguram a barra de abas honesta: família tem de existir, e o que não
 * tem interface (hook, tema, CSS base, regra) mora em Fundação — senão volta a
 * aba que mistura peça com utilitário. `lib` fica livre: há web component com
 * demo (fader, tempo-bar) que é controle de verdade.
 */
const familiasValidas = [
  ...catalogSrc
    .slice(catalogSrc.indexOf("export const FAMILIES"), catalogSrc.indexOf("export const MIN_ABA"))
    .matchAll(/key:\s*"([^"]+)"/g),
].map((m) => m[1]);
const SEM_INTERFACE = ["hook", "theme", "base", "item"];
const itens = [
  ...catalogBlock.matchAll(
    /^\s{4}name: "([^"]+)",(?:(?!\n\s{4}name: ")[\s\S])*?type: "([^"]+)",(?:(?!\n\s{4}name: ")[\s\S])*?family: "([^"]+)"/gm,
  ),
].map(([, name, type, family]) => ({ name, type, family }));
const familiaInvalida = itens
  .filter((i) => !familiasValidas.includes(i.family))
  .map((i) => `${i.name}: "${i.family}"`);
const foraDaFundacao = itens
  .filter((i) => SEM_INTERFACE.includes(i.type) && i.family !== "fundacao")
  .map((i) => `${i.name} (${i.type}) em "${i.family}"`);
const semFamilia = catalogNames.filter((n) => !itens.some((i) => i.name === n));

/*
 * O site é pré-renderizado: só existe HTML pra família atual. O nome antigo
 * (`/catalogo/shaders`) só abre se a Vercel redirecionar — a `FAMILIA_ANTIGA`
 * resolve dentro do app, mas o link de fora bate no 404 antes do app carregar.
 */
const vercel = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
const antigas = [
  ...catalogSrc
    .slice(catalogSrc.indexOf("export const FAMILIA_ANTIGA"), catalogSrc.indexOf("const ALIAS"))
    .matchAll(/^\s+"?([\w-]+)"?:\s*"([^"]+)"/gm),
].map(([, de, para]) => ({ de, para }));
const semRedirect = antigas
  .filter(
    ({ de, para }) =>
      !(vercel.redirects ?? []).some(
        (r) => r.source === `/catalogo/${de}` && r.destination === `/catalogo/${para}`,
      ),
  )
  .map(({ de, para }) => `/catalogo/${de} → /catalogo/${para}`);
const redirectPraFamiliaMorta = (vercel.redirects ?? [])
  .filter((r) => r.destination.startsWith("/catalogo/"))
  .filter((r) => !familiasValidas.includes(r.destination.slice("/catalogo/".length)))
  .map((r) => `${r.source} → ${r.destination}`);

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
if (!familiasValidas.length) problems.push(["FAMILIES não lida de catalog.tsx — o formato mudou?", ["-"]]);
if (semFamilia.length) problems.push(["Sem type/family legível no catálogo", semFamilia]);
if (familiaInvalida.length) problems.push(["Família fora de FAMILIES", familiaInvalida]);
if (foraDaFundacao.length) problems.push(["Sem interface própria e fora de Fundação", foraDaFundacao]);
if (!antigas.length) problems.push(["FAMILIA_ANTIGA não lida de catalog.tsx — o formato mudou?", ["-"]]);
if (semRedirect.length) problems.push(["Família antiga sem redirect no vercel.json (link velho dá 404)", semRedirect]);
if (redirectPraFamiliaMorta.length)
  problems.push(["Redirect no vercel.json pra família que não existe mais", redirectPraFamiliaMorta]);

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
