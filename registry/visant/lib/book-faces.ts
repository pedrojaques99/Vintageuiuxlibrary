/**
 * As faces que o item não fornece, pintadas em `<canvas>`.
 *
 * O item entrega UMA imagem: a capa de frente. Lombada, contracapa e corte do
 * miolo saem daqui, derivados da mesma semente e da mesma palheta. Isso não é
 * economia de esforço: é o que faz o mesmo item ser o mesmo objeto em qualquer
 * render, e o que permite cadastrar produto sem virar trabalho de arte.
 *
 * Zero byte de rede. A alternativa — três imagens por item num bucket —
 * significaria que trocar a paleta da marca deixaria o acervo inteiro com a cor
 * velha.
 */

import * as THREE from "three";

import { coverLook, monogram, type CoverLook } from "@/lib/cover-look";
import { resolveRgb, token, type BookPalette } from "@/lib/book-material";
import type { BookDimensions } from "@/lib/book-geometry";

/** Resolução das faces de texto. 1024 na altura é o que segura o título da
 *  lombada legível num herói sem serrilhar; acima disso é VRAM à toa. */
const TEX_H = 1024;

type Ctx = CanvasRenderingContext2D;

function surface(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

/**
 * A tinta do texto, com alfa, saída do token — nunca escrita à mão.
 *
 * Canvas 2D não enxerga `var()` nem `color-mix()`: não há elemento, não há
 * cascata. Sem esta ponte, toda face pintada aqui teria a cor em canais crus, e
 * trocar o tema deixaria a lombada com a cor velha, em silêncio.
 */
function ink(pct: number): string {
  const fg = resolveRgb("var(--foreground)");
  const base = fg ? `${fg.r}, ${fg.g}, ${fg.b}` : "128, 128, 128";
  return `rgba(${base}, ${pct / 100})`;
}

/**
 * O nome da família que o pipeline de fonte gerou, lido do token.
 *
 * Hardcodar `'Inter'` aqui funcionaria em dev e falharia em produção: um
 * `next/font` publica a fonte com nome hasheado e o nome humano simplesmente
 * não existe no documento. Canvas não avisa — cai no fallback em silêncio e a
 * lombada sai com outra letra.
 */
function family(name: "--font-sans" | "--font-display"): string {
  return token(name) || "sans-serif";
}

function texture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Encolhe o corpo até caber em UMA linha. É o caso da lombada, que não tem
 *  segunda linha pra oferecer: título cortado com reticências ali seria pior
 *  que título pequeno, porque a lombada É o nome do objeto. */
function fitOneLine(ctx: Ctx, text: string, limit: number, max: number, fam: string): number {
  let px = max;
  while (px > 10) {
    ctx.font = `700 ${px}px ${fam}`;
    if (ctx.measureText(text).width <= limit) break;
    px -= 2;
  }
  return px;
}

function wrap(ctx: Ctx, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width > width && line) {
      lines.push(line);
      line = word;
    } else line = attempt;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * O maior corpo em que o título cabe em `maxLines` — a régua de CAPA, que é
 * outra coisa da régua de lombada.
 *
 * Usar `fitOneLine` aqui foi um defeito real: ela encolhe até caber numa linha,
 * e um título de cinco palavras só cabe numa linha em corpo minúsculo. A capa
 * saía ilegível ao lado das que têm arte, e a degradação — que existe pra o
 * item sem arte continuar tendo cara — virava a prova de que ele não tem.
 *
 * A ordem certa é a do tipógrafo: escolhe o corpo, QUEBRA, e só encolhe se
 * passar do número de linhas que a página aguenta. Uma palavra sozinha mais
 * larga que a coluna também derruba o corpo, e por isso a maior linha entra na
 * condição.
 */
function fitBlock(
  ctx: Ctx,
  text: string,
  width: number,
  max: number,
  maxLines: number,
  fam: string,
): { px: number; lines: string[] } {
  let px = max;
  let lines = [""];
  while (px > 12) {
    ctx.font = `800 ${px}px ${fam}`;
    lines = wrap(ctx, text, width);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (lines.length <= maxLines && widest <= width) break;
    px -= 2;
  }
  return { px, lines };
}

/* ── Lombada ────────────────────────────────────────────────────────────── */

/**
 * A face que justifica o 3D existir.
 *
 * Vai numa meia-cilíndrica, então a UV corre em volta da curva (u = largura da
 * lombada) e ao longo da altura (v). O texto roda 90° pra correr no v: livro
 * ocidental lê de cima pra baixo, com a cabeça inclinada pra direita.
 *
 * A LARGURA da textura é o ARCO, não a largura da capa. Foi `width / height`
 * (0.68) e o certo é `π·thickness/2 / height` — num livro grosso, 0.27. Assim a
 * textura saía duas vezes e meia mais larga do que a superfície onde pousa, e a
 * curva espremia tudo: o título ficava alto e fino, como letra esticada na
 * vertical. É o erro que mais denuncia mapeamento em superfície curva, porque o
 * olho conhece a proporção da letra e vê a distorção sem saber nomeá-la.
 *
 * As duas sombras nas pontas do u são a CHARNEIRA — o vinco onde a capa dobra.
 * Sem elas a curva lê como tubo colado no livro; com elas, como lombada.
 */
export function paintSpine(title: string, p: BookPalette, d: BookDimensions) {
  const arc = (Math.PI * d.thickness) / 2;
  /* Piso de 40px é só resolução: numa lombada fina o texto já é minúsculo, e
     forçar a largura acima da razão real traria a distorção de volta. */
  const W = Math.max(40, Math.round((arc / d.height) * TEX_H));
  const [canvas, ctx] = surface(W, TEX_H);

  const g = ctx.createLinearGradient(0, 0, 0, TEX_H);
  g.addColorStop(0, p.cover);
  g.addColorStop(1, p.coverDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, TEX_H);

  const hinge = ctx.createLinearGradient(0, 0, W, 0);
  hinge.addColorStop(0, "rgba(0,0,0,0.55)");
  hinge.addColorStop(0.13, "rgba(0,0,0,0)");
  hinge.addColorStop(0.87, "rgba(0,0,0,0)");
  hinge.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = hinge;
  ctx.fillRect(0, 0, W, TEX_H);

  const margin = W * 0.22;
  ctx.fillStyle = ink(22);
  ctx.fillRect(margin, TEX_H * 0.055, W - margin * 2, 2);
  ctx.fillRect(margin, TEX_H * 0.945, W - margin * 2, 2);

  ctx.save();
  ctx.translate(W / 2, TEX_H * 0.11);
  ctx.rotate(Math.PI / 2);
  const fam = family("--font-sans");
  const px = fitOneLine(ctx, title, TEX_H * 0.7, W * 0.46, fam);
  ctx.font = `700 ${px}px ${fam}`;
  ctx.fillStyle = ink(92);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 0, 0);
  ctx.restore();

  /* Monograma no pé, onde numa estante real fica o selo da editora. */
  ctx.save();
  ctx.translate(W / 2, TEX_H * 0.9);
  ctx.rotate(Math.PI / 2);
  ctx.font = `400 ${Math.round(W * 0.3)}px ${family("--font-display")}`;
  ctx.fillStyle = ink(55);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(monogram(title), 0, 0);
  ctx.restore();

  return texture(canvas);
}

