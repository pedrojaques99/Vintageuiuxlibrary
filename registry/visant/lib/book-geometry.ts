/**
 * A geometria e o gesto de um livro de capa dura, fora do componente.
 *
 * Mora separado porque é a parte TESTÁVEL: um livro que muda de espessura entre
 * renders quebra a prateleira, e "a inclinação parece errada" não é coisa que se
 * audita olhando JSX de cena 3D.
 *
 * Nada de `Math.random`, nada de `Date`: dimensão sai da contagem de páginas,
 * inclinação sai do ponteiro. Zero cor — a cor vive em `book-material`.
 *
 * Unidade de mundo: ALTURA DO LIVRO = 1. Toda medida daqui é relativa a ela,
 * então trocar a escala da cena é mexer em um número só, na câmera.
 */

/* ── Geometria ──────────────────────────────────────────────────────────── */

/** Proporção de livro comercial (≈ 6×9 pol). Não é escolha estética: é o que o
 *  olho reconhece como livro em vez de caderno ou catálogo. */
export const RATIO = 0.68;

/**
 * Espessura por página, em altura-relativo. Um livro de 229 mm com 300 páginas
 * de offset dá ~16 mm de miolo; 0.00026 × 300 × 229 mm ≈ 18 mm, contando capa.
 */
const PAPER_PER_PAGE = 0.00026;

/** Piso e teto. Sem eles, um e-book de 40 páginas vira panfleto e um curso de
 *  900 vira tijolo — e os dois leem como defeito, não como informação. */
const MIN_THICKNESS = 0.05;
const MAX_THICKNESS = 0.17;

/** Sem contagem de páginas, este é o livro "de estante" médio. */
const DEFAULT_PAGES = 240;

/** Cartão da capa dura. É ele que cria o degrau na borda — ver `SQUARE`. */
export const BOARD = 0.007;

/**
 * A "praça": o quanto a capa avança além do miolo nas três bordas livres.
 *
 * É o detalhe que separa livro de caixa texturizada. Numa capa dura real o
 * cartão sobra ~3 mm além do bloco de páginas, e é essa sombra fina em volta do
 * corte que o olho lê como "isso abre". Sem ela, qualquer render vira
 * paralelepípedo com uma foto colada.
 */
export const SQUARE = 0.014;

export type BookDimensions = {
  /** Eixo X. Lombada em `-width/2`, corte em `+width/2`. */
  width: number;
  /** Eixo Y. Sempre 1 — é a unidade. */
  height: number;
  /** Eixo Z. Capa em `+thickness/2`. */
  thickness: number;
  /** Espessura só do bloco de páginas, já descontados os dois cartões. */
  block: number;
};

export function thicknessFor(pages?: number | null): number {
  const p = pages && pages > 0 ? pages : DEFAULT_PAGES;
  return Math.min(MAX_THICKNESS, Math.max(MIN_THICKNESS, p * PAPER_PER_PAGE));
}

export function bookDimensions(pages?: number | null): BookDimensions {
  const thickness = thicknessFor(pages);
  return { width: RATIO, height: 1, thickness, block: thickness - BOARD * 2 };
}

/* ── Inclinação ─────────────────────────────────────────────────────────── */

/**
 * Repouso: três-quartos, lombada à vista.
 *
 * Livro de frente é a capa achatada — é a imagem 2D que já existe, e pagar
 * WebGL pra chegar nela seria peso sem receita. O ângulo existe pra mostrar a
 * ÚNICA coisa que a versão 2D não mostra: que o objeto tem lado.
 *
 * `y` positivo gira a lombada (que fica em −X) na direção do observador.
 */
export const REST_Y = 0.38;

/**
 * Inclinação de repouso no eixo X — quem revela a CABEÇA do miolo.
 *
 * ┌─ O SINAL, QUE JÁ FOI ERRADO DUAS VEZES ───────────────────────────────────┐
 * │ Uma face só é visível se o olho estiver do lado de fora do plano dela:    │
 * │ `n · (olho − p) > 0`. Pra tampa de cima, com a câmera abaixo do topo do   │
 * │ livro (y=0.5), isso dá NEGATIVO — não se vê a cabeça de jeito nenhum,     │
 * │ incline-se o livro pra onde for.                                          │
 * │                                                                            │
 * │ E `x` negativo, que parece "baixar o topo", faz o contrário do que o nome │
 * │ sugere: joga a normal do topo pra −z, ou seja, pra LONGE de quem olha.    │
 * │                                                                            │
 * │ Quem resolve é a CÂMERA subir acima de y=0.5. Com ela lá em cima, um `x`  │
 * │ levemente POSITIVO inclina o topo na direção do olho e abre a cabeça — é  │
 * │ o gesto de tombar uma caixa pra ver a tampa.                              │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * 0.06 é pouco de propósito: acima disso o livro lê como tombando pra frente.
 */
export const REST_X = 0.06;

/** Curso do hover, em radianos. Teto de propósito: passar disto mostra a
 *  contracapa, que é a face mais fraca do modelo (não tem arte, só tom). */
const SWING_Y = 0.34;
const SWING_X = 0.18;

export type Tilt = { rx: number; ry: number };

export const REST: Tilt = { rx: REST_X, ry: REST_Y };

/**
 * Ponteiro normalizado (−1..1, origem no centro da peça) → rotação do grupo.
 *
 * `px` INVERTE: cursor à direita puxa a lombada pra fora, como se o dedo
 * girasse o livro pelo corte. O contrário — cursor à direita, lombada some — lê
 * como o objeto FUGINDO do cursor, e foi o primeiro descarte da bancada.
 *
 * `py` não inverte, e é o mesmo gesto: cursor na base empurra o pé e o topo vem
 * na direção do olho, mostrando mais cabeça. O objeto obedece ao dedo nos dois
 * eixos.
 */
export function tilt(px: number, py: number): Tilt {
  const cx = Math.max(-1, Math.min(1, px));
  const cy = Math.max(-1, Math.min(1, py));
  return { ry: REST_Y - cx * SWING_Y, rx: REST_X + cy * SWING_X };
}

/**
 * Amortecimento independente de taxa de quadros.
 *
 * `atual + (alvo − atual) * k` — o lerp que todo mundo escreve — depende do
 * intervalo entre quadros: a 144 Hz o objeto chega quase instantâneo e a 30 Hz
 * arrasta. Duas máquinas, duas animações diferentes. A exponencial mata isso:
 * `k` vira "quanto da distância por SEGUNDO", e o resultado é o mesmo em
 * qualquer monitor.
 *
 * O teto de `dt` existe porque aba em segundo plano devolve um delta gigante no
 * primeiro quadro de volta. Sem ele o livro TELEPORTA, e teleporte lê como
 * falha de render.
 */
export function damp(current: number, target: number, k: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-k * Math.min(dt, 0.1)));
}

/** Rigidez do retorno. Rápido o bastante pra parecer resposta, lento o bastante
 *  pra ter peso — livro não é botão. */
export const STIFFNESS = 7;

/**
 * Câmera de foto de produto.
 *
 * `fov` longo (24) porque grande-angular deforma a capa e denuncia o render —
 * 24 mm equivalente é onde foto de produto vive. A ALTURA não é gosto: o topo
 * do livro está em y=0.5 e uma face só aparece pra quem está fora do plano
 * dela, então abaixo de 0.5 a cabeça do miolo não aparece em ângulo nenhum e a
 * praça — metade da razão de a malha ter quatro peças — nunca chega à tela.
 */
export const CAMERA = { position: [0, 0.55, 2.9] as const, fov: 24 };
