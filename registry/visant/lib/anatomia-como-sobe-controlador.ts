/**
 * Movimento da Fig 1.4 · Como a ferramenta sobe.
 *
 * A pose em qualquer instante é função pura do tempo (`poseEm(plano, t)`): o
 * laço só anda o relógio. Assim o passo a passo é "ir até o instante X e
 * parar", a pausa é não andar o relógio e o movimento reduzido é desenhar o
 * fim direto.
 */
import type { AnatomiaApi, Controle, Ponto3 } from "./anatomia-tipos";

interface Modelo {
  ARQUIVOS: string[];
  IGNORADOS: string[];
  SRC_AT: [number, number];
  SRC_TOP: number;
  PITCH: number;
  HOME: number;
  GATE: number;
  END: number;
  CAR_TOP: number;
  BIN_AT: [number, number];
  BIN_FLOOR: number;
  GH_AT: [number, number];
  TRAY_FLOOR: number;
  LIFT: number;
  STROKE: number;
}

type Slot = "src" | "rail" | "bin" | "gh" | "sky";
interface Estado {
  car: number;
  ext: number;
  lamp: "off" | "amber" | "green" | "red";
  say: string;
  cards: Record<string, { p: Ponto3; slot: Slot }>;
}
interface Plano {
  segs: { t0: number; t1: number; apply: (u: number, st: Estado) => void }[];
  fim: number;
  total: number;
  marcas: Record<string, number>;
}

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
function along(points: Ponto3[], u: number): Ponto3 {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1], p[2] - points[i][2]));
  let left = u * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] ? clamp01(left / lengths[i]) : 1;
      return points[i].map((v, j) => lerp(v, points[i + 1][j], f)) as Ponto3;
    }
    left -= lengths[i];
  }
  return points[points.length - 1];
}

