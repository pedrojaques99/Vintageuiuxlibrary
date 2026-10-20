"use client";

import * as React from "react";

/**
 * SFX Bus: poucos sons, cada um copiado de um objeto analógico, e só onde a
 * pessoa age.
 *
 * Colhido do `visantismo`, onde o arquivo já rodava em duas casas (a landing e
 * o `visant-club`, que carrega uma cópia em `public/sfx.js`). Duas casas com o
 * mesmo arquivo é a definição de item de registry.
 *
 * ── O escopo é deliberadamente mínimo ──────────────────────────────────────
 *
 * Nada de som de seção entrando, de acordeão abrindo, de sucesso ou de erro. Um
 * plano anterior pedia oito eventos; virou poucos, e a razão vale mais que a
 * economia: som que acontece em todo lugar vira ruído de fundo e a pessoa
 * desliga. Som que só acontece onde ela age vira tato.
 *
 * ── A paleta analógica ─────────────────────────────────────────────────────
 *
 * A primeira versão tinha um timbre só, chimbau fechado (ruído em passa-alta).
 * Funciona, mas soa eletrônico. Os cliques gostosos de objeto antigo (tecla de
 * câmera, seletor de toca-discos, alavanca de painel) têm outra receita, e é a
 * mesma pros quatro: **síntese modal**. Uma peça de metal pequena, quando leva
 * uma batida, não faz "tss"; ela soa por um instante nas frequências em que
 * ressoa. Então: um sopro de ruído de 1 ms (a batida) passa por um passa-banda
 * estreito (a peça ressoando) e morre em milésimos. Q alto dá o brilho de metal
 * sem virar nota, porque a ressonância dura menos de 15 ms e o ouvido não tem
 * tempo de achar altura. Peça grande ressoa grave, peça pequena ressoa agudo.
 *
 * Cada timbre é uma lista de **camadas** (uma batida cada) em instantes
 * diferentes. O que separa um objeto do outro é quantas batidas, onde cada uma
 * ressoa e o intervalo entre elas:
 *
 * | timbre   | objeto                         | camadas (instante · filtro · Hz · Q · pico · duração)   |
 * |----------|--------------------------------|----------------------------------------------------------|
 * | `click`  | botão de disparo de câmera     | 0 ms · banda · 3800 · 4 · 0.11 · 9 ms  (trava de metal)  |
 * |          |                                | 16 ms · banda · 2400 · 7 · 0.06 · 14 ms (mola volta)     |
 * | `detent` | detente de knob, seletor de    | 0 ms · banda · 2900 · 10 · 0.07 · 6 ms (dente da mola)   |
 * |          | velocidade do toca-discos      |                                                          |
 * | `toggle` | interruptor de alavanca        | 0 ms · banda · 2100 · 5 · 0.035 · 6 ms (sai do dente)    |
 * |          |                                | 22 ms · banda · 1300 · 3 · 0.07 · 18 ms (bate, corpo)    |
 * |          |                                | 22 ms · alta · 4500 · 0.7 · 0.012 · 5 ms (brilho)        |
 * | `drop`   | agulha pousando no disco       | 0 ms · baixa · 380 · 1 · 0.16 · 70 ms (baque surdo)      |
 * |          |                                | 30 a 110 ms · alta · 3000 · 0.7 · 0.01 · 3 ms (2 chiados)|
 *
 * Por que cada escolha:
 *
 * - **`click` tem duas batidas a 16 ms.** Câmera de filme faz "tic-tac": a trava
 *   solta e a mola devolve. Uma batida só lê como tique de plástico; duas, como
 *   mecanismo. Abaixo de 10 ms as duas fundem; acima de 30 ms viram dois cliques.
 * - **`detent` é o mais baixo e o mais curto** porque vem em rajada: girar um
 *   knob dispara dez seguidos. Q 10 dá o "tic" de metal fino sem corpo nenhum.
 * - **`toggle` tem corpo** (passa-banda largo em 1300 Hz): alavanca é peça
 *   maior que dente de knob e bate num batente. A primeira batida, fraca, é a
 *   alavanca saindo do lugar; é ela que diz "alavanca" e não "botão".
 * - **`drop` é o único com grave**, e por isso é o único reservado pra ação
 *   forte (confirmar, publicar, soltar). O baque é ruído em passa-baixa: tem
 *   peso e não tem nota. Os dois chiados de vinil caem em instantes sorteados.
 * - **Ataque entre 0,4 e 3 ms.** Abaixo disso o primeiro quadro é um degrau, e
 *   degrau soa como estalo digital. Acima, a batida amolece e vira sopro.
 *
 * Os picos parecem altos perto do chimbau antigo (0.034), mas passa-banda
 * estreito joga fora quase toda a energia do ruído. Medido com `renderSfx`
 * (média de 20 toques, RMS do trecho que soa):
 *
 * | timbre    | RMS       | soa por |
 * |-----------|-----------|---------|
 * | `chimbau` | -44 dBFS  | 82 ms   |
 * | `click`   | -48 dBFS  | 28 ms   |
 * | `drop`    | -47 dBFS  | 130 ms  |
 * | `toggle`  | -52 dBFS  | 50 ms   |
 * | `detent`  | -54 dBFS  | 5 ms    |
 *
 * Tudo abaixo do clique antigo, e mais curto. É o nível que se ouve com fone
 * sem notar o volume.
 *
 * **Variação leve a cada toque**: frequência ±6%, pico ±12%, intervalo entre
 * camadas ±15%, e trecho sorteado do buffer de ruído. Objeto de verdade nunca
 * soa duas vezes igual; dez estalos idênticos lêem como loop travado.
 *
 * Os dois sons antigos continuam: `hover` (chimbau quase inaudível, 8200 Hz,
 * 0.016, 28 ms) e `chimbau` (o clique da primeira versão, 6400 Hz, 0.034,
 * 62 ms), pra quem já tinha se acostumado com ele.
 *
 * ── Como pedir o timbre ────────────────────────────────────────────────────
 *
 * 1. **Por atributo**, com o `SfxProvider` na raiz: `data-sfx="detent"` no
 *    elemento (ou num ancestral) escolhe o timbre; `data-sfx="off"` cala. Sem
 *    atributo, o bus deduz pelo papel: `role="switch"` e checkbox são
 *    `toggle`; aba, rádio, opção e botão com `aria-pressed` são `detent`
 *    (seletor girando de uma posição pra outra); o resto é `click`.
 * 2. **Por código**, em gesto contínuo: `playSfx("detent")` no handler que
 *    muda o passo do knob. O portão por timbre segura a rajada.
 *
 * ── O que o motor faz sozinho, e é o que separa gostoso de irritante ───────
 *
 * 1. **Contexto criado só depois de um gesto de verdade.** Navegador nenhum
 *    toca áudio antes disso, e criar o contexto cedo (num hover) só gera aviso
 *    no console. "Ligado por padrão" quer dizer **armado**. Nada de banner.
 * 2. **Portão por timbre**: `click` 60 ms, `detent` 30 ms, `toggle` 90 ms,
 *    `drop` 250 ms. O hover ainda respeita 60 ms contra qualquer som.
 * 3. **Debounce por alvo.** O mesmo botão não re-dispara hover sem o ponteiro sair.
 * 4. **Hover só em `(hover: hover) and (pointer: fine)`.** No toque, o hover
 *    falso do tap daria dois sons por dedo.
 * 5. **Buffer de ruído gerado uma vez.** Gerar ruído a cada toque é trabalho
 *    de CPU no exato instante em que a pessoa está mirando um botão.
 * 6. **Mudo sob `prefers-reduced-motion`**, o sinal mais próximo que o
 *    navegador dá de "não me sacode". A escolha explícita sempre vence.
 * 7. **Limitador no fim da cadeia.** Hover e clique no mesmo gesto somam.
 *
 * Zero dependência, zero arquivo de áudio, zero request: um CSP fechado
 * (`script-src 'self'`) aceita sem hash novo.
 */

