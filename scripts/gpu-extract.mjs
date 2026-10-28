#!/usr/bin/env node
/**
 * Quais peças abrem contexto WebGL, e quantos.
 *
 * A grade limita quantas peças de GPU ficam vivas ao mesmo tempo (o Chrome
 * derruba o contexto mais antigo a partir de ≈16, no celular bem antes), e para
 * isso precisa saber quem é de GPU. Lista à mão apodrece na primeira peça nova,
 * então ela sai do código:
 *
 * - **Estático.** Segue a cadeia de `registryDependencies` de cada item, os
 *   imports relativos de cada arquivo e a demo da vitrine
 *   (`src/app/demos/<nome>-demo.tsx`), procurando three, r3f ou `getContext("webgl")`.
 *   Os `shader-*` não importam three, só o WebGL cru, e é por isso que a regra
 *   olha o `getContext` também.
 * - **Peso medido, quando há.** A `book-shelf` abre 4 contextos sozinha. O
 *   peso é o maior número de contextos medido em `perf/pecas-*.json` (ou o já
 *   gravado no arquivo de saída). Sem medição nenhuma, o peso é 1.
 *
 * Saída: `src/app/gpu.generated.json` — `{ "<item>": { contextos, pesada } }`.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));
const porNome = new Map(registry.items.map((i) => [i.name, i]));

const GPU = /getContext\(\s*["'`]webgl|@react-three\/fiber|from\s+["']three["']|WebGLRenderer/;
const IMPORT_RELATIVO = /(?:import|from)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g;

const nomeDoItem = (dep) => {
  if (dep.startsWith("@visant/")) return dep.slice("@visant/".length);
  const url = dep.match(/^https?:\/\/.+\/r\/(.+)\.json$/);
  return url ? url[1] : null;
};

const EXT = ["", ".tsx", ".ts", "/index.tsx", "/index.ts"];
const resolverArquivo = (base) => EXT.map((e) => base + e).find((p) => existsSync(p) && statSync(p).isFile());

/*
 * Só código de peça conta: o registry e as demos. A demo importa o catálogo da
 * vitrine (tipos, fixtures), e seguir por ali chegava no `deps.generated.json`,
 * que tem o texto "three", e marcava o acervo inteiro como GPU.
 */
const DE_PECA = /[\\/](registry|src[\\/]app[\\/]demos)[\\/].+\.(tsx?|mjs|js)$/;

const cacheArquivo = new Map();
/** O arquivo, ou algo que ele importa por caminho relativo, toca a GPU? */
function arquivoUsaGpu(caminho, vistos = new Set()) {
  if (!caminho || vistos.has(caminho) || !DE_PECA.test(caminho)) return false;
  vistos.add(caminho);
  if (cacheArquivo.has(caminho)) return cacheArquivo.get(caminho);
  const src = readFileSync(caminho, "utf8");
  let usa = GPU.test(src);
  for (const [, rel] of src.matchAll(IMPORT_RELATIVO)) {
    if (usa) break;
    usa = arquivoUsaGpu(resolverArquivo(join(dirname(caminho), rel)), vistos);
  }
  cacheArquivo.set(caminho, usa);
  return usa;
}

function itemUsaGpu(nome, vistos = new Set()) {
  if (vistos.has(nome)) return false;
  vistos.add(nome);
  const item = porNome.get(nome);
  if (!item) return false;
  if ((item.files ?? []).some((f) => arquivoUsaGpu(join(ROOT, f.path)))) return true;
  return (item.registryDependencies ?? []).some((d) => {
    const alvo = nomeDoItem(d);
    return alvo ? itemUsaGpu(alvo, vistos) : false;
  });
}

/*
 * O que a medição sabe de cada peça, somando todas as rodadas de
 * `perf/pecas-*.json`: o maior número de contextos e se ela é PESADA (perde
 * `PESADA_PCT`% ou mais dos quadros sozinha, na CPU da medição). O ponto de
 * partida é o arquivo já gravado: o build da Vercel não tem `perf/`, e sem isso
 * ele esqueceria a medição.
 */
const PESADA_PCT = 20;
const DESTINO = join(ROOT, "src", "app", "gpu.generated.json");
const medido = existsSync(DESTINO) ? JSON.parse(readFileSync(DESTINO, "utf8")) : {};
const PERF = join(ROOT, "perf");
if (existsSync(PERF)) {
  for (const f of readdirSync(PERF).filter((f) => f.startsWith("pecas-"))) {
    for (const r of JSON.parse(readFileSync(join(PERF, f), "utf8")).res ?? []) {
      if (!r.webgl) continue;
      const m = (medido[r.nome] ??= { contextos: 1, pesada: false });
      m.contextos = Math.max(m.contextos, r.webgl);
      m.pesada ||= (r.lentosPct ?? 0) >= PESADA_PCT;
    }
  }
}

const saida = {};
for (const item of registry.items) {
  const demo = join(ROOT, "src", "app", "demos", `${item.name}-demo.tsx`);
  const usa = itemUsaGpu(item.name) || (existsSync(demo) && arquivoUsaGpu(demo));
  if (usa) saida[item.name] = medido[item.name] ?? { contextos: 1, pesada: false };
}

writeFileSync(DESTINO, JSON.stringify(saida, null, 2) + "\n");
console.log(
  `gpu: ${Object.keys(saida).length} peças de GPU → src/app/gpu.generated.json\n  ${Object.entries(saida)
    .map(([n, m]) => n + (m.contextos > 1 ? `×${m.contextos}` : "") + (m.pesada ? " (pesada)" : ""))
    .join(", ")}`,
);