/* ── Contracapa ─────────────────────────────────────────────────────────── */

/** Nunca fica de frente — o curso do hover para antes. Existe pra que a borda
 *  que se vê de três-quartos não seja um retângulo chapado. */
export function paintBack(p: BookPalette, ratio: number, mark?: string) {
  const W = Math.round(TEX_H * ratio);
  const [canvas, ctx] = surface(W, TEX_H);

  const g = ctx.createLinearGradient(0, 0, W, TEX_H);
  g.addColorStop(0, p.back);
  g.addColorStop(1, p.coverDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, TEX_H);

  ctx.fillStyle = ink(16);
  ctx.fillRect(W * 0.12, TEX_H * 0.86, W * 0.16, 2);

  if (mark) {
    ctx.font = `400 ${Math.round(W * 0.05)}px ${family("--font-display")}`;
    ctx.fillStyle = ink(40);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(mark, W * 0.12, TEX_H * 0.91);
  }

  return texture(canvas);
}

/* ── Corte do miolo ─────────────────────────────────────────────────────── */

/**
 * Uma textura por PALHETA, memoizada — é a mesma folha de papel em todo livro
 * de uma mesma marca, e refazê-la por item seria VRAM repetida.
 *
 * As listras não são regulares: passo constante bate com a grade de pixels e
 * produz moiré quando o livro gira, que é o artefato que mais denuncia render
 * barato. A variação vem de um seno, não de `Math.random` — determinismo aqui é
 * a diferença entre "renderizar duas vezes dá o mesmo resultado" e não dar.
 */