const KEY = "visant-sfx";

/** Alvos padrão. Card, item de acordeão e link de texto ficam de fora de
 *  propósito: som em elemento que a pessoa só atravessa é o que transforma
 *  sutil em irritante. */
export const SFX_DEFAULT_SELECTOR = "button, [role='button'], a[data-sfx-target]";

/** Os timbres que o bus sabe tocar. */
export type SfxTimbre = "click" | "detent" | "toggle" | "drop" | "hover" | "chimbau";

export const SFX_TIMBRES: readonly SfxTimbre[] = [
  "click",
  "detent",
  "toggle",
  "drop",
  "hover",
  "chimbau",
];

/** Uma batida: ruído curto passando por um filtro, com envelope próprio. */
interface Camada {
  /** Instante em segundos, contado do disparo. */
  em: number;
  /** Faixa sorteada somada ao `em`, em segundos (os chiados do `drop`). */
  sorteio?: number;
  tipo: BiquadFilterType;
  hz: number;
  q: number;
  pico: number;
  /** Ataque em segundos. */
  atk: number;
  /** Duração total em segundos, ataque incluso. */
  dur: number;
  /** Passa-alta extra em série, pra camada que precisa de corte duro embaixo. */
  corte?: number;
}

const TIMBRES: Record<SfxTimbre, Camada[]> = {
  click: [
    { em: 0, tipo: "bandpass", hz: 3800, q: 4, pico: 0.11, atk: 0.0006, dur: 0.009, corte: 1200 },
    { em: 0.016, tipo: "bandpass", hz: 2400, q: 7, pico: 0.06, atk: 0.0008, dur: 0.014 },
  ],
  detent: [
    { em: 0, tipo: "bandpass", hz: 2900, q: 10, pico: 0.07, atk: 0.0004, dur: 0.006, corte: 1500 },
  ],
  toggle: [
    { em: 0, tipo: "bandpass", hz: 2100, q: 5, pico: 0.035, atk: 0.0005, dur: 0.006 },
    { em: 0.022, tipo: "bandpass", hz: 1300, q: 3, pico: 0.07, atk: 0.0008, dur: 0.018 },
    { em: 0.022, tipo: "highpass", hz: 4500, q: 0.7, pico: 0.012, atk: 0.0004, dur: 0.005 },
  ],
  drop: [
    { em: 0, tipo: "lowpass", hz: 380, q: 1, pico: 0.16, atk: 0.003, dur: 0.07 },
    { em: 0.03, sorteio: 0.08, tipo: "highpass", hz: 3000, q: 0.7, pico: 0.01, atk: 0.0003, dur: 0.003 },
    { em: 0.03, sorteio: 0.08, tipo: "highpass", hz: 3000, q: 0.7, pico: 0.01, atk: 0.0003, dur: 0.003 },
  ],
  // Os dois da primeira versão: chimbau fechado, dois passa-altas em série.
  hover: [
    { em: 0, tipo: "highpass", hz: 8200, q: 0.7, pico: 0.016, atk: 0.0015, dur: 0.028, corte: 8200 },
  ],
  chimbau: [
    { em: 0, tipo: "highpass", hz: 6400, q: 0.7, pico: 0.034, atk: 0.006, dur: 0.062, corte: 6400 },
  ],
};

