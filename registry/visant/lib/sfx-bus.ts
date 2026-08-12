"use client";

import * as React from "react";

/**
 * SFX Bus — dois sons, os dois em botão. Hover e clique.
 *
 * Colhido do `visantismo`, onde o arquivo já rodava em duas casas (a landing e
 * o `visant-club`, que carrega uma cópia em `public/sfx.js`). Duas casas com o
 * mesmo arquivo é a definição de item de registry.
 *
 * ── O escopo é deliberadamente mínimo ──────────────────────────────────────
 *
 * Nada de som de seção entrando, de acordeão abrindo, de sucesso ou de erro. Um
 * plano anterior pedia oito eventos; virou dois, e a razão vale mais que a
 * economia: som que acontece em todo lugar vira ruído de fundo e a pessoa
 * desliga. Som que só acontece onde ela age vira tato.
 *
 * ── O timbre, e por que cada número ────────────────────────────────────────
 *
 * Chimbau fechado: ruído branco em dois passa-altas em série, com decaimento
 * curtíssimo. Não tem altura definida, então não briga com o que estiver
 * tocando no fone; não tem cauda, então clicar rápido não empilha som. Senoide
 * com reverb tem nota e cauda, e as duas cansam numa interface.
 *
 * |               | hover   | clique  |
 * |---------------|---------|---------|
 * | passa-alta    | 8200 Hz | 6400 Hz |
 * | pico de ganho | 0.016   | 0.034   |
 * | ataque        | 1,5 ms  | 6 ms    |
 * | duração       | 28 ms   | 62 ms   |
 *
 * Dois passa-altas em série e não um: a 12 dB/oitava sobra barriga e soa "tss"
 * com corpo; em série vira 24 dB/oitava e fica fino como chimbau fechado é.
 *
 * O **ataque** é o que decide duro contra macio, e não o volume. O clique
 * nasceu com 1 ms e a quina do transiente soava como tique de plástico;
 * esticado pra 6 ms o ruído entra em vez de bater. O hover pode manter ataque
 * seco porque o pico é baixo demais pra sobrar transiente.
 *
 * ── O que o motor faz sozinho, e é o que separa gostoso de irritante ───────
 *
 * 1. **Contexto criado no primeiro gesto.** Navegador nenhum toca áudio antes
 *    disso, então "ligado por padrão" quer dizer **armado**. Nada de banner.
 * 2. **Throttle de 60 ms no bus inteiro.** Varrer o ponteiro por uma fileira de
 *    botões dispararia vários em 200 ms.
 * 3. **Debounce por alvo.** O mesmo botão não re-dispara sem o ponteiro sair.
 * 4. **Só em `(hover: hover) and (pointer: fine)`.** No toque, o hover falso do
 *    tap daria dois sons por dedo.
 * 5. **Ponto de partida aleatório no buffer de ruído.** Doze estalos idênticos
 *    lêem como loop travado.
 * 6. **Buffer gerado uma vez.** Gerar ruído a cada hover é trabalho de CPU no
 *    exato instante em que a pessoa está mirando um botão.
 * 7. **Mudo sob `prefers-reduced-motion`** — o sinal mais próximo que o
 *    navegador dá de "não me sacode". A escolha explícita sempre vence.
 *
 * Zero dependência, zero arquivo de áudio, zero request: um CSP fechado
 * (`script-src 'self'`) aceita sem hash novo.
 */

const KEY = "visant-sfx";

/** Alvos padrão. Card, item de acordeão e link de texto ficam de fora de
 *  propósito: som em elemento que a pessoa só atravessa é o que transforma
 *  sutil em irritante. */
export const SFX_DEFAULT_SELECTOR = "button, [role='button'], a[data-sfx-target]";

