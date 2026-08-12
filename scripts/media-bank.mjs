#!/usr/bin/env node
/**
 * O banco de mídia da vitrine: acervo real da Visant, otimizado e versionado.
 *
 * As demos desenhavam caixa cinza no lugar de foto e vídeo. Isso mente duas
 * vezes: some a diferença entre um `masonry-gallery` que respira e um que
 * embola, e faz a library parecer wireframe de estudo — exatamente a impressão
 * que uma agência de branding não pode dar na própria vitrine.
 *
 * Três decisões que mandam neste arquivo:
 *
 * 1. **Curadoria explícita, nunca varredura.** Tem 95 arquivos em `Z:/VISANT/
 *    ASSETS` e 16 fotos de bastidor no R2; a vitrine precisa de umas vinte. A
 *    lista `ACERVO` é escrita à mão porque escolher a foto É o trabalho — um
 *    `readdir` traria PSD de 19MB e print de WhatsApp de 2022.
 * 2. **A fonte fica fora do repo; o derivado entra.** O original mora no HD e
 *    no R2. Aqui entra só a versão web (webp ≤1200px, mp4 ≤960px e ≤6s, mudo),
 *    dentro de `public/media/`. O repo da library não é backup de acervo.
 * 3. **Idempotente por mtime.** Rodar de novo não retranscodifica nada que já
 *    está no lugar e mais novo que a fonte. Assim isto vira passo de build sem
 *    custar cinco minutos de ffmpeg a cada `npm run build`.
 *
 * Uso:
 *   node scripts/media-bank.mjs            # só o que falta
 *   node scripts/media-bank.mjs --force    # refaz tudo
 *
 * Requer `ffmpeg` no PATH (ele resolve imagem E vídeo — sem sharp, sem imagemagick).
 * Saída: `public/media/*` + `src/app/media-bank.generated.json`.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = join(ROOT, "public", "media");
const MANIFESTO = join(ROOT, "src", "app", "media-bank.generated.json");
const FORCE = process.argv.includes("--force");

/** As pastas de onde o acervo vem. Sobrescreva por env em outra máquina. */
const FONTES = {
  assets: process.env.VISANT_ASSETS ?? "Z:/VISANT/ASSETS",
  board:
    process.env.VISANT_BOARD ??
    "Z:/Jobs 2.0/2026/@Automations/gpt-image-generator/visant-board/public/assets",
  r2: "https://pub-73afd65b394b48aebd711f66320a802c.r2.dev",
};

/**
 * O acervo curado.
 *
 * `papel` é o que decide onde a peça pode usar a mídia, e existe porque uma
 * demo não escolhe "uma imagem": ela escolhe um retrato para o depoimento, uma
 * cena para o card de portfólio, uma textura para o fundo. Sem papel, o rosto
 * de alguém do time acaba de plano de fundo de um CTA.
 */
