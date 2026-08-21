/**
 * A matéria do livro, derivada dos tokens da marca.
 *
 * ┌─ WEBGL NÃO LÊ CSS ────────────────────────────────────────────────────────┐
 * │ A tese da library é "componente nunca tem cor própria: ele consome        │
 * │ `var(--brand)`". Um material do three.js não pode fazer isso — não há     │
 * │ cascata dentro de uma cena WebGL, e `var(--card)` não significa nada pra  │
 * │ um `MeshStandardMaterial`.                                                │
 * │                                                                            │
 * │ A saída não é abrir exceção e escrever hex: é usar o PRÓPRIO NAVEGADOR    │
 * │ como resolvedor. Escreve-se a expressão de token num elemento             │
 * │ descartável, lê-se o `getComputedStyle` de volta, e o que chega é o rgb   │
 * │ exato que o CSS pintaria — inclusive através de `color-mix(in oklch, …)`, │
 * │ que ninguém quer reimplementar. Nenhuma cor literal existe neste arquivo, │
 * │ e não por disciplina: por construção.                                     │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ MATIZ VEM DA ARTE, VALOR VEM DA MARCA ───────────────────────────────────┐
 * │ Pegar a cor dominante de uma capa e pintar a lombada com ela é o caminho  │
 * │ óbvio e está errado: pinturas têm dominantes claras, e uma lombada bege   │
 * │ de luminância 0.65 numa interface escura não lê como livro, lê como       │
 * │ vazamento de CSS.                                                         │
 * │                                                                            │
 * │ Então só o MATIZ atravessa. A saturação entra amortecida e a luminância   │
 * │ é derivada do `--background` de quem instalou: marca escura → livro       │
 * │ escuro, marca clara → livro claro. O objeto pertence à sua arte e         │
 * │ continua pertencendo à tela.                                              │
 * └────────────────────────────────────────────────────────────────────────────┘
 */

import { coverLook, mix } from "@/lib/cover-look";

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

/* ── O resolvedor ───────────────────────────────────────────────────────── */

/**
 * Qualquer expressão de cor do CSS → rgb, resolvida pelo navegador.
 *
 * O elemento fica FORA do fluxo e é removido no mesmo tique. `getComputedStyle`
 * força layout, então isto é caro num laço — e é por isso que só roda uma vez
 * por livro, na montagem, nunca por quadro.
 *
 * Devolve `null` fora do navegador e quando o token não existe: quem chama
 * decide o que fazer, e a decisão nunca é "usa este hex aqui".
 */
export function resolveRgb(css: string): Rgb | null {
  if (typeof document === "undefined") return null;
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  probe.style.color = css;
  document.body.appendChild(probe);
  const painted = getComputedStyle(probe).color;
  probe.remove();
  const m = painted.match(/-?[\d.]+/g);
  if (!m || m.length < 3) return null;
  return { r: +m[0], g: +m[1], b: +m[2] };
}

/** Token do documento, ou `''` se ele não existir. */
export function token(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ── Conversão ──────────────────────────────────────────────────────────── */

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rr
      ? ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6
      : max === gg
        ? ((bb - rr) / d + 2) / 6
        : ((rr - gg) / d + 4) / 6;
  return { h, s, l };
}

function channel(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

/** Sempre `rgb(…)`, nunca hex — o portão de cor do registry lê o CÓDIGO. */
export function hslToCss({ h, s, l }: Hsl): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const to = (t: number) => Math.round((s === 0 ? l : channel(p, q, t)) * 255);
  return `rgb(${to(h + 1 / 3)}, ${to(h)}, ${to(h - 1 / 3)})`;
}

export const rgbToCss = ({ r, g, b }: Rgb) => `rgb(${r}, ${g}, ${b})`;

/* ── A régua, derivada do --background ──────────────────────────────────── */

/**
 * Degraus de luminância a partir da superfície da marca, e o SINAL que decide
 * pra que lado eles crescem.
 *
 * Numa marca escura o livro tem que ser mais claro que a página pra ter
 * silhueta; numa marca clara, mais escuro. Um único `sign` resolve os dois
 * casos e é a razão de a peça não precisar de uma variante "dark".
 *
 * O papel dá um salto grande de propósito: o bloco de páginas é o único
 * material do objeto que não é a capa, e se ele ficar perto do tom do cartão o
 * livro vira um bloco só.
 */
const STEP = { spine: 0.15, dark: 0.035, board: 0.09, back: 0.055, paper: 0.72 };

/** Nem branco estourado nem preto chapado: os dois matam o degrau da praça. */
const clampL = (l: number) => Math.min(0.94, Math.max(0.05, l));

/** Teto de saturação. Livro tingido, não livro pintado. */
const SAT_CEILING = 0.34;

