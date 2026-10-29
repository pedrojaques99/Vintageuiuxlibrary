/**
 * Tempo Bar, o controle de BPM em web component: `<visant-tempo-bar>`.
 *
 * LED que pisca na batida (e liga/desliga o tempo), número grande que se
 * arrasta, quatro luzes de compasso, divisão 1/4 · 1/8 · 1/16 e tap. Vanilla:
 * página sem framework, React 19 ou o que vier. Colhido do Refuge FX.
 *
 * Decisões que não se veem de primeira:
 *
 * 1. **O BPM é núcleo, não ajuste.** Mora numa barra sempre à mão, não numa
 *    aba. Num visual de festa o tempo é a primeira coisa que se mexe.
 * 2. **O relógio pode ser do host.** Por padrão a barra cria o seu
 *    (`tempo-clock`), mas `el.clock = meuRelogio` faz a barra e o desenho
 *    baterem juntos: um relógio só, nenhuma deriva entre luz e imagem.
 * 3. **O número arrasta.** Pros lados muda o BPM (Shift = 4x mais fino),
 *    setas ±1, Shift+setas ±10, duplo clique volta pro `default` (128).
 * 4. **O tempo 1 acende na cor da marca**, os outros em neutro: o olho acha o
 *    início do compasso sem contar.
 * 5. **Desligado não some.** O BPM fica a 35% e a divisão trava, mas o LED
 *    continua clicável: é o caminho de volta.
 * 6. **O laço de quadros só roda ligado e conectado**, e sob
 *    `prefers-reduced-motion` o LED para de pulsar (as luzes continuam: são
 *    informação, não enfeite).
 *
 * Atributos: `bpm`, `div` (1|2|4), `default`, `off`.
 * Eventos (todos com `detail`): `bpmchange {bpm}`, `divchange {div}`,
 * `syncchange {on}`, `beat {step, beatInBar, bar, env}`.
 */

import { createTempoClock, type TempoClock, type TempoDivision } from "./tempo-clock";

const CSS = `
:host { display: block; --tb-fg: var(--foreground, CanvasText); --tb-dim: var(--muted-foreground, color-mix(in oklab, currentColor 55%, transparent));
  --tb-line: var(--border, color-mix(in oklab, currentColor 20%, transparent)); --tb-fill: color-mix(in oklab, var(--tb-fg) 7%, transparent);
  --tb-brand: var(--brand, Highlight); --tb-bg: var(--background, Canvas); --tb-r: var(--r-control, 10px);
  --tb-mono: var(--font-mono, ui-monospace, monospace); color: var(--tb-fg); font: 13px/1.2 var(--font-sans, system-ui, sans-serif); }
:host([hidden]) { display: none; }
.t { display: grid; gap: 8px; padding: 10px; border-radius: calc(var(--tb-r) + 4px); background: var(--tb-fill); }
.main { display: flex; align-items: center; gap: 10px; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
button:focus-visible, .bpm:focus-visible { outline: 1.5px solid var(--ring, Highlight); outline-offset: 2px; }
.led { width: 22px; height: 22px; display: grid; place-items: center; flex: none; border-radius: 6px; box-shadow: inset 0 0 0 1px var(--tb-line); }
.led:hover { box-shadow: inset 0 0 0 1px var(--tb-fg); }
.led i { width: 8px; height: 8px; border-radius: 50%; background: var(--tb-brand); box-shadow: 0 0 10px var(--tb-brand); opacity: 0.3; }
:host([off]) .led i { background: var(--tb-dim); box-shadow: none; opacity: 0.4; }
.bpm { display: flex; align-items: baseline; gap: 6px; flex: 1; cursor: ew-resize; touch-action: none; user-select: none; -webkit-user-select: none;
  font-family: var(--tb-mono); font-variant-numeric: tabular-nums; border-radius: 6px; }
.bpm b { font-size: 30px; font-weight: 500; letter-spacing: -0.04em; line-height: 1; }
.bpm small { font-size: 11px; color: var(--tb-dim); }
.beats { display: flex; gap: 4px; }
.beats i { width: 9px; height: 9px; border-radius: 2px; box-shadow: inset 0 0 0 1px var(--tb-line); }
.beats i.on { background: var(--tb-fg); box-shadow: none; }
.beats i:first-child.on { background: var(--tb-brand); }
.row { display: grid; grid-template-columns: 1fr auto; gap: 6px; }
.seg { display: grid; grid-template-columns: repeat(3, 1fr); padding: 2px; border-radius: 9px; background: color-mix(in oklab, var(--tb-bg) 40%, transparent); }
.seg button { padding: 5px 0; border-radius: 7px; font: 11px var(--tb-mono); color: var(--tb-dim); }
.seg button[aria-checked="true"] { color: var(--tb-fg); background: color-mix(in oklab, var(--tb-fg) 12%, transparent); }
.tap { height: 28px; padding: 0 12px; border-radius: 9px; background: var(--tb-fg); color: var(--tb-bg); font: 500 11px var(--tb-mono);
  transition: transform var(--dur-press, 120ms) var(--ease-out, ease); }
.tap:active { transform: scale(0.97); }
:host([off]) .bpm, :host([off]) .beats, :host([off]) .row { opacity: 0.35; }
:host([off]) .row { pointer-events: none; }
`;

