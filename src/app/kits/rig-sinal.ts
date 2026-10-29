/**
 * A cadeia de sinal da bancada vintage, em um lugar só.
 *
 * O defeito que isto mata: a sala antiga tinha nove módulos e **nenhum caminho**.
 * O VU sorteava um número a cada 100ms, o osciloscópio desenhava uma soma de
 * senos fixa, e os controles não chegavam a lugar nenhum. Girar o DRIVE não
 * movia o ponteiro; o CLIP acendia sozinho. A pessoa mexia em treze peças e a
 * bancada respondia a nenhuma, que é o jeito mais rápido de uma demo interativa
 * virar decoração.
 *
 * Aqui existe uma cadeia: fonte → ganho → tratamento → medição. O nível que o VU
 * marca é o nível que o fader e o knob produziram, e o traço do osciloscópio é a
 * onda que o EQ, os knobs de tom e o XY pad moldaram. É o que transforma a sala
 * de "amostra de nove componentes" em "uma bancada", e é a única razão de esta
 * matemática existir: ela não simula áudio, ela **liga causa a efeito na tela**.
 *
 * Mora fora do registry de propósito. Componente publicado não pode carregar a
 * regra de negócio de uma demo; quem instala o `vintage-meter` liga o `value`
 * dele no áudio de verdade.
 */

/** Posições do `vintage-toggle`, na ordem em que ele cicla. */
export type Fonte = "up" | "middle" | "down";

/** O que cada fonte entrega antes do ganho. Microfone chega fraco, linha chega quente. */
const GANHO_DE_FONTE: Record<Fonte, number> = { up: 1, middle: 0.72, down: 0.88 };

export const ROTULO_DE_FONTE: Record<Fonte, string> = {
  up: "LINE",
  middle: "MIC",
  down: "INST",
};

/**
 * Onde o CLIP acende.
 *
 * Fica escrito ao lado do número, não só na cor do LED: valor sem régua é
 * trivia, e "6,4" não diz nada até se saber que o corte é 8,5.
 */
export const CORTE = 8.5;

export interface Cadeia {
  ligado: boolean;
  mute: boolean;
  fonte: Fonte;
  /** O fader GAIN, 0 a 10. */
  ganho: number;
  /** O knob grande DRIVE, 0 a 10. */
  drive: number;
  /** Sobra de um pad recém-disparado, 0 a 1, decaindo. */
  transiente: number;
}

/** O nível que sai do estágio de ganho, na mesma escala do VU (0 a 10). */
export function nivelDe(c: Cadeia): number {
  if (!c.ligado || c.mute) return 0;
  const bruto = GANHO_DE_FONTE[c.fonte] * (c.ganho / 10) * (0.85 + c.drive / 22);
  return Math.max(0, Math.min(10, (bruto + c.transiente * 0.35) * 10));
}

export interface Tom {
  /** Knob BASS, 0 a 10. */
  grave: number;
  /** Média das bandas do EQ gráfico, 0 a 10. */
  medio: number;
  /** Knob TREBLE, 0 a 10. */
  agudo: number;
  /** Eixo X do XY pad, 0 a 1: fecha o filtro e come o agudo. */
  filtro: number;
  /** Eixo Y do XY pad, 0 a 1: acrescenta uma cópia atrasada, a cauda. */
  cauda: number;
}

/** O tom que o BYPASS produz: tratamento fora do caminho, nada moldado. */
export const TOM_NEUTRO: Tom = { grave: 5, medio: 5, agudo: 5, filtro: 0, cauda: 0 };

/**
 * Escreve um quadro da onda **no buffer que já existe**.
 *
 * Preenche no lugar em vez de devolver um `Float32Array` novo porque o
 * `vintage-oscilloscope` lê o array por ref dentro do próprio
 * `requestAnimationFrame`. Alocar 256 floats a 30fps só para o React repassar a
 * mesma referência é lixo de GC de graça, e re-renderizar a sala inteira a cada
 * quadro do traço faria os knobs remontarem debaixo do dedo de quem arrasta.
 */
export function preencherOnda(buf: Float32Array, t: number, amplitude: number, tom: Tom): void {
  const n = buf.length;
  const g = 0.28 + (tom.grave / 10) * 0.34;
  const m = 0.1 + (tom.medio / 10) * 0.22;
  const a = (0.05 + (tom.agudo / 10) * 0.2) * (1 - tom.filtro * 0.85);
  const eco = tom.cauda * 0.32;

  for (let i = 0; i < n; i++) {
    const f = (i / n) * Math.PI * 2;
    buf[i] =
      amplitude *
      (g * Math.sin(f * 2 + t) +
        m * Math.sin(f * 5 + t * 1.3) +
        a * Math.sin(f * 11 + t * 0.7) +
        eco * Math.sin(f * 2 + t - 0.9));
  }
}

/**
 * O ponteiro analógico nunca fica parado, mesmo com o sinal estável.
 *
 * Um VU cravado num número é um desenho; a respiração é o que faz o instrumento
 * parecer ligado. O ruído é proporcional ao nível, então no silêncio o ponteiro
 * descansa no zero em vez de tremer sozinho, que seria mentira sobre o sinal.
 */
export function respiro(nivel: number): number {
  const amplitude = 0.12 + nivel * 0.03;
  return Math.max(0, Math.min(10, nivel + (Math.random() - 0.5) * amplitude));
}
