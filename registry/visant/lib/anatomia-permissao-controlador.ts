// Movimento da Fig 2.3b. Contrato: Vintageuiuxlibrary-anatomia/anatomia/CONTRATO.md
// Tudo sai de um plano de trechos; a pose em qualquer instante é função pura do tempo.
import type { AnatomiaApi, Controle, Ponto3 } from "./anatomia-tipos";

export default function controlador(raiz: ParentNode, bruto: Record<string, unknown>, api: AnatomiaApi) {
  // O modelo vem do JSON da geometria; o formato está em anatomia/figuras/permissao/geometria.mjs.
  const M = bruto as any;
  const { translateAlong, holdStill, axisVector } = api.kit;
  const Z = axisVector(api.P, [0, 0, 1]);
  const P = api.P;
  const svg = raiz.querySelector("svg")!;
  const slots = Object.fromEntries([...svg.querySelectorAll<SVGGraphicsElement>("[data-slot]")].map((el: any) => [el.dataset.slot, el]));
  const sledItem = svg.querySelector<SVGGraphicsElement>('[data-item="sled"]')!;
  const cardItem = svg.querySelector<SVGGraphicsElement>('[data-item="pedido"]')!;
  const sledEl = sledItem.querySelector<SVGGraphicsElement>('[data-part="sled"]')!;
  const cardEl = cardItem.querySelector<SVGGraphicsElement>('[data-part="pedido"]')!;
  const recadoEl = cardEl.querySelector<SVGGraphicsElement>('[data-part="recado"]')!;
  const portaEl = svg.querySelector<SVGGraphicsElement>('[data-part="porta"]')!;
  const lampEl = svg.querySelector<SVGGraphicsElement>('[data-part="lamp"]')!;
  const botoes = [0, 1, 2].map((i: any) => svg.querySelector<SVGGraphicsElement>(`[data-part="botao-${i}"]`)!);
  const regrasEl = [...svg.querySelectorAll<SVGGraphicsElement>("[data-regra]")];
  const pilhaEl = [...svg.querySelectorAll<SVGGraphicsElement>("[data-pilha]")];

  const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
  const c01 = (u: number) => Math.min(1, Math.max(0, u));

  const inicial = () => ({
    sledX: M.X_SAI, card: { p: [M.X_SAI, 0, 0], op: 0 }, recado: 0, porta: 0, botao: [0, 0, 0],
    lamp: "off", say: "esperando um pedido", pilha: 0, regras: [], proximo: 0, esperando: null,
  });
  const copia = (st: any) => ({ ...st, card: { p: [...st.card.p], op: st.card.op }, botao: [...st.botao], regras: [...st.regras] });
  const cmdDe = (i: any) => M.PEDIDOS[i].cmd;

  // ---- o plano: trechos com início, duração e o que aplicam no estado
  function novoPlano(base: any): any {
    return { base: copia(base), segs: [], fim: 0, marcas: {} };
  }
  function add(plano: any, dur: any, aplicar: any, em: any = plano.fim) {
    plano.segs.push({ t0: em, t1: em + dur, aplicar });
    plano.fim = Math.max(plano.fim, em + dur);
    return em + dur;
  }
  const pausa = (plano: any, s: any) => add(plano, s, () => {});

  function chegar(plano: any, i: any) {
    const nome = M.PEDIDOS[i].nome;
    add(plano, 1.1, (u: any, st: any) => {
      st.sledX = lerp(M.X_SAI, M.X_FILA, ease(u));
      st.card = { p: [st.sledX, 0, 0], op: c01(u * 4) };
      st.recado = 0;
      st.esperando = i;
      st.lamp = "amber";
      st.say = `${nome}: esperando você`;
      st.proximo = (i + 1) % M.PEDIDOS.length;
    });
  }

  function passar(plano: any, i: any, modo: any) {
    const nome = M.PEDIDOS[i].nome;
    const b = modo === "sim" ? 0 : modo === "sempre" ? 1 : -1;
    if (b >= 0) {
      add(plano, 0.35, (u: any, st: any) => {
        st.botao = [0, 0, 0];
        st.botao[b] = Math.sin(Math.PI * u);
        if (modo === "sempre" && u > 0.5 && !st.regras.includes(cmdDe(i))) st.regras = [...st.regras, cmdDe(i)].slice(-M.REGRAS_MAX);
      });
    }
    add(plano, 0.5, (u: any, st: any) => {
      st.porta = ease(u);
      st.lamp = "green";
      st.esperando = null;
      st.say = modo === "liberado" ? `${nome}: passou sem perguntar, a regra está no caderno` : modo === "sempre" ? `${nome}: passou e a regra ficou escrita` : `${nome}: passou só essa vez`;
    });
    const anda = plano.fim;
    add(plano, 0.9, (u: any, st: any) => {
      st.sledX = lerp(M.X_FILA, M.X_PASSOU, ease(u));
      st.card = { p: [st.sledX, 0, 0], op: 1 };
    }, anda);
    add(plano, 0.45, (u: any, st: any) => (st.porta = 1 - ease(u)), anda + 0.7);
    const sobe = anda + 0.9;
    add(plano, 0.8, (u: any, st: any) => {
      const alvo = [M.PASTA_AT[0], M.PASTA_AT[1], M.PASTA_H + Math.min(st.pilha, M.PILHA_MAX - 1) * M.PITCH - M.SLED_TOP];
      const e = ease(u);
      const z = e < 0.5 ? lerp(0, M.LIFT, e * 2) : lerp(M.LIFT, alvo[2], (e - 0.5) * 2);
      st.card = { p: [lerp(M.X_PASSOU, alvo[0], c01(e * 1.6 - 0.3)), 0, z], op: u < 1 ? 1 : 0 };
      if (u >= 1) st.pilha = Math.min(st.pilha + 1, M.PILHA_MAX);
    }, sobe);
    add(plano, 1.0, (u: any, st: any) => (st.sledX = lerp(M.X_PASSOU, M.X_SAI, ease(u))), sobe + 0.2);
  }

  function barrar(plano: any, i: any) {
    const nome = M.PEDIDOS[i].nome;
    add(plano, 0.35, (u: any, st: any) => {
      st.botao = [0, 0, Math.sin(Math.PI * u)];
      st.lamp = "red";
      st.esperando = null;
      st.say = `${nome}: barrado, volta com o teu recado`;
    });
    add(plano, 0.35, (u: any, st: any) => (st.recado = ease(u)));
    add(plano, 1.0, (u: any, st: any) => {
      st.sledX = lerp(M.X_FILA, M.X_SAI, ease(u));
      st.card = { p: [st.sledX, 0, 0], op: 1 - c01((u - 0.7) / 0.3) };
    });
  }

  function apagarRegras(plano: any) {
    add(plano, 0.4, (u: any, st: any) => {
      if (u >= 1) st.regras = [];
      st.say = "caderno limpo: tudo volta a perguntar";
    });
  }

  // ---- o passeio: os cinco passos em sequência
  function passeio() {
    const pl = novoPlano(inicial());
    pausa(pl, 0.6);
    chegar(pl, 0);
    pl.marcas.p1 = pl.fim + 0.4;
    pausa(pl, 1.4);
    passar(pl, 0, "sim");
    pl.marcas.p2 = pl.fim;
    pausa(pl, 0.6);
    chegar(pl, 1);
    pausa(pl, 1.2);
    passar(pl, 1, "sempre");
    pl.marcas.p3 = pl.fim;
    pausa(pl, 0.6);
    chegar(pl, 1);
    passar(pl, 1, "liberado");
    pl.marcas.p4 = pl.fim;
    pausa(pl, 0.6);
    chegar(pl, 2);
    pausa(pl, 1.2);
    barrar(pl, 2);
    pl.marcas.p5 = pl.fim;
    pausa(pl, 3.5);
    return pl;
  }

  function poseAt(plano: any, t: any) {
    const st = copia(plano.base);
    for (const s of plano.segs) if (t >= s.t0) s.aplicar(c01((t - s.t0) / (s.t1 - s.t0)), st);
    return st;
  }

  // ---- desenho
  function slotPara(x: any) {
    return x > M.PORTAO_X + 2 ? slots.dentro : slots.fila;
  }
  function desenhar(st: any) {
    const sSlot = slotPara(st.sledX);
    const cSlot = slotPara(st.card.p[0]);
    if (sledItem.parentNode !== sSlot || cardItem.parentNode !== cSlot) {
      sSlot.appendChild(sledItem);
      cSlot.appendChild(cardItem);
    }
    sledEl.setAttribute("transform", translateAlong(P, [st.sledX, 0, 0]));
    sledEl.style.opacity = String(c01((st.sledX - M.X_SAI) / 12));
    cardEl.setAttribute("transform", translateAlong(P, st.card.p));
    cardEl.style.opacity = String(Math.min(st.card.op, c01((st.card.p[0] - M.X_SAI) / 12)));
    recadoEl.style.opacity = String(st.recado);
    const desce = -M.PORTA_DESCE * st.porta;
    portaEl.setAttribute("transform", translateAlong(P, [0, 0, desce]));
    holdStill(portaEl, [Z[0] * desce, Z[1] * desce]);
    botoes.forEach((el: any, i: any) => el.setAttribute("transform", translateAlong(P, [0, 0, -1.6 * st.botao[i]])));
    if (lampEl.dataset.state !== st.lamp) lampEl.dataset.state = st.lamp;
    regrasEl.forEach((el: any, i: any) => (el.style.opacity = i < st.regras.length ? "1" : "0"));
    pilhaEl.forEach((el: any, i: any) => (el.style.opacity = i < st.pilha ? "1" : "0"));
    if (st.card.op > 0.05 && st.card.p[0] > M.X_SAI + 6) api.moverPino(2, [st.card.p[0], st.card.p[1], st.card.p[2] + M.SLED_TOP + 10]);
    else api.moverPino(2, M.MOUTH);
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

  // a base de uma ação: fora do passeio, onde a última parou; no passeio, o pedido que está
  // esperando no portão (dá pra responder ele), ou uma sessão limpa
  function agora() {
    if (!passeando) return poseAt(plano, plano.fim);
    const st = poseAt(plano, Math.min(relogio, plano.fim));
    if (st.esperando !== null && st.sledX === M.X_FILA) return { ...copia(st), botao: [0, 0, 0] };
    return inicial();
  }
  // uma ação começa do estado de agora (se ainda está mexendo, termina o trecho na hora)
  function agir(montar: any) {
    // quem interrompe o passeio começa uma sessão limpa; depois disso, cada ação parte de onde a outra parou
    const base = agora();
    passeando = false;
    plano = novoPlano(base);
    relogio = 0;
    montar(plano, base);
    if (api.reduzido()) relogio = plano.fim;
    desenhar(poseAt(plano, relogio));
    if (tocando) loop.iniciar();
  }

  const responder = (modo: any) => () =>
    agir((pl: any, st: any) => {
      if (st.esperando === null) return chegarComRegra(pl, st.proximo, st);
      if (modo === "nao") barrar(pl, st.esperando);
      else passar(pl, st.esperando, modo);
    });
  function chegarComRegra(pl: any, i: any, st: any) {
    chegar(pl, i);
    if (st.regras.includes(cmdDe(i))) passar(pl, i, "liberado");
  }
  const rotuloResposta = (texto: any) => () => (agora().esperando === null ? "Mandar um pedido primeiro" : texto);

  const acoes = {
    1: {
      rotulo: () => (agora().esperando === null ? `Mandar: ${M.PEDIDOS[agora().proximo].nome}` : "Responda o pedido que está no portão"),
      rodar: () => {
        if (agora().esperando !== null) return;
        agir((pl: any, st: any) => chegarComRegra(pl, st.proximo, st));
      },
    },
    3: { rotulo: rotuloResposta("Responder Yes"), rodar: responder("sim") },
    4: { rotulo: rotuloResposta("Responder Yes, and don't ask again"), rodar: responder("sempre") },
    5: { rotulo: rotuloResposta("Responder No"), rodar: responder("nao") },
    7: {
      rotulo: () => (agora().regras.length ? `Apagar as regras (${agora().regras.length})` : "O caderno está vazio"),
      rodar: () => {
        if (agora().regras.length) agir((pl: any) => apagarRegras(pl));
      },
    },
  };

  function irParaPasso(i: any) {
    const p = passeio();
    const marca = p.marcas[`p${i + 1}`];
    passeando = false;
    plano = novoPlano(poseAt(p, marca));
    relogio = 0;
    loop.parar();
    desenhar(poseAt(plano, 0));
  }

  function reiniciar() {
    passeando = true;
    plano = passeio();
    relogio = api.reduzido() ? plano.marcas.p5 : 0;
    desenhar(poseAt(plano, relogio));
    if (tocando && !api.reduzido()) loop.iniciar();
  }

  // estado de partida: com movimento reduzido, a pose final do passeio parada
  if (api.reduzido()) {
    relogio = plano.marcas.p5;
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
    // pra captura e teste: congela a pose do passeio no segundo t
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
