#!/usr/bin/env node
/**
 * A capa estática de cada peça — claro e escuro — para o índice do catálogo.
 *
 * O índice mostra 80 peças. Montar 80 demos vivas numa página é o que produziu
 * os 26.253px e os tickers todos ligados ao mesmo tempo; a foto resolve isso
 * sem inventar nada: é o mesmo caminho que o shadcn usa no fallback mobile do
 * `block-viewer` (`{name}-light.png`). Demo viva continua existindo — só que
 * dentro da categoria, onde são 10 e não 80.
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

/* O contrato publicado no plano. A frente C consome por caminho. */
const LARGURA = 1200;
const ALTURA = 750;
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
    const agora = await pagina.screenshot(recorte ? { clip: recorte } : undefined);
    if (anterior && Buffer.compare(anterior, agora) === 0) return agora;
    anterior = agora;
    await new Promise((r) => setTimeout(r, 350));
  }
  return anterior;
}

/**
 * A caixa que a peça REALMENTE ocupa, com um respiro em volta.
 *
 * O viewport é esticado até 1.6:1 para a media query enxergar o tamanho certo —
 * e isso está correto. Mas fotografar o viewport inteiro punha um board de
 * 220px de altura no meio de 657px de vazio, e na miniatura de 104px do índice
 * a peça virava uma tira de 7px: capa que não mostra nada.
 *
 * Aqui a foto passa a ser recortada no conteúdo. O respiro é proporcional (6%
 * da maior dimensão, com piso de 24px) porque peça pequena precisa de menos ar
 * absoluto que faixa cheia, e um valor fixo dá os dois errados.
 */
async function caixaDaPeca(pagina) {
  return pagina.evaluate(() => {
    const raiz = document.querySelector("#root > div > div") ?? document.querySelector("#root");
    if (!raiz) return null;
    // A união das caixas dos filhos, e não a do container: o container é
    // esticado por `justify-content: center` e devolveria o viewport de volta.
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;

    /*
     * Só entra na conta o que PINTA.
     *
     * Contar toda caixa visível devolvia o viewport de volta: as demos têm um
     * invólucro `h-full w-full` de centralização, ele é "visível" por qualquer
     * critério geométrico e é do tamanho da tela. O que interessa é onde há
     * tinta — folha da árvore (texto, ícone, imagem, canvas) ou caixa com fundo
     * ou borda própria. Contêiner de layout não desenha nada e não deve ditar o
     * enquadramento.
     */
    const pinta = (el, cs) => {
      if (!el.children.length) return true;
      if (cs.backgroundImage !== "none") return true;
      const bg = cs.backgroundColor;
      const m = bg.match(/[\d.]+/g);
      if (m && (m.length < 4 || Number(m[3]) > 0.02)) return true;
      return ["Top", "Right", "Bottom", "Left"].some(
        (l) => parseFloat(cs[`border${l}Width`]) > 0 && cs[`border${l}Style`] !== "none",
      );
    };

    const visitar = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const visivel =
        r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && +cs.opacity > 0.02;
      if (visivel && pinta(el, cs)) {
        x1 = Math.min(x1, r.left);
        y1 = Math.min(y1, r.top);
        x2 = Math.max(x2, r.right);
        y2 = Math.max(y2, r.bottom);
      }
      if (visivel) for (const f of el.children) visitar(f);
    };
    for (const f of raiz.children) visitar(f);
    if (!Number.isFinite(x1) || x2 <= x1 || y2 <= y1) return null;

    const respiro = Math.max(24, Math.round(Math.max(x2 - x1, y2 - y1) * 0.06));
    const x = Math.max(0, Math.floor(x1 - respiro));
    const y = Math.max(0, Math.floor(y1 - respiro));
    return {
      x,
      y,
      width: Math.min(window.innerWidth - x, Math.ceil(x2 - x1 + respiro * 2)),
      height: Math.min(window.innerHeight - y, Math.ceil(y2 - y1 + respiro * 2)),
    };
  });
}

