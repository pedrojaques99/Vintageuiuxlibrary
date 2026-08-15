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
 *   2. escreve `dist/c/<item>/index.html` para cada item do registry,
 *      `dist/catalogo/<familia>/index.html` para cada fatia do catálogo, e
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

/* A home é a primeira sala de kit desde que os kits viraram a porta de entrada.
   A descrição acompanha: quem chega não compra componente solto, compra a
   composição montada. */
const HOME = {
  titulo: "@visant/ui — a library da Visant",
  descricao: `Cinco kits montados — mesa de trabalho, landing, motion, bancada vintage e marca viva — sobre ${registry.items.length} componentes React em registry shadcn, com tema de marca compilado.`,
};

writeFileSync(
  join(DIST, "index.html"),
  comMeta({ ...HOME, url: `${SITE}/`, imagem: `${SITE}/og/home.png` }),
);

const SECOES = [
  {
    slug: "catalogo",
    titulo: "Catálogo — @visant/ui",
    /* `/catalogo` deixou de ser a página com tudo dentro: virou o índice das
       categorias, e cada fatia tem endereço próprio em `/catalogo/<familia>`. */
    descricao: `As ${registry.items.length} peças do registry, divididas por categoria — cada fatia com demo viva e comando de instalação.`,
  },
  {
    slug: "marca",
    titulo: "Marca — @visant/ui",
    descricao: "Trocar a marca repinta a interface inteira: tokens compilados do vault, em runtime.",
  },
  /* `/rig` virou apelido de `/kit/rig-vintage`. A página continua existindo
     porque o endereço circulou — e sem HTML próprio o link colado no chat
     perderia a prévia que já tinha. */
  {
    slug: "rig",
    titulo: "Rig vintage — @visant/ui",
    descricao: "A bancada de áudio: knobs, faders, VU, osciloscópio e paleta de comandos.",
  },
];

/*
 * As salas de kit, lidas de `src/app/kits.tsx`.
 *
 * Uma cópia da lista aqui envelheceria na primeira sala nova — e o sintoma
 * seria silencioso: a página existiria no app e não teria prévia ao ser colada
 * em lugar nenhum. Mesma técnica do portão de catálogo, que lê o `catalog.tsx`.
 */
const kitsSrc = readFileSync(join(ROOT, "src", "app", "kits.tsx"), "utf8");
const KITS = [
  ...kitsSrc
    .slice(kitsSrc.indexOf("export const KITS"))
    .matchAll(/slug:\s*"([^"]+)",[\s\S]*?title:\s*"([^"]+)",[\s\S]*?tese:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g),
].map(([, slug, title, tese]) => ({
  slug: `kit/${slug}`,
  titulo: `${title} — @visant/ui`,
  descricao: tese.replace(/\\"/g, '"'),
}));

if (!KITS.length) {
  console.error("nenhum kit lido de src/app/kits.tsx — o formato do arquivo mudou?");
  process.exit(1);
}

/*
 * As fatias do catálogo, lidas de `src/app/catalog.tsx`.
 *
 * O `registry.json` não sabe de família — a taxonomia mora no catálogo, e é lá
 * que ela tem de continuar morando. Reescrever as seis famílias aqui à mão daria
 * uma segunda fonte de verdade que envelhece calada: família nova apareceria no
 * app e a rota `/catalogo/<familia>` não teria HTML, ou seja, nenhuma prévia e
 * nada indexado. Mesma técnica do `catalog-check.mjs` e da leitura dos kits
 * acima — regex sobre o fonte, e portão se não vier nada.
 *
 * `/catalogo/marca` é a FAMÍLIA marca. O estúdio de marca é `/marca`, em SECOES
 * — dois endereços, dois documentos, sem sobreposição.
 */
const catalogSrc = readFileSync(join(ROOT, "src", "app", "catalog.tsx"), "utf8");
const familias = [
  ...catalogSrc
    .slice(catalogSrc.indexOf("export const FAMILIES"), catalogSrc.indexOf("export const familyLabel"))
    .matchAll(/key:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g),
].map(([, key, label]) => ({ key, label }));

const catalogBlock = catalogSrc.slice(catalogSrc.indexOf("export const CATALOG"));
const pecasPorFamilia = new Map();
for (const [, key] of catalogBlock.matchAll(/^\s{4}family: "([^"]+)"/gm)) {
  pecasPorFamilia.set(key, (pecasPorFamilia.get(key) ?? 0) + 1);
}

const FAMILIAS = familias.map(({ key, label }) => {
  const n = pecasPorFamilia.get(key) ?? 0;
  return {
    slug: `catalogo/${key}`,
    /* "— catálogo" não é enfeite: a família `marca` e a seção `/marca` (o Brand
       Studio) têm o mesmo rótulo, e sem isto os dois documentos sairiam com o
       título "Marca — @visant/ui". Dois links diferentes com a mesma cara no
       chat e na busca é o defeito que o prerender existe para não ter. */
    titulo: `${label} — catálogo @visant/ui`,
    descricao: `${n} ${n === 1 ? "peça" : "peças"} da categoria ${label}, com demo viva e comando de instalação.`,
  };
});

/* Família declarada e vazia é rota que abre em branco — o portão é aqui, não
   na tela de quem abriu o link. */
const vazias = familias.filter((f) => !pecasPorFamilia.get(f.key)).map((f) => f.key);
if (!familias.length || vazias.length) {
  console.error(
    !familias.length
      ? "nenhuma família lida de src/app/catalog.tsx — o formato do arquivo mudou?"
      : `família sem nenhuma peça: ${vazias.join(", ")}`,
  );
  process.exit(1);
}

for (const s of [...SECOES, ...FAMILIAS, ...KITS]) {
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

console.log(
  `páginas: ${registry.items.length + SECOES.length + FAMILIAS.length + KITS.length + 1}`,
);

if (!existsSync(join(DIST, "c"))) {
  console.error("dist/c não foi criado — o prerender rodou antes do build?");
  process.exit(1);
}
