/**
 * Tempo Clock, um relógio de BPM sem interface e sem framework.
 *
 * Colhido do Refuge FX (motor de efeito no ritmo de techno). Serve a qualquer
 * coisa que precise andar no tempo de uma música: visual de festa, metrônomo,
 * sequenciador, animação presa a um set.
 *
 * Decisões que não se veem de primeira:
 *
 * 1. **O relógio é perguntado, não empurra.** `tick(now)` devolve o estado no
 *    instante pedido. Quem desenha já tem um laço de quadros (rAF, vídeo,
 *    gravação quadro a quadro); um segundo timer interno brigaria com ele e
 *    derivaria. Por isso também funciona fora de tempo real: é só passar o
 *    `now` do quadro que está sendo exportado.
 * 2. **Trocar o BPM não pula o compasso.** `setBpm` recalcula a origem pra
 *    manter a posição atual na batida. Sem isso, arrastar o BPM de 128 pra 129
 *    teleporta o passo e o visual dá um soluço.
 * 3. **O envelope é de bumbo, não de onda.** `env` vai a 1 no passo e cai em
 *    exponencial (decay ~200ms a 128bpm). Seno parece respiração; techno pede
 *    ataque seco.
 * 4. **No tap, a última batida vira o tempo 1.** Quem bate no ritmo espera que
 *    o desenho caia junto com o dedo, não só que a velocidade fique certa.
 * 5. **`beat` é verdadeiro uma vez por passo**, mesmo se o laço atrasar e pular
 *    quadros: a comparação é com o último passo visto, não com o tempo.
 *
 * Instância por relógio (não um singleton de módulo): dois decks, dois tempos.
 */

export type TempoDivision = 1 | 2 | 4;

export interface TempoTick {
  /** Verdadeiro no primeiro tick de cada passo. */
  beat: boolean;
  /** Passo absoluto desde a origem, na divisão atual. */
  step: number;
  /** Tempo (semínima) dentro do compasso de 4, de 0 a 3. */
  beatInBar: number;
  /** Compasso absoluto, a partir de 0. */
  bar: number;
  /** Envelope 0..1: 1 no passo, decai até o próximo. */
  env: number;
}

export interface TempoClockOptions {
  bpm?: number;
  /** 1 = semínima, 2 = colcheia, 4 = semicolcheia. */
  div?: TempoDivision;
  min?: number;
  max?: number;
  /** Quão rápido o envelope cai (maior = mais seco). */
  decay?: number;
}

export interface TempoClock {
  readonly bpm: number;
  div: TempoDivision;
  tick(now: number): TempoTick;
  setBpm(bpm: number, now: number): number;
  /** Registra uma batida do dedo; devolve o BPM novo quando já há batidas suficientes. */
  tap(now: number): number | null;
  /** Põe o tempo 1 do compasso em `now`. */
  restart(now: number): void;
}

export function createTempoClock(opts: TempoClockOptions = {}): TempoClock {
  const min = opts.min ?? 60;
  const max = opts.max ?? 180;
  const decay = opts.decay ?? 5;
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)));
  let bpm = clamp(opts.bpm ?? 128);
  let t0 = 0;
  let lastStep = -1;
  let taps: number[] = [];

  const clock: TempoClock = {
    get bpm() {
      return bpm;
    },
    div: opts.div ?? 1,
    tick(now) {
      const beats = (now - t0) / (60000 / bpm);
      const stepPos = beats * clock.div;
      const step = Math.floor(stepPos);
      const beat = step !== lastStep;
      lastStep = step;
      const whole = Math.floor(beats);
      return {
        beat,
        step,
        beatInBar: ((whole % 4) + 4) % 4,
        bar: Math.floor(whole / 4),
        env: Math.exp(-(stepPos - step) * decay),
      };
    },
    setBpm(next, now) {
      const pos = (now - t0) / (60000 / bpm);
      bpm = clamp(next);
      t0 = now - pos * (60000 / bpm);
      return bpm;
    },
    tap(now) {
      // pausa longa começa uma contagem nova
      if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
      taps = [...taps, now].slice(-5);
      clock.restart(now);
      if (taps.length < 2) return null;
      const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
      bpm = clamp(60000 / avg);
      return bpm;
    },
    restart(now) {
      t0 = now;
      lastStep = -1;
    },
  };
  return clock;
}
