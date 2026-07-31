#!/usr/bin/env node
/**
 * Um HTML por item, com título, descrição e imagem de prévia.
 *
 * A vitrine é um SPA: sem isto, `/c/kanban` e `/c/marquee` são o MESMO documento
 * — mesmo `<title>`, mesma descrição, nenhuma imagem. Colar o link no Slack, no
 * WhatsApp ou no Twitter mostrava "Vintage UI UX Library" para os 47 itens, e o
 * Google indexava uma página só. Quem publica uma library precisa que cada peça
 * tenha endereço com cara própria; é assim que ela circula.
 *
 * O que roda aqui, depois do `vite build`:
 *
 *   1. reescreve `dist/index.html` com as meta tags da home;
 *   2. escreve `dist/c/<item>/index.html` para cada item do registry, e
 *      `dist/marca/`, `dist/rig/` para as outras seções;
 *
 * As imagens de prévia são geradas à parte (`npm run build:og`) e versionadas em
 * `public/og/`: gerar exige Chromium, e o build da Vercel não tem — fazer isso
 * aqui quebraria a publicação.
 *
 * O HTML gerado é o MESMO app: o React assume no cliente. O que muda é o que o
 * robô de prévia lê antes de qualquer JavaScript existir.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SITE = "https://ui.visantlabs.com";

const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));
const base = readFileSync(join(DIST, "index.html"), "utf8");

const escapar = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Injeta as meta tags no lugar do `<title>` que o Vite deixou. */
function comMeta({ titulo, descricao, url, imagem }) {
  const tags = [
    `<title>${escapar(titulo)}</title>`,
    `<meta name="description" content="${escapar(descricao)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="@visant/ui" />`,
    `<meta property="og:title" content="${escapar(titulo)}" />`,
    `<meta property="og:description" content="${escapar(descricao)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${imagem}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapar(titulo)}" />`,
    `<meta name="twitter:description" content="${escapar(descricao)}" />`,
    `<meta name="twitter:image" content="${imagem}" />`,
  ].join("\n    ");

  return base.replace(/<title>.*?<\/title>/s, tags);
}

function escrever(caminhoRelativo, html) {
  const dir = join(DIST, caminhoRelativo);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}

// --- páginas -----------------------------------------------------------------

const HOME = {
  titulo: "@visant/ui — a library da Visant",
  descricao: `${registry.items.length} componentes React em registry shadcn, com temas de marca compilados: nenhum componente sabe a cor de um cliente.`,
};

writeFileSync(
  join(DIST, "index.html"),
  comMeta({ ...HOME, url: `${SITE}/`, imagem: `${SITE}/og/home.png` }),
);

const SECOES = [
  {
    slug: "marca",
    titulo: "Marca — @visant/ui",
    descricao: "Trocar a marca repinta a interface inteira: tokens compilados do vault, em runtime.",
  },
  {
    slug: "rig",
    titulo: "Rig vintage — @visant/ui",
    descricao: "A bancada de áudio: knobs, faders, VU, osciloscópio e paleta de comandos.",
  },
];

for (const s of SECOES) {
  escrever(s.slug, comMeta({ titulo: s.titulo, descricao: s.descricao, url: `${SITE}/${s.slug}`, imagem: `${SITE}/og/home.png` }));
}

for (const item of registry.items) {
  escrever(
    `c/${item.name}`,
    comMeta({
      titulo: `${item.title ?? item.name} — @visant/ui`,
      descricao: item.description ?? HOME.descricao,
      url: `${SITE}/c/${item.name}`,
      imagem: `${SITE}/og/${item.name}.png`,
    }),
  );
}

console.log(`páginas: ${registry.items.length + SECOES.length + 1}`);

if (!existsSync(join(DIST, "c"))) {
  console.error("dist/c não foi criado — o prerender rodou antes do build?");
  process.exit(1);
}