/** Intervalo mínimo entre dois disparos do mesmo timbre, em ms. */
const PORTAO: Record<SfxTimbre, number> = {
  click: 60,
  detent: 30,
  toggle: 90,
  drop: 250,
  hover: 60,
  chimbau: 60,
};

/** ±metade da faixa: `variar(1000, 0.12)` cai entre 940 e 1060. */
function variar(v: number, faixa: number) {
  return v * (1 + (Math.random() - 0.5) * faixa);
}

function criarRuido(ctx: BaseAudioContext) {
  const len = Math.floor(ctx.sampleRate * 0.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Agenda as camadas de um timbre. Serve ao contexto vivo e ao offline. */
function agendar(
  ctx: BaseAudioContext,
  destino: AudioNode,
  ruido: AudioBuffer,
  timbre: SfxTimbre,
  t0: number,
) {
  // Um fator de espaçamento por toque, não por camada: o mecanismo inteiro
  // fica um tico mais rápido ou mais lento, como dedo diferente na mesma tecla.
  const ritmo = variar(1, 0.3);
  for (const c of TIMBRES[timbre]) {
    const t = t0 + c.em * ritmo + (c.sorteio ? Math.random() * c.sorteio : 0);
    const pico = variar(c.pico, 0.24);

    const src = ctx.createBufferSource();
    src.buffer = ruido;
    // Trecho diferente de ruído a cada vez: começar sempre na amostra 0 faz
    // estalos idênticos, e idêntico lê como loop travado.
    const off = Math.random() * 0.4;

    const f = ctx.createBiquadFilter();
    f.type = c.tipo;
    f.frequency.value = variar(c.hz, 0.12);
    f.Q.value = c.q;
    let fim: AudioNode = f;
    src.connect(f);

    if (c.corte) {
      const f2 = ctx.createBiquadFilter();
      f2.type = "highpass";
      f2.frequency.value = c.corte;
      f2.Q.value = 0.7;
      f.connect(f2);
      fim = f2;
    }

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + c.atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + c.dur);
    fim.connect(g);
    g.connect(destino);

    src.start(t, off, c.dur + 0.02);
    src.stop(t + c.dur + 0.02);
  }
}

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

/** Já houve gesto de verdade nesta página? Sem a API (Safari antigo), confia
 *  em quem chamou: o bus só é chamado de dentro de handler de gesto. */
function houveGesto(visto: boolean) {
  try {
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
      .userActivation;
    return ua ? ua.hasBeenActive : true;
  } catch {
    return visto;
  }
}

type Ouvinte = (on: boolean) => void;

class SfxBus {
  private on = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private ultimo = 0;
  private ultimoPor: Partial<Record<SfxTimbre, number>> = {};
  private ouvintes = new Set<Ouvinte>();
  private iniciado = false;
  private gestoVisto = false;

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
    this.iniciado = true;
    this.on = v;
    try {
      localStorage.setItem(KEY, v ? "on" : "off");
    } catch {
      /* modo privado do Safari: a preferência vale pela sessão e pronto */
    }
    document.documentElement.setAttribute("data-sfx", v ? "on" : "off");
    this.ouvintes.forEach((fn) => fn(v));
    // A confirmação de "ligado" é o próprio som, e o som de ligar é o de
    // alavanca. Dizer com palavra o que dá pra dizer com o efeito é desperdício.
    if (v && announce) {
      this.gestoVisto = true;
      this.play("toggle");
    }
  }

  /** Destrava o contexto. Qualquer gesto serve, inclusive um que não toca som.
   *  Desligado não cria contexto: mudo é mudo até no `AudioContext`. */
  arm() {
    this.gestoVisto = true;
    if (this.on) this.garantir();
  }

  /** Toca um timbre da paleta. Seguro de chamar em rajada: o portão segura. */
  play(timbre: SfxTimbre) {
    if (!TIMBRES[timbre] || !this.portao(timbre)) return;
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise) return;
    agendar(ctx, master, noise, timbre, ctx.currentTime);
  }

  /** API da primeira versão: continua valendo. */
  hover() {
    this.play("hover");
  }

  /** API da primeira versão. Agora toca o `click` analógico. */
  press() {
    this.play("click");
  }

  private portao(timbre: SfxTimbre) {
    if (!this.on) return false;
    // Antes do primeiro gesto o navegador não deixa tocar, e criar o contexto
    // mesmo assim só deixa aviso no console.
    if (!this.ctx && !houveGesto(this.gestoVisto)) return false;
    const now = Date.now();
    if (timbre === "hover" && now - this.ultimo < PORTAO.hover) return false;
    if (now - (this.ultimoPor[timbre] ?? 0) < PORTAO[timbre]) return false;
    this.ultimo = now;
    this.ultimoPor[timbre] = now;
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

      /* Limitador: hover e clique disparam juntos no mesmo gesto (o ponteiro
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
      this.noise = criarRuido(ctx);

      return ctx;
    } catch {
      this.ctx = null;
      return null;
    }
  }
}

/** Singleton: um `AudioContext` por documento, não um por componente. */
export const sfx = new SfxBus();

/**
 * Toca um timbre. É a porta pra gesto contínuo: o knob chama
 * `playSfx("detent")` cada vez que cruza um passo, e o portão de 30 ms segura
 * o giro rápido sem perder o ritmo dos dentes.
 */
export function playSfx(timbre: SfxTimbre) {
  sfx.hidratar();
  sfx.play(timbre);
}

/**
 * Renderiza um timbre fora do ar, num `OfflineAudioContext`. Serve pra teste e
 * pra medir nível; nunca toca nada e não precisa de gesto.
 */
export function renderSfx(timbre: SfxTimbre, sampleRate = 48000): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * 0.25), sampleRate);
  agendar(ctx, ctx.destination, criarRuido(ctx), timbre, 0);
  return ctx.startRendering();
}

