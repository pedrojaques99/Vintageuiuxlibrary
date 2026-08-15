/**
 * A lógica determinística da capa gerada, fora do componente.
 *
 * Mora aqui e não no `.tsx` por dois motivos: dá pra **testar** (determinismo é
 * a única promessa que a capa faz — se ela mudar entre renders, quebra
 * hidratação e destrói o reconhecimento na prateleira), e o componente fica só
 * com a pintura.
 *
 * Nada de `Math.random`, nada de `Date`: só um hash da chave.
 */

export type CoverFamily = "book" | "app" | "plate";

/**
 * djb2-ish. Estável entre Node e browser — é o que garante SSR == cliente.
 * Trocar por qualquer hash "melhor" é aceitável; trocar por um que dependa de
 * ordem de iteração de objeto ou de locale, não.
 */
export function hashKey(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * A rampa tonal.
 *
 * **Não são cores, são misturas.** O original trazia cinco pares de hex, e hex
 * num item de registry morre no primeiro cliente de outra marca. Aqui cada tom
 * é uma proporção entre `--card` e `--foreground`, então a rampa inteira nasce
 * da paleta de quem instalou.
 *
 * As diferenças são pequenas de propósito: numa prateleira real os livros
 * variam de tom sem virar arco-íris, e é essa variação sutil que faz um trilho
 * inteiro sem thumb não parecer defeito de carregamento.
 */
export const TONE_RAMP: ReadonlyArray<readonly [number, number]> = [
  [14, 4],
  [9, 2],
  [18, 6],
  [11, 3],
  [16, 5],
];

export const ANGLES = [135, 160, 115] as const;

/**
 * Palavras que não identificam nada. Sem esta lista, "A Imersão de Marca" vira
 * "ID" (Imersão + de) — pego por teste, não na tela. Monograma existe pra a
 * pessoa reconhecer o item de relance; preposição não reconhece.
 *
 * A lista é pt-BR + en por padrão e entra por parâmetro quando o produto fala
 * outra língua: stopword é decisão de idioma, não de design.
 */
export const STOPWORDS_PT_EN = new Set([
  "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "no", "na",
  "nos", "nas", "com", "por", "para", "pra", "ao", "aos", "um", "uma",
  "the", "of", "in", "on", "at", "to", "for", "and", "an",
]);

/** Duas letras pra identificar a peça na barra da janela. */
export function monogram(title: string, stopwords: Set<string> = STOPWORDS_PT_EN): string {
  const palavras = title
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p) && p.length > 1 && !stopwords.has(p.toLowerCase()));
  if (!palavras.length) {
    // Título só de palavras funcionais ou de símbolos: cai no que houver de
    // letra/dígito, e nunca devolve vazio (um monograma em branco lê como bug).
    const cru = title.replace(/[^\p{L}\p{N}]/gu, "");
    return (cru.slice(0, 2) || "··").toUpperCase();
  }
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return (palavras[0][0] + palavras[1][0]).toUpperCase();
}

export type CoverLook = {
  /** % de `--foreground` misturado no `--card` pro tom claro do gradiente. */
  light: number;
  /** idem, pro tom escuro. */
  dark: number;
  angle: number;
  /** BOOK: título no topo em vez de na base. */
  titleOnTop: boolean;
  /** APP: painel lateral à esquerda. */
  panelLeft: boolean;
  /** APP: quantas linhas de conteúdo. */
  lines: number;
  /** Deslocamento das larguras de linha, pra duas janelas vizinhas não repetirem. */
  spin: number;
};

/**
 * Toda a variação sai de UM hash, por deslocamento de bits — cada aspecto lê
 * uma fatia diferente do mesmo número, então nada precisa de segunda semente.
 */
export function coverLook(key: string): CoverLook {
  const h = hashKey(key);
  const [light, dark] = TONE_RAMP[h % TONE_RAMP.length];
  return {
    light,
    dark,
    angle: ANGLES[(h >> 6) % ANGLES.length],
    titleOnTop: (h >> 3) % 3 === 2,
    panelLeft: ((h >> 3) & 1) === 0,
    lines: 3 + ((h >> 4) % 2),
    spin: h >> 5,
  };
}

/** `mix(14)` → um tom 14% mais próximo do `--foreground` que o `--card`. */
export const mix = (pct: number) =>
  `color-mix(in oklch, var(--foreground) ${pct}%, var(--card))`;
