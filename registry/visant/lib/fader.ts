/**
 * Fader, o slider de console em web component: `<visant-fader>`.
 *
 * Vanilla de propósito: roda em página sem framework, em React (19 entende
 * custom element) e em qualquer outro lugar. Colhido do Refuge FX, onde vive
 * numa coluna de parâmetros de efeito.
 *
 * Decisões que não se veem de primeira:
 *
 * 1. **O rótulo também arrasta.** Em painel denso o trilho é curto e o polegar
 *    é pequeno; arrastar o NOME na horizontal muda o valor, como nos editores
 *    gráficos. Shift deixa o passo 4x mais fino.
 * 2. **É um `<input type=range>` por baixo.** Teclado, leitor de tela, Page e
 *    Home/End vêm de graça; o desenho é só pele.
 * 3. **Marca a cada 10% no trilho.** Dá régua pro olho sem número, e é o que
 *    separa um fader de uma barra genérica.
 * 4. **Tampa quadrada, estreita.** Bolinha é slider de formulário; a tampa diz
 *    "mesa de som".
 * 5. **Duplo clique volta pro `default`.** Quem experimenta precisa de um
 *    caminho de volta que não seja lembrar o número.
 * 6. **Sem cor própria.** Só tokens (`--foreground`, `--border`, `--ring`) com
 *    fallback em cor de sistema, então o tema da marca troca tudo.
 *
 * Eventos: `valuechange` a cada passo (inclusive arrastando) e `valuecommit`
 * ao soltar, ambos com `detail.value`.
 */