const ACERVO = [
  // ── retratos: bastidor do time, já públicos no R2 ────────────────────────
  ...[
    ["1782153397464-741195-IMG_1806", "Bastidor de produção"],
    ["1782153398151-ddb91d-IMG_3494", "Time em campo"],
    ["1782153398898-a7236b-IMG_4878", "Registro de bastidor"],
    ["1782153400307-34f098-Rectangle_2-1", "Retrato de equipe"],
    ["1782153402716-ad5e44-Rectangle_2338", "Bastidor de estúdio"],
    ["1782153404404-e02673-Rectangle_2340", "Time em reunião"],
    ["1782153406058-48bf12-Rectangle_2344", "Bastidor de gravação"],
  ].map(([arquivo, alt], i) => ({
    id: `retrato-${String(i + 1).padStart(2, "0")}`,
    papel: "retrato",
    tipo: "imagem",
    de: `${FONTES.r2}/team/${arquivo}.webp`,
    alt,
    largura: 720,
  })),

  // ── cenas: render e arte de marca ────────────────────────────────────────
  { id: "cena-cubo", papel: "cena", tipo: "imagem", de: `${FONTES.assets}/visant_cube_black_glow.png`, alt: "Cubo Visant com halo" },
  { id: "cena-glare", papel: "cena", tipo: "imagem", de: `${FONTES.assets}/first-render-glare.png`, alt: "Render com estouro de luz" },
  { id: "cena-radio", papel: "cena", tipo: "imagem", de: `${FONTES.assets}/radio.png`, alt: "Rádio vintage renderizado" },
  { id: "cena-trofeu", papel: "cena", tipo: "imagem", de: `${FONTES.assets}/trophy.png`, alt: "Troféu renderizado" },
  { id: "cena-produto", papel: "cena", tipo: "imagem", de: `${FONTES.assets}/premium-product.png`, alt: "Embalagem premium" },
  { id: "cena-terra", papel: "cena", tipo: "imagem", de: `${FONTES.assets}/earth.png`, alt: "Globo renderizado" },
  { id: "cena-estojo", papel: "cena", tipo: "imagem", de: `${FONTES.assets}/pencil-case.png`, alt: "Estojo de lápis" },
  // A capa do Behance saiu: 1200×154 é faixa, não cena. Numa caixa 4:3 ela vira
  // tarja com duas barras pretas, e "a imagem não enche o card" é justamente o
  // defeito que o banco existe pra matar.
  { id: "cena-cartao", papel: "cena", tipo: "imagem", de: `${FONTES.r2}/team/1782153395840-b0c291-6.webp`, alt: "Cartão de perfil da marca", largura: 900 },

  // ── texturas: fundo que não disputa leitura ──────────────────────────────
  { id: "textura-vidro", papel: "textura", tipo: "imagem", de: `${FONTES.assets}/mymind-XUlsF9LYeVk-unsplash.jpg`, alt: "Textura de vidro" },
  { id: "textura-neon", papel: "textura", tipo: "imagem", de: `${FONTES.assets}/steve-johnson-0vHT_QY9u7k-unsplash.jpg`, alt: "Gradiente neon" },
  { id: "textura-papel", papel: "textura", tipo: "imagem", de: `${FONTES.assets}/simon-lee-ldg40aCeOXo-unsplash.jpg`, alt: "Textura de papel" },
  { id: "textura-bruma", papel: "textura", tipo: "imagem", de: `${FONTES.assets}/icarius-Lim3NQQ_RZ4-unsplash.jpg`, alt: "Bruma colorida" },

  // ── vídeo: recorte curto, mudo, em loop ──────────────────────────────────
  { id: "video-loop3d", papel: "video", tipo: "video", de: `${FONTES.board}/3d-loop.mp4`, alt: "Loop 3D da marca", corte: 6 },
  { id: "video-vinheta", papel: "video", tipo: "video", de: `${FONTES.assets}/vinheta-visant-sketch01.mp4`, alt: "Vinheta Visant", corte: 6 },
  { id: "video-composicao", papel: "video", tipo: "video", de: `${FONTES.assets}/Composição-33.mp4`, alt: "Composição em movimento", corte: 6, inicio: 2 },
];

// ── ferramenta ───────────────────────────────────────────────────────────────

const ff = (args) =>
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "pipe" });

/** Largura×altura reais do derivado — o manifesto sem proporção deixa a página pular. */
function medir(arquivo) {
  const saida = execFileSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", arquivo],
    { encoding: "utf8" },
  ).trim();
  const [w, h] = saida.split(",").map(Number);
  return { w, h };
}