export type BookPalette = {
  /** Topo da lombada e da contracapa. */
  cover: string;
  /** Pé da lombada, e o par escuro de todo gradiente. */
  coverDark: string;
  /** Cartão da capa — o degrau que aparece na praça e na quina. */
  board: string;
  /** Fundo da contracapa. */
  back: string;
  /** Corte do miolo. */
  paper: string;
  /** Fundo do estúdio virtual. Não é o fundo da PÁGINA (o canvas é
   *  transparente): é o que o ambiente reflete na capa. */
  studio: string;
};

/**
 * A palheta inteira, a partir da semente do item e — se houver — do matiz da
 * arte da capa.
 *
 * Sem arte, o matiz vem da MESMA rampa que o `cover-art` usa pra desenhar a
 * capa 2D do mesmo item. Não é economia: é o que faz o livro e o card do
 * catálogo serem reconhecíveis como a mesma coisa.
 */
export function bookPalette(seed: string, artColor?: string | null): BookPalette {
  const look = coverLook(seed);

  const surface = resolveRgb("var(--background)");
  const lBg = surface ? rgbToHsl(surface).l : 0.05;
  const sign = lBg < 0.5 ? 1 : -1;
  const at = (step: number) => clampL(lBg + sign * step);

  /* O matiz: da arte quando ela existe, senão da rampa tonal da marca. */
  const source = resolveRgb(artColor || mix(look.light));
  const hsl = source ? rgbToHsl(source) : { h: 0, s: 0, l: 0.5 };
  const h = hsl.h;
  const s = Math.min(hsl.s, SAT_CEILING);

  return {
    cover: hslToCss({ h, s, l: at(STEP.spine) }),
    coverDark: hslToCss({ h, s: s * 0.85, l: at(STEP.dark) }),
    board: hslToCss({ h, s: s * 0.7, l: at(STEP.board) }),
    back: hslToCss({ h, s: s * 0.8, l: at(STEP.back) }),
    /* Papel quase neutro: um creme saturado puxaria cor pra dentro de um
       produto que pode ter decidido não ter cor. */
    paper: hslToCss({ h, s: s * 0.12, l: at(STEP.paper) }),
    studio: surface ? rgbToCss(surface) : hslToCss({ h: 0, s: 0, l: 0.06 }),
  };
}

/* ── Aspereza ───────────────────────────────────────────────────────────── */

/** Alto = pano e papel-cartão, não plástico. O erro clássico de render de livro
 *  é deixar isto baixo e o objeto virar brinquedo lustroso. */
export const ROUGH_COVER = 0.82;
export const ROUGH_PAPER = 0.95;

/* ── O matiz da arte ────────────────────────────────────────────────────── */

/** Grade de amostragem. Pequena de propósito: a média de uma pintura não muda
 *  entre 32×48 e 800×1200, e a leitura fica em microssegundos. */
const GRID_W = 32;
const GRID_H = 48;

/**
 * A cor de caráter de uma imagem, medida da própria textura já carregada.
 *
 * Existe pra que um item cadastrado amanhã já saia com a lombada na cor da arte,
 * sem ninguém rodar nada. Uma palheta curada por gente continua ganhando quando
 * existe (é o parâmetro `artColor`) — ela sabe o que é ASSUNTO e o que é fundo,
 * e isto aqui não sabe. Isto é o piso, não o teto.
 *
 * A média é CIRCULAR: matiz é ângulo, e a média aritmética de 350° e 10° dá
 * 180° — ciano, uma cor que não existe em nenhum dos dois pixels. Somar vetores
 * unitários e tirar o `atan2` no fim é o único jeito que respeita a roda.
 *
 * O peso é `saturação × proximidade do meio-tom`: pixel cinza não tem matiz pra
 * opinar, e branco estourado ou preto de sombra também não.
 */
export function characterColor(img: CanvasImageSource): string | null {
  try {
    const c = document.createElement("canvas");
    c.width = GRID_W;
    c.height = GRID_H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, GRID_W, GRID_H);
    const { data } = ctx.getImageData(0, 0, GRID_W, GRID_H);

    let x = 0;
    let y = 0;
    let sumS = 0;
    let weight = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const { h, s, l } = rgbToHsl({ r: data[i], g: data[i + 1], b: data[i + 2] });
      const w = s * Math.max(0, 1 - Math.abs(l - 0.5) * 1.6);
      if (w <= 0) continue;
      const a = h * Math.PI * 2;
      x += Math.cos(a) * w;
      y += Math.sin(a) * w;
      sumS += s * w;
      weight += w;
    }

    /* Arte acromática (uma foto em preto e branco, um diagrama): não há matiz
       pra colher, e inventar um seria pior que herdar o tom da marca. */
    if (weight < 1e-6) return null;

    const h = (Math.atan2(y, x) / (Math.PI * 2) + 1) % 1;
    return hslToCss({ h, s: Math.min(1, sumS / weight), l: 0.5 });
  } catch {
    /* `getImageData` numa textura de outra origem sem CORS joga SecurityError.
       Livro sem cor de lombada é muito melhor que livro que não renderiza. */
    return null;
  }
}
