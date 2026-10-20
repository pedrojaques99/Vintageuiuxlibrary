#!/usr/bin/env node
/**
 * anatomia-build — transforma cada `anatomia/figuras/<id>/geometria.mjs` em item do registry.
 *
 *   node scripts/anatomia-build.mjs            # todas as figuras
 *   node scripts/anatomia-build.mjs como-sobe  # uma só
 *
 * Gera, em registry/visant/lib/:
 *   anatomia-kit.ts      o runtime do kit isométrico (skill anatomy, MIT), SEM o ISO_CSS:
 *                        o CSS dele tem hex, e componente do registry não tem cor própria
 *   anatomia-estilo.ts   as regras do kit com os tons derivados dos tokens do site
 *   anatomia-<id>.ts     a figura pronta: SVG já calculado + o controlador
 *
 * A geometria roda AQUI, no Node: o navegador recebe o desenho pronto e só move
 * o que se move. O controlador (anatomia-<id>-controlador.ts) é escrito à mão
 * e vive direto no registry; este script nunca o sobrescreve.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KIT = join(ROOT, "anatomia", "kit");
const LIB = join(ROOT, "registry", "visant", "lib");
const importar = (p) => import(pathToFileURL(p).href);

const k = await importar(join(KIT, "iso-kit.mjs"));
const G = await importar(join(KIT, "lathe.mjs"));
const T = await importar(join(KIT, "tube.mjs"));

const CABECALHO = (origem) => `// GERADO por scripts/anatomia-build.mjs a partir de ${origem}. Não edite: rode o script.\n`;

// ---- logo deitado no topo de uma face (simple-icons, CC0; o da casa em anatomia/logos)
function caminhoDoLogo(nome) {
  const proprio = join(ROOT, "anatomia", "logos", `${nome}.svg`);
  const si = join(ROOT, "node_modules", "simple-icons", "icons", `${nome}.svg`);
  const arquivo = existsSync(proprio) ? proprio : si;
  if (!existsSync(arquivo)) throw new Error(`logo "${nome}" não existe em anatomia/logos nem no simple-icons`);
  const svg = readFileSync(arquivo, "utf8");
  const d = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]).join("");
  const vb = /viewBox="([\d.\s-]+)"/.exec(svg)?.[1].split(/\s+/).map(Number) ?? [0, 0, 24, 24];
  return { d, vb };
}
function logo(nome, [cx, cy], tamanho, z, P, { tom = "mid", ao = "x" } = {}) {
  const { d, vb } = caminhoDoLogo(nome);
  const s = tamanho / Math.max(vb[2], vb[3]);
  const canto = ao === "x" ? [cx - tamanho / 2, cy - tamanho / 2] : [cx - tamanho / 2, cy + tamanho / 2];
  return `<path class="iso-logo" data-tone="${tom}" transform="${k.topMatrix(canto, z, P, ao)} scale(${s.toFixed(4)}) translate(${-vb[0]} ${-vb[1]})" d="${d}"/>`;
}

// ---- runtime do kit: o iso-kit.ts sem cartão, página e ISO_CSS
function gerarKit() {
  const fonte = readFileSync(join(KIT, "iso-kit.ts"), "utf8");
  const corte = fonte.indexOf("export type KeyMark");
  if (corte < 0) throw new Error("iso-kit.ts mudou: não achei o ponto de corte (export type KeyMark)");
  // figureSvg({ standalone }) embutia o ISO_CSS (com hex); no runtime a figura nunca é standalone.
  const kit = fonte.slice(0, corte).trimEnd().replace("standalone ? `<style>${ISO_CSS}</style>` : \"\"", '""') + "\n";
  if (kit.includes("ISO_CSS")) throw new Error("o runtime do kit ainda cita ISO_CSS");
  if (/#[0-9a-fA-F]{3,8}\b/.test(kit.replace(/&#\d+;/g, ""))) throw new Error("o runtime do kit ficou com hex");
  writeFileSync(
    join(LIB, "anatomia-kit.ts"),
    CABECALHO("anatomia/kit/iso-kit.ts") +
      "// Kit isométrico da skill anatomy (github.com/wheresryan22/anatomy, MIT). Licença em anatomia/kit/LICENSE.\n" +
      "// @ts-nocheck\n" +
      kit,
  );
}

// ---- estilo: tons do kit derivados dos tokens do site (nenhum hex)
function gerarEstilo() {
  const css = k.ISO_CSS;
  const ini = css.indexOf(".iso-svg{");
  const fim = css.indexOf(".iso-figure{");
  if (ini < 0 || fim < 0) throw new Error("ISO_CSS mudou: não achei .iso-svg / .iso-figure");
  const regras = css.slice(ini, fim) + "@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n";
  if (/#[0-9a-fA-F]{3,8}\b/.test(regras)) throw new Error("as regras do kit têm hex");
  const mix = (a, pct, b) => `color-mix(in oklab, ${a} ${pct}%, ${b})`;
  const F = "var(--va-fg)";
  const B = "var(--va-bg)";
  const tons = [
    `--anatomy-card:${B}`,
    `--anatomy-paper:${B}`,
    `--anatomy-text:var(--va-muted)`,
    `--anatomy-strong:${F}`,
    `--anatomy-muted:${mix(F, 45, B)}`,
    `--anatomy-face:${mix("white", 4, B)}`,
    `--anatomy-top:${mix("white", 5, B)}`,
    `--anatomy-shade-0:${mix("black", 16, B)}`,
    `--anatomy-shade-1:${mix("black", 11, B)}`,
    `--anatomy-shade-2:${mix("black", 6.5, B)}`,
    `--anatomy-shade-3:${mix("black", 2.5, B)}`,
    `--anatomy-lit-top:${mix("white", 11, B)}`,
    `--anatomy-lit-shade:${mix("white", 6, B)}`,
    `--anatomy-hi:${mix(F, 84, B)}`,
    `--anatomy-mid:${mix(F, 46, B)}`,
    `--anatomy-lo:${mix(F, 26, B)}`,
    `--anatomy-faint:${mix(F, 14, B)}`,
    `--anatomy-lit:var(--va-brand)`,
    `--anatomy-halo:${mix("black", 70, B)}`,
    `--anatomy-halo-opacity:.55`,
    `--anatomy-dot:${F}`,
    `--anatomy-red:var(--destructive, crimson)`,
    `--anatomy-green:var(--success, seagreen)`,
    `--anatomy-blue:var(--info, royalblue)`,
    `--anatomy-weight:.6px`,
    `--anatomy-ease:var(--ease-out, cubic-bezier(.32,.72,0,1))`,
    `--anatomy-mono:var(--va-mono)`,
  ].join(";");
  const extra = ".iso-logo{fill:var(--anatomy-mid);stroke:none}.iso-logo[data-tone=\"hi\"]{fill:var(--anatomy-hi)}.iso-logo[data-tone=\"lo\"]{fill:var(--anatomy-lo)}.iso-logo[data-tone=\"lit\"]{fill:var(--anatomy-lit)}\n";
  writeFileSync(
    join(LIB, "anatomia-estilo.ts"),
    CABECALHO("anatomia/kit/iso-kit.mjs (ISO_CSS, só as regras)") +
      "/** Regras do kit com os tons vindos dos tokens do site (--foreground, --card, --brand). */\n" +
      `export const ESTILO_DO_KIT = ${JSON.stringify(`.va-palco{${tons}}\n${regras}${extra}`)};\n`,
  );
}

