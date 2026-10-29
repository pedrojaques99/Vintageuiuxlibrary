#!/usr/bin/env node
/**
 * A foto de cada peça — claro e escuro — que o acervo mostra enquanto a peça
 * viva ainda não montou.
 *
 * No acervo a peça viva monta quando o ladrilho chega perto da tela; a foto é a
 * espera do primeiro carregamento e é trocada por crossfade. Para a troca não
 * pular, a foto é tirada no enquadramento EXATO do palco: a caixa `w×h` do
 * catálogo, num viewport de desktop, sem fundo (`?solo=1&caixa=1`). É o mesmo
 * caminho que o shadcn usa no fallback do `block-viewer` (`{name}-light.png`).
 *
 * Irmão do `og-images.mjs`: mesmo Chromium do `@playwright/test`, mesma postura
 * sobre o deploy. As imagens saem em `public/shots/` e são **versionadas de
 * propósito** — gerar exige um browser, e o build da Vercel não tem. Rodar isto
 * na publicação quebraria o deploy, exatamente como está escrito lá.
 *
 * A diferença é que aqui não se desenha HTML de mentira: fotografa-se a peça de
 * verdade, pela rota que já existe (`/c/<nome>?solo=1`) — mesmo bundle, mesmo
 * CSS, mesmo componente. Por isso **precisa de servidor**:
 *
 *     npm run build        # o dist/ tem de estar pronto e atual
 *     npm run build:shots
 *
 * Bandeiras:
 *     --force          reescreve tudo (o padrão é pular o que já existe)
 *     --only <nome>    refaz uma peça só
 *     --png            não converte para webp; grava PNG
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(ROOT, "public", "shots");
const DIST = join(ROOT, "dist");

/* Porta própria, longe da 5182 do dev e da preview configurada: quem roda a
   captura quase sempre está com a vitrine aberta na outra janela, e derrubar o
   servidor de trabalho de alguém para tirar foto seria um preço absurdo. */
const PORTA = 4319;
const BASE = `http://127.0.0.1:${PORTA}`;

/* O viewport de desktop em que a grade roda — ver o laço. */
const LARGURA = 1440;
const ALTURA = 900;
const DENSIDADE = 2;

const argv = process.argv.slice(2);
const FORCAR = argv.includes("--force");
const SO_PNG = argv.includes("--png");
/* `indexOf` devolve -1 quando a bandeira não veio, e `argv[-1 + 1]` é `argv[0]`
   — ou seja, sem `--only`, a primeira bandeira qualquer virava "o nome da peça".
   Com `--force` sozinho o script morria dizendo que "--force" não existe no
   catálogo. A guarda é a checagem explícita de presença. */
const iSomente = argv.indexOf("--only");
const SOMENTE = iSomente >= 0 ? argv[iSomente + 1] : undefined;
const EXT = SO_PNG ? "png" : "webp";

// --- a lista de peças, lida do catálogo -------------------------------------

/*
 * O catálogo é a fonte, não o `registry.json`.
 *
 * O registry sabe o que o `shadcn add` instala; quem sabe se existe demo — e de
 * que tamanho ela é — é o `catalog.tsx`. Ler por regex é o que o
 * `catalog-check.mjs` e o `prerender.mjs` já fazem com este arquivo: importar
 * TSX de dentro do Node exigiria um bundler só para saber uma lista.
 */
const catalogoSrc = readFileSync(join(ROOT, "src", "app", "catalog.tsx"), "utf8");
const bloco = catalogoSrc.slice(catalogoSrc.indexOf("export const CATALOG"));

/** Palco de quem não declara tamanho — o mesmo DEFAULT_PREVIEW do catálogo. */
const PADRAO = { w: 380, h: 190 };

const PECAS = [...bloco.matchAll(/^\s{4}name: "([^"]+)",([\s\S]*?)(?=^\s{4}name: "|^\];)/gm)].map(
  ([, nome, corpo]) => {
    const p = corpo.match(/^\s{4}preview: \{ w: (\d+), h: (\d+) \}/m);
    return {
      nome,
      temDemo: /^\s{4}demo: /m.test(corpo),
      w: p ? Number(p[1]) : PADRAO.w,
      h: p ? Number(p[2]) : PADRAO.h,
    };
  },
);

if (!PECAS.length) {
  console.error("nenhuma peça lida de src/app/catalog.tsx — o formato do arquivo mudou?");
  process.exit(1);
}

