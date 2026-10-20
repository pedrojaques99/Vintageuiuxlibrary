/**
 * Anatomia: figura didática interativa como web component, `<visant-anatomia>`.
 *
 * Um objeto isométrico que explica uma ideia funcionando (skill anatomy, MIT),
 * com a UI de componente em volta: pinos, painel de peças, passo a passo,
 * pausa, recomeço e tela cheia. Roda igual em aula, blog, livro e landing page,
 * porque mora num Shadow DOM e só herda do site as variáveis de tema
 * (--foreground, --card, --brand, --font-sans...). Sem elas, cai nas cores do
 * sistema (Canvas/CanvasText), então nunca fica sem contraste.
 *
 *   registrarFigura(comoSobe); definirAnatomia();
 *   <visant-anatomia figura="como-sobe"></visant-anatomia>
 *
 * Decisões que custaram caro (vieram de teste com aluno e com o dono):
 * - A dica NÃO segue o mouse. A primeira versão abria um balão ao lado do pino
 *   e o mouse atravessava o desenho no caminho até o botão, trocando a peça no
 *   meio. Agora o texto mora num painel fixo e no palco só aparece o nome.
 * - O foco tem ímã e intenção: pino perto ganha da peça embaixo, e só troca de
 *   peça quando o mouse para uns 90 ms (passar rápido por cima não pisca).
 * - O hover nunca mexe em `transform`: peça que se move tem o transform no
 *   grupo de dentro, e um transform de CSS por cima faria ela voltar pro lugar.
 */
import * as kit from "./anatomia-kit";
import { ESTILO_DO_KIT } from "./anatomia-estilo";
import type { AnatomiaApi, Controle, FiguraDef, Ponto3 } from "./anatomia-tipos";

export type { FiguraDef } from "./anatomia-tipos";

const figuras = new Map<string, FiguraDef>();

/** Deixa a figura disponível pelo atributo `figura="<id>"`. */
export function registrarFigura(def: FiguraDef) {
  figuras.set(def.dados.id, def);
  document.querySelectorAll<VisantAnatomia>(`visant-anatomia[figura="${def.dados.id}"]`).forEach((el) => el.montar?.());
}