function isTimbre(v: string | null): v is SfxTimbre {
  return v !== null && (SFX_TIMBRES as readonly string[]).includes(v);
}

/**
 * Qual timbre o elemento pede. `data-sfx` explícito vence; o `<html>` fica de
 * fora porque o bus usa `data-sfx="on|off"` nele pra outra coisa (o estado).
 */
function timbreDe(el: Element): SfxTimbre | "off" {
  const marcado = el.closest("[data-sfx]");
  if (marcado && marcado !== document.documentElement) {
    const v = marcado.getAttribute("data-sfx");
    if (v === "off") return "off";
    if (isTimbre(v)) return v;
  }
  const role = el.getAttribute("role");
  if (
    role === "switch" ||
    el.hasAttribute("aria-checked") ||
    (el instanceof HTMLInputElement && el.type === "checkbox")
  )
    return "toggle";
  if (
    role === "tab" ||
    role === "radio" ||
    role === "option" ||
    el.hasAttribute("aria-pressed") ||
    el.hasAttribute("aria-selected")
  )
    return "detent";
  return "click";
}

export interface SfxWiringOptions {
  /** Som de hover. Ligado por padrão (compatível com a primeira versão); a
   *  vitrine desliga, porque passar o ponteiro não é agir. */
  hover?: boolean;
}

