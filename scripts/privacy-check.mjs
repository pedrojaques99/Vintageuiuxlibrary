#!/usr/bin/env node
/**
 * Nenhuma marca de cliente pode estar em `public/`.
 *
 * O que este portão evita já aconteceu: o sync compilava as 22 marcas do vault
 * pessoal direto para `public/r/`, e o deploy servia tudo — nome, tagline, logo,
 * paleta, completude — num domínio aberto, com CORS liberado para qualquer
 * origem. Carteira de clientes legível por quem soubesse a URL.
 *
 * Só passam:
 *   · `visant`      a marca da casa
 *   · `demo-*`      as fictícias de `scripts/demo-brands.mjs`
 *
 * Roda no `ship`, antes de qualquer build. Falhar aqui é barato; um `theme-<seu
 * cliente>.json` indexado pelo Google, não.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const R_DIR = join(ROOT, "public", "r");

/*
 * Quem pode: a casa, mais exatamente as fictícias declaradas em
 * `demo-brands.json`.
 *
 * A lista sai do próprio arquivo gerado por `scripts/demo-brands.mjs`, e não de
 * um prefixo no nome: convenção de nome é fácil de imitar sem querer, e o
 * compilador deriva o slug do nome da marca — "Norte Verde" vira `norte-verde`,
 * não `demo-norte-verde`. Assim, marca que aparecer em `public/` sem ter sido
 * inventada aqui é flagrada, seja qual for o nome.
 */
const demoDeclaradas = existsSync(join(R_DIR, "demo-brands.json"))
  ? JSON.parse(readFileSync(join(R_DIR, "demo-brands.json"), "utf8")).map((b) => b.slug)
  : [];

const PERMITIDOS = (slug) => slug === "visant" || demoDeclaradas.includes(slug);

const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

const vazando = readdirSync(R_DIR)
  .filter((f) => f.startsWith("theme-") && f.endsWith(".json"))
  .map((f) => f.replace(/^theme-|\.json$/g, ""))
  .filter((slug) => !PERMITIDOS(slug));

const indice = existsSync(join(R_DIR, "brands.json"))
  ? JSON.parse(readFileSync(join(R_DIR, "brands.json"), "utf8"))
  : { brands: [] };

const noIndice = (indice.brands ?? []).map((b) => b.slug).filter((slug) => !PERMITIDOS(slug));

/*
 * A direção oposta, que já quebrou app de cliente em produção.
 *
 * O índice é montado juntando as publicáveis do vault com `demo-brands.json`,
 * mas os `theme-<slug>.json` das fictícias são escritos por outro script
 * (`demo-brands.mjs`). Publicar o índice sem os arquivos deixa quatro marcas
 * no seletor e um tema no ar: clicar em qualquer outra devolve 404 e derruba
 * o provider do lado de lá.
 *
 * Aqui é o lugar de barrar: roda antes do build, lê os dois lados e não
 * depende de ninguém lembrar de rodar o gerador.
 */
const semArquivo = (indice.brands ?? [])
  .filter((b) => !existsSync(join(R_DIR, `${b.theme}.json`)))
  .map((b) => `${b.slug} (${b.theme}.json)`);

if (!vazando.length && !noIndice.length && !semArquivo.length) {
  console.log(
    c.green(`✓ público limpo — ${(indice.brands ?? []).length} marca(s), nenhuma de cliente`),
  );
  process.exit(0);
}

if (semArquivo.length) {
  console.error(c.red("✗ marca no índice sem o tema publicado:"));
  console.error(`    ${semArquivo.join(", ")}`);
  console.error(c.dim("\n  Rode `node scripts/demo-brands.mjs` (fictícias) ou `npm run sync:brands`."));
  if (!vazando.length && !noIndice.length) process.exit(1);
}

console.error(c.red("✗ dado de cliente em public/:"));
if (vazando.length) console.error(`    temas: ${vazando.join(", ")}`);
if (noIndice.length) console.error(`    índice: ${noIndice.join(", ")}`);
console.error(
  c.dim(
    "\n  As marcas do vault são compiladas para .brands-local/ (fora do git).\n" +
      "  Para publicar uma de propósito, inclua o slug em PUBLICAVEIS no brands-sync.mjs.",
  ),
);
process.exit(1);