let sheet: CSSStyleSheet | null = null;
const reduced = typeof matchMedia !== "undefined" ? matchMedia("(prefers-reduced-motion: reduce)") : null;

/* SSR: no servidor não existe `HTMLElement`, e `extends HTMLElement` no topo
   do módulo derruba a renderização de servidor de toda página que importe este
   arquivo (visto no curso do Club, 28/10/2026). Fora do navegador a classe
   estende uma vazia; o `customElements.define` já não roda lá. É o mesmo
   truque do shim de SSR do Lit. */
const ElementoBase = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;

export class VisantTempoBar extends ElementoBase {
  static observedAttributes = ["bpm", "div", "off"];
  #clock: TempoClock = createTempoClock();
  #raf = 0;
  #lit = -1;
  #r!: { led: HTMLButtonElement; dot: HTMLElement; bpm: HTMLElement; num: HTMLElement; lights: HTMLElement[]; divs: HTMLButtonElement[] };

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    if ("adoptedStyleSheets" in root) {
      sheet ??= new CSSStyleSheet();
      if (!sheet.cssRules.length) sheet.replaceSync(CSS);
      root.adoptedStyleSheets = [sheet];
    } else {
      (root as ShadowRoot).innerHTML = `<style>${CSS}</style>`;
    }
    const t = document.createElement("div");
    t.className = "t";
    t.part.add("bar");
    t.innerHTML = `
      <div class="main">
        <button class="led" part="led" aria-label="seguir o bpm"><i></i></button>
        <div class="bpm" part="bpm" role="slider" tabindex="0" aria-label="bpm"><b></b><small>bpm</small></div>
        <div class="beats" part="beats" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="row">
        <div class="seg" role="radiogroup" aria-label="divisão">
          <button role="radio" data-div="1">1/4</button><button role="radio" data-div="2">1/8</button><button role="radio" data-div="4">1/16</button>
        </div>
        <button class="tap" part="tap">tap</button>
      </div>`;
    root.append(t);
    this.#r = {
      led: t.querySelector(".led")!,
      dot: t.querySelector(".led i")!,
      bpm: t.querySelector(".bpm")!,
      num: t.querySelector(".bpm b")!,
      lights: [...t.querySelectorAll<HTMLElement>(".beats i")],
      divs: [...t.querySelectorAll<HTMLButtonElement>(".seg button")],
    };
    this.#wire();
  }

  /** O relógio que a barra lê. Troque pelo do seu desenho pra bater junto. */
  get clock() {
    return this.#clock;
  }
  set clock(c: TempoClock) {
    this.#clock = c;
    this.#paint();
  }
  get bpm() {
    return this.#clock.bpm;
  }
  set bpm(v: number) {
    this.#setBpm(v, false);
  }
  get on() {
    return !this.hasAttribute("off");
  }
  set on(v: boolean) {
    this.toggleAttribute("off", !v);
  }

  connectedCallback() {
    this.#clock.restart(performance.now());
    this.#paint();
    this.#loop();
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
  }
  attributeChangedCallback(name: string, _old: string | null, val: string | null) {
    if (name === "bpm" && val !== null && Number(val) !== this.#clock.bpm) this.#clock.setBpm(Number(val), performance.now());
    if (name === "div" && val !== null) this.#clock.div = (Number(val) as TempoDivision) || 1;
    if (name === "off") this.#loop();
    if (this.#r) this.#paint();
  }

  #emit(type: string, detail: object) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  #setBpm(v: number, emit = true) {
    const before = this.#clock.bpm;
    this.#clock.setBpm(v, performance.now());
    this.#paint();
    if (emit && this.#clock.bpm !== before) this.#emit("bpmchange", { bpm: this.#clock.bpm });
  }

  #paint() {
    const { num, bpm, divs, led } = this.#r;
    num.textContent = String(this.#clock.bpm);
    bpm.setAttribute("aria-valuenow", String(this.#clock.bpm));
    bpm.setAttribute("aria-valuemin", "60");
    bpm.setAttribute("aria-valuemax", "180");
    divs.forEach((b) => b.setAttribute("aria-checked", String(Number(b.dataset.div) === this.#clock.div)));
    led.setAttribute("aria-pressed", String(this.on));
  }

  #loop() {
    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
    if (!this.isConnected) return;
    if (!this.on) {
      this.#r.lights.forEach((l) => l.classList.remove("on"));
      this.#lit = -1;
      return;
    }
    const frame = (now: number) => {
      this.#raf = requestAnimationFrame(frame);
      const k = this.#clock.tick(now);
      this.#r.dot.style.opacity = reduced?.matches ? "1" : String(0.3 + k.env * 0.7);
      if (k.beatInBar !== this.#lit) {
        this.#r.lights.forEach((l, i) => l.classList.toggle("on", i === k.beatInBar));
        this.#lit = k.beatInBar;
      }
      if (k.beat) this.#emit("beat", k);
    };
    this.#raf = requestAnimationFrame(frame);
  }

  #wire() {
    const { led, bpm, divs } = this.#r;
    led.addEventListener("click", () => {
      this.on = !this.on;
      this.#emit("syncchange", { on: this.on });
    });
    divs.forEach((b) =>
      b.addEventListener("click", () => {
        this.#clock.div = Number(b.dataset.div) as TempoDivision;
        this.#paint();
        this.#emit("divchange", { div: this.#clock.div });
      }),
    );
    this.shadowRoot!.querySelector(".tap")!.addEventListener("click", () => {
      if (!this.on) { this.on = true; this.#emit("syncchange", { on: true }); }
      const before = this.#clock.bpm;
      this.#clock.tap(performance.now());
      this.#paint();
      if (this.#clock.bpm !== before) this.#emit("bpmchange", { bpm: this.#clock.bpm });
    });
    bpm.addEventListener("keydown", (e) => {
      const d = ({ ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 } as Record<string, number>)[e.key];
      if (!d) return;
      e.preventDefault();
      this.#setBpm(this.#clock.bpm + d * (e.shiftKey ? 10 : 1));
    });
    bpm.addEventListener("dblclick", () => this.#setBpm(Number(this.getAttribute("default") ?? 128)));
    // drag the number sideways: 1 bpm per 4px, Shift is 4x finer
    bpm.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      bpm.setPointerCapture(e.pointerId);
      const x0 = e.clientX, v0 = this.#clock.bpm;
      const move = (ev: PointerEvent) => this.#setBpm(v0 + Math.round((ev.clientX - x0) / (ev.shiftKey ? 16 : 4)));
      const up = () => bpm.removeEventListener("pointermove", move);
      bpm.addEventListener("pointermove", move);
      bpm.addEventListener("pointerup", up, { once: true });
      bpm.addEventListener("pointercancel", up, { once: true });
    });
  }
}

/** Registra o `<visant-tempo-bar>` (uma vez só, mesmo chamado várias vezes). */
export function definirTempoBar(tag = "visant-tempo-bar") {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) customElements.define(tag, VisantTempoBar);
}
