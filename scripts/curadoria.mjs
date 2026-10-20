#!/usr/bin/env node
/**
 * O placar da curadoria, e a exclusão de vez — só quando pedida duas vezes.
 *
 *   npm run curadoria                          # placar: notas, arquivadas, sem nota
 *   npm run curadoria -- --excluir             # mostra o que SERIA apagado (seco)
 *   npm run curadoria -- --excluir --confirmo  # apaga de verdade
 *
 * Excluir apaga a peça do repo inteiro: os arquivos do item no registry, a
 * demo, a entrada do catálogo, o item do `registry.json`, as fotos e o
 * fragmento de colheita. É irreversível fora do git, por isso o modo padrão é
 * seco e a exclusão real exige `--confirmo`. E recusa apagar peça que outro
 * arquivo ainda importa (um kit, outra peça): apagar ali quebraria o build.
 */

import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NOTA_DE_CORTE, arquivada, lerNotas, renderMarkdown } from "./vite-curadoria.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const notas = lerNotas(ROOT);
const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));
const catPath = join(ROOT, "src", "app", "catalog.tsx");
let cat = readFileSync(catPath, "utf8");
const doCatalogo = [...cat.slice(cat.indexOf("export const CATALOG")).matchAll(/^\s{4}name: "([^"]+)"/gm)].map((m) => m[1]);

if (!args.includes("--excluir")) {
  const avaliadas = Object.keys(notas);
  const semNota = doCatalogo.filter((n) => !notas[n]);
  const fora = avaliadas.filter((n) => arquivada(notas[n]));
  const media = avaliadas.length
    ? (avaliadas.reduce((s, n) => s + notas[n].nota, 0) / avaliadas.length).toFixed(1)
    : "—";
  console.log(`acervo: ${doCatalogo.length} peças · avaliadas ${avaliadas.length} (média ${media}) · sem nota ${semNota.length}`);
  console.log(`fora da vitrine: ${fora.length} (nota ≤ ${NOTA_DE_CORTE} ou marcadas pra excluir)\n`);
  for (const [n, v] of Object.entries(notas).sort((a, b) => b[1].nota - a[1].nota)) {
    const marca = v.excluir ? "EXCLUIR " : arquivada(v) ? "arquivada" : "";
    console.log(`  ${"★".repeat(v.nota).padEnd(5, "·")} ${n.padEnd(26)} ${marca.padEnd(9)} ${v.comentario ?? ""}`);
  }
  if (semNota.length) console.log(`\nsem nota: ${semNota.join(", ")}`);
  writeFileSync(join(ROOT, "curadoria", "CURADORIA.md"), renderMarkdown(notas));
  process.exit(0);
}

// --- excluir ------------------------------------------------------------------

const alvos = Object.entries(notas).filter(([, v]) => v.excluir).map(([n]) => n);
if (!alvos.length) {
  console.log("nenhuma peça marcada pra excluir.");
  process.exit(0);
}
const REAL = args.includes("--confirmo");

const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    if (/node_modules|\.git|dist|public/.test(p)) return [];
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs|css)$/.test(f) ? [p] : [];
  });
const fontes = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "registry"))];

const recusas = [];
const plano = [];
for (const nome of alvos) {
  const item = registry.items.find((i) => i.name === nome);
  const arquivos = (item?.files ?? []).map((f) => join(ROOT, f.path));
  const demoImport = cat.match(new RegExp(`const (\\w+) = React\\.lazy\\(\\(\\) => import\\("(\\./demos/[^"]+)"\\)\\);[\\s\\S]*?name: "${nome}"`));
  // A demo é procurada SÓ dentro da entrada: peça com demo escrita no próprio
  // catálogo (`demo: () => (...)`) não tem const, e a busca solta ia achar a
  // demo da peça SEGUINTE e apagá-la (o octahedron-loader levaria a do
  // turbulence-field).
  const iniEntrada = cat.indexOf(`name: "${nome}",`);
  const entrada = iniEntrada < 0 ? "" : cat.slice(iniEntrada, cat.indexOf("\n  },", iniEntrada));
  const demoArq = entrada.match(/demo: (\w+),/);
  const linhaDemo = demoArq ? cat.match(new RegExp(`const ${demoArq[1]} = React\\.lazy\\(\\(\\) => import\\("(\\./demos/[^"]+)"\\)\\);`)) : null;
  const demo = linhaDemo ? join(ROOT, "src", "app", `${linhaDemo[1]}.tsx`) : null;
  // Quem ainda importa os arquivos do item (fora a própria demo e o catálogo)?
  const usadoPor = fontes.filter((f) => {
    if (arquivos.includes(f) || f === demo || f === catPath) return false;
    const src = readFileSync(f, "utf8");
    return arquivos.some((a) => {
      const base = a.replace(/\.(tsx?|css)$/, "").replace(/\\/g, "/").split("/registry/")[1];
      return base && src.includes(`registry/${base}`);
    });
  });
  if (usadoPor.length) {
    recusas.push(`${nome}: ainda importada por ${usadoPor.map((f) => relative(ROOT, f)).join(", ")}`);
    continue;
  }
  plano.push({ nome, arquivos, demo, linhaDemo: linhaDemo?.[0], demoConst: demoArq?.[1] });
  void demoImport;
}

for (const r of recusas) console.log(`RECUSADA ${r}`);
for (const p of plano) {
  console.log(`${REAL ? "apagando" : "apagaria"} ${p.nome}:`);
  for (const a of [...p.arquivos, p.demo].filter(Boolean)) console.log(`   ${relative(ROOT, a)}`);
}
if (!REAL) {
  console.log(`\n(seco) rode de novo com --confirmo pra apagar ${plano.length} peça(s).`);
  process.exit(0);
}

for (const p of plano) {
  for (const a of [...p.arquivos, p.demo].filter(Boolean)) if (existsSync(a)) rmSync(a);
  for (const t of ["claro", "escuro"]) rmSync(join(ROOT, "public", "shots", `${p.nome}-${t}.webp`), { force: true });
  rmSync(join(ROOT, "colheita", `${p.nome}.json`), { force: true });
  if (p.linhaDemo) cat = cat.replace(`\n${p.linhaDemo}`, "");
  cat = cat.replace(new RegExp(`\\n  \\{\\n(?:    //[^\\n]*\\n)*    name: "${p.nome}",[\\s\\S]*?\\n  \\},`), "");
  registry.items = registry.items.filter((i) => i.name !== p.nome);
  delete notas[p.nome];
}
writeFileSync(catPath, cat);
writeFileSync(join(ROOT, "registry.json"), JSON.stringify(registry, null, 2) + "\n");
writeFileSync(join(ROOT, "curadoria", "notas.json"), JSON.stringify(notas, null, 2) + "\n");
writeFileSync(join(ROOT, "curadoria", "CURADORIA.md"), renderMarkdown(notas));
console.log(`\n${plano.length} peça(s) excluída(s). Rode: npx tsc --noEmit, catalog-check, e os testes.`);
