#!/usr/bin/env node
/**
 * Folha de contato: o ladrilho de cada peça pedida, vivo, numa imagem só.
 *
 * Serve pra revisar uma colheita de olho, de uma vez — doze peças novas abertas
 * uma a uma são doze rotas, doze esperas e nenhuma comparação. Aqui elas saem
 * lado a lado, no ladrilho real da grade (marca, palco, escala), depois de a
 * peça pintar.
 *
 *   node scripts/folha-de-contato.mjs <saida.png> nome nome nome…
 *   node scripts/folha-de-contato.mjs <saida.png> --colheita   # os de colheita/*.json
 *   node scripts/folha-de-contato.mjs <saida.png> --todas      # o acervo inteiro, 6 colunas
 *
 * Precisa do dev server no ar (BASE, padrão http://localhost:5182).
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE ?? "http://localhost:5182";
const [saida, ...resto] = process.argv.slice(2);
if (!saida) {
  console.error("uso: node scripts/folha-de-contato.mjs <saida.png> nome… | --colheita");
  process.exit(1);
}

let nomes = resto.filter((a) => !a.startsWith("--"));
const catalogoSrc = readFileSync(join(ROOT, "src", "app", "catalog.tsx"), "utf8");
const doCatalogo = [
  ...catalogoSrc
    .slice(catalogoSrc.indexOf("export const CATALOG"))
    .matchAll(/^\s{4}name: "([^"]+)",[\s\S]*?family: "([^"]+)"[\s\S]*?(?=^\s{4}name: "|^\];)/gm),
].map((m) => ({ nome: m[1], familia: m[2], comDemo: /\n\s{4}demo: /.test(m[0]) }));
if (resto.includes("--todas")) nomes = doCatalogo.filter((c) => c.comDemo).map((c) => c.nome);
const COLUNAS = resto.includes("--todas") ? 6 : 4;
if (resto.includes("--colheita")) {
  nomes = readdirSync(join(ROOT, "colheita"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(ROOT, "colheita", f), "utf8")).catalogo.name);
}
const familia = Object.fromEntries(doCatalogo.map((c) => [c.nome, c.familia]));

const nav = await chromium.launch();
const pagina = await nav.newPage({ viewport: { width: 1440, height: 900 } });
const fotos = [];
for (const nome of nomes) {
  const fam = familia[nome];
  await pagina.goto(`${BASE}/catalogo/${fam ?? ""}`, { waitUntil: "domcontentloaded" });
  const card = pagina.locator(`article[data-name="${nome}"]`);
  try {
    await card.scrollIntoViewIfNeeded({ timeout: 8000 });
    await pagina.waitForTimeout(1800);
    fotos.push({ nome, dados: (await card.screenshot()).toString("base64") });
  } catch (e) {
    fotos.push({ nome, erro: String(e.message).slice(0, 80) });
  }
}

const html = `<html><body style="margin:0;background:#0a0a0a;font:12px system-ui;color:#aaa;display:grid;grid-template-columns:repeat(${COLUNAS},1fr);gap:8px;padding:8px">${fotos
  .map((f) =>
    f.dados
      ? `<figure style="margin:0"><img style="width:100%;border-radius:10px" src="data:image/png;base64,${f.dados}"><figcaption>${f.nome}</figcaption></figure>`
      : `<figure style="margin:0;color:#f66">${f.nome}: ${f.erro}</figure>`,
  )
  .join("")}</body></html>`;
const folha = await nav.newPage({ viewport: { width: 1600, height: 400 } });
await folha.setContent(html);
await folha.screenshot({ path: saida, fullPage: true });
await nav.close();
console.log(`folha: ${fotos.length} peças → ${saida}`);