/*
 * A conversão para webp acontece dentro do próprio Chromium.
 *
 * O `page.screenshot` do Playwright só sabe png e jpeg, e `sharp` não é
 * dependência deste repo — instalar um binário nativo para converter imagem
 * quando o browser que já está aberto sabe fazer isso seria peso sem troco.
 * `OffscreenCanvas.convertToBlob({type:"image/webp"})` é o encoder do Chromium.
 *
 * Este mesmo passo faz a moldura: a peça é fotografada no tamanho declarado
 * dela (que é o que o `FitStage` desenha na vitrine, e o que faz media query
 * valer) e depois assentada, centrada, na tela de 1200×750 do contrato. O
 * sobrando é pintado com o fundo do tema — não com branco, que apareceria como
 * uma faixa clara no escuro.
 *
 * De quebra devolve a `tinta`: a fração de pixels que difere do fundo. É como o
 * script descobre sozinho que uma peça saiu vazia.
 */
async function moldurar(encoder, pngBase64, fundo, comoPng, recorte) {
  const { larguraAlvo, alturaAlvo } = telaDaCapa(
    recorte?.width || LARGURA,
    recorte?.height || ALTURA,
  );
  return encoder.evaluate(
    async ({ pngBase64, fundo, larguraAlvo, alturaAlvo, comoPng }) => {
      const bmp = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${pngBase64}`)).blob(),
      );
      const tela = new OffscreenCanvas(larguraAlvo, alturaAlvo);
      const ctx = tela.getContext("2d");
      ctx.fillStyle = fundo;
      ctx.fillRect(0, 0, larguraAlvo, alturaAlvo);

      const escala = Math.min(larguraAlvo / bmp.width, alturaAlvo / bmp.height);
      const w = Math.round(bmp.width * escala);
      const h = Math.round(bmp.height * escala);
      ctx.drawImage(bmp, Math.round((larguraAlvo - w) / 2), Math.round((alturaAlvo - h) / 2), w, h);

      // Quanto da foto não é fundo. Amostra de 4 em 4 pixels: precisão de sobra
      // para separar "peça" de "retângulo liso".
      const px = ctx.getImageData(0, 0, larguraAlvo, alturaAlvo).data;
      const base = ctx.getImageData(0, 0, 1, 1).data;
      let diferentes = 0;
      let olhados = 0;
      for (let i = 0; i < px.length; i += 16) {
        olhados++;
        if (
          Math.abs(px[i] - base[0]) > 8 ||
          Math.abs(px[i + 1] - base[1]) > 8 ||
          Math.abs(px[i + 2] - base[2]) > 8
        )
          diferentes++;
      }

      const blob = await tela.convertToBlob(
        comoPng ? { type: "image/png" } : { type: "image/webp", quality: 0.92 },
      );
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      return { tipo: blob.type, dados: btoa(bin), tinta: diferentes / olhados };
    },
    { pngBase64, fundo, larguraAlvo, alturaAlvo, comoPng },
  );
}

/**
 * A tela da capa acompanha a PROPORÇÃO DA PEÇA — não uma moldura de 1.6:1.
 *
 * Assentar tudo num 1200×750 fixo parecia dar uniformidade e dava o oposto: um
 * board de 1020×220 vira uma tira no meio de meia tela de fundo liso, e na
 * miniatura de 104px do índice sobra uma linha de 7px. A capa mostrava a moldura,
 * não a peça — que é exatamente o defeito que ela existe para não ter.
 *
 * O teto de área mantém arquivo e memória sob controle sem impor forma; o piso
 * de 1.2:1 impede que uma peça altíssima vire um poste na miniatura, que é o
 * único caso em que o letterbox ainda ajuda.
 */
function telaDaCapa(larguraFoto, alturaFoto) {
  const AREA = LARGURA * ALTURA * DENSIDADE * DENSIDADE;
  const proporcao = larguraFoto / alturaFoto;
  const alvo = Math.max(1.2, Math.min(3.2, proporcao));
  const altura = Math.round(Math.sqrt(AREA / alvo));
  return { larguraAlvo: Math.round(altura * alvo), alturaAlvo: altura };
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
   * O viewport é o tamanho declarado da peça, esticado até a proporção da capa.
   *
   * Duas coisas de uma vez. Primeiro, fotografar no tamanho declarado é o que
   * mantém a foto honesta: um controle de 380px num viewport de 1200 não é o
   * mesmo componente, porque media query lê o viewport — é o mesmo motivo pelo
   * qual o solo existe. Segundo, crescer a dimensão que sobra até 1200×750 dá
   * respiro de verdade em vez de faixa de fundo: um board de 1020×220 numa capa
   * 1.6:1 renderizado na proporção dele sairia como uma tira no meio de um
   * retângulo vazio.
   *
   * O `+32` é o `p-4` do solo, que também ocupa viewport — sem ele o board de
   * 1020 declarados perdia a última coluna pela direita.
   */
  const largura0 = peca.w + 32;
  const altura0 = peca.h + 32;
  const vw = Math.max(largura0, Math.round((altura0 * LARGURA) / ALTURA));
  const vh = Math.max(altura0, Math.round((largura0 * ALTURA) / LARGURA));

  /*
   * A densidade acompanha, em vez de ficar presa em 2.
   *
   * Um viewport de 412px ampliado até 1200 no canvas sairia borrado. Subir a
   * densidade resolve na origem: o Chromium desenha o texto nítido já no
   * tamanho final. Teto em 4 porque acima disso é memória a troco de nada.
   */
  const densidade = Math.min(4, Math.max(1, (LARGURA * DENSIDADE) / vw));

  const contexto = await navegador.newContext({
    viewport: { width: vw, height: vh },
    deviceScaleFactor: densidade,
    /*
     * Movimento LIGADO de propósito.
     *
     * `reduced-motion: reduce` daria foto estável de graça, mas neste repo
     * várias demos entram animando a partir de opacidade 0 — congelar no
     * primeiro quadro fotografaria o vazio. Como `assentar()` já espera a
     * imagem parar de mudar, a estabilidade vem de medir, não de desligar.
     */
    reducedMotion: "no-preference",
  });

  for (const tema of TEMAS) {
    const arquivo = join(DESTINO, `${peca.nome}-${tema.sufixo}.${EXT}`);
    if (!FORCAR && existsSync(arquivo)) continue;

    const pagina = await contexto.newPage();
    try {
      const url = `${BASE}/c/${peca.nome}?solo=1${tema.escuro ? "&dark=1" : ""}`;
      await pagina.goto(url, { waitUntil: "networkidle" });

      /* O solo desenha a peça no topo e para. Numa foto isso vira um bloco
         colado na borda de cima com meia tela de vazio embaixo — centrar é a
         única correção, e ela é de enquadramento, então mora aqui e não no
         componente. */
      await pagina.addStyleTag({
        content: "#root > div { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }",
      });

      if (await pagina.getByText("não tem demo").count()) {
        throw new Error("a rota solo respondeu “não tem demo”");
      }

      // Uma primeira passada sem recorte deixa a cena assentar; só então a
      // caixa da peça é medida (antes disso ela ainda está entrando) e a foto
      // final sai recortada nela.
      await assentar(pagina);
      const recorte = await caixaDaPeca(pagina);
      const png = await assentar(pagina, recorte ?? undefined);
      /* O fundo do letterbox sai do tema pintado na página, não de um hex
         escrito aqui: a marca da casa repinta `--background`, e um hex fixo
         viraria uma faixa de cor errada no dia da repintura. */
      const fundo = await pagina.evaluate(
        () => getComputedStyle(document.querySelector("#root > div")).backgroundColor,
      );

      const { dados, tinta } = await moldurar(encoder, png.toString("base64"), fundo, SO_PNG, recorte);
      const bytes = Buffer.from(dados, "base64");
      if (bytes.length < 1024) throw new Error(`arquivo degenerado (${bytes.length} bytes)`);

      writeFileSync(arquivo, bytes);
      escritas++;
      if (tinta < 0.01) vazias.push(`${peca.nome}-${tema.sufixo} (${(tinta * 100).toFixed(2)}% de tinta)`);
    } catch (erro) {
      // Falhar alto e sem deixar meia imagem no disco: uma capa quebrada
      // versionada é pior que capa nenhuma — sem o arquivo, a frente C cai no
      // palco vivo, que é degradação e não erro.
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