const ICONES = {
  pausar: '<path d="M6 4h3v12H6zM11 4h3v12h-3z"/>',
  tocar: '<path d="M6 4l10 6-10 6z"/>',
  reiniciar: '<path d="M10 4a6 6 0 1 1-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4 3v4h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  tela: '<path d="M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
};
const icone = (nome: keyof typeof ICONES) => `<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="currentColor">${ICONES[nome]}</svg>`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const CSS = `
:host{display:block;
  --va-fg:var(--foreground, CanvasText);--va-bg:var(--card, var(--background, Canvas));
  --va-muted:var(--muted-foreground, color-mix(in oklab, var(--va-fg) 58%, var(--va-bg)));
  --va-borda:var(--border, color-mix(in oklab, var(--va-fg) 13%, var(--va-bg)));
  --va-suave:color-mix(in oklab, var(--va-fg) 5%, var(--va-bg));
  --va-brand:var(--brand, var(--va-fg));--va-brand-fg:var(--brand-foreground, var(--va-bg));
  --va-raio:var(--r-surface, var(--radius, 10px));--va-raio-c:var(--r-control, 6px);
  --va-sans:var(--font-sans, ui-sans-serif, system-ui, sans-serif);--va-mono:var(--font-mono, ui-monospace, "SF Mono", Menlo, monospace);
  --va-ease:var(--ease-out, cubic-bezier(.2,.8,.2,1));
  color:var(--va-fg);font-family:var(--va-sans);-webkit-font-smoothing:antialiased}
:host([tema="escuro"]){color-scheme:dark}:host([tema="claro"]){color-scheme:light}
:host(:fullscreen){background:var(--va-bg);overflow:auto;padding:24px}
*,*::before,*::after{box-sizing:border-box}
button{font:inherit;color:inherit}
.va{container-type:inline-size;margin:0;border:1px solid var(--va-borda);border-radius:var(--va-raio);background:var(--va-bg);overflow:hidden}
.va-topo{display:flex;align-items:center;gap:12px;padding:12px 14px 12px 18px;border-bottom:1px solid var(--va-borda)}
.va-id{display:flex;align-items:baseline;gap:10px;min-width:0;flex:1}
.va-fig{font:500 11px/1 var(--va-mono);color:var(--va-muted);letter-spacing:.04em;white-space:nowrap}
.va-titulo{margin:0;font-size:14px;font-weight:600;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.va-ferramentas{display:flex;align-items:center;gap:4px}
.va-modos{display:inline-flex;padding:2px;margin-right:6px;border-radius:calc(var(--va-raio-c) + 2px);background:var(--va-suave);border:1px solid var(--va-borda)}
.va-modos button{border:0;background:transparent;padding:5px 10px;border-radius:var(--va-raio-c);font-size:12px;font-weight:600;color:var(--va-muted);cursor:pointer;transition:background .2s,color .2s}
.va-modos button[aria-selected="true"]{background:var(--va-bg);color:var(--va-fg);box-shadow:0 0 0 1px var(--va-borda)}
.va-icone{display:inline-grid;place-items:center;width:30px;height:30px;border:0;border-radius:var(--va-raio-c);background:transparent;color:var(--va-muted);cursor:pointer;transition:background .2s,color .2s}
.va-icone:hover{background:var(--va-suave);color:var(--va-fg)}
:is(button,.va-palco):focus-visible{outline:2px solid var(--focus, var(--va-brand));outline-offset:2px}
.va-corpo{display:grid}
@container (min-width:760px){.va-corpo{grid-template-columns:minmax(0,1fr) 300px}.va-painel{border-left:1px solid var(--va-borda);border-top:0!important}}
.va-palco{position:relative;padding:28px 24px 44px;outline:none;min-width:0}
.va-arte{position:relative;max-width:820px;margin:0 auto;touch-action:manipulation}
.va-arte svg{display:block;width:100%;height:auto;overflow:visible}
.va-leitura{position:absolute;left:18px;right:18px;bottom:14px;font:500 11px/1.3 var(--va-mono);color:var(--va-muted);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.va-pinos{position:absolute;inset:0;pointer-events:none}
.va-pino{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;padding:0;border-radius:50%;border:1px solid color-mix(in oklab, var(--va-fg) 45%, transparent);background:var(--va-bg);color:var(--va-fg);font:600 11px/20px var(--va-mono);text-align:center;cursor:pointer;pointer-events:auto;opacity:0;transform:scale(.6);transition:opacity .22s var(--va-ease),transform .22s var(--va-ease),background .18s,color .18s;box-shadow:0 0 0 4px color-mix(in oklab, var(--va-bg) 70%, transparent)}
.va[data-interagindo] .va-pino,.va[data-modo="passos"] .va-pino[data-ativa]{opacity:1;transform:none}
.va[data-focando] .va-pino:not([data-ativa]){opacity:.28}
.va[data-focando] .va-pino[data-ativa]{opacity:1}
.va[data-focando] .va-arte svg [data-peca][data-junto]:not([data-ativa]){opacity:.82}
.va-pino[data-ativa]{background:var(--va-fg);color:var(--va-bg);border-color:var(--va-fg);transform:scale(1.12)}
.va-pino[hidden]{display:none}
@media (hover:none){.va .va-pino{opacity:1;transform:none}}
.va-etiqueta{position:absolute;padding:4px 9px;border-radius:999px;background:var(--va-fg);color:var(--va-bg);font-size:12px;font-weight:600;white-space:nowrap;pointer-events:none;opacity:0;transform:translate(-50%,calc(-100% - 18px)) translateY(4px);transition:opacity .16s,transform .16s var(--va-ease)}
.va-etiqueta[data-visivel]{opacity:1;transform:translate(-50%,calc(-100% - 18px))}
.va-arte svg [data-peca]{transition:opacity .28s var(--va-ease),filter .28s var(--va-ease)}
.va[data-focando] .va-arte svg [data-peca]:not([data-ativa]){opacity:var(--va-apagado,.42)}
.va-arte svg [data-peca]:not([data-peca="0"]){cursor:pointer}
.va-painel{border-top:1px solid var(--va-borda);padding:14px;min-width:0;display:flex;flex-direction:column;gap:10px;max-height:min(560px,80vh);overflow:auto}
.va-rotulo{margin:2px 4px 0;font:500 11px/1 var(--va-mono);color:var(--va-muted);letter-spacing:.04em}
.va-lista{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.va-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border:0;border-radius:var(--va-raio-c);background:transparent;text-align:left;font-size:13px;font-weight:600;cursor:pointer;transition:background .18s}
.va-item:hover,.va-item[data-ativa]{background:var(--va-suave)}
.va-num{flex:none;width:20px;height:20px;border-radius:50%;border:1px solid color-mix(in oklab, var(--va-fg) 35%, transparent);font:600 10.5px/18px var(--va-mono);text-align:center;transition:background .18s,color .18s}
.va-item[data-ativa] .va-num{background:var(--va-fg);color:var(--va-bg);border-color:var(--va-fg)}
.va-detalhe{display:grid;grid-template-rows:0fr;transition:grid-template-rows .26s var(--va-ease)}
.va-detalhe>div{overflow:hidden;padding:0 8px 0 38px;color:var(--va-muted);font-size:13px;line-height:1.5}
.va-detalhe[data-aberto]{grid-template-rows:1fr}
.va-detalhe[data-aberto]>div{padding-bottom:10px}
.va-botao{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:7px 12px;border:1px solid var(--va-borda);border-radius:var(--va-raio-c);background:var(--va-bg);font-size:12.5px;font-weight:600;cursor:pointer;transition:background .18s,border-color .18s}
.va-botao:hover{border-color:color-mix(in oklab, var(--va-fg) 35%, transparent)}
.va-botao[data-primario]{background:var(--va-brand);color:var(--va-brand-fg);border-color:transparent}
.va-botao[data-primario]:hover{background:color-mix(in oklab, var(--va-brand) 88%, var(--va-fg))}
.va-botao:disabled{opacity:.4;cursor:default}
.va-vazio{margin:0 4px;color:var(--va-muted);font-size:12.5px;line-height:1.5}
.va-progresso{display:flex;gap:4px;margin:2px 4px}
.va-progresso button{flex:1;height:4px;padding:0;border:0;border-radius:2px;background:var(--va-borda);cursor:pointer;transition:background .2s}
.va-progresso button[data-feito]{background:color-mix(in oklab, var(--va-fg) 55%, transparent)}
.va-progresso button[aria-current="step"]{background:var(--va-fg)}
.va-passo{margin:0 4px}
.va-passo h4{margin:6px 0 6px;font-size:15px;font-weight:650;letter-spacing:-.01em}
.va-passo p{margin:0;color:var(--va-muted);font-size:13.5px;line-height:1.55}
.va-nav{display:flex;justify-content:space-between;gap:8px;margin:auto 4px 2px}
.va-resumo{padding:10px 18px 14px;border-top:1px solid var(--va-borda);color:var(--va-muted);font-size:12.5px;line-height:1.5}
.va-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
[hidden]{display:none!important}
@container (max-width:520px){.va-topo{flex-wrap:wrap}.va-ferramentas{width:100%;justify-content:space-between}.va-palco{padding:18px 10px 40px}.va-pino{width:18px;height:18px;margin:-9px 0 0 -9px;font-size:9.5px;line-height:16px}}
@media (prefers-reduced-motion:reduce){.va *,.va *::before{transition:none!important;animation:none!important}}
`;