// --- servidor ----------------------------------------------------------------

if (!existsSync(join(DIST, "index.html")) || !existsSync(join(DIST, "c"))) {
  console.error("dist/ não está pronto. Rode `npm run build` antes de `npm run build:shots`.");
  process.exit(1);
}

/** Sobe `vite preview` sobre o dist/ e só devolve quando ele responde. */
async function subirServidor() {
  const bin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  /* `--host 127.0.0.1` não é enfeite: sem ele o vite escuta em `localhost`, que
     no Windows resolve para `::1` primeiro, e o `fetch` do Node por IPv4 bate na
     porta fechada. O sintoma era o servidor de pé e a espera estourando. */
  const proc = spawn(
    process.execPath,
    [bin, "preview", "--port", String(PORTA), "--strictPort", "--host", "127.0.0.1"],
    { cwd: ROOT, stdio: "ignore" },
  );

  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/`);
      if (r.ok) return proc;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill();
  throw new Error(`vite preview não respondeu em ${BASE} em 15s`);
}

// --- foto --------------------------------------------------------------------

/**
 * Espera a peça **assentar**.
 *
 * Sem isto a capa sai no meio do movimento — e uma peça fotografada com o
 * conteúdo a 40% de opacidade parece quebrada no índice, que é o oposto do que
 * a foto existe para fazer. Não dá para esperar "a animação acabar" em geral:
 * quem faz marquee nunca acaba. Então espera-se a IMAGEM parar de mudar, com
 * teto — o que estabiliza quem tem entrada e desiste de quem roda em loop.
 */
async function assentar(pagina, recorte) {
  await pagina.evaluate(() => document.fonts?.ready);
  /* Peça WebGL nasce tarde: o canvas existe desde o início, mas a cena chega por
     import dinâmico e leva segundos para o primeiro quadro. Até lá o palco é
     branco e PARADO, e "parou de mudar" passava por assentado — a capa do
     fog-garden saiu com 0,48% de tinta. Com canvas na página, dá um prazo antes
     de começar a comparar. */
  if (await pagina.evaluate(() => !!document.querySelector("canvas"))) {
    await new Promise((r) => setTimeout(r, 4500));
  }
  let anterior = null;
  for (let i = 0; i < 8; i++) {
    const agora = await pagina.screenshot({ clip: recorte, omitBackground: true });
    if (anterior && Buffer.compare(anterior, agora) === 0) return agora;
    anterior = agora;
    await new Promise((r) => setTimeout(r, 350));
  }
  return anterior;
}

/*
 * A conversão para webp acontece dentro do próprio Chromium.
 *
 * O `page.screenshot` do Playwright só sabe png e jpeg, e `sharp` não é
 * dependência deste repo. `OffscreenCanvas.convertToBlob({type:"image/webp"})`
 * é o encoder do Chromium, e ele guarda o canal alfa — que é o que a foto
 * precisa desde que passou a sair sem fundo.
 *
 * De quebra devolve a `tinta`: a fração de pixels não transparentes. É como o
 * script descobre sozinho que uma peça saiu vazia.
 */
async function codificar(encoder, pngBase64, comoPng) {
  return encoder.evaluate(
    async ({ pngBase64, comoPng }) => {
      const bmp = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${pngBase64}`)).blob(),
      );
      const tela = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = tela.getContext("2d");
      ctx.drawImage(bmp, 0, 0);

      const px = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      let pintados = 0;
      let olhados = 0;
      for (let i = 3; i < px.length; i += 16) {
        olhados++;
        if (px[i] > 8) pintados++;
      }

      const blob = await tela.convertToBlob(
        comoPng ? { type: "image/png" } : { type: "image/webp", quality: 0.9 },
      );
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      return { dados: btoa(bin), tinta: pintados / olhados };
    },
    { pngBase64, comoPng },
  );
}

// --- laço --------------------------------------------------------------------

mkdirSync(DESTINO, { recursive: true });

const alvos = PECAS.filter((p) => p.temDemo).filter((p) => !SOMENTE || p.nome === SOMENTE);
if (SOMENTE && !alvos.length) {
  console.error(`--only ${SOMENTE}: não existe no catálogo, ou não tem demo.`);
  process.exit(1);
}

const TEMAS = [
  { sufixo: "claro", escuro: false },
  { sufixo: "escuro", escuro: true },
];