/** Baixa a fonte remota uma vez, para um cache fora do repo versionado. */
async function baixar(url, destino) {
  if (existsSync(destino)) return destino;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} em ${url}`);
  writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  return destino;
}

const precisa = (fonte, destino) => {
  if (FORCE || !existsSync(destino)) return true;
  try {
    return statSync(fonte).mtimeMs > statSync(destino).mtimeMs;
  } catch {
    return false;
  }
};

// ── execução ─────────────────────────────────────────────────────────────────

mkdirSync(SAIDA, { recursive: true });
const CACHE = join(ROOT, "node_modules", ".cache", "media-bank");
mkdirSync(CACHE, { recursive: true });

const manifesto = [];
const faltando = [];
let refeitos = 0;

for (const item of ACERVO) {
  let fonte = item.de;

  if (fonte.startsWith("http")) {
    try {
      fonte = await baixar(fonte, join(CACHE, `${item.id}-orig`));
    } catch (e) {
      faltando.push(`${item.id}: ${e.message}`);
      continue;
    }
  } else if (!existsSync(fonte)) {
    faltando.push(`${item.id}: fonte ausente (${fonte})`);
    continue;
  }

  try {
    if (item.tipo === "imagem") {
      const destino = join(SAIDA, `${item.id}.webp`);
      const largura = item.largura ?? 1200;
      if (precisa(fonte, destino)) {
        // `-2` na altura mantém a proporção em número par, que é o que os
        // encoders aceitam sem reclamar. `min(w,iw)` nunca AMPLIA: subir uma
        // foto de 400px para 1200 não inventa detalhe, só peso.
        ff(["-i", fonte, "-vf", `scale='min(${largura},iw)':-2`, "-c:v", "libwebp", "-quality", "78", destino]);
        refeitos++;
      }
      manifesto.push({ id: item.id, papel: item.papel, tipo: "imagem", src: `/media/${item.id}.webp`, alt: item.alt, ...medir(destino) });
    } else {
      const destino = join(SAIDA, `${item.id}.mp4`);
      const webm = join(SAIDA, `${item.id}.webm`);
      const poster = join(SAIDA, `${item.id}.webp`);
      if (precisa(fonte, destino)) {
        // Mudo e curto, de propósito: vídeo de vitrine que toca som é armadilha,
        // e depois de ~6s ninguém está mais olhando para o card.
        ff([
          "-ss", String(item.inicio ?? 0), "-t", String(item.corte ?? 6), "-i", fonte,
          "-an", "-vf", "scale='min(960,iw)':-2,fps=24",
          "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p",
          "-movflags", "+faststart", destino,
        ]);
        /*
         * O MESMO vídeo sai duas vezes, e não é desperdício.
         *
         * H.264 é codec proprietário: o Chromium de build livre — que é o que o
         * Playwright roda, e o que vem em várias distros — recusa o mp4 com
         * `MediaError 4` e o card cai no wireframe sem avisar ninguém. VP9/WebM
         * toca em tudo que é Chromium e Firefox; o mp4 fica para o Safari, que
         * é o contrário. Dois arquivos de ~120KB compram cobertura total.
         */
        ff([
          "-ss", String(item.inicio ?? 0), "-t", String(item.corte ?? 6), "-i", fonte,
          "-an", "-vf", "scale='min(960,iw)':-2,fps=24",
          "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-deadline", "good", "-cpu-used", "4",
          "-row-mt", "1", webm,
        ]);
        // O pôster não é luxo: sem ele o card fica um retângulo preto até o
        // primeiro quadro chegar, e em conexão ruim isso é a impressão que fica.
        ff(["-ss", String(item.inicio ?? 0), "-i", fonte, "-frames:v", "1", "-vf", "scale='min(960,iw)':-2", "-c:v", "libwebp", "-quality", "72", poster]);
        refeitos++;
      }
      manifesto.push({ id: item.id, papel: item.papel, tipo: "video", src: `/media/${item.id}.mp4`, webm: `/media/${item.id}.webm`, poster: `/media/${item.id}.webp`, alt: item.alt, ...medir(destino) });
    }
  } catch (e) {
    faltando.push(`${item.id}: ${String(e.message).split("\n")[0]}`);
  }
}

writeFileSync(MANIFESTO, JSON.stringify(manifesto, null, 2) + "\n");

const peso = manifesto.reduce((soma, m) => {
  const arquivos = [m.src, m.webm, m.poster].filter(Boolean).map((p) => join(ROOT, "public", p.slice(1)));
  return soma + arquivos.reduce((s, f) => s + (existsSync(f) ? statSync(f).size : 0), 0);
}, 0);

const porPapel = manifesto.reduce((acc, m) => ({ ...acc, [m.papel]: (acc[m.papel] ?? 0) + 1 }), {});
console.log(
  `banco de mídia: ${manifesto.length} peças (${Object.entries(porPapel).map(([k, v]) => `${v} ${k}`).join(", ")}) · ` +
    `${(peso / 1024 / 1024).toFixed(2)}MB em public/media · ${refeitos} transcodificadas agora`,
);
if (faltando.length) {
  console.log(`\n  não entraram (${faltando.length}):`);
  for (const f of faltando) console.log(`  · ${f}`);
}
