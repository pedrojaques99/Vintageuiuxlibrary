// Fig 2.2 · Conector e chave de API. Geometria (roda no Node, no build do registry).
// Contrato em anatomia/CONTRATO.md. O movimento mora em registry/visant/lib/anatomia-tomadas-controlador.ts.
export default function figura({ k, logo }) {
  // ---- o modelo: seis tomadas prontas no claude.ai; quatro ligadas na aula 2.2
  const PROGRAMAS = ["Figma", "Google Drive", "Linear", "Cloudflare", "GitHub", "Visant Labs"];
  const LOGOS = ["figma", "googledrive", "linear", "cloudflare", "github", "visant"];
  const LIGADOS = [true, true, true, true, false, false];
  const VOLTA = 20; // chamadas por volta do contador

  const WIDTH = 680;
  const HEIGHT = 440;

  const PLATE = { x: -98, y: -80, w: 238, d: 156, r: 8 };
  const PLATE_H = 12;
  const FOOT_H = 5;

  const AGENT = { x: -76, y: -58, w: 140, d: 40, r: 4 };
  const AGENT_H = 32;
  const FACE_Y = AGENT.y + AGENT.d; // -18
  const SOCKET_Z = 14;
  const PITCH = 22;
  const SX = PROGRAMAS.map((_, i) => -60 + i * PITCH);
  const PLATE_FRONT = FACE_Y + 1.2;
  const PLUG_IN = (x) => [x, PLATE_FRONT, SOCKET_Z];
  const PLUG_OUT = (x) => [x, PLATE_FRONT + 16, 5];

  const BLOCK_Y = 36;
  const BLOCK_W = 16;
  const BLOCK_D = 18;
  const BLOCK = (x) => ({ x: x - BLOCK_W / 2, y: BLOCK_Y, w: BLOCK_W, d: BLOCK_D, r: 2 });
  const BLOCK_H = 9;

  const DIAL = [-48, -38];
  const DIAL_R = 10;
  const DIAL_TOP = AGENT_H + 3;

  const READER = { x: 14, y: -54, w: 26, d: 24, r: 2 };
  const READER_TOP = AGENT_H + 2.5;
  const CARD_ON = [READER.x + READER.w / 2, READER.y + READER.d / 2, READER_TOP];

  const SAFE = { x: 92, y: 6, w: 32, d: 28, r: 2 };
  const SAFE_H = 12;
  const CARD_OFF = [SAFE.x + SAFE.w / 2, SAFE.y + 11, SAFE_H];
  const CARD = { x: -9, y: -6, w: 18, d: 12, r: 1 };

  const SERVICE = { x: 96, y: -72, w: 32, d: 28, r: 3 };
  const SERVICE_H = 20;

  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [AGENT.x, AGENT.y, AGENT_H + 4], [CARD_ON[0], CARD_ON[1], 52], [SERVICE.x + SERVICE.w, SERVICE.y, SERVICE_H]],
    WIDTH,
    HEIGHT,
    { pad: 24, azimuth: 36 },
  );

  const at = (point) => k.iso(point, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const peca = (n, markup, extra = "") => `<g data-peca="${n}"${extra}>${markup}</g>`;

  function plate() {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
      out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
    const corners = k.corners(PLATE, 10);
    out.push(L(corners.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(D(corners.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    return out.join("");
  }

  // o agente: uma central com as tomadas na frente e a marca do Claude no tampo
  function agent() {
    const out = [`<path class="iso-halo" d="${k.haloOf(AGENT, 0, AGENT_H, P)}"/>`];
    const seam = L(k.sideSeam(AGENT, 4, P, 6), { tone: "faint" });
    out.push(S(k.slabOf(AGENT, 0, AGENT_H, P, 6, 1.2), { tone: "mid", inner: seam }));
    out.push(L(k.planOutline(k.insetPlan(AGENT, 3), AGENT_H, P, 5), { tone: "faint" }));
    out.push(D(k.corners(AGENT, 6).map(([x, y]) => at([x, y, AGENT_H])), { size: 0.45 }));
    // grade de ventilação: frestas fechadas
    for (let i = 0; i < 5; i++) out.push(L(k.planOutline({ x: -26 + i * 5, y: -52, w: 2.4, d: 16, r: 1 }, AGENT_H, P, 2), { tone: "lo" }));
    out.push(logo("claude", [AGENT.x + AGENT.w - 12, AGENT.y + 24], 10, AGENT_H, P, { tom: "hi" }));
    return out.join("");
  }

  function dial() {
    const [x, y] = DIAL;
    const out = [];
    out.push(S(k.cylinder(x, y, DIAL_R + 1.6, AGENT_H, 1.2, P, 48), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, DIAL_R, AGENT_H + 1.2, DIAL_TOP - AGENT_H - 1.2, P, 56, 0.6), { tone: "hi", crease: "lo" }));
    out.push(L(k.ring(x, y, DIAL_R - 1.8, DIAL_TOP, P, 48), { tone: "lo" }));
    const ticks = k.radialTicks(x, y, DIAL_R - 2, VOLTA, 5, DIAL_TOP, [1.1, 2.3], P);
    out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
    out.push(L(k.ring(x, y, 1.2, DIAL_TOP, P, 12), { tone: "mid" }));
    return out.join("");
  }

  const needleAt = (count) => {
    const angle = (count / VOLTA) * Math.PI * 2;
    const [x, y] = DIAL;
    return k.lineOnTop([x - Math.sin(angle) * 2.4, y + Math.cos(angle) * 2.4], [x + Math.sin(angle) * (DIAL_R - 3), y - Math.cos(angle) * (DIAL_R - 3)], DIAL_TOP + 0.2, P);
  };

  function reader() {
    const out = [];
    out.push(S(k.slabOf(READER, AGENT_H, READER_TOP - AGENT_H, P, 4, 0.6), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(READER, 3), READER_TOP, P, 3), { tone: "lo" }));
    out.push(L(k.planOutline(k.insetPlan(READER, 6), READER_TOP, P, 3), { tone: "faint" }));
    out.push(D(k.corners(READER, 1.6).map(([x, y]) => at([x, y, READER_TOP])), { size: 0.4 }));
    out.push(`<g data-part="reader-led" data-state="off">${S(k.cylinder(READER.x + READER.w - 3, READER.y + READER.d + 2.4, 1.2, AGENT_H, 1, P, 16), { tone: "hi" })}</g>`);
    return out.join("");
  }

  // as tomadas: espelho, dois furos e a luz em cima
  function sockets() {
    const out = [];
    SX.forEach((x, i) => {
      const plate = { x: x - 6.5, y: FACE_Y, w: 13, d: 1.2, r: 0.6 };
      out.push(S(k.slabOf(plate, SOCKET_Z - 7.5, 15, P, 2, 0.3), { tone: "mid" }));
      out.push(L(k.sideRing([x - 2.4, PLATE_FRONT, SOCKET_Z], 1, "y", P, 14) + k.sideRing([x + 2.4, PLATE_FRONT, SOCKET_Z], 1, "y", P, 14), { tone: "lo" }));
      out.push(D([at([x, PLATE_FRONT, SOCKET_Z + 5.6]), at([x, PLATE_FRONT, SOCKET_Z - 5.6])], { size: 0.4 }));
      out.push(`<g data-led="${i}" data-state="${LIGADOS[i] ? "on" : "off"}">${S(k.cylinder(x, FACE_Y - 4, 1.4, AGENT_H, 1, P, 16), { tone: "hi" })}</g>`);
    });
    return out.join("");
  }

  // o plugue nasce na origem e anda até a tomada ou até o chão
  function plug(i) {
    const body = { x: -5, y: 0, w: 10, d: 6, r: 1.2 };
    const boot = { x: -2.4, y: 6, w: 4.8, d: 3, r: 1 };
    const out = [];
    out.push(S(k.slabOf(body, -5, 10, P, 3, 0.5), { tone: "hi", crease: "lo" }));
    out.push(L(k.sideSeam(body, 0, P, 3), { tone: "faint" }));
    out.push(S(k.slabOf(boot, -2.4, 4.8, P, 3, 0.3), { tone: "mid" }));
    return `<g data-plug="${i}">${out.join("")}</g>`;
  }

  // cada programa: um aparelho com a marca dele no tampo
  function block(i) {
    const x = SX[i];
    const plan = BLOCK(x);
    const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, BLOCK_H, P)}"/>`];
    out.push(S(k.slabOf(plan, 0, BLOCK_H, P, 4, 0.8), { tone: "mid" }));
    out.push(logo(LOGOS[i], [x, BLOCK_Y + 7.5], LOGOS[i] === "visant" ? 12.5 : 9, BLOCK_H, P, { tom: "hi" }));
    out.push(D([at([x - 5, BLOCK_Y + BLOCK_D - 2.6, BLOCK_H]), at([x + 5, BLOCK_Y + BLOCK_D - 2.6, BLOCK_H])], { size: 0.4 }));
    return `<g data-prog="${i}">${out.join("")}</g>`;
  }

  function safe() {
    const out = [`<path class="iso-halo" d="${k.haloOf(SAFE, 0, SAFE_H, P)}"/>`];
    out.push(S(k.slabOf(SAFE, 0, SAFE_H, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(SAFE, 8.5, P, 4), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(SAFE, 2.5), SAFE_H, P, 3), { tone: "faint" }));
    out.push(L(k.sideRing([SAFE.x + SAFE.w / 2, SAFE.y + SAFE.d, 4.4], 1.4, "y", P, 16), { tone: "lo" }));
    out.push(D([at([SAFE.x + SAFE.w / 2, SAFE.y + SAFE.d, 4.4])], { size: 0.4 }));
    out.push(k.faceTextSvg(k.topMatrix([SAFE.x + SAFE.w / 2, SAFE.y + SAFE.d - 3.4], SAFE_H, P, "x"), ".env", { size: 3, tone: "lo", anchor: "middle" }));
    return out.join("");
  }

  function service() {
    const out = [`<path class="iso-halo" d="${k.haloOf(SERVICE, 0, SERVICE_H, P)}"/>`];
    out.push(S(k.slabOf(SERVICE, 0, SERVICE_H, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(SERVICE, 5, P, 4), { tone: "faint" }) }));
    for (let i = 0; i < 4; i++) out.push(L(k.planOutline({ x: SERVICE.x + 5 + i * 5.6, y: SERVICE.y + 5, w: 2.4, d: 18, r: 1 }, SERVICE_H, P, 2), { tone: "lo" }));
    out.push(D(k.corners(SERVICE, 2.4).map(([x, y]) => at([x, y, SERVICE_H])), { size: 0.4 }));
    return out.join("");
  }

  const SERVICE_WIRE = k.wireSvg(at([READER.x + READER.w, READER.y + 5, READER_TOP - 1]), at([SERVICE.x, SERVICE.y + 18, 9]), {
    via: [at([AGENT.x + AGENT.w + 3, READER.y + 5, READER_TOP - 1]), at([AGENT.x + AGENT.w + 8, SERVICE.y + 18, 9])],
    tone: "mid",
  });

  function card() {
    const out = [];
    out.push(S(k.slabOf(CARD, 0, 1.2, P, 3, 0.4), { tone: "hi", lit: true }));
    out.push(L(k.planOutline({ x: -6.5, y: -3.6, w: 5, d: 4.4, r: 0.6 }, 1.2, P, 2), { tone: "lo" }));
    [[9, 2.2], [6, 4.2]].forEach(([len, y]) => out.push(L(k.lineOnTop([-6.5, y], [-6.5 + len, y], 1.2, P), { tone: "lo", free: true })));
    return `<g data-card>${out.join("")}</g>`;
  }

  const PECAS = [
    { n: 1, nome: "O agente.", texto: "É o Claude. Sozinho ele só enxerga a pasta onde você abriu ele. Cada cabo ligado é mais um programa que ele alcança.", ancora: [AGENT.x + AGENT.w, AGENT.y + 20, 22], acao: "Fazer um pedido" },
    { n: 2, nome: "As tomadas do claude.ai.", texto: "Já vêm prontas, uma pra cada programa. Não instala nada: é encaixar o cabo e entrar com a tua conta. A luz acende quando o login deu certo.", ancora: [SX[0] - 10, FACE_Y + 2, SOCKET_Z + 12] },
    { n: 3, nome: "Os programas.", texto: "Figma, Google Drive, Linear, Cloudflare, GitHub e Visant Labs. Cada um entra com a tua conta, não com a do agente. Clique num aparelho pra plugar ou desplugar.", ancora: [SX[5] + 12, BLOCK_Y + BLOCK_D, BLOCK_H + 6], acao: "Plugar ou desplugar" },
    { n: 4, nome: "O cabo do conector.", texto: "O login fica guardado no claude.ai. Você não copia senha nenhuma, e desliga quando quiser.", ancora: [SX[0], FACE_Y + 14, 4], acao: "Plugar ou desplugar" },
    { n: 5, nome: "A chave de API.", texto: "Um segredo em texto que você cola. Quem tem a chave usa a tua conta, então ela não vai no chat nem no GitHub.", ancora: [CARD_OFF[0], CARD_OFF[1], CARD_OFF[2] + 8], acao: "Encostar ou guardar a chave" },
    { n: 6, nome: "O cofre .env.", texto: "Onde a chave mora no teu computador. É o mesmo .env que o .gitignore segura na Fig 1.4.", ancora: [SAFE.x + SAFE.w, SAFE.y + SAFE.d, 6] },
    { n: 7, nome: "O leitor e o contador.", texto: "Com a chave no leitor, cada pedido que passa pelo serviço pago conta uma chamada. O ponteiro anda uma marca por chamada.", ancora: [DIAL[0] - 12, DIAL[1] - 4, DIAL_TOP + 6] },
    { n: 8, nome: "O serviço pago.", texto: "Um serviço que não tem tomada pronta. Ele entra pela chave e cobra por chamada, na conta de quem é dono da chave.", ancora: [SERVICE.x + SERVICE.w, SERVICE.y + SERVICE.d, SERVICE_H - 4] },
  ];

  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "Uma central de tomadas. A caixa grande é o agente, com seis tomadas na frente. Seis aparelhos com a marca de cada programa ficam na frente: os plugados acendem a luz da tomada. À direita, um cofre marcado .env guarda um cartão, a chave de API. Encostado no leitor em cima do agente, o cartão liga um cabo até o serviço pago, e um contador conta cada chamada.",
    body: [
      peca(0, plate()),
      peca(1, agent()),
      peca(7, dial()),
      `<g data-peca="7"><path data-part="needle" class="iso-line" data-tone="hi" data-free="start" d="${needleAt(0)}" style="stroke-width:1"/></g>`,
      peca(7, reader()),
      peca(2, sockets()),
      `<g data-peca="8"><g data-part="service-wire" data-ligado="off">${SERVICE_WIRE}</g></g>`,
      peca(8, service()),
      `<g data-peca="4"><g data-slot="cabos">${PROGRAMAS.map((_, i) => `<g data-cabo="${i}"></g>`).join("")}</g></g>`,
      `<g data-peca="4">${PROGRAMAS.map((_, i) => plug(i)).join("")}</g>`,
      `<g data-peca="3">${PROGRAMAS.map((_, i) => block(i)).join("")}</g>`,
      peca(6, safe()),
      `<g data-peca="5">${card()}</g>`,
    ],
  });

  return {
    id: "tomadas",
    fig: "Fig 2.2",
    titulo: "Conector e chave de API",
    resumo: "Uma central de tomadas: os programas entram pelo conector do claude.ai, com a tua conta e sem instalar nada. O serviço pago entra pela chave de API, que mora no .env e conta cada chamada.",
    width: WIDTH,
    height: HEIGHT,
    svg,
    P,
    modelo: {
      PROGRAMAS, LIGADOS, VOLTA, SX, DIAL, DIAL_R, DIAL_TOP, CARD_ON, CARD_OFF, BLOCK_Y,
      PLUG_IN: SX.map(PLUG_IN), PLUG_OUT: SX.map(PLUG_OUT),
    },
    pecas: PECAS,
    passos: [
      {
        titulo: "O agente sozinho",
        texto: "Sem cabo nenhum, o Claude só enxerga a pasta onde você abriu ele. Pedir pra ele mexer no Figma não dá em nada.",
        foco: [1, 2],
        pose: { plugged: [false, false, false, false, false, false], cardOn: false, calls: 0 },
      },
      {
        titulo: "Conector: encaixa e entra",
        texto: "No claude.ai cada programa já tem a tomada pronta. Você encaixa, entra com a tua conta e a luz acende. Nada pra instalar.",
        foco: [2, 3, 4],
        pose: { plugged: [true, true, true, true, false, false], cardOn: false, calls: 0, pedido: true },
      },
      {
        titulo: "Mais um programa",
        texto: "Plugou o GitHub, o agente passa a alcançar o GitHub também. Desplugou, ele para de ver. Quem manda é você.",
        foco: [3, 4],
        pose: { plugged: [true, true, true, true, true, false], cardOn: false, calls: 0, pedido: true },
      },
      {
        titulo: "A chave mora no .env",
        texto: "Serviço que não tem tomada pronta entra por uma chave de API: um segredo em texto, guardado no .env do teu computador.",
        foco: [5, 6],
        pose: { plugged: [true, true, true, true, false, false], cardOn: false, calls: 0 },
      },
      {
        titulo: "Encostou, conta",
        texto: "Com a chave no leitor, o agente chega no serviço pago, e cada pedido conta uma chamada na conta de quem é dono da chave.",
        foco: [5, 7, 8],
        pose: { plugged: [true, true, true, true, false, false], cardOn: true, calls: 2, pedido: true },
      },
    ],
    leitura: "4 conectores ligados, chave no .env, 0 chamadas contadas",
    css: `[data-led] .iso-top,[data-led] .iso-shade,[data-part="reader-led"] .iso-top,[data-part="reader-led"] .iso-shade{transition:fill .35s}
[data-led][data-state="on"] .iso-top,[data-part="reader-led"][data-state="on"] .iso-top{fill:var(--anatomy-green)}
[data-led][data-state="on"] .iso-shade,[data-part="reader-led"][data-state="on"] .iso-shade{fill:color-mix(in oklab, var(--anatomy-green) 75%, black)}
[data-led][data-state="on"],[data-part="reader-led"][data-state="on"]{filter:drop-shadow(0 0 2px var(--anatomy-green))}
[data-part="service-wire"]{transition:opacity .35s}
[data-part="service-wire"][data-ligado="off"]{opacity:.35}
[data-prog],[data-plug]{cursor:pointer}
[data-prog] .iso-logo{transition:opacity .3s}
[data-prog][data-ligado="off"] .iso-logo{opacity:.45}`,
  };
}
