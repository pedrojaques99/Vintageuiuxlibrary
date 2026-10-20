// Movimento da Fig 2.7. Contrato: anatomia/CONTRATO.md. A pose é função pura do tempo (poseAt).
import type { AnatomiaApi, Ponto3 } from "./anatomia-tipos";

export default function controlador(raiz: ParentNode, bruto: Record<string, unknown>, api: AnatomiaApi) {
  // O modelo vem do JSON da geometria; o formato está em anatomia/figuras/memoria/geometria.mjs.
  const M = bruto as any;
  const { translateAlong } = api.kit;
  const q = (sel: string) => raiz.querySelector<SVGGraphicsElement>(sel) as SVGGraphicsElement;
  const el = {
    agente: q('[data-part="agente"]'),
    leitura: q('[data-part="leitura"]'),
    folha1: q('[data-part="folha-1"]'),
    folha2: q('[data-part="folha-2"]'),
    fato1: q('[data-part="fato-1"]'),
    fato1b: q('[data-part="fato-1b"]'),
    fato2: q('[data-part="fato-2"]'),
  };
  const slots: Record<string, SVGGraphicsElement> = { bloco: q('[data-slot="bloco"]'), ceu: q('[data-slot="ceu"]') };
  const camada = (part: any) => part.parentNode; // o <g data-peca> de fora é o que troca de slot

  const TOTAL = 24;
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

  const NO_BLOCO = [M.SHEET_AT[0], M.SHEET_AT[1], M.PAD_TOP];
  const ALTO = [M.SHEET_AT[0], M.SHEET_AT[1], 62];
  const ALVO = M.ALVO_FOLHA;

  function poseAt(t: any) {
    const p = { agenteX: M.AT_DESK, agenteOp: 1, leitura: 0, f1: { p: NO_BLOCO, op: 1 }, f2: { p: NO_BLOCO, op: 0 }, fato1: { dz: 0, op: 1 }, fato1b: { dz: 4, op: 0 }, fato2: { dz: 4, op: 0 }, say: "na conversa: 1 folha no bloco" };

    // guardar no arquivo (1,5 a 4,5): a folha sobe, vai até o quadro e vira cartão
    const g = fase(t, 1.5, 4.5);
    if (t >= 1.5) {
      p.f1 = { p: along([NO_BLOCO, ALTO, ALVO], ease(g)), op: g < 0.6 ? 1 : 1 - (g - 0.6) / 0.4 };
      const c = fase(t, 3.6, 4.5);
      p.fato2 = { dz: 4 * (1 - ease(c)), op: c };
      p.say = g < 1 ? "guardando no arquivo: a gráfica pede 3 mm de sangria" : "guardado no CLAUDE.md, com data";
    }
    // na conversa (5 a 6): uma folha nova, que ninguém mandou guardar
    if (t >= 5) {
      const u = fase(t, 5, 6);
      p.f2 = { p: [NO_BLOCO[0], NO_BLOCO[1], NO_BLOCO[2] + 12 * (1 - ease(u))], op: u };
      p.say = "só na conversa: pode usar Manrope";
    }
    // fechou a janela (7 a 8): o bloco vai pro lixo
    if (t >= 7) {
      const u = fase(t, 7, 8);
      p.f2 = { p: [NO_BLOCO[0], NO_BLOCO[1], NO_BLOCO[2] + 16 * ease(u)], op: 1 - u };
      p.say = "janela fechada: o bloco foi pro lixo";
    }
    // o agente sai pela porta (8 a 10,2) e some
    if (t >= 8) {
      const u = fase(t, 8, 10.6);
      p.agenteX = lerp(M.AT_DESK, M.AT_DOOR, ease(u));
      p.agenteOp = t < 10 ? 1 : 1 - fase(t, 10, 10.6);
    }
    if (t >= 10.6) p.say = "conversa nova: ele chega sem saber nada";
    // volta pela porta (11,4 a 11,9) e vai direto pro quadro (11,9 a 14)
    if (t >= 11.4) {
      p.agenteOp = fase(t, 11.4, 11.9);
      p.agenteX = lerp(M.AT_DOOR, M.AT_BOARD, ease(fase(t, 11.9, 14)));
      if (t >= 11.9) p.say = "antes de responder, ele vai ao quadro";
    }
    // lê o quadro (14 a 15,6)
    if (t >= 14) {
      const fatos = 2;
      p.leitura = t < 15.6 ? Math.min(fase(t, 14, 14.25), 1 - fase(t, 15.35, 15.6)) : 0;
      p.say = `lendo o CLAUDE.md: ${M.REGRAS} regras e ${fatos} fatos`;
    }
    // volta pra mesa (15,6 a 17)
    if (t >= 15.6) {
      p.agenteX = lerp(M.AT_BOARD, M.AT_DESK, ease(fase(t, 15.6, 17)));
      p.say = "lembrou o que está no quadro. O Manrope, que ficou só no chat, ele não sabe";
    }
    // a dona mudou de ideia (17,6 a 19,6): o fato velho sai, o novo entra
    if (t >= 17.6) {
      const a = fase(t, 17.6, 18.6);
      const b = fase(t, 18.6, 19.6);
      p.fato1 = { dz: 6 * ease(a), op: 1 - a };
      p.fato1b = { dz: 4 * (1 - ease(b)), op: b };
      p.say = b < 1 ? "a dona mudou de ideia: o fato velho sai do quadro" : "fato novo: marrom escuro aprovado, 20/10";
    }
    return p;
  }

  function colocar(part: any, slot: any) {
    const g = camada(part);
    if (g.parentNode !== slots[slot]) slots[slot].appendChild(g);
  }

  function draw(p: any) {
    el.agente.setAttribute("transform", translateAlong(api.P, [p.agenteX, M.TRACK_Y, 0]));
    el.agente.style.opacity = String(p.agenteOp);
    el.leitura.style.opacity = String(p.leitura);
    for (const [part, f] of [[el.folha1, p.f1], [el.folha2, p.f2]]) {
      colocar(part, f.p[2] > M.PAD_TOP + 2 ? "ceu" : "bloco");
      part.setAttribute("transform", translateAlong(api.P, f.p));
      part.style.opacity = String(Math.max(0, f.op));
    }
    for (const [part, f] of [[el.fato1, p.fato1], [el.fato1b, p.fato1b], [el.fato2, p.fato2]]) {
      part.setAttribute("transform", translateAlong(api.P, [0, 0, f.dz]));
      part.style.opacity = String(f.op);
    }
    // o agente sai pela porta e some: o pino some junto, e volta quando ele volta
    api.moverPino(1, p.agenteOp > 0.05 ? [p.agenteX, M.TRACK_Y, 48] : null);
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
  function tocarDe(t: any) {
    irPara(t);
    tocando = !api.reduzido();
    if (tocando) loop.iniciar();
    else irPara(t + 3);
  }

  colocar(el.folha1, "bloco");
  colocar(el.folha2, "bloco");
  irPara(api.reduzido() ? M.POSES[M.POSES.length - 1] : 0);
  if (tocando) loop.iniciar();

  return {
    acoes: {
      1: { rotulo: () => "Fechar e abrir a janela", rodar: () => tocarDe(7) },
      2: { rotulo: () => "Guardar no arquivo", rodar: () => tocarDe(1.5) },
      4: { rotulo: () => "A cliente mudou de ideia", rodar: () => tocarDe(17.6) },
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
      tocarDe(0);
    },
    destruir() {
      tocando = false;
      loop.parar();
    },
  };
}
