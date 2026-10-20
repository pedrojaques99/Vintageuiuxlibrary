/**
 * Movimento da Fig 2.2 · Conector e chave de API.
 *
 * Estado com alvo e mola: quais plugues estão na tomada, onde está a chave e
 * quantas chamadas contaram. O laço só aproxima o desenho do alvo. Com
 * movimento reduzido o alvo vale na hora.
 *
 * Clicar num aparelho pluga ou despluga aquele programa; o botão do painel faz o
 * mesmo com o último programa que o mouse visitou (começa no GitHub, que vem
 * desplugado). Sem ninguém mexendo, a figura passeia sozinha pelo que ela sabe
 * fazer; o passo a passo desliga o passeio.
 */
import type { AnatomiaApi, Controle, Ponto3 } from "./anatomia-tipos";

interface Modelo {
  PROGRAMAS: string[];
  LIGADOS: boolean[];
  VOLTA: number;
  SX: number[];
  DIAL: [number, number];
  DIAL_R: number;
  DIAL_TOP: number;
  CARD_ON: Ponto3;
  CARD_OFF: Ponto3;
  BLOCK_Y: number;
  PLUG_IN: Ponto3[];
  PLUG_OUT: Ponto3[];
}

interface Pose {
  plugged?: boolean[];
  cardOn?: boolean;
  calls?: number;
  pedido?: boolean;
}

