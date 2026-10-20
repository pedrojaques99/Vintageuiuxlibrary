/**
 * Movimento da Fig 2.6 · O fichário de receitas.
 *
 * A pose em qualquer instante sai de `poseEm(plano, t)`, função pura do tempo
 * pra cada pedido: o leitor passa nas etiquetas, a que casa acende e só aquela
 * receita sobe. A pasta references/ é a única coisa fora da linha do tempo: ela
 * sobe por mola quando a pessoa pede.
 *
 * A receita que casou vira a peça 4 (e a pasta dela a 5) trocando o
 * `data-peca` do grupo de fora; as outras ficam como peça 6. O núcleo lê o
 * `data-peca` a cada foco, então o realce acompanha.
 */
import type { AnatomiaApi, Controle } from "./anatomia-tipos";

interface Receita {
  nome: string;
  etiqueta: number;
  corpo: number;
  refs: number;
  refsLinhas: number;
}
interface Modelo {
  RECEITAS: Receita[];
  PEDIDOS: { texto: string; casa: string | null }[];
  X: number[];
  TAB_Y: number[];
  TAB: { d: number; h: number };
  DIV: { top: number };
  BAR_Z: number;
  HEAD_PARK: number;
  POST_Y: number;
  BEAM_Z: number;
  RISE: number;
  REF_RISE: number;
  CARD_X: number[];
  CARD_TOP: number[];
  REF: { dx: number; y: number; d: number; top: number };
  BOX: { x: number; w: number };
}
interface Estado {
  head: number;
  raio: number;
  tab: number;
  rise: number[];
  slip: number;
  say: string;
}
interface Plano {
  segs: { t0: number; t1: number; apply: (u: number, st: Estado) => void }[];
  fim: number;
  total: number;
  m: number;
  marcas: Record<string, number>;
}
interface Pose {
  pedido: number;
  marca: string;
  refs?: boolean;
}

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const fmt = (n: number) => n.toLocaleString("pt-BR");

