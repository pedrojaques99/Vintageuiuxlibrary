// Movimento da Fig B.8. Contrato: Vintageuiuxlibrary-anatomia/anatomia/CONTRATO.md
// Um plano de trechos; a pose em qualquer instante é função pura do tempo.
import type { AnatomiaApi, Ponto3 } from "./anatomia-tipos";

export default function controlador(raiz: ParentNode, bruto: Record<string, unknown>, api: AnatomiaApi) {
  // O modelo vem do JSON da geometria; o formato está em anatomia/figuras/script/geometria.mjs.
  const M = bruto as any;
  const { translateAlong, holdStill, axisVector } = api.kit;
  const P = api.P;
  const Z = axisVector(P, [0, 0, 1]);
  const svg = raiz.querySelector("svg")!;
  const slots = Object.fromEntries([...svg.querySelectorAll<SVGGraphicsElement>("[data-slot]")].map((el: any) => [el.dataset.slot, el]));
  const loteItem = svg.querySelector<SVGGraphicsElement>('[data-item="lote"]')!;
  const loteEl = loteItem.querySelector<SVGGraphicsElement>('[data-part="lote"]')!;
  const gavetaEl = svg.querySelector<SVGGraphicsElement>('[data-part="gaveta"]')!;
  const cabecaEl = svg.querySelector<SVGGraphicsElement>('[data-part="cabeca"]')!;
  const gabaritoEl = svg.querySelector<SVGGraphicsElement>('[data-part="gabarito"]')!;
  const lampEl = svg.querySelector<SVGGraphicsElement>('[data-part="lamp"]')!;
  const fichasEl = [...svg.querySelectorAll<SVGGraphicsElement>('[data-ficha^="a-"]')];
  const saidasEl = M.BINS.map((_: any, b: any) => [...svg.querySelectorAll<SVGGraphicsElement>(`[data-saida^="${b}-"]`)]);

  const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
  const c01 = (u: number) => Math.min(1, Math.max(0, u));
  const s = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  function along(pts: number[][], u: number): Ponto3 {
    const len = pts.slice(1).map((p: any, i: any) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]));
    let resto = u * len.reduce((a: any, b: any) => a + b, 0);
    for (let i = 0; i < len.length; i++) {
      if (resto <= len[i] || i === len.length - 1) return pts[i].map((v: any, j: any) => lerp(v, pts[i + 1][j], len[i] ? c01(resto / len[i]) : 1)) as Ponto3;
      resto -= len[i];
    }
    return pts[pts.length - 1] as Ponto3;
  }

  const inicial = () => ({
    lote: { p: [...M.ENTRADA_AT], op: 0, slot: "entrada" }, gaveta: 0, cabeca: 0, gabarito: 0, lamp: "off",
    fichas: 0, saidas: 0, lotes: 0, agente: 0, script: 0, pronto: false, parado: false, onde: null, say: "esperando o briefing",
  });
  const copia = (st: any) => ({ ...st, lote: { ...st.lote, p: [...st.lote.p] } });
  const resumo = (st: any) => `${s(st.lotes, "lote", "lotes")}, agente ${st.agente} (${s(st.fichas, "ficha", "fichas")}), script ${st.script} (0 ficha)`;

  function novoPlano(base: any): any {
    return { base: copia(base), segs: [], fim: 0, marcas: {} };
  }
  function add(pl: any, dur: any, aplicar: any, em: any = pl.fim) {
    pl.segs.push({ t0: em, t1: em + dur, aplicar });
    pl.fim = Math.max(pl.fim, em + dur);
    return em + dur;
  }
  const pausa = (pl: any, t: any) => add(pl, t, () => {});

  function chegar(pl: any) {
    add(pl, 0.7, (u: any, st: any) => {
      st.lote = { p: [M.ENTRADA_AT[0], M.ENTRADA_AT[1], M.ENTRADA_AT[2] + 10 * (1 - ease(u))], op: c01(u * 2), slot: "entrada" };
      st.lamp = st.parado ? st.lamp : "off";
      st.say = "chegou o lote do cliente";
    });
  }

  function voar(pl: any, destino: any, slotFinal: any) {
    const de = [...M.ENTRADA_AT];
    const pts = [de, [de[0], de[1], M.LIFT], [destino[0], destino[1], M.LIFT], destino];
    add(pl, 1.3, (u: any, st: any) => {
      const p = along(pts, ease(u));
      st.lote = { p, op: 1, slot: u < 0.97 ? "alto" : slotFinal };
      st.say = slotFinal === "bancada" ? "o lote vai pra bancada do agente" : "o lote vai pro carimbo";
    });
  }

  function agente(pl: any) {
    voar(pl, M.AGENTE_AT, "bancada");
    add(pl, 1.6, (u: any, st: any) => {
      st.onde = "agente";
      st.gaveta = Math.sin(Math.PI * c01(u * 1.2));
      if (u > 0.55 && st.fichasMarcadas !== st.lotes) {
        st.fichas = Math.min(st.fichas + 1, 99);
        st.fichasMarcadas = st.lotes;
      }
      st.say = "o agente lê o briefing e pega ImageMagick e PyMuPDF, 1 ficha";
    });
  }

  function carimbar(pl: any, ate: any = 1) {
    voar(pl, M.PRENSA_AT, "prensa");
    add(pl, ate < 1 ? 0.5 : 0.9, (u: any, st: any) => {
      st.onde = "script";
      st.cabeca = ate < 1 ? ease(u) * ate : Math.sin(Math.PI * u);
      st.lamp = ate < 1 ? (u > 0.6 ? "red" : "off") : u > 0.3 && u < 0.8 ? "green" : "off";
      st.say = ate < 1 ? `parou e perguntou: o que eu faço com ${M.ESTRANHO}?` : "o carimbo resolve sozinho, 0 ficha";
      if (ate < 1) st.parado = true;
    });
  }

  function entregar(pl: any) {
    const de = [...M.PRENSA_AT];
    const meio = [(M.BINS[0][0] + M.BINS[3][0]) / 2, (M.BINS[0][1] + M.BINS[3][1]) / 2, M.BIN_H];
    add(pl, 1.0, (u: any, st: any) => {
      const origem = st.onde === "agente" ? M.AGENTE_AT : de;
      const e = ease(u);
      const p = along([origem, [origem[0], origem[1], M.LIFT], [meio[0], meio[1], M.LIFT], [meio[0], meio[1], M.LIFT - 10]], e);
      st.lote = { p, op: 1 - c01((u - 0.75) / 0.25), slot: "alto" };
      if (u >= 1 && st.entregue !== st.lotes + 1) {
        st.entregue = st.lotes + 1;
        st.lotes += 1;
        st.saidas = Math.min(st.saidas + 1, M.SAIDA_MAX);
        if (st.onde === "agente") st.agente += 1;
        else st.script += 1;
        st.say = resumo(st);
        st.lote = { p: [...M.ENTRADA_AT], op: 0, slot: "entrada" };
      }
    });
  }

  function virar(pl: any) {
    add(pl, 0.9, (u: any, st: any) => {
      st.gabarito = ease(u);
      st.pronto = true;
      st.say = "virou script: o carimbo está pronto pro próximo lote";
    });
  }

  function resolver(pl: any) {
    add(pl, 0.6, (u: any, st: any) => {
      st.cabeca = lerp(0.5, 1, ease(c01(u * 2))) * (u < 0.5 ? 1 : 1 - ease((u - 0.5) * 2));
      st.lamp = u < 0.3 ? "red" : "green";
      st.parado = false;
      st.say = "você respondeu, ele renomeou e seguiu";
    });
    entregar(pl);
  }

  function passeio() {
    const pl = novoPlano(inicial());
    pausa(pl, 0.5);
    chegar(pl);
    pl.marcas.p1 = pl.fim + 0.2;
    pausa(pl, 0.6);
    agente(pl);
    pl.marcas.p2 = pl.fim - 0.8;
    entregar(pl);
    pl.marcas.p3 = pl.fim;
    pausa(pl, 0.8);
    virar(pl);
    pl.marcas.p4 = pl.fim;
    pausa(pl, 0.6);
    chegar(pl);
    carimbar(pl);
    entregar(pl);
    pl.marcas.p5 = pl.fim;
    pausa(pl, 0.3);
    chegar(pl);
    carimbar(pl);
    entregar(pl);
    pausa(pl, 0.3);
    chegar(pl);
    carimbar(pl, 0.5);
    pl.marcas.p6 = pl.fim;
    pausa(pl, 3.5);
    return pl;
  }

  function poseAt(pl: any, t: any) {
    const st = copia(pl.base);
    for (const sg of pl.segs) if (t >= sg.t0) sg.aplicar(c01((t - sg.t0) / (sg.t1 - sg.t0)), st);
    return st;
  }

  function desenhar(st: any) {
    const slot = slots[st.lote.slot];
    if (loteItem.parentNode !== slot) slot.appendChild(loteItem);
    loteEl.setAttribute("transform", translateAlong(P, st.lote.p));
    loteEl.style.opacity = String(st.lote.op);
    gavetaEl.setAttribute("transform", translateAlong(P, [0, 9 * st.gaveta, 0]));
    const desce = -M.DESCE * st.cabeca;
    cabecaEl.setAttribute("transform", translateAlong(P, [0, 0, desce]));
    holdStill(cabecaEl, [Z[0] * desce, Z[1] * desce]);
    gabaritoEl.style.opacity = String(st.gabarito);
    if (lampEl.dataset.state !== st.lamp) lampEl.dataset.state = st.lamp;
    fichasEl.forEach((el: any, i: any) => (el.style.opacity = i < Math.min(st.fichas, M.FICHAS_MAX) ? "1" : "0"));
    saidasEl.forEach((lista: any) => lista.forEach((el: any, i: any) => (el.style.opacity = i < st.saidas ? "1" : "0")));
    if (st.lote.op > 0.05) api.moverPino(1, [st.lote.p[0], st.lote.p[1], st.lote.p[2] + 14]);
    else api.moverPino(1, [M.ENTRADA_AT[0], M.ENTRADA_AT[1], M.ENTRADA_AT[2] + 14]);
    api.dizer(st.say);
  }

  // ---- relógio
  let plano = passeio();
  let relogio = 0;
  let passeando = true;
  let tocando = true;
  const loop = api.loop((dt: any) => {
    relogio += dt;
    if (relogio > plano.fim) {
      if (passeando) {
        plano = passeio();
        relogio = 0;
      } else {
        desenhar(poseAt(plano, plano.fim));
        return false;
      }
    }
    desenhar(poseAt(plano, relogio));
    return true;
  });

  // base de uma ação: fora do passeio, onde a última parou; no passeio, o carimbo parado
  // (dá pra responder), ou uma sessão limpa
  function agora() {
    if (!passeando) return poseAt(plano, plano.fim);
    const st = poseAt(plano, Math.min(relogio, plano.fim));
    return st.parado ? st : inicial();
  }
  function agir(montar: any) {
    const base = agora();
    passeando = false;
    plano = novoPlano(base);
    relogio = 0;
    montar(plano, base);
    if (api.reduzido()) relogio = plano.fim;
    desenhar(poseAt(plano, relogio));
    if (tocando) loop.iniciar();
  }
  // Clique durante um movimento não é ignorado: a ação parte do fim do trecho atual (agora()).

  const acoes = {
    1: {
      rotulo: () => (agora().parado ? "Responda o carimbo primeiro" : agora().pronto ? "Chegou outro lote (vai pro carimbo)" : "Chegou outro lote (vai pro agente)"),
      rodar: () => {
        if (agora().parado) return;
        agir((pl: any, st: any) => {
          chegar(pl);
          if (st.pronto) carimbar(pl);
          else agente(pl);
          entregar(pl);
        });
      },
    },
    2: {
      rotulo: () => (agora().parado ? "Responda o carimbo primeiro" : "Mandar um lote pro agente"),
      rodar: () => {
        if (agora().parado) return;
        agir((pl: any) => {
          chegar(pl);
          agente(pl);
          entregar(pl);
        });
      },
    },
    4: {
      rotulo: () => (agora().parado ? "Responda o carimbo primeiro" : agora().pronto ? "Rodar o script num lote" : "Virar script"),
      rodar: () => {
        if (agora().parado) return;
        agir((pl: any, st: any) => {
          if (!st.pronto) return virar(pl);
          chegar(pl);
          carimbar(pl);
          entregar(pl);
        });
      },
    },
    6: {
      rotulo: () => (agora().parado ? "Responder e seguir" : agora().pronto ? "Mandar um nome fora do padrão" : "Primeiro vire o script (no 4)"),
      rodar: () => {
        const st = agora();
        if (st.parado) return agir((pl: any) => resolver(pl));
        if (!st.pronto) return;
        agir((pl: any) => {
          chegar(pl);
          carimbar(pl, 0.5);
        });
      },
    },
  };

  function irParaPasso(i: any) {
    const p = passeio();
    passeando = false;
    plano = novoPlano(poseAt(p, p.marcas[`p${i + 1}`]));
    relogio = 0;
    loop.parar();
    desenhar(poseAt(plano, 0));
  }

  function reiniciar() {
    passeando = true;
    plano = passeio();
    relogio = api.reduzido() ? plano.marcas.p6 : 0;
    desenhar(poseAt(plano, relogio));
    if (tocando && !api.reduzido()) loop.iniciar();
  }

  if (api.reduzido()) {
    relogio = plano.marcas.p6;
    desenhar(poseAt(plano, relogio));
  } else {
    desenhar(poseAt(plano, 0));
    loop.iniciar();
  }

  return {
    acoes,
    irParaPasso,
    tocar() {
      tocando = true;
      loop.iniciar();
    },
    pausar() {
      tocando = false;
      loop.parar();
    },
    reiniciar,
    destruir() {
      loop.parar();
    },
    congelar(t: number) {
      loop.parar();
      passeando = true;
      plano = passeio();
      relogio = t;
      desenhar(poseAt(plano, t));
    },
    get duracao() {
      return plano.fim;
    },
  };
}