function preferenciaSalva() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function ligadoPorPadrao() {
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

type Ouvinte = (on: boolean) => void;

class SfxBus {
  private on = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private ultimo = 0;
  private ouvintes = new Set<Ouvinte>();
  private iniciado = false;

  /** Idempotente: dá pra chamar em todo mount sem reler o storage à toa. */
  hidratar() {
    if (this.iniciado || typeof window === "undefined") return;
    this.iniciado = true;
    const pref = preferenciaSalva();
    this.on = pref === null ? ligadoPorPadrao() : pref === "on";
    document.documentElement.setAttribute("data-sfx", this.on ? "on" : "off");
  }

  isEnabled() {
    return this.on;
  }

  /** Assina mudanças de estado. Devolve o cancelador. */
  subscribe(fn: Ouvinte) {
    this.ouvintes.add(fn);
    return () => {
      this.ouvintes.delete(fn);
    };
  }

  setEnabled(v: boolean, { announce = true } = {}) {
    this.on = v;
    try {
      localStorage.setItem(KEY, v ? "on" : "off");
    } catch {
      /* modo privado do Safari: a preferência vale pela sessão e pronto */
    }
    document.documentElement.setAttribute("data-sfx", v ? "on" : "off");
    this.ouvintes.forEach((fn) => fn(v));
    // A confirmação de "ligado" é o próprio som. Dizer com palavra o que dá pra
    // dizer com o próprio efeito é desperdiçar o efeito.
    if (v && announce) this.press();
  }

  /** Destrava o contexto. Qualquer gesto serve — inclusive um que não toca som. */
  arm() {
    this.garantir();
  }

  hover() {
    if (!this.portao()) return;
    this.hat(8200, 0.016, 0.028, 0.0015);
  }

  press() {
    if (!this.portao()) return;
    this.hat(6400, 0.034, 0.062, 0.006);
  }

  private portao() {
    if (!this.on) return false;
    const now = Date.now();
    if (now - this.ultimo < 60) return false;
    this.ultimo = now;
    return Boolean(this.garantir());
  }

  private garantir() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = 0.9;

      /* Limitador: hover e press disparam juntos no mesmo gesto (o ponteiro
         entra no botão e clica), e soma sem teto é clipping. */
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -8;
      lim.knee.value = 0;
      lim.ratio.value = 20;
      lim.attack.value = 0.003;
      lim.release.value = 0.2;
      master.connect(lim);
      lim.connect(ctx.destination);
      this.master = master;

      const len = Math.floor(ctx.sampleRate * 0.5);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;

      return ctx;
    } catch {
      this.ctx = null;
      return null;
    }
  }

  private hat(hp: number, peak: number, dur: number, atk: number) {
    const ctx = this.ctx;
    const master = this.master;
    const noise = this.noise;
    if (!ctx || !master || !noise) return;

    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    // Trecho diferente de ruído a cada vez: começar sempre na amostra 0 faz
    // doze estalos idênticos, e idêntico lê como loop travado.
    const off = Math.random() * 0.4;

    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    f.Q.value = 0.7;

    const f2 = ctx.createBiquadFilter();
    f2.type = "highpass";
    f2.frequency.value = hp;
    f2.Q.value = 0.7;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(f);
    f.connect(f2);
    f2.connect(g);
    g.connect(master);
    src.start(t, off, dur + 0.02);
    src.stop(t + dur + 0.02);
  }
}

/** Singleton: um `AudioContext` por documento, não um por componente. */
export const sfx = new SfxBus();

/**
 * Liga o bus ao documento. Um por app, no topo.
 *
 * A fiação é por **delegação no documento** e não por prop em cada botão, e é
 * essa a decisão que faz o item valer: um `<SfxProvider/>` na raiz sonoriza
 * botão que ainda nem foi escrito, inclusive de biblioteca de terceiro.
 */
export function useSfxWiring(selector: string = SFX_DEFAULT_SELECTOR) {
  React.useEffect(() => {
    sfx.hidratar();

    let fine = false;
    try {
      fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    } catch {
      fine = false;
    }

    let ultimoAlvo: Element | null = null;
    const over = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest?.(selector) ?? null;
      if (!el || el === ultimoAlvo) return; // re-hover no mesmo alvo não re-dispara
      ultimoAlvo = el;
      sfx.hover();
    };
    const out = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(selector) ?? null;
      if (el && el === ultimoAlvo) ultimoAlvo = null;
    };
    const down = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(selector) ?? null;
      if (!el) {
        sfx.arm(); // qualquer gesto destrava o contexto, mesmo sem tocar som
        return;
      }
      if (el.hasAttribute("data-sfx-silent")) return; // o toggle toca o próprio
      sfx.press();
    };
    const key = () => sfx.arm();

    if (fine) {
      document.addEventListener("pointerover", over, { passive: true });
      document.addEventListener("pointerout", out, { passive: true });
    }
    document.addEventListener("pointerdown", down, { passive: true });
    // Teclado destrava igual ao clique, senão quem navega por Tab percorre o
    // app inteiro em silêncio.
    document.addEventListener("keydown", key, { passive: true, once: true });

    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [selector]);
}

/** Estado reativo do bus, pra desenhar o toggle. `null` até hidratar — a
 *  preferência mora no `localStorage`, que o servidor não enxerga, e chutar no
 *  HTML é um estado errado piscando na tela até a hidratação corrigir. */
export function useSfxEnabled() {
  const [on, setOn] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    sfx.hidratar();
    setOn(sfx.isEnabled());
    return sfx.subscribe(setOn);
  }, []);
  return on;
}

export function SfxProvider({
  selector = SFX_DEFAULT_SELECTOR,
  children,
}: {
  /** Alvos que soam. Estenda quando os alvos de decisão do app tiverem outro nome. */
  selector?: string;
  children?: React.ReactNode;
}) {
  useSfxWiring(selector);
  return children as React.ReactElement | null;
}