export default function controlador(raiz: ParentNode, bruto: Record<string, unknown>, api: AnatomiaApi): Controle {
  const M = bruto as unknown as Modelo;
  const { translateAlong, iso } = api.kit;
  const svg = raiz.querySelector("svg")!;
  const head = svg.querySelector('[data-part="head"]')!;
  const slip = svg.querySelector('[data-part="slip"]')!;
  const raio = svg.querySelector<SVGPathElement>('[data-part="raio"]')!;
  const tabs = [...svg.querySelectorAll("[data-tab]")].map((el) => el.querySelector(".iso-solid")!);
  const cardEls = [...svg.querySelectorAll<SVGGElement>("[data-card]")];
  const refsEls = new Map([...svg.querySelectorAll<SVGGElement>("[data-refs]")].map((el) => [Number(el.dataset.refs), el]));
  const N = M.RECEITAS.length;
  const casaDe = (p: number) => M.RECEITAS.findIndex((r) => r.nome === M.PEDIDOS[p].casa);

  const inicial = (): Estado => ({ head: M.HEAD_PARK, raio: -1, tab: -1, rise: new Array(N).fill(0), slip: 0, say: "pronto pra ler" });

  function planejar(p: number): Plano {
    const segs: Plano["segs"] = [];
    const marcas: Record<string, number> = {};
    let t = 0;
    const add = (dur: number, apply: Plano["segs"][number]["apply"]) => (segs.push({ t0: t, t1: t + dur, apply }), (t += dur));
    const pedido = M.PEDIDOS[p];
    const m = casaDe(p);
    add(0.9, (u, st) => {
      st.slip = u < 0.5 ? -22 * ease(u * 2) : -22 * (1 - ease((u - 0.5) * 2));
      st.say = `pedido: "${pedido.texto}"`;
    });
    marcas.pedido = t;
    t += 0.3;
    let from = M.HEAD_PARK;
    let lidas = 0;
    // o leitor sai do fundo da caixa e volta: lê da última divisória pra primeira
    [...M.RECEITAS.keys()].reverse().forEach((i, lida) => {
      const a = from;
      add(0.4, (u, st) => void (st.head = lerp(a, M.X[i], ease(u))));
      lidas += M.RECEITAS[i].etiqueta;
      const soma = lidas;
      if (lida === Math.floor(N / 2)) marcas.lendo = t + 0.2;
      add(0.35, (u, st) => {
        st.head = M.X[i];
        st.raio = u < 1 ? i : -1;
        st.say = `lendo a etiqueta ${lida + 1} de ${N}, ${fmt(soma)} letras`;
      });
      from = M.X[i];
    });
    if (m >= 0) {
      const a = from;
      add(0.5, (u, st) => void (st.head = lerp(a, M.X[m], ease(u))));
      add(0.6, (u, st) => {
        st.head = M.X[m];
        st.raio = u < 1 ? m : -1;
        st.tab = m;
        st.say = `casou: ${M.RECEITAS[m].nome}`;
      });
      add(0.7, (u, st) => void (st.head = lerp(M.X[m], M.HEAD_PARK, ease(u))));
      add(1.1, (u, st) => {
        st.rise[m] = M.RISE * ease(u);
        st.say = `abriu ${M.RECEITAS[m].nome}, ${M.RECEITAS[m].corpo} linhas`;
      });
    } else {
      const a = from;
      add(0.7, (u, st) => {
        st.head = lerp(a, M.HEAD_PARK, ease(u));
        st.say = `${N} etiquetas lidas, nenhuma casou`;
      });
    }
    marcas.fim = t;
    return { segs, fim: t, total: t + 5, m, marcas };
  }

  function poseEm(p: Plano, t: number): Estado {
    const st = inicial();
    for (const seg of p.segs) if (t >= seg.t0) seg.apply(clamp01((t - seg.t0) / (seg.t1 - seg.t0)), st);
    return st;
  }

  let pedido = 0;
  let plano = planejar(pedido);
  let relogio = 0;
  let alvo: number | null = null;
  let refsAlvo = 0;
  let refsVal = 0;
  let passeio = true;
  let pausado = false;

  function desenhar(st: Estado) {
    const m = plano.m;
    head.setAttribute("transform", translateAlong(api.P, [st.head, 0, 0]));
    slip.setAttribute("transform", translateAlong(api.P, [0, 0, st.slip]));
    tabs.forEach((el, i) => el.toggleAttribute("data-lit", st.tab === i));
    cardEls.forEach((el, i) => {
      (el.parentNode as SVGGElement).dataset.peca = i === m ? "4" : "6";
      el.setAttribute("transform", translateAlong(api.P, [0, 0, st.rise[i]]));
      el.querySelector(".iso-solid")!.toggleAttribute("data-lit", st.rise[i] > 0.5);
    });
    const subida = m >= 0 ? st.rise[m] / M.RISE : 0;
    refsEls.forEach((el, i) => {
      (el.parentNode as SVGGElement).dataset.peca = i === m ? "5" : "6";
      el.setAttribute("transform", translateAlong(api.P, [0, 0, i === m ? M.REF_RISE * refsVal * subida : 0]));
    });
    if (st.raio >= 0) {
      const i = st.raio;
      const y = M.TAB_Y[i] + M.TAB.d / 2;
      const [ax, ay] = iso([M.X[i] + 0.7, y, M.BAR_Z], api.P);
      const [bx, by] = iso([M.X[i] + 0.7, y, M.DIV.top + M.TAB.h], api.P);
      raio.setAttribute("d", `M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}`);
      raio.style.opacity = "1";
    } else if (raio.getAttribute("d")) {
      raio.setAttribute("d", "");
      raio.style.opacity = "0";
    }
    api.moverPino(2, [st.head, M.POST_Y, M.BEAM_Z + 14]);
    if (m >= 0) {
      api.moverPino(4, [M.X[m] + M.CARD_X[0], 0, M.CARD_TOP[0] + st.rise[m] + 6]);
      api.moverPino(5, [M.X[m] + M.REF.dx, M.REF.y + M.REF.d / 2, M.REF.top + M.REF_RISE * refsVal * subida + 6]);
    } else {
      api.moverPino(4, [M.BOX.x + M.BOX.w / 2, 0, M.CARD_TOP[0] + 8]);
    }
    // 4 e 5 só aparecem no palco quando existem de fato; o painel explica os dois sempre
    api.mostrarPino(4, !(subida < 0.35));
    api.mostrarPino(5, !(subida < 0.35 || m < 0 || !M.RECEITAS[m].refs || refsVal < 0.35));
    let say = st.say;
    if (m >= 0 && refsVal > 0.5 && M.RECEITAS[m].refs) say = `${M.RECEITAS[m].nome} + references/, ${fmt(M.RECEITAS[m].corpo + M.RECEITAS[m].refsLinhas)} linhas`;
    api.dizer(say);
  }

  const laco = api.loop((dt) => {
    refsVal += (refsAlvo - refsVal) * (1 - Math.exp(-dt / 0.25));
    if (Math.abs(refsAlvo - refsVal) < 0.002) refsVal = refsAlvo;
    if (alvo !== null) {
      relogio = Math.min(alvo, relogio + dt);
      desenhar(poseEm(plano, relogio));
      return relogio < alvo || refsVal !== refsAlvo;
    }
    relogio += dt;
    if (relogio > plano.total) {
      if (refsAlvo || !passeio) relogio = plano.fim;
      else trocar((pedido + 1) % M.PEDIDOS.length);
    }
    desenhar(poseEm(plano, relogio));
    return passeio || relogio < plano.fim || refsVal !== refsAlvo;
  });

  /** Desenha já (movimento reduzido ou pausa) ou deixa o laço levar. */
  function mostrar(t: number) {
    if (api.reduzido() || pausado) {
      refsVal = refsAlvo;
      relogio = t;
      desenhar(poseEm(plano, t));
    } else laco.iniciar();
  }

  function trocar(p: number) {
    pedido = p;
    plano = planejar(pedido);
    refsAlvo = 0;
    refsVal = 0;
    relogio = 0;
    alvo = null;
    desenhar(poseEm(plano, api.reduzido() ? plano.fim : 0));
  }

  function alternarRefs() {
    const m = plano.m;
    if (m < 0 || !M.RECEITAS[m].refs) return;
    refsAlvo = refsAlvo ? 0 : 1;
    if (relogio < plano.fim) relogio = plano.fim;
    alvo = null;
    mostrar(plano.fim);
  }

  const temRefs = () => plano.m >= 0 && Boolean(M.RECEITAS[plano.m].refs);
  const rotuloRefs = () => {
    const m = plano.m;
    if (m < 0) return "Nenhuma receita aberta agora";
    if (!M.RECEITAS[m].refs) return "Essa receita não tem references/";
    return refsAlvo ? "Guardar a pasta references/" : "Abrir a pasta references/";
  };

  desenhar(poseEm(plano, api.reduzido() ? plano.fim : 0));

  return {
    acoes: {
      1: {
        rotulo: () => `Trocar o pedido (agora: "${M.PEDIDOS[pedido].texto}")`,
        rodar: () => {
          trocar((pedido + 1) % M.PEDIDOS.length);
          mostrar(plano.fim);
        },
      },
      4: { rotulo: rotuloRefs, rodar: alternarRefs, ativa: temRefs },
      5: { rotulo: rotuloRefs, rodar: alternarRefs, ativa: temRefs },
    },
    irParaPasso(i) {
      const poses: Pose[] = [
        { pedido: 0, marca: "pedido" },
        { pedido: 0, marca: "lendo" },
        { pedido: 0, marca: "fim" },
        { pedido: 0, marca: "fim", refs: true },
        { pedido: 2, marca: "fim" },
      ];
      const pose = poses[i] ?? poses[0];
      passeio = false;
      const novo = pose.pedido !== pedido;
      if (novo) trocar(pose.pedido);
      refsAlvo = pose.refs ? 1 : 0;
      const t = plano.marcas[pose.marca] ?? plano.fim;
      // pedido novo no passo a passo: mostra só o fim da leitura, não a volta inteira
      if (novo) relogio = Math.max(0, t - 3);
      else if (t < relogio) relogio = Math.max(0, t - 1.2);
      alvo = t;
      mostrar(t);
    },
    tocar() {
      pausado = false;
      passeio = true;
      alvo = null;
      laco.iniciar();
    },
    pausar() {
      pausado = true;
      laco.parar();
    },
    reiniciar() {
      pausado = false;
      passeio = true;
      trocar(0);
      laco.iniciar();
    },
    destruir() {
      laco.parar();
    },
  };
}