const blockCache = new Map<string, THREE.CanvasTexture>();

export function paintBlock(p: BookPalette): THREE.CanvasTexture {
  const cached = blockCache.get(p.paper);
  if (cached) return cached;

  const N = 1024;
  const [canvas, ctx] = surface(N, 64);

  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, N, 64);

  for (let i = 0; i < 260; i++) {
    const x = (i / 260) * N + Math.sin(i * 2.399) * 1.6;
    const a = 0.06 + (Math.sin(i * 1.117) + 1) * 0.05;
    ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`;
    ctx.fillRect(x, 0, 1.2, 64);
  }

  /* Escurecimento nas duas pontas: o corte encosta nos cartões e ali entra
     menos luz. É o que impede o bloco de páginas de virar barra clara chapada. */
  const g = ctx.createLinearGradient(0, 0, N, 0);
  g.addColorStop(0, "rgba(0,0,0,0.42)");
  g.addColorStop(0.1, "rgba(0,0,0,0)");
  g.addColorStop(0.9, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, N, 64);

  const t = texture(canvas);
  blockCache.set(p.paper, t);
  return t;
}

/* ── Capa de frente, quando não há arte ─────────────────────────────────── */

/**
 * Degradação honesta: sem arte o livro não vira caixa cinza nem imagem gerada —
 * vira a mesma capa desenhada que o `cover-art` mostra na prateleira, agora com
 * espessura. Mesmo hash, então o item é reconhecível nas duas superfícies.
 */
export function paintCover(title: string, look: CoverLook, p: BookPalette, ratio: number) {
  const W = Math.round(TEX_H * ratio);
  const [canvas, ctx] = surface(W, TEX_H);

  const rad = (look.angle * Math.PI) / 180;
  const g = ctx.createLinearGradient(0, 0, Math.cos(rad) * W, Math.sin(rad) * TEX_H);
  g.addColorStop(0, p.cover);
  g.addColorStop(1, p.coverDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, TEX_H);

  const m = W * 0.11;
  const base = look.titleOnTop ? TEX_H * 0.16 : TEX_H * 0.82;

  ctx.fillStyle = ink(28);
  ctx.fillRect(m, base - TEX_H * 0.055, W * 0.14, 2);

  const fam = family("--font-sans");
  /* Teto de 4 linhas: acima disso o título vira parágrafo e a capa vira
     folheto. O corpo de partida é generoso — capa não é lombada. */
  const { px, lines } = fitBlock(ctx, title, W - m * 2, W * 0.17, 4, fam);
  ctx.font = `800 ${px}px ${fam}`;
  ctx.fillStyle = ink(95);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  /* Composição de BASE cresce pra cima e a de topo pra baixo. Sem isso, um
     título de quatro linhas ancorado no pé sangrava pra fora do cartão. */
  const leading = px * 1.08;
  const top = look.titleOnTop ? base : base - (lines.length - 1) * leading;
  lines.forEach((l, i) => ctx.fillText(l, m, top + i * leading));

  return texture(canvas);
}

/** Tudo que o livro precisa, num lugar só. */
export function bookFaces(
  seed: string,
  title: string,
  d: BookDimensions,
  palette: BookPalette,
  mark?: string,
) {
  const look = coverLook(seed);
  const ratio = d.width / d.height;
  return {
    spine: paintSpine(title, palette, d),
    back: paintBack(palette, ratio, mark),
    cover: paintCover(title, look, palette, ratio),
    block: paintBlock(palette),
  };
}