/**
 * Liga o bus ao documento. Um por app, no topo.
 *
 * A fiação é por **delegação no documento** e não por prop em cada botão, e é
 * essa a decisão que faz o item valer: um `<SfxProvider/>` na raiz sonoriza
 * botão que ainda nem foi escrito, inclusive de biblioteca de terceiro.
 */
export function useSfxWiring(
  selector: string = SFX_DEFAULT_SELECTOR,
  { hover = true }: SfxWiringOptions = {},
) {
  React.useEffect(() => {
    sfx.hidratar();
    // Elemento com `data-sfx` explícito também é alvo, mesmo fora do seletor.
    const alvos = `${selector}, [data-sfx]:not(html)`;

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
      if (el.hasAttribute("data-sfx-silent") || timbreDe(el) === "off") return;
      sfx.hover();
    };
    const out = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(selector) ?? null;
      if (el && el === ultimoAlvo) ultimoAlvo = null;
    };
    const down = (e: PointerEvent) => {
      sfx.arm(); // qualquer gesto destrava o contexto, mesmo sem tocar som
      const el = (e.target as Element | null)?.closest?.(alvos) ?? null;
      if (!el) return;
      if (el.hasAttribute("data-sfx-silent")) return; // quem toca o próprio som
      if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true")
        return;
      const t = timbreDe(el);
      if (t !== "off") sfx.play(t);
    };
    const key = () => sfx.arm();

    if (fine && hover) {
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
  }, [selector, hover]);
}

/** Estado reativo do bus, pra desenhar o toggle. `null` até hidratar: a
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
  hover = true,
  children,
}: {
  /** Alvos que soam. Estenda quando os alvos de decisão do app tiverem outro nome. */
  selector?: string;
  /** Som de hover. Desligue onde passar o ponteiro não é agir. */
  hover?: boolean;
  children?: React.ReactNode;
}) {
  useSfxWiring(selector, { hover });
  return children as React.ReactElement | null;
}