const CSS = `
:host { display: block; --fd-fg: var(--foreground, CanvasText); --fd-dim: var(--muted-foreground, color-mix(in oklab, currentColor 55%, transparent));
  --fd-line: var(--border, color-mix(in oklab, currentColor 18%, transparent)); --fd-bg: var(--background, Canvas);
  --fd-ease: var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); --fd-press: var(--dur-press, 120ms); --fd-fast: var(--dur-fast, 160ms);
  font: 13px/1.2 var(--font-sans, system-ui, sans-serif); color: var(--fd-dim); }
:host([hidden]) { display: none; }
:host([disabled]) { opacity: 0.4; pointer-events: none; }
.f { display: grid; grid-template-columns: var(--fader-label-w, 64px) 1fr var(--fader-value-w, 28px); align-items: center; gap: 10px; }
.l { cursor: ew-resize; user-select: none; -webkit-user-select: none; touch-action: none; transition: color var(--fd-fast) ease; }
.f:hover .l, .l.on { color: var(--fd-fg); }
output { font: 11px var(--font-mono, ui-monospace, monospace); font-variant-numeric: tabular-nums; text-align: right; color: var(--fd-fg); }
input { -webkit-appearance: none; appearance: none; width: 100%; height: 28px; margin: 0; cursor: ew-resize; touch-action: pan-y;
  background: repeating-linear-gradient(to right, var(--fd-line) 0 1px, transparent 1px 10%) 3px center / calc(100% - 6px) 7px no-repeat; }
input:focus-visible { outline: none; }
input::-webkit-slider-runnable-track { height: 2px; background: linear-gradient(to right, var(--fd-fg) var(--p, 50%), var(--fd-line) var(--p, 50%)); }
input::-moz-range-track { height: 2px; background: var(--fd-line); }
input::-moz-range-progress { height: 2px; background: var(--fd-fg); }
input::-webkit-slider-thumb { -webkit-appearance: none; width: 6px; height: 16px; margin-top: -7px; border-radius: 1.5px; background: var(--fd-fg);
  box-shadow: 0 0 0 3px var(--fd-bg); transition: transform var(--fd-press) var(--fd-ease); }
input::-moz-range-thumb { width: 6px; height: 16px; border: 0; border-radius: 1.5px; background: var(--fd-fg); }
input:active::-webkit-slider-thumb { transform: scaleY(1.2); }
input:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px var(--fd-bg), 0 0 0 4.5px var(--ring, Highlight); }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

let sheet: CSSStyleSheet | null = null;

/* SSR: no servidor não existe `HTMLElement`, e `extends HTMLElement` no topo
   do módulo derruba a renderização de servidor de toda página que importe este
   arquivo (visto no curso do Club, 28/10/2026). Fora do navegador a classe
   estende uma vazia; o `customElements.define` já não roda lá. É o mesmo
   truque do shim de SSR do Lit. */
const ElementoBase = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;

export class VisantFader extends ElementoBase {
  static observedAttributes = ["label", "min", "max", "step", "value", "disabled"];
  #input!: HTMLInputElement;
  #out!: HTMLOutputElement;
  #label!: HTMLSpanElement;

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
    const f = document.createElement("div");
    f.className = "f";
    f.part.add("field");
    f.innerHTML = `<span class="l" part="label"></span><input type="range" part="range"><output part="value"></output>`;
    root.append(f);
    this.#label = f.querySelector(".l")!;
    this.#input = f.querySelector("input")!;
    this.#out = f.querySelector("output")!;

    this.#input.addEventListener("input", () => this.#emit("valuechange"));
    this.#input.addEventListener("change", () => this.#emit("valuecommit"));
    const reset = () => {
      const d = this.getAttribute("default");
      if (d === null) return;
      this.value = Number(d);
      this.#emit("valuechange");
      this.#emit("valuecommit");
    };
    this.#input.addEventListener("dblclick", reset);
    this.#label.addEventListener("dblclick", reset);
    this.#scrub();
  }

  connectedCallback() {
    this.#sync();
  }

  attributeChangedCallback() {
    if (this.#input) this.#sync();
  }

  get value() {
    return Number(this.#input.value);
  }
  set value(v: number) {
    this.#input.value = String(v);
    this.#paint();
  }

  #sync() {
    const a = (n: string, d: string) => this.getAttribute(n) ?? d;
    this.#label.textContent = a("label", "");
    this.#input.min = a("min", "0");
    this.#input.max = a("max", "100");
    this.#input.step = a("step", "1");
    this.#input.disabled = this.hasAttribute("disabled");
    this.#input.setAttribute("aria-label", a("label", "valor"));
    if (this.hasAttribute("value")) this.#input.value = a("value", "50");
    this.#paint();
  }

  #paint() {
    const i = this.#input;
    const p = ((Number(i.value) - Number(i.min)) / (Number(i.max) - Number(i.min) || 1)) * 100;
    i.style.setProperty("--p", `${p}%`);
    this.#out.value = i.value;
  }

  #emit(type: "valuechange" | "valuecommit") {
    this.#paint();
    this.dispatchEvent(new CustomEvent(type, { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  // drag the name sideways; one step per few px, Shift is finer
  #scrub() {
    const l = this.#label;
    l.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || this.hasAttribute("disabled")) return;
      e.preventDefault();
      l.setPointerCapture(e.pointerId);
      l.classList.add("on");
      const i = this.#input;
      const x0 = e.clientX, v0 = this.value;
      const step = Number(i.step) || 1;
      const span = (Number(i.max) - Number(i.min)) / step;
      const px = span > 50 ? 2 : 6;
      let last = v0;
      const move = (ev: PointerEvent) => {
        const d = Math.round((ev.clientX - x0) / (ev.shiftKey ? px * 4 : px));
        const v = Math.min(Number(i.max), Math.max(Number(i.min), v0 + d * step));
        if (v === last) return;
        last = v;
        this.value = v;
        this.#emit("valuechange");
      };
      const up = () => {
        l.removeEventListener("pointermove", move);
        l.classList.remove("on");
        if (last !== v0) this.#emit("valuecommit");
      };
      l.addEventListener("pointermove", move);
      l.addEventListener("pointerup", up, { once: true });
      l.addEventListener("pointercancel", up, { once: true });
    });
  }
}

/** Registra o `<visant-fader>` (uma vez só, mesmo chamado várias vezes). */
export function definirFader(tag = "visant-fader") {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) customElements.define(tag, VisantFader);
}