const camel = (id) => id.replace(/-(\w)/g, (_, c) => c.toUpperCase());

async function gerarFigura(id) {
  const geo = join(ROOT, "anatomia", "figuras", id, "geometria.mjs");
  const { default: figura } = await importar(geo);
  const dados = figura({ k, G, T, logo });
  for (const campo of ["id", "fig", "titulo", "resumo", "width", "height", "svg", "P", "modelo", "pecas", "passos", "leitura"]) {
    if (dados[campo] === undefined) throw new Error(`${id}: geometria sem "${campo}"`);
  }
  if (dados.id !== id) throw new Error(`${id}: o id da geometria é "${dados.id}"`);
  if (/#[0-9a-fA-F]{3,8}\b/.test(dados.svg.replace(/url\(#[\w-]+\)/g, "").replace(/href="#[\w-]+"/g, ""))) throw new Error(`${id}: o SVG tem hex`);
  if (/[—–]/.test(JSON.stringify([dados.pecas, dados.passos, dados.titulo, dados.resumo]))) throw new Error(`${id}: travessão no texto`);
  const ctrl = join(LIB, `anatomia-${id}-controlador.ts`);
  if (!existsSync(ctrl)) throw new Error(`${id}: falta registry/visant/lib/anatomia-${id}-controlador.ts`);
  const nome = camel(id);
  writeFileSync(
    join(LIB, `anatomia-${id}.ts`),
    CABECALHO(`anatomia/figuras/${id}/geometria.mjs`) +
      `import type { FiguraDef } from "./anatomia-tipos";\n` +
      `import controlador from "./anatomia-${id}-controlador";\n\n` +
      `export const ${nome}: FiguraDef = {\n  dados: ${JSON.stringify(dados)},\n  controlador,\n};\n\nexport default ${nome};\n`,
  );
  console.log(`✓ ${id}: ${dados.pecas.length} peças, ${dados.passos.length} passos, svg ${(dados.svg.length / 1024).toFixed(0)} KB`);
}

gerarKit();
gerarEstilo();
const pedidas = process.argv.slice(2);
const todas = readdirSync(join(ROOT, "anatomia", "figuras"), { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(ROOT, "anatomia", "figuras", e.name, "geometria.mjs")))
  .map((e) => e.name);
for (const id of pedidas.length ? pedidas : todas) await gerarFigura(id);