export default function controlador(raiz: ParentNode, bruto: Record<string, unknown>, api: AnatomiaApi): Controle {
  const M = bruto as unknown as Modelo;
  const { translateAlong, holdStill, axisVector } = api.kit;
  const svg = raiz.querySelector("svg")!;
  const palco = svg.parentElement!;
  const carriage = svg.querySelector('[data-part="carriage"]')!;
  const pusher = svg.querySelector('[data-part="pusher"]')!;
  const lamp = svg.querySelector<SVGGElement>('[data-part="lamp"]')!;
  const slots = Object.fromEntries([...svg.querySelectorAll<SVGGElement>("[data-slot]")].map((el) => [el.dataset.slot, el])) as Record<Slot, SVGGElement>;
  const cartas = Object.fromEntries([...svg.querySelectorAll<SVGGElement>("[data-carta]")].map((el) => [el.dataset.carta, el]));
  const N = M.ARQUIVOS.length;
  const Y = axisVector(api.P, [0, 1, 0]);
  const stackAt = (i: number): Ponto3 => [M.SRC_AT[0], M.SRC_AT[1], M.SRC_TOP + (N - 1 - i) * M.PITCH];

  function inicial(): Estado {
    const st: Estado = { car: M.HOME, ext: 0, lamp: "off", say: `${N} arquivos na pasta`, cards: {} };
    M.ARQUIVOS.forEach((name, i) => (st.cards[name] = { p: stackAt(i), slot: "src" }));
    return st;
  }

  function planejar(on: boolean): Plano {
    const segs: Plano["segs"] = [];
    const marcas: Record<string, number> = { inicio: 0 };
    let t = 1.2;
    let binN = 0;
    let ghN = 0;
    const add = (dur: number, apply: Plano["segs"][number]["apply"], at = t) => (segs.push({ t0: at, t1: at + dur, apply }), at + dur);
    M.ARQUIVOS.forEach((name, i) => {
      const secret = M.IGNORADOS.includes(name);
      const barred = on && secret;
      const from = stackAt(i);
      const pick: Ponto3[] = [from, [from[0], from[1], 24], [M.HOME, 0, 24], [M.HOME, 0, M.CAR_TOP]];
      t = add(1.1, (u, st) => {
        st.cards[name] = { p: along(pick, ease(u)), slot: u < 1 ? "sky" : "rail" };
        st.say = `levando ${name}`;
      });
      t = add(1.0, (u, st) => {
        st.car = lerp(M.HOME, M.GATE, ease(u));
        st.cards[name] = { p: [st.car, 0, M.CAR_TOP], slot: "rail" };
      });
      if (barred) {
        const top = M.STROKE - 4;
        marcas.barrando ??= t + 0.75;
        t = add(0.8, (u, st) => {
          st.ext = M.STROKE * ease(u);
          st.cards[name] = { p: [M.GATE, Math.max(0, st.ext - 4), M.CAR_TOP], slot: "rail" };
          st.say = `${name} barrado pelo .gitignore`;
        });
        const n = binN++;
        const start = t;
        add(0.55, (u, st) => {
          st.cards[name] = { p: [M.GATE, lerp(top, M.BIN_AT[1], ease(u)), lerp(M.CAR_TOP, M.BIN_FLOOR + n * M.PITCH, u * u)], slot: "bin" };
          st.say = `${name} fica no teu computador`;
        }, start);
        add(0.7, (u, st) => void (st.ext = M.STROKE * (1 - ease(u))), start);
        add(1.0, (u, st) => void (st.car = lerp(M.GATE, M.HOME, ease(u))), start);
        t = start + 1.0;
      } else {
        t = add(0.8, (u, st) => {
          st.car = lerp(M.GATE, M.END, ease(u));
          st.cards[name] = { p: [st.car, 0, M.CAR_TOP], slot: "rail" };
          if (secret) st.say = `${name} subindo junto`;
        });
        const n = ghN++;
        const start = t;
        marcas.subindo ??= start + 0.7;
        const lift: Ponto3[] = [[M.END, 0, M.CAR_TOP], [M.END, 0, M.LIFT], [M.GH_AT[0], M.GH_AT[1], M.LIFT], [M.GH_AT[0], M.GH_AT[1], M.TRAY_FLOOR + n * M.PITCH]];
        t = add(1.3, (u, st) => {
          const p = along(lift, ease(u));
          st.cards[name] = { p, slot: p[0] > M.END + 0.5 ? "gh" : "rail" };
          if (u >= 1) {
            st.say = `${name} no GitHub`;
            st.lamp = "amber";
          }
        });
        add(1.1, (u, st) => void (st.car = lerp(M.END, M.HOME, ease(u))), start);
        t = Math.max(t, start + 1.1);
      }
    });
    t = add(1.4, (_u, st) => {
      st.lamp = "amber";
      st.say = "a Vercel está publicando";
    });
    t = add(0.01, (_u, st) => {
      st.lamp = on ? "green" : "red";
      st.say = on ? `${N - binN} de ${N} no GitHub, .env ficou em casa, no ar` : `${N} de ${N} no GitHub, a chave ficou à mostra`;
    });
    marcas.fim = t + 0.05;
    return { segs, fim: t, total: t + 4.5, marcas };
  }

  function poseEm(p: Plano, t: number): Estado {
    const st = inicial();
    for (const seg of p.segs) if (t >= seg.t0) seg.apply(clamp01((t - seg.t0) / (seg.t1 - seg.t0)), st);
    return st;
  }

  function reempilhar() {
    M.ARQUIVOS.map((name, i) => [name, i] as const)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name]) => slots.src.appendChild(cartas[name]));
  }

  function desenhar(st: Estado) {
    carriage.setAttribute("transform", translateAlong(api.P, [st.car, 0, 0]));
    pusher.setAttribute("transform", translateAlong(api.P, [0, st.ext, 0]));
    holdStill(pusher, [Y[0] * st.ext, Y[1] * st.ext]);
    for (const name of M.ARQUIVOS) {
      const { p, slot } = st.cards[name];
      const el = cartas[name];
      if (el.parentNode !== slots[slot]) slots[slot].appendChild(el);
      el.firstElementChild!.setAttribute("transform", translateAlong(api.P, p));
    }
    api.moverPino(4, [st.car, 0, M.CAR_TOP + 10]);
    const env = M.IGNORADOS[0] && st.cards[M.IGNORADOS[0]];
    if (env) api.moverPino(3, [env.p[0], env.p[1], env.p[2] + 8]);
    if (lamp.dataset.state !== st.lamp) lamp.dataset.state = st.lamp;
    api.dizer(st.say);
  }

  let on = true;
  let plano = planejar(on);
  let relogio = 0;
  /** Instante onde o relógio para (passo a passo). Sem alvo, ele roda em volta. */
  let alvo: number | null = null;

  const laco = api.loop((dt) => {
    if (alvo !== null) {
      relogio = Math.min(alvo, relogio + dt);
      desenhar(poseEm(plano, relogio));
      return relogio < alvo;
    }
    relogio += dt;
    if (relogio > plano.total) {
      relogio = 0;
      reempilhar();
    }
    desenhar(poseEm(plano, relogio));
    return true;
  });

  function ir(t: number, { tocar = true } = {}) {
    if (api.reduzido()) {
      reempilhar();
      relogio = t;
      desenhar(poseEm(plano, t));
      return;
    }
    if (t < relogio) {
      reempilhar();
      relogio = Math.max(0, t - 1.6);
    }
    alvo = t;
    if (tocar) laco.iniciar();
  }

  function definirIgnore(valor: boolean) {
    if (valor === on) return;
    on = valor;
    palco.dataset.ignore = on ? "on" : "off";
    plano = planejar(on);
    relogio = 0;
    reempilhar();
  }

  palco.dataset.ignore = "on";
  reempilhar();
  desenhar(poseEm(plano, api.reduzido() ? plano.fim : 0));

  return {
    acoes: {
      5: {
        rotulo: () => (on ? "Tirar o .gitignore" : "Pôr o .gitignore de volta"),
        rodar: () => {
          definirIgnore(!on);
          alvo = null;
          desenhar(poseEm(plano, api.reduzido() ? plano.fim : 0));
          laco.iniciar();
        },
      },
      4: {
        rotulo: () => "Mandar de novo",
        rodar: () => {
          relogio = 0;
          alvo = null;
          reempilhar();
          laco.iniciar();
        },
      },
    },
    irParaPasso(i) {
      const poses = ["inicio", "subindo", "barrando", "fim", "sem-gitignore"];
      const pose = poses[i] ?? "inicio";
      if (pose === "sem-gitignore") {
        definirIgnore(false);
        ir(plano.marcas.fim);
        return;
      }
      definirIgnore(true);
      ir(plano.marcas[pose] ?? 0);
    },
    tocar() {
      alvo = null;
      laco.iniciar();
    },
    pausar() {
      laco.parar();
    },
    reiniciar() {
      definirIgnore(true);
      relogio = 0;
      alvo = null;
      reempilhar();
      desenhar(poseEm(plano, 0));
      laco.iniciar();
    },
    destruir() {
      laco.parar();
    },
  };
}
