// Movimento da Fig B.7. Contrato: anatomia/CONTRATO.md. A pose é função pura do tempo (poseAt).
import type { AnatomiaApi, Controle, Ponto3 } from "./anatomia-tipos";

export default function controlador(raiz: ParentNode, bruto: Record<string, unknown>, api: AnatomiaApi) {
  // O modelo vem do JSON da geometria; o formato está em anatomia/figuras/tokens/geometria.mjs.
  const M = bruto as any;
  const { translateAlong, lineOnTop } = api.kit;
  const q = (sel: string) => raiz.querySelector<SVGGraphicsElement>(sel) as SVGGraphicsElement;
  const nivel = q('[data-part="nivel"]');
  const boia = q('[data-part="boia"]');
  const ponteiro = q('[data-part="ponteiro"]');
  const luz = q('[data-part="luz-agente"]');
  const itens: Record<string, SVGGraphicsElement> = {
    m1: q('[data-part="maco-1"]'),
    m2: q('[data-part="maco-2"]'),
    m3: q('[data-part="maco-3"]'),
    pr: q('[data-part="print"]'),
  };
  const slots: Record<string, SVGGraphicsElement> = { banca: q('[data-slot="banca"]'), ceu: q('[data-slot="ceu"]') };

  const ALTURA = M.WIN_Z1 - M.WIN_Z0;
  const TOTAL = 23.5;
  const VOLTA = 3.2;
  const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
  const fase = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  function along(pts: number[][], u: number): Ponto3 {
    const len = pts.slice(1).map((p: any, i: any) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]));
    let left = u * len.reduce((a: any, b: any) => a + b, 0);
    for (let i = 0; i < len.length; i++) {
      if (left <= len[i] || i === len.length - 1) {
        const f = len[i] ? Math.min(1, left / len[i]) : 1;
        return pts[i].map((v: any, j: any) => lerp(v, pts[i + 1][j], f)) as Ponto3;
      }
      left -= len[i];
    }
    return pts[pts.length - 1] as Ponto3;
  }

  const pilha = (i: any) => [M.PILHA_AT[0], M.PILHA_AT[1], M.BANCA_H + (2 - i) * 2 * M.FOLHA_H]; // maço 1 em cima
  const NO_PRINT = [M.PRINT_AT[0], M.PRINT_AT[1], M.BANCA_H];
  const BOCA = [M.FUNIL_AT[0], M.FUNIL_AT[1], M.FUNIL_Z + 16];
  const caminho = (de: any) => [de, [de[0], de[1], 122], [BOCA[0], BOCA[1], 122], BOCA];

  const FALAS = [
    `volta 1: o parágrafo, ${M.PALAVRAS} palavras`,
    'volta 2: "não, o cinza pequeno"',
    'volta 3: "o da terceira foto"',
  ];
  const INICIO_PARAGRAFO = [1.5, 1.5 + VOLTA, 1.5 + 2 * VOLTA];
  const INICIO_PRINT = 14.2;

  function poseAt(t: any) {
    const p: any = {
      itens: { m1: { p: pilha(0), op: 1 }, m2: { p: pilha(1), op: 1 }, m3: { p: pilha(2), op: 1 }, pr: { p: NO_PRINT, op: 1 } },
      nivel: M.BASE_CAMADA,
      lido: M.BASE_CAMADA,
      luz: 0.25,
      say: "conversa nova: só o CLAUDE.md no tanque",
    };
    const volta = (t0: any, chave: any, de: any, entra: any, fala: any, respostaFala: any) => {
      if (t < t0) return;
      const u = fase(t, t0, t0 + 1.2);
      p.itens[chave] = { p: along(caminho(de), ease(u)), op: u < 0.82 ? 1 : 1 - (u - 0.82) / 0.18 };
      p.nivel += entra * ease(fase(t, t0 + 1.2, t0 + 1.7));
      p.say = fala;
      if (t >= t0 + 1.7) {
        const r = fase(t, t0 + 1.7, t0 + 2.4);
        p.nivel += M.CAMADA.resp * ease(r);
        p.luz = t < t0 + 2.4 ? 1 : 0.25;
        p.say = respostaFala;
      }
      if (t >= t0 + 2.4) p.lido = lerp(p.lido, p.nivel, ease(fase(t, t0 + 2.4, t0 + 3)));
    };

    INICIO_PARAGRAFO.forEach((t0: any, i: any) => volta(t0, `m${i + 1}`, pilha(i), M.CAMADA.msg, FALAS[i], `volta ${i + 1}: ele responde, e o tanque guarda as duas`));
    if (t >= INICIO_PARAGRAFO[2] + VOLTA) p.say = "explicando: 3 voltas, e a terceira releu as duas primeiras";

    // conversa nova (12 a 13,6): esvazia até a faixa do CLAUDE.md
    const esvaziar = (t0: any, t1: any) => {
      if (t < t0) return;
      const u = ease(fase(t, t0, t1));
      p.nivel = lerp(p.nivel, M.BASE_CAMADA, u);
      p.lido = lerp(p.lido, M.BASE_CAMADA, u);
      p.say = "conversa nova: o tanque esvazia, só o CLAUDE.md volta";
    };
    esvaziar(12, 13.6);

    volta(INICIO_PRINT, "pr", NO_PRINT, M.CAMADA.print, `volta 1: um print de ${M.PRINT_PX[0]}×${M.PRINT_PX[1]}, ${M.PRINT_TOKENS} tokens`, "volta 1: ele responde, e resolveu de primeira");
    if (t >= INICIO_PRINT + VOLTA) p.say = `print: 1 volta só, ${M.PRINT_TOKENS} tokens de imagem`;

    esvaziar(21, 22.5);
    return p;
  }

  function ponteiroD(frac: any) {
    const ang = -Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, Math.max(0, frac));
    const [x, y] = M.DIAL;
    const r = M.DIAL_R - 3;
    return lineOnTop([x - Math.sin(ang) * 2.4, y + Math.cos(ang) * 2.4], [x + Math.sin(ang) * r, y - Math.cos(ang) * r], M.DIAL_TOP + 0.2, api.P);
  }

  function draw(p: any) {
    nivel.setAttribute("transform", translateAlong(api.P, [0, 0, M.WIN_Z0 + p.nivel - M.WIN_Z1]));
    boia.setAttribute("transform", translateAlong(api.P, [0, 0, p.nivel]));
    ponteiro.setAttribute("d", ponteiroD(p.lido / ALTURA));
    luz.style.opacity = String(p.luz);
    for (const [chave, item] of Object.entries(p.itens) as [string, any][]) {
      const part = itens[chave];
      const camada = part.parentNode as SVGGElement;
      const slot = item.p[2] > M.BANCA_H + 6 ? "ceu" : "banca";
      if (camada.parentNode !== slots[slot]) slots[slot].appendChild(camada);
      part.setAttribute("transform", translateAlong(api.P, item.p));
      part.style.opacity = String(Math.max(0, item.op));
    }
    // pino que perdeu a peça some: o print depois de despejado, os maços depois do último
    const naBanca = (it: any) => it.op > 0.05 && it.p[2] <= M.BANCA_H + 6;
    api.moverPino(5, naBanca(p.itens.pr) ? [M.PRINT_AT[0], M.PRINT_AT[1] + 10, M.BANCA_H + 8] : null);
    api.moverPino(4, ["m1", "m2", "m3"].some((c) => naBanca(p.itens[c])) ? [M.PILHA_AT[0], M.PILHA_AT[1] + 10, M.BANCA_H + 10] : null);
    api.dizer(p.say);
  }

  let clock = 0;
  let tocando = !api.reduzido();
  const loop = api.loop((dt: any) => {
    clock += dt;
    if (clock > TOTAL) clock = 0;
    draw(poseAt(clock));
    return tocando;
  });

  function irPara(t: any) {
    clock = t;
    draw(poseAt(t));
  }
  function tocarDe(t: any, fim: any) {
    irPara(t);
    tocando = !api.reduzido();
    if (tocando) loop.iniciar();
    else irPara(fim);
  }

  // ordem de pintura da pilha: o de baixo primeiro
  for (const chave of ["m3", "m2", "m1", "pr"]) slots.banca.appendChild(itens[chave].parentNode as Node);
  irPara(api.reduzido() ? 18 : 0);
  if (tocando) loop.iniciar();

  return {
    acoes: {
      4: { rotulo: () => "Explicar em parágrafo", rodar: () => tocarDe(1.5, 11.5) },
      5: { rotulo: () => "Mandar print", rodar: () => tocarDe(INICIO_PRINT - 0.4, 18) },
      7: { rotulo: () => "Conversa nova", rodar: () => tocarDe(12, 13.8) },
    },
    irParaPasso(i: number) {
      tocando = false;
      loop.parar();
      irPara(M.POSES[i]);
    },
    irPara,
    tocar() {
      tocando = !api.reduzido();
      if (tocando) loop.iniciar();
    },
    pausar() {
      tocando = false;
      loop.parar();
    },
    reiniciar() {
      tocarDe(0, 18);
    },
    destruir() {
      tocando = false;
      loop.parar();
    },
  };
}