const servidor = await subirServidor();
const navegador = await chromium.launch();
/* Página descartável só para rodar o encoder de imagem — `about:blank` basta,
   e mantê-la aberta evita abrir e fechar um contexto por foto. */
const encoder = await navegador.newPage();

const falhas = [];
const vazias = [];
let escritas = 0;
let puladas = 0;

for (const peca of alvos) {
  const caminhos = TEMAS.map((t) => join(DESTINO, `${peca.nome}-${t.sufixo}.${EXT}`));
  if (!FORCAR && caminhos.every((c) => existsSync(c))) {
    puladas++;
    continue;
  }

  /*
   * O enquadramento é o do PALCO, não o do solo.
   *
   * O ladrilho da grade mostra a foto dentro do mesmo `PalcoFixo` que depois
   * monta a peça viva, na caixa `w×h` declarada no catálogo. Para a troca do
   * hover não pular, a foto tem de ser exatamente essa caixa: `?caixa=1` desenha
   * a peça nela, no canto, e a foto recorta a caixa — sem respiro, sem
   * `object-contain`, sem letterbox.
   *
   * O viewport é de desktop (`LARGURA`×`ALTURA`, ou maior se a peça não couber),
   * porque é nele que a grade roda: media query lê o viewport, e uma caixa de
   * 380px num viewport de 380 acionaria o layout de celular que o ladrilho
   * nunca mostra.
   *
   * Sem fundo (`omitBackground`): a foto sai na marca padrão, e o ladrilho veste
   * a marca escolhida. Transparente, ela herda o chão da marca atual.
   */
  const vw = Math.max(LARGURA, peca.w);
  const vh = Math.max(ALTURA, peca.h);
  /* Densidade 2, com teto de 2400px no lado maior: retina sem arquivo gigante
     para as faixas de 1280px. */
  const densidade = Math.min(DENSIDADE, 2400 / Math.max(peca.w, peca.h));

  const contexto = await navegador.newContext({
    viewport: { width: vw, height: vh },
    deviceScaleFactor: densidade,
    /*
     * Movimento LIGADO de propósito: várias demos entram animando a partir de
     * opacidade 0, e congelar no primeiro quadro fotografaria o vazio. A
     * estabilidade vem de `assentar()`, que espera a imagem parar de mudar.
     */
    reducedMotion: "no-preference",
  });

  for (const tema of TEMAS) {
    const arquivo = join(DESTINO, `${peca.nome}-${tema.sufixo}.${EXT}`);
    if (!FORCAR && existsSync(arquivo)) continue;

    const pagina = await contexto.newPage();
    try {
      const url = `${BASE}/c/${peca.nome}?solo=1&caixa=1${tema.escuro ? "&dark=1" : ""}`;
      await pagina.goto(url, { waitUntil: "networkidle" });

      if (await pagina.getByText("não tem demo").count()) {
        throw new Error("a rota solo respondeu “não tem demo”");
      }
      await pagina.waitForSelector("[data-caixa]");

      const caixa = { x: 0, y: 0, width: peca.w, height: peca.h };
      const png = await assentar(pagina, caixa);

      const { dados, tinta } = await codificar(encoder, png.toString("base64"), SO_PNG);
      const bytes = Buffer.from(dados, "base64");
      if (bytes.length < 512) throw new Error(`arquivo degenerado (${bytes.length} bytes)`);

      writeFileSync(arquivo, bytes);
      escritas++;
      if (tinta < 0.01) vazias.push(`${peca.nome}-${tema.sufixo} (${(tinta * 100).toFixed(2)}% de tinta)`);
    } catch (erro) {
      // Falhar alto e sem deixar meia imagem no disco: sem o arquivo, o
      // ladrilho cai na peça viva, que é degradação e não erro.
      falhas.push(`${peca.nome}-${tema.sufixo}: ${erro.message}`);
    } finally {
      await pagina.close();
    }
  }

  await contexto.close();
}

await navegador.close();
servidor.kill();

console.log(
  `capas: ${escritas} escritas · ${puladas} peças puladas (já existiam) · ${alvos.length} peças no alvo → public/shots/*.${EXT}`,
);

if (vazias.length) {
  console.warn(`\n⚠ quase sem tinta (peça que só existe no gesto?):`);
  for (const v of vazias) console.warn(`    ${v}`);
}

if (falhas.length) {
  console.error(`\n✗ ${falhas.length} capturas falharam:`);
  for (const f of falhas) console.error(`    ${f}`);
  process.exit(1);
}