export class VisantAnatomia extends HTMLElement {
  static observedAttributes = ["figura", "modo"];
  #fig: FiguraDef | null = null;
  #controle: Controle | null = null;
  #raiz: ShadowRoot;
  #limpar: (() => void)[] = [];

  constructor() {
    super();
    this.#raiz = this.attachShadow({ mode: "open" });
  }

  /** Pra React e afins: passar a figura direto, sem registrar. */
  set figura(def: FiguraDef | string | null) {
    if (typeof def === "string") this.setAttribute("figura", def);
    else {
      this.#fig = def;
      this.montar();
    }
  }

  connectedCallback() {
    this.montar();
  }
  disconnectedCallback() {
    this.desmontar();
  }
  attributeChangedCallback(nome: string, antes: string | null, depois: string | null) {
    if (antes === depois || !this.isConnected) return;
    if (nome === "figura") {
      this.#fig = null;
      this.montar();
    }
    if (nome === "modo") this.#definirModo?.(depois === "passos" ? "passos" : "explorar");
  }

  #definirModo: ((m: "explorar" | "passos") => void) | null = null;

  desmontar() {
    this.#controle?.destruir();
    this.#controle = null;
    this.#limpar.forEach((f) => f());
    this.#limpar = [];
  }

  montar() {
    const def = this.#fig ?? figuras.get(this.getAttribute("figura") ?? "");
    if (!def || !this.isConnected) return;
    this.desmontar();
    this.#fig = def;
    const d = def.dados;
    const raiz = this.#raiz;
    const passos = d.passos ?? [];

    raiz.innerHTML = `<style>${CSS}${ESTILO_DO_KIT}${d.css ?? ""}</style>
<figure class="va" data-modo="explorar">
  <header class="va-topo">
    <div class="va-id"><span class="va-fig">${esc(d.fig)}</span><h3 class="va-titulo">${esc(d.titulo)}</h3></div>
    <div class="va-ferramentas" role="toolbar" aria-label="Controles da figura">
      ${passos.length ? `<div class="va-modos" role="tablist" aria-label="Modo"><button role="tab" data-modo="explorar" aria-selected="true">Explorar</button><button role="tab" data-modo="passos" aria-selected="false">Passo a passo</button></div>` : ""}
      <button class="va-icone" data-acao="tocar" aria-label="Pausar" title="Pausar">${icone("pausar")}</button>
      <button class="va-icone" data-acao="reiniciar" aria-label="Recomeçar" title="Recomeçar">${icone("reiniciar")}</button>
      <button class="va-icone" data-acao="tela" aria-label="Tela cheia" title="Tela cheia">${icone("tela")}</button>
    </div>
  </header>
  <div class="va-corpo">
    <div class="va-palco va-palco-kit" tabindex="0" role="group" aria-roledescription="figura interativa" aria-label="${esc(d.resumo)} Use as setas pra passar pelas peças e Enter pra usar a peça.">
      <div class="va-arte">${d.svg}
        <div class="va-pinos">${d.pecas.map((p) => `<button class="va-pino" data-n="${p.n}" tabindex="-1" aria-label="${p.n}: ${esc(p.nome)}">${p.n}</button>`).join("")}</div>
        <div class="va-etiqueta" aria-hidden="true"></div>
      </div>
      <output class="va-leitura" aria-live="off">${esc(d.leitura)}</output>
    </div>
    <aside class="va-painel">
      <div class="va-explorar">
        <p class="va-rotulo">${d.pecas.length} peças</p>
        <ol class="va-lista">${d.pecas
          .map(
            (p) => `<li><button class="va-item" data-n="${p.n}" aria-expanded="false"><span class="va-num">${p.n}</span><span>${esc(p.nome.replace(/\.$/, ""))}</span></button>
<div class="va-detalhe" data-n="${p.n}"><div><p style="margin:0">${esc(p.texto)}</p>${p.acao ? `<button class="va-botao" data-primario data-acao-peca="${p.n}">${esc(p.acao)}</button>` : ""}</div></div></li>`,
          )
          .join("")}</ol>
      </div>
      ${
        passos.length
          ? `<div class="va-passos" hidden>
        <div class="va-progresso">${passos.map((_, i) => `<button aria-label="Passo ${i + 1}" data-i="${i}"></button>`).join("")}</div>
        <div class="va-passo"><p class="va-rotulo" data-passo-n></p><h4 data-passo-titulo></h4><p data-passo-texto></p></div>
        <div class="va-nav"><button class="va-botao" data-nav="-1">Anterior</button><button class="va-botao" data-primario data-nav="1">Próximo</button></div>
      </div>`
          : ""
      }
    </aside>
  </div>
  <figcaption class="va-resumo">${esc(d.resumo)}</figcaption>
  <p class="va-sr" aria-live="polite" data-anuncio></p>
</figure>`;

    const $ = <T extends Element = HTMLElement>(s: string) => raiz.querySelector(s) as T;
    const $$ = <T extends Element = HTMLElement>(s: string) => [...raiz.querySelectorAll(s)] as T[];
    const va = $(".va");
    const palco = $(".va-palco");
    const arte = $(".va-arte");
    const svg = arte.querySelector("svg")!;
    const vb = svg.viewBox.baseVal;
    const leitura = $(".va-leitura");
    const etiqueta = $(".va-etiqueta");
    const anuncio = $("[data-anuncio]");
    const pinos = new Map($$<HTMLButtonElement>(".va-pino").map((el) => [Number(el.dataset.n), el]));
    const grupos = (n: number) => $$<SVGGElement>(`.va-arte svg [data-peca="${n}"]`);
    const itens = new Map($$<HTMLButtonElement>(".va-item").map((el) => [Number(el.dataset.n), el]));
    const detalhes = new Map($$(".va-detalhe").map((el) => [Number(el.dataset.n), el]));
    const pecasVivas = d.pecas.map((p) => ({ ...p }));
    const peca = (n: number) => pecasVivas.find((p) => p.n === n)!;
    const reduzido = matchMedia("(prefers-reduced-motion: reduce)");
    const ouvir = <K extends keyof HTMLElementEventMap>(el: EventTarget, ev: K | string, fn: (e: any) => void, opt?: AddEventListenerOptions) => {
      el.addEventListener(ev, fn, opt);
      this.#limpar.push(() => el.removeEventListener(ev, fn, opt));
    };

    // ---- estado do foco
    let modo: "explorar" | "passos" = "explorar";
    let hover: number | null = null;
    let selecionada: number | null = null;
    let passo = 0;
    const principal = () => selecionada ?? hover;
    const ativas = (): number[] => {
      const p = principal();
      if (p !== null) return [p];
      return modo === "passos" ? passos[passo]?.foco ?? [] : [];
    };

    // ---- pinos: posição em % do viewBox, então acompanham qualquer largura
    const posicao = new Map<number, [number, number]>();
    const escondidos = new Map<number, [number, number]>();
    const porPino = (n: number, ponto: Ponto3 | null) => {
      if (ponto === null) {
        posicao.delete(n);
        pinos.get(n)?.toggleAttribute("hidden", true);
        if (n === principal()) mostrarEtiqueta();
        return;
      }
      pinos.get(n)?.removeAttribute("hidden");
      const [sx, sy] = kit.iso(ponto, d.P as kit.Projection);
      const x = (sx / vb.width) * 100;
      const y = (sy / vb.height) * 100;
      posicao.set(n, [x, y]);
      const el = pinos.get(n);
      if (el) {
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
      }
      if (n === principal()) mostrarEtiqueta();
    };
    d.pecas.forEach((p) => porPino(p.n, p.ancora));

    function mostrarEtiqueta() {
      const n = principal();
      const pos = n !== null ? posicao.get(n) : undefined;
      if (n === null || !pos) return etiqueta.removeAttribute("data-visivel");
      etiqueta.textContent = peca(n).nome.replace(/\.$/, "");
      etiqueta.style.left = `${pos[0]}%`;
      etiqueta.style.top = `${pos[1]}%`;
      etiqueta.setAttribute("data-visivel", "");
    }

    const aplicar = () => {
      const lista = ativas();
      va.toggleAttribute("data-focando", lista.length > 0);
      const junto = lista.length === 1 ? peca(lista[0])?.junto ?? [] : [];
      $$(".va-arte svg [data-peca]").forEach((g) => {
        const m = Number(g.getAttribute("data-peca"));
        g.toggleAttribute("data-ativa", lista.includes(m));
        g.toggleAttribute("data-junto", junto.includes(m));
      });
      pinos.forEach((el, n) => el.toggleAttribute("data-ativa", lista.includes(n)));
      const p = principal();
      itens.forEach((el, n) => {
        el.toggleAttribute("data-ativa", n === p);
        el.setAttribute("aria-expanded", String(n === p));
      });
      detalhes.forEach((el, n) => el.toggleAttribute("data-aberto", n === p));
      mostrarEtiqueta();
      refrescarAcao();
    };

    function refrescarAcao() {
      const p = principal();
      const acao = p !== null ? controle?.acoes?.[p] : undefined;
      const botao = p !== null ? raiz.querySelector<HTMLButtonElement>(`[data-acao-peca="${p}"]`) : null;
      if (!acao || !botao) return;
      const rotulo = acao.rotulo();
      if (botao.textContent !== rotulo) botao.textContent = rotulo;
      botao.disabled = acao.ativa ? !acao.ativa() : false;
    }

    const anunciar = (texto: string) => {
      anuncio.textContent = texto;
    };

    // ---- foco inteligente: ímã do pino, peça embaixo, intenção e histerese
    let espera = 0;
    let saida = 0;
    const IMA_FORTE = 18;
    const IMA = 46;
    function candidatoEm(e: PointerEvent): number | null {
      const caixa = arte.getBoundingClientRect();
      const px = e.clientX - caixa.left;
      const py = e.clientY - caixa.top;
      let perto: number | null = null;
      let dist = Infinity;
      posicao.forEach(([x, y], n) => {
        const dd = Math.hypot((x / 100) * caixa.width - px, (y / 100) * caixa.height - py);
        if (dd < dist) {
          dist = dd;
          perto = n;
        }
      });
      if (perto !== null && dist <= IMA_FORTE) return perto;
      const alvo = (e.composedPath()[0] as Element | undefined)?.closest?.("[data-peca]");
      const n = alvo ? Number(alvo.getAttribute("data-peca")) : 0;
      if (n > 0 && pinos.has(n)) return n;
      return perto !== null && dist <= IMA ? perto : null;
    }
    function dentroDaAtual(e: PointerEvent) {
      if (hover === null) return false;
      return grupos(hover).some((g) => {
        const r = g.getBoundingClientRect();
        return e.clientX >= r.left - 8 && e.clientX <= r.right + 8 && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8;
      });
    }
    const trocarHover = (n: number | null) => {
      if (n === hover) return;
      hover = n;
      aplicar();
    };
    ouvir(arte, "pointermove", (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      clearTimeout(saida);
      va.setAttribute("data-interagindo", "");
      const n = candidatoEm(e);
      clearTimeout(espera);
      if (n === hover) return;
      if (hover === null) return trocarHover(n);
      if (n === null && dentroDaAtual(e)) return;
      espera = window.setTimeout(() => trocarHover(n), 90);
    });
    ouvir(arte, "pointerleave", () => {
      clearTimeout(espera);
      saida = window.setTimeout(() => {
        trocarHover(null);
        if (!palco.matches(":focus-within")) va.removeAttribute("data-interagindo");
      }, 180);
    });
    ouvir(arte, "click", (e: PointerEvent) => {
      const n = candidatoEm(e);
      selecionar(n === selecionada ? null : n, { rolar: true });
    });
    pinos.forEach((el, n) => ouvir(el, "click", (e: Event) => {
      e.stopPropagation();
      selecionar(n === selecionada ? null : n, { rolar: true });
    }));

    function selecionar(n: number | null, { rolar = false } = {}) {
      selecionada = n;
      if (n !== null && modo === "passos") definirModo("explorar");
      aplicar();
      if (n !== null) {
        anunciar(`${n}. ${peca(n).nome} ${peca(n).texto}`);
        if (rolar) itens.get(n)?.scrollIntoView({ block: "nearest", behavior: reduzido.matches ? "auto" : "smooth" });
      }
    }

    // ---- painel
    itens.forEach((el, n) => {
      ouvir(el, "pointerenter", () => trocarHover(n));
      ouvir(el, "pointerleave", () => trocarHover(null));
      ouvir(el, "click", () => selecionar(n === selecionada ? null : n));
    });
    $$<HTMLButtonElement>("[data-acao-peca]").forEach((b) =>
      ouvir(b, "click", (e: Event) => {
        e.stopPropagation();
        const n = Number(b.dataset.acaoPeca);
        controle?.acoes?.[n]?.rodar();
        aplicar();
      }),
    );

    // ---- passo a passo
    const passosEl = raiz.querySelector<HTMLElement>(".va-passos");
    const explorarEl = $(".va-explorar");
    function irPasso(i: number) {
      passo = Math.max(0, Math.min(passos.length - 1, i));
      const p = passos[passo];
      $("[data-passo-n]").textContent = `Passo ${passo + 1} de ${passos.length}`;
      $("[data-passo-titulo]").textContent = p.titulo;
      $("[data-passo-texto]").textContent = p.texto;
      $$<HTMLButtonElement>(".va-progresso button").forEach((b, j) => {
        b.toggleAttribute("data-feito", j < passo);
        if (j === passo) b.setAttribute("aria-current", "step");
        else b.removeAttribute("aria-current");
      });
      raiz.querySelector<HTMLButtonElement>('[data-nav="-1"]')!.disabled = passo === 0;
      raiz.querySelector<HTMLButtonElement>('[data-nav="1"]')!.textContent = passo === passos.length - 1 ? "Explorar" : "Próximo";
      controle?.irParaPasso?.(passo);
      aplicar();
      anunciar(`Passo ${passo + 1} de ${passos.length}. ${p.titulo}. ${p.texto}`);
    }
    function definirModo(m: "explorar" | "passos") {
      if (!passosEl || m === modo) return;
      modo = m;
      va.dataset.modo = m;
      passosEl.hidden = m !== "passos";
      explorarEl.hidden = m === "passos";
      $$<HTMLButtonElement>(".va-modos button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.modo === m)));
      if (m === "passos") {
        selecionada = null;
        hover = null;
        irPasso(0);
      } else {
        controle?.tocar();
        aplicar();
      }
    }
    this.#definirModo = definirModo;
    $$<HTMLButtonElement>(".va-modos button").forEach((b) => ouvir(b, "click", () => definirModo(b.dataset.modo as "explorar" | "passos")));
    $$<HTMLButtonElement>("[data-nav]").forEach((b) =>
      ouvir(b, "click", () => {
        const ultimo = passo === passos.length - 1;
        if (b.dataset.nav === "1" && ultimo) return definirModo("explorar");
        irPasso(passo + Number(b.dataset.nav));
      }),
    );
    $$<HTMLButtonElement>(".va-progresso button").forEach((b) => ouvir(b, "click", () => irPasso(Number(b.dataset.i))));

    // ---- teclado no palco
    const ordem = d.pecas.map((p) => p.n);
    ouvir(palco, "focus", () => va.setAttribute("data-interagindo", ""));
    ouvir(palco, "blur", () => va.removeAttribute("data-interagindo"));
    ouvir(palco, "keydown", (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const passoTecla = e.key === "ArrowRight" ? 1 : -1;
        if (modo === "passos") return irPasso(passo + passoTecla);
        const i = selecionada === null ? (passoTecla > 0 ? -1 : 0) : ordem.indexOf(selecionada);
        selecionar(ordem[(i + passoTecla + ordem.length) % ordem.length], { rolar: true });
      } else if (e.key === "Enter" && selecionada !== null && controle?.acoes?.[selecionada]) {
        e.preventDefault();
        controle.acoes[selecionada].rodar();
        aplicar();
      } else if (e.key === "Escape") {
        selecionar(null);
      }
    });

    // ---- laço único, só com a figura na tela e sem pausa
    let visivel = false;
    let pausado = false;
    let quadro = 0;
    let ultimo = 0;
    const lacos = new Set<{ ativo: boolean; tick: (dt: number) => boolean }>();
    const passar = (agora: number) => {
      const dt = ultimo ? Math.min((agora - ultimo) / 1000, 1 / 20) : 1 / 60;
      ultimo = agora;
      lacos.forEach((l) => {
        if (l.ativo && !l.tick(dt)) l.ativo = false;
      });
      quadro = visivel && !pausado && [...lacos].some((l) => l.ativo) ? requestAnimationFrame(passar) : 0;
    };
    const acordar = () => {
      if (!quadro && visivel && !pausado && !reduzido.matches && [...lacos].some((l) => l.ativo)) {
        ultimo = 0;
        quadro = requestAnimationFrame(passar);
      }
    };
    const io = new IntersectionObserver((es) => {
      visivel = es[es.length - 1].isIntersecting;
      if (visivel) acordar();
    }, { rootMargin: "120px 0px" });
    io.observe(this);
    this.#limpar.push(() => {
      io.disconnect();
      cancelAnimationFrame(quadro);
      clearTimeout(espera);
      clearTimeout(saida);
    });

    const api: AnatomiaApi = {
      kit,
      P: d.P,
      dizer(texto) {
        if (leitura.textContent === texto) return;
        leitura.textContent = texto;
        // o rótulo da ação costuma depender do mesmo estado que a leitura conta
        refrescarAcao();
      },
      moverPino: porPino,
      reduzido: () => reduzido.matches,
      mostrarPino(n, visivel) {
        const el = pinos.get(n);
        if (!el) return;
        el.toggleAttribute("hidden", !visivel);
        if (!visivel) {
          const pos = posicao.get(n);
          if (pos) escondidos.set(n, pos);
          posicao.delete(n);
        } else if (escondidos.has(n)) {
          posicao.set(n, escondidos.get(n)!);
          escondidos.delete(n);
        }
        if (n === principal()) mostrarEtiqueta();
      },
      textoDaPeca(n, texto) {
        const p = peca(n);
        if (!p || p.texto === texto) return;
        p.texto = texto;
        const alvo = raiz.querySelector(`.va-detalhe[data-n="${n}"] p`);
        if (alvo) alvo.textContent = texto;
      },
      atualizar: () => aplicar(),
      loop(tick) {
        const l = { ativo: false, tick };
        lacos.add(l);
        return {
          iniciar() {
            l.ativo = true;
            acordar();
          },
          parar() {
            l.ativo = false;
          },
        };
      },
    };

    // ---- controles do topo
    const botaoTocar = raiz.querySelector<HTMLButtonElement>('[data-acao="tocar"]')!;
    const marcarTocar = () => {
      botaoTocar.innerHTML = icone(pausado ? "tocar" : "pausar");
      botaoTocar.setAttribute("aria-label", pausado ? "Tocar" : "Pausar");
      botaoTocar.title = pausado ? "Tocar" : "Pausar";
    };
    ouvir(botaoTocar, "click", () => {
      pausado = !pausado;
      marcarTocar();
      if (pausado) controle?.pausar();
      else {
        controle?.tocar();
        acordar();
      }
    });
    ouvir(raiz.querySelector('[data-acao="reiniciar"]')!, "click", () => {
      pausado = false;
      marcarTocar();
      controle?.reiniciar();
      acordar();
    });
    ouvir(raiz.querySelector('[data-acao="tela"]')!, "click", () => {
      if (document.fullscreenElement === this) document.exitFullscreen();
      else this.requestFullscreen?.().catch(() => {});
    });
    if (!document.fullscreenEnabled) raiz.querySelector<HTMLElement>('[data-acao="tela"]')!.hidden = true;

    const controle: Controle = def.controlador(arte, d.modelo, api);
    this.#controle = controle;
    if (!reduzido.matches) controle.tocar();
    aplicar();
    if (this.getAttribute("modo") === "passos") definirModo("passos");
  }
}

/** Registra o `<visant-anatomia>` (uma vez só, mesmo chamado várias vezes). */
export function definirAnatomia(tag = "visant-anatomia") {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) customElements.define(tag, VisantAnatomia);
}