const PASSO = 2.6;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
function along(points: Ponto3[], u: number): Ponto3 {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1], p[2] - points[i][2]));
  let left = u * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] ? Math.min(1, Math.max(0, left / lengths[i])) : 1;
      return points[i].map((v, j) => lerp(v, points[i + 1][j], f)) as Ponto3;
    }
    left -= lengths[i];
  }
  return points[points.length - 1];
}
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default function controlador(raiz: ParentNode, bruto: Record<string, unknown>, api: AnatomiaApi): Controle {
  const M = bruto as unknown as Modelo;
  const { translateAlong, wireSvg, iso, lineOnTop } = api.kit;
  const svg = raiz.querySelector("svg")!;
  const plugs = [...svg.querySelectorAll<SVGGElement>("[data-plug]")];
  const cabos = [...svg.querySelectorAll<SVGGElement>("[data-cabo]")];
  const leds = [...svg.querySelectorAll<SVGGElement>("[data-led]")];
  const blocos = [...svg.querySelectorAll<SVGGElement>("[data-prog]")];
  const cardEl = svg.querySelector<SVGGElement>("[data-card]")!;
  const needle = svg.querySelector<SVGPathElement>('[data-part="needle"]')!;
  const serviceWire = svg.querySelector<SVGGElement>('[data-part="service-wire"]')!;
  const readerLed = svg.querySelector<SVGGElement>('[data-part="reader-led"]')!;
  const N = M.PROGRAMAS.length;

  const st = {
    plugged: [...M.LIGADOS],
    cardOn: false,
    calls: 0,
    pedidos: 0,
    plugU: M.LIGADOS.map((on) => (on ? 1 : 0)),
    cardU: 0,
    needleV: 0,
    fluxoAte: 0,
    fluxoChave: false,
    aviso: null as null | { texto: string; ate: number },
  };
  let agora = 0;
  let passeio = true;
  let passeioPasso = 0;
  let pausaAte = 0;
  let alvoProg = 4;
  let pausado = false;

  const ligados = () => st.plugged.filter(Boolean).length;
  const resumo = () =>
    `${plural(ligados(), "conector ligado", "conectores ligados")} · chave ${st.cardOn ? "no leitor" : "no .env"} · ${plural(st.calls, "chamada contada", "chamadas contadas")}`;
  const avisar = (texto: string, segundos = 2.4) => (st.aviso = { texto, ate: agora + segundos });

  function plugPos(i: number): Ponto3 {
    const into = M.PLUG_IN[i];
    const out = M.PLUG_OUT[i];
    return along([out, [into[0], out[1], into[2]], into], ease(st.plugU[i]));
  }
  function cardPos(): Ponto3 {
    const off = M.CARD_OFF;
    const on = M.CARD_ON;
    return along([off, [off[0], off[1], 50], [on[0], on[1], 50], on], ease(st.cardU));
  }
  function needleD(count: number) {
    const angle = (count / M.VOLTA) * Math.PI * 2;
    const [x, y] = M.DIAL;
    const r = M.DIAL_R - 3;
    return lineOnTop([x - Math.sin(angle) * 2.4, y + Math.cos(angle) * 2.4], [x + Math.sin(angle) * r, y - Math.cos(angle) * r], M.DIAL_TOP + 0.2, api.P);
  }

  function desenhar() {
    const fluindo = agora < st.fluxoAte;
    plugs.forEach((el, i) => {
      const p = plugPos(i);
      el.setAttribute("transform", translateAlong(api.P, p));
      const preso = st.plugged[i] && st.plugU[i] > 0.98;
      const de: Ponto3 = [p[0], p[1] + 9, p[2]];
      const chao: Ponto3 = [p[0], p[1] + 14, 0.6];
      const ate: Ponto3 = [p[0], M.BLOCK_Y, 4];
      cabos[i].innerHTML = wireSvg(iso(de, api.P), iso(ate, api.P), { via: [iso(chao, api.P)], tone: preso ? "mid" : "lo", flow: fluindo && preso });
      const led = preso ? "on" : "off";
      if (leds[i].dataset.state !== led) leds[i].dataset.state = led;
      if (blocos[i].dataset.ligado !== led) blocos[i].dataset.ligado = led;
    });
    const c = cardPos();
    cardEl.setAttribute("transform", translateAlong(api.P, c));
    api.moverPino(5, [c[0], c[1], c[2] + 8]);
    const lida = st.cardOn && st.cardU > 0.98 ? "on" : "off";
    if (readerLed.dataset.state !== lida) readerLed.dataset.state = lida;
    if (serviceWire.dataset.ligado !== lida) serviceWire.dataset.ligado = lida;
    serviceWire.querySelector(".iso-line")?.toggleAttribute("data-flow", fluindo && st.fluxoChave);
    needle.setAttribute("d", needleD(st.needleV));
    api.dizer(st.aviso && agora < st.aviso.ate ? st.aviso.texto : resumo());
  }

  function assentar() {
    st.plugU = st.plugged.map((on) => (on ? 1 : 0));
    st.cardU = st.cardOn ? 1 : 0;
    st.needleV = st.calls;
  }

  function pedido() {
    st.pedidos++;
    const n = ligados();
    if (!n && !st.cardOn) {
      avisar("sem cabo nenhum: ele só enxerga a pasta");
      return;
    }
    if (st.cardOn) st.calls++;
    st.fluxoAte = agora + 1.8;
    st.fluxoChave = st.cardOn;
    const partes = [n ? plural(n, "conector", "conectores") : null, st.cardOn ? "a chave (+1 chamada)" : null].filter(Boolean);
    avisar(`pedido ${st.pedidos}: foi por ${partes.join(" e ")}`);
  }
  function setPlug(i: number, on: boolean) {
    st.plugged[i] = on;
    avisar(`${M.PROGRAMAS[i]}: ${on ? "plugado, com a tua conta" : "desplugado"}`);
  }
  function setCard(on: boolean) {
    st.cardOn = on;
    avisar(on ? "chave no leitor: cada chamada conta" : "chave de volta no .env");
  }

  const PASSEIO = [() => pedido(), () => setCard(true), () => pedido(), () => pedido(), () => setCard(false), () => setPlug(4, true), () => pedido(), () => setPlug(4, false)];

  const segurar = () => {
    pausaAte = agora + 10;
    passeioPasso = Math.floor(pausaAte / PASSO);
  };

  /** Depois de qualquer mudança: com movimento reduzido assenta e desenha já; senão a mola leva até lá. */
  function mudou() {
    if (api.reduzido() || pausado) {
      assentar();
      st.fluxoAte = 0;
      desenhar();
    } else laco.iniciar();
  }

  const laco = api.loop((dt) => {
    agora += dt;
    if (passeio && agora >= pausaAte && Math.floor(agora / PASSO) > passeioPasso) {
      passeioPasso = Math.floor(agora / PASSO);
      PASSEIO[passeioPasso % PASSEIO.length]();
    }
    const kk = 1 - Math.exp(-dt / 0.3);
    for (let i = 0; i < N; i++) st.plugU[i] += ((st.plugged[i] ? 1 : 0) - st.plugU[i]) * kk;
    st.cardU += ((st.cardOn ? 1 : 0) - st.cardU) * (1 - Math.exp(-dt / 0.45));
    st.needleV += (st.calls - st.needleV) * kk;
    desenhar();
    const parado =
      st.plugU.every((u, i) => Math.abs(u - (st.plugged[i] ? 1 : 0)) < 0.002) &&
      Math.abs(st.cardU - (st.cardOn ? 1 : 0)) < 0.002 &&
      Math.abs(st.needleV - st.calls) < 0.002 &&
      agora >= st.fluxoAte &&
      (!st.aviso || agora >= st.aviso.ate);
    return passeio || !parado;
  });

  // aparelho e plugue respondem direto: o clique pluga ou despluga aquele programa
  const programaDo = (alvo: EventTarget | null) => {
    const el = (alvo as Element | null)?.closest?.("[data-prog], [data-plug]") as SVGGElement | null;
    return el ? Number(el.dataset.prog ?? el.dataset.plug) : null;
  };
  const aoMover = (e: Event) => {
    const i = programaDo(e.target);
    if (i === null || i === alvoProg) return;
    alvoProg = i;
    avisar(`${M.PROGRAMAS[i]}: ${st.plugged[i] ? "ligado" : "desligado"}`, 1.2);
    if (api.reduzido() || pausado) desenhar();
    else laco.iniciar();
  };
  const aoClicar = (e: Event) => {
    segurar();
    const i = programaDo(e.target);
    if (i === null) return;
    alvoProg = i;
    setPlug(i, !st.plugged[i]);
    mudou();
  };
  svg.addEventListener("pointermove", aoMover);
  svg.addEventListener("click", aoClicar);

  const acaoPlugue = {
    rotulo: () => `${st.plugged[alvoProg] ? "Desplugar" : "Plugar"} o ${M.PROGRAMAS[alvoProg]}`,
    rodar: () => {
      segurar();
      setPlug(alvoProg, !st.plugged[alvoProg]);
      mudou();
    },
  };
  const acaoChave = {
    rotulo: () => (st.cardOn ? "Guardar a chave no .env" : "Encostar a chave no leitor"),
    rodar: () => {
      segurar();
      setCard(!st.cardOn);
      mudou();
    },
  };

  desenhar();

  return {
    acoes: {
      1: {
        rotulo: () => "Fazer um pedido",
        rodar: () => {
          segurar();
          pedido();
          mudou();
        },
      },
      3: acaoPlugue,
      4: acaoPlugue,
      5: acaoChave,
      6: acaoChave,
    },
    irParaPasso(i) {
      const passos = [
        { plugged: [false, false, false, false, false, false], cardOn: false, calls: 0 },
        { plugged: [true, true, true, true, false, false], cardOn: false, calls: 0, pedido: true },
        { plugged: [true, true, true, true, true, false], cardOn: false, calls: 0, pedido: true },
        { plugged: [true, true, true, true, false, false], cardOn: false, calls: 0 },
        { plugged: [true, true, true, true, false, false], cardOn: true, calls: 2, pedido: true },
      ] satisfies Pose[];
      const pose: Pose = passos[i] ?? passos[0];
      passeio = false;
      st.aviso = null;
      if (pose.plugged) st.plugged = [...pose.plugged];
      if (pose.cardOn !== undefined) st.cardOn = pose.cardOn;
      if (pose.calls !== undefined) st.calls = pose.calls;
      if (pose.pedido) pedido();
      mudou();
    },
    tocar() {
      pausado = false;
      passeio = true;
      pausaAte = agora;
      laco.iniciar();
    },
    pausar() {
      pausado = true;
      laco.parar();
    },
    reiniciar() {
      st.plugged = [...M.LIGADOS];
      st.cardOn = false;
      st.calls = 0;
      st.pedidos = 0;
      st.aviso = null;
      st.fluxoAte = 0;
      passeio = true;
      pausado = false;
      pausaAte = agora;
      assentar();
      desenhar();
      laco.iniciar();
    },
    destruir() {
      laco.parar();
      svg.removeEventListener("pointermove", aoMover);
      svg.removeEventListener("click", aoClicar);
    },
  };
}
