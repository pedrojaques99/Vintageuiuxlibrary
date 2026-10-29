// Fig 1.4 · Como a ferramenta sobe. Geometria (roda no Node, no build do registry).
// Contrato em anatomia/CONTRATO.md. O movimento mora em registry/visant/lib/anatomia-como-sobe-controlador.ts.
export default function figura({ k, G }) {
  // ---- o modelo: o que existe na pasta e o que o .gitignore barra
  const ARQUIVOS = ["index.html", ".env", "app.js", "estilo.css"]; // ordem de saída
  const IGNORADOS = [".env"];

  const WIDTH = 640;
  const HEIGHT = 400;

  const PLATE = { x: -158, y: -60, w: 316, d: 120, r: 8 };
  const PLATE_H = 12;
  const FOOT_H = 5;

  const CARD = { x: -12, y: -15, w: 24, d: 30, r: 1.2 };
  const CARD_H = 1.6;
  const PITCH = 1.9;

  const SRC = { x: -146, y: -19, w: 32, d: 38, r: 2 };
  const SRC_TOP = 5;
  const SRC_AT = [-130, 0];

  const RAIL_FROM = -104;
  const RAIL_TO = 64;
  const CARRIAGE = { x: -15, y: -15, w: 30, d: 30, r: 2 };
  const CAR_Z = 3;
  const CAR_TOP = 7;
  const HOME = -88;
  const GATE = -10;
  const END = 44;

  const BRACKET = { x: -17, y: -57, w: 14, d: 26, r: 1.5 };
  const HOUSING = { x: -15.5, y: -55, w: 11, d: 27, r: 2 };
  const ROD_Z = 11;
  const GLAND = -28;
  const TIP = -22;
  const STROKE = 31;
  const PADDLE = { x: -17, y: TIP, w: 14, d: 3, r: 0.8 };

  const BIN = { x: -28, y: 18, w: 36, d: 36, r: 2 };
  const BIN_FLOOR = 2;
  const BIN_AT = [-10, 36];

  const CAB = { x: 96, y: -26, w: 50, d: 52, r: 3 };
  const CAB_H = 46;
  const TRAY = { x: 100, y: -22, w: 42, d: 44, r: 2 };
  const TRAY_FLOOR = CAB_H + 2;
  const GH_AT = [121, 0];
  const LIFT = 62;

  const TOWER = [139, -17];

  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [TOWER[0], TOWER[1], 76], [GH_AT[0], GH_AT[1], LIFT + 2], [SRC_AT[0], SRC_AT[1], 30]],
    WIDTH,
    HEIGHT,
    { pad: 26, azimuth: 38 },
  );

  const at = (point) => k.iso(point, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const screws = (plan, inset, z) => D(k.corners(plan, inset).map(([x, y]) => at([x, y, z])), { size: 0.45 });

  function plate() {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
      out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
    const corners = k.corners(PLATE, 10);
    out.push(L(corners.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(D(corners.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    // plaqueta de identificação, na frente à esquerda
    const tag = { x: -146, y: 30, w: 44, d: 16, r: 1.2 };
    out.push(S(k.slabOf(tag, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(tag, 1.6), 0.8, P), { tone: "faint" }));
    [[30, 35], [22, 38.5], [26, 42]].forEach(([len, y]) => out.push(L(k.lineOnTop([tag.x + 5, y], [tag.x + 5 + len, y], 0.8, P), { tone: "lo", free: true })));
    out.push(D([at([tag.x + 2.6, tag.y + 2.6, 0.8]), at([tag.x + tag.w - 2.6, tag.y + tag.d - 2.6, 0.8])], { size: 0.4 }));
    return out.join("");
  }

  function source() {
    const out = [`<path class="iso-halo" d="${k.haloOf(SRC, 0, SRC_TOP, P)}"/>`];
    out.push(S(k.slabOf(SRC, 0, SRC_TOP, P, 4, 0.8), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(SRC, 2.5), SRC_TOP, P, 4), { tone: "faint" }));
    // batentes no fundo e à esquerda: a pilha encosta neles
    out.push(S(k.slabOf({ x: SRC.x, y: SRC.y, w: SRC.w, d: 3, r: 0.8 }, SRC_TOP, 7, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: SRC.x, y: SRC.y + 3, w: 3, d: SRC.d - 3, r: 0.8 }, SRC_TOP, 7, P, 3, 0.4), { tone: "mid" }));
    out.push(D([at([SRC.x + SRC.w - 3, SRC.y + 1.5, SRC_TOP + 7]), at([SRC.x + 1.5, SRC.y + SRC.d - 3, SRC_TOP + 7])], { size: 0.4 }));
    return out.join("");
  }

  function rails() {
    const out = [];
    for (const y of [-10, 7]) {
      out.push(S(k.slabOf({ x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: 3, r: 0.8 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
      out.push(D([RAIL_FROM + 5, (RAIL_FROM + RAIL_TO) / 2, RAIL_TO - 5].map((x) => at([x, y + 1.5, 3])), { size: 0.35 }));
    }
    for (const x of [RAIL_FROM - 5, RAIL_TO]) {
      out.push(S(k.slabOf({ x, y: -13, w: 5, d: 26, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
      out.push(D([at([x + 2.5, -9, 7]), at([x + 2.5, 9, 7])], { size: 0.45 }));
    }
    // régua entre os trilhos
    const strip = { x: RAIL_FROM + 4, y: -5, w: RAIL_TO - RAIL_FROM - 8, d: 6, r: 0.8 };
    out.push(S(k.slabOf(strip, 0, 0.5, P, 3), { tone: "lo", crease: "none" }));
    const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.6, 0.5, [1.6, 3], P);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    return out.join("");
  }

  function carriage() {
    const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CARRIAGE, 3), CAR_Z, 0.1, P)}" style="filter:blur(3px)"/>`];
    out.push(S(k.slabOf(CARRIAGE, CAR_Z, CAR_TOP - CAR_Z, P, 4, 0.6), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(CARRIAGE, 2.5), CAR_TOP, P, 3), { tone: "faint" }));
    out.push(D(k.corners(CARRIAGE, 3).map(([x, y]) => at([x, y, CAR_TOP])), { size: 0.4, tone: "lo" }));
    // puxador na face da frente
    out.push(S(k.slabOf({ x: 8, y: CARRIAGE.y + CARRIAGE.d - 0.5, w: 3, d: 3, r: 0.8 }, CAR_Z + 1, 2.4, P, 2), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(9.5, CARRIAGE.y + CARRIAGE.d + 3.6, 2.4, CAR_Z + 0.4, 4, P, 18), { tone: "mid" }));
    out.push(L(k.knurl(9.5, CARRIAGE.y + CARRIAGE.d + 3.6, 2.4, CAR_Z + 0.4, CAR_Z + 4.4, 16, P), { tone: "lo" }));
    return out.join("");
  }

  // o empurrador do .gitignore: suporte, corpo, haste e pá
  const AXIS = G.frameAlong([GATE, 0, ROD_Z], [0, 1, 0]);
  const ROD = G.rodOut(AXIS, GLAND, TIP, 1.3, P, { stroke: STROKE });

  function pusherBody() {
    const out = [`<path class="iso-halo" d="${k.haloOf(BRACKET, 0, 7, P)}"/>`];
    out.push(S(k.slabOf(BRACKET, 0, 7, P, 3, 0.6), { tone: "mid" }));
    out.push(D(k.corners(BRACKET, 2.4).map(([x, y]) => at([x, y, 7])), { size: 0.4 }));
    out.push(S(k.slabOf(HOUSING, 7, 8, P, 4, 0.6), { tone: "mid" }));
    out.push(S(k.slabOf({ x: HOUSING.x - 0.6, y: GLAND - 2, w: HOUSING.w + 1.2, d: 2, r: 0.8 }, 6.6, 8.8, P, 3, 0.4), { tone: "mid" }));
    out.push(L(G.circleOf(AXIS, GLAND, 1.7, P), { tone: "faint" }));
    // plaqueta gravada: o único texto no desenho
    out.push(k.faceTextSvg(k.topMatrix([GATE, -41], 15, P, "y"), ".gitignore", { size: 2.6, tone: "lo", anchor: "middle" }));
    return out.join("");
  }

  function pusherMoving() {
    const rod = `<clipPath id="haste"><path data-hold d="${ROD.clip}"/></clipPath><g clip-path="url(#haste)">${S(ROD.paths, { tone: "hi", crease: "none" })}</g>`;
    const paddle = S(k.slabOf(PADDLE, 7.5, 8, P, 3, 0.5), { tone: "hi", crease: "lo" }) + D([at([PADDLE.x + 2.5, PADDLE.y + 1.5, 15.5]), at([PADDLE.x + PADDLE.w - 2.5, PADDLE.y + 1.5, 15.5])], { size: 0.4 });
    return `<g data-part="pusher">${rod}${paddle}</g>`;
  }

  function binBack() {
    const out = [`<path class="iso-halo" d="${k.haloOf(BIN, 0, BIN_FLOOR, P)}"/>`];
    out.push(S(k.slabOf(BIN, 0, BIN_FLOOR, P, 4, 0.6), { tone: "lo" }));
    out.push(S(k.slabOf({ x: BIN.x, y: BIN.y, w: BIN.w, d: 2.4, r: 0.8 }, BIN_FLOOR, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: BIN.x, y: BIN.y + 2.4, w: 2.4, d: BIN.d - 4.8, r: 0.8 }, BIN_FLOOR, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(BIN, 6), BIN_FLOOR, P, 3), { tone: "faint" }));
    return out.join("");
  }

  function binFront() {
    const out = [];
    out.push(S(k.slabOf({ x: BIN.x + BIN.w - 2.4, y: BIN.y + 2.4, w: 2.4, d: BIN.d - 4.8, r: 0.8 }, BIN_FLOOR, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: BIN.x, y: BIN.y + BIN.d - 2.4, w: BIN.w, d: 2.4, r: 0.8 }, BIN_FLOOR, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(D(k.corners(BIN, 1.2).map(([x, y]) => at([x, y, BIN_FLOOR + 4])), { size: 0.4 }));
    return out.join("");
  }

  function cabinet() {
    const out = [`<path class="iso-halo" d="${k.haloOf(CAB, 0, CAB_H, P)}"/>`];
    const seams = [16, 31].map((z) => L(k.sideSeam(CAB, z, P, 4), { tone: "faint" })).join("");
    out.push(S(k.slabOf(CAB, 0, CAB_H, P, 4, 1.2), { tone: "mid", inner: seams }));
    out.push(L(k.planOutline(k.insetPlan(CAB, 1.5), CAB_H, P, 4), { tone: "faint" }));
    // puxadores das três gavetas, na face +x
    for (const z of [8, 23.5, 38.5]) {
      out.push(S(k.slabOf({ x: CAB.x + CAB.w - 0.4, y: -9, w: 2.2, d: 2.4, r: 0.6 }, z - 1, 2, P, 2), { tone: "mid", crease: "none" }));
      out.push(S(k.slabOf({ x: CAB.x + CAB.w - 0.4, y: 6.6, w: 2.2, d: 2.4, r: 0.6 }, z - 1, 2, P, 2), { tone: "mid", crease: "none" }));
      out.push(S(k.slabOf({ x: CAB.x + CAB.w + 1.8, y: -10, w: 1.8, d: 20, r: 0.8 }, z - 1.2, 2.4, P, 3), { tone: "hi", crease: "lo" }));
    }
    // bandeja de cima: fundo e batentes de trás
    out.push(S(k.slabOf(TRAY, CAB_H, 2, P, 3, 0.5), { tone: "lo" }));
    out.push(S(k.slabOf({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: 2.4, r: 0.8 }, TRAY_FLOOR, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: TRAY.x, y: TRAY.y + 2.4, w: 2.4, d: TRAY.d - 4.8, r: 0.8 }, TRAY_FLOOR, 4, P, 3, 0.4), { tone: "mid" }));
    return out.join("");
  }

  function cabinetFront() {
    const out = [];
    out.push(S(k.slabOf({ x: TRAY.x + TRAY.w - 2.4, y: TRAY.y + 2.4, w: 2.4, d: TRAY.d - 4.8, r: 0.8 }, TRAY_FLOOR, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: TRAY.x, y: TRAY.y + TRAY.d - 2.4, w: TRAY.w, d: 2.4, r: 0.8 }, TRAY_FLOOR, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(D(k.corners(TRAY, 1.2).map(([x, y]) => at([x, y, TRAY_FLOOR + 4])), { size: 0.4 }));
    return out.join("");
  }

  function tower() {
    const [x, y] = TOWER;
    const out = [];
    out.push(S(k.cylinder(x, y, 4.2, TRAY_FLOOR + 4, 2, P, 28), { tone: "mid" }));
    out.push(D(G.dotsOf(G.frameAlong([x, y, 0], [0, 0, 1]), TRAY_FLOOR + 6, 3, 6, P, { all: true }), { size: 0.35 }));
    out.push(S(k.cylinder(x, y, 1.5, TRAY_FLOOR + 6, 8, P, 18), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, y, 3.4, TRAY_FLOOR + 14, 1.4, P, 28), { tone: "mid" }));
    out.push(`<g data-part="lamp" data-state="off">${S(k.cylinder(x, y, 3.2, TRAY_FLOOR + 15.4, 7, P, 32), { tone: "hi", crease: "faint" })}</g>`);
    out.push(S(k.cylinder(x, y, 3.6, TRAY_FLOOR + 22.4, 1.6, P, 28), { tone: "mid" }));
    return out.join("");
  }

  // cada arquivo é uma folha; o .env é o envelope lacrado (o único acento)
  function card(name) {
    const secret = IGNORADOS.includes(name);
    const out = [];
    out.push(S(k.slabOf(CARD, 0, CARD_H, P, 3, 0.4), { tone: "hi", crease: "lo", lit: secret }));
    if (secret) {
      out.push(L(k.onTop([[CARD.x, CARD.y], [0, 0], [CARD.x + CARD.w, CARD.y]], CARD_H, P), { tone: "lo" }));
      out.push(S(k.cylinder(0, 0, 3, CARD_H, 0.8, P, 24), { tone: "hi", lit: true }));
      out.push(L(k.ring(0, 0, 1.6, CARD_H + 0.8, P, 16), { tone: "lo" }));
    } else {
      [[16, -9], [11, -5], [14, -1], [8, 3]].forEach(([len, y]) => out.push(L(k.lineOnTop([-8, y], [-8 + len, y], CARD_H, P), { tone: "lo", free: true })));
      out.push(L(k.planOutline({ x: -8, y: 6, w: 16, d: 6, r: 0.6 }, CARD_H, P, 2), { tone: "faint" }));
    }
    return `<g data-peca="${secret ? 3 : 2}" data-carta="${name}"><g data-card="${name}">${out.join("")}</g></g>`;
  }

  const peca = (n, markup) => `<g data-peca="${n}">${markup}</g>`;

  // a legenda posicionada: cada número cai em cima da peça
  const PECAS = [
    { n: 1, nome: "A pasta no teu computador.", texto: "Onde o projeto nasce. Nada aqui é público até você mandar subir.", ancora: [SRC.x + 6, SRC.y + 4, SRC_TOP + 14] },
    { n: 2, nome: "Os arquivos do projeto.", texto: "index.html, app.js, estilo.css: o que faz a ferramenta funcionar. Esses sobem.", ancora: [SRC.x + SRC.w - 2, SRC.y + SRC.d - 2, SRC_TOP + 2] },
    { n: 3, nome: "O envelope .env.", texto: "Guarda senha e chave de API. Fica lacrado no teu computador e nunca sobe.", ancora: [SRC_AT[0], SRC_AT[1], 30] },
    { n: 4, nome: "O carrinho no trilho.", texto: "É o envio. Quando você pede \"sobe pro GitHub\", o agente põe os arquivos aqui (ele chama isso de push).", ancora: [HOME, 0, CAR_TOP + 10], acao: "Mandar de novo" },
    { n: 5, nome: "O empurrador .gitignore.", texto: "Uma lista de nomes que não podem subir. Se o arquivo está na lista, ele tira do carrinho.", ancora: [GATE, -44, 26], acao: "Tirar o .gitignore" },
    { n: 6, nome: "A bandeja de casa.", texto: "O que o .gitignore barrou cai aqui e continua só no teu computador.", ancora: [BIN.x + BIN.w - 4, BIN.y + BIN.d - 4, 12] },
    { n: 7, nome: "O armário do GitHub.", texto: "Uma cópia do projeto guardada fora do teu computador. Com coisa de cliente, o repositório é privado.", ancora: [CAB.x + CAB.w, CAB.y + CAB.d, CAB_H - 10] },
    { n: 8, nome: "A luz da Vercel.", texto: "Pega o que chegou no GitHub e põe no ar. Amarelo é publicando, verde é no ar, vermelho é no ar com a chave à mostra.", ancora: [TOWER[0], TOWER[1], TRAY_FLOOR + 30] },
  ];

  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "Uma bancada de expedição. À esquerda, a pilha de arquivos do teu computador. Um carrinho leva cada arquivo pelo trilho até o armário do GitHub, à direita. No meio, o empurrador do .gitignore tira o envelope .env do carrinho e derruba ele na bandeja que fica em casa. Quando o armário recebe tudo, a luz da torre fica verde: o site está no ar.",
    body: [
      peca(0, plate()),
      peca(5, pusherBody()),
      peca(4, rails()),
      peca(1, source()),
      `<g data-slot="src"></g>`,
      `<g data-peca="4"><g data-part="carriage">${carriage()}</g></g>`,
      peca(5, pusherMoving()),
      `<g data-slot="rail"></g>`,
      peca(6, binBack()),
      `<g data-slot="bin"></g>`,
      peca(6, binFront()),
      peca(7, cabinet()),
      `<g data-slot="gh"></g>`,
      peca(7, cabinetFront()),
      peca(8, tower()),
      `<g data-slot="sky"></g>`,
      `<g hidden data-cards>${ARQUIVOS.map(card).join("")}</g>`,
    ],
  });


  const MODEL = {
    ARQUIVOS, IGNORADOS, SRC_AT, SRC_TOP, PITCH, CARD_H, HOME, GATE, END, CAR_TOP, BIN_AT, BIN_FLOOR, GH_AT, TRAY_FLOOR, LIFT, STROKE,
  };

  return {
    id: "como-sobe",
    fig: "Fig 1.4",
    titulo: "Como a ferramenta sobe",
    resumo: "Uma bancada de expedição: os arquivos saem do teu computador num carrinho, o .gitignore tira o .env do caminho e o GitHub guarda o resto. Quando chega, a Vercel põe no ar.",
    width: WIDTH,
    height: HEIGHT,
    svg,
    P,
    modelo: MODEL,
    pecas: PECAS,
    passos: [
      { titulo: "Tudo começa na tua pasta", texto: "O projeto mora no teu computador. Nada aqui é público até você mandar subir.", foco: [1, 2, 3], pose: "inicio" },
      { titulo: "O agente leva os arquivos", texto: "Quando você pede \"sobe pro GitHub\", cada arquivo vai no carrinho até o armário.", foco: [2, 4, 7], pose: "subindo" },
      { titulo: "O .gitignore segura o segredo", texto: "O .env está na lista do .gitignore. O empurrador tira ele do carrinho e ele cai na bandeja que fica em casa.", foco: [3, 5, 6], pose: "barrando" },
      { titulo: "No ar", texto: "Com tudo no GitHub, a Vercel publica e a luz fica verde. A chave nunca saiu do teu computador.", foco: [7, 8], pose: "fim" },
      { titulo: "E se não tivesse o .gitignore?", texto: "O .env sobe junto, a chave fica à mostra no GitHub e a luz fica vermelha. Por isso ele vem antes do primeiro envio.", foco: [3, 5, 8], pose: "sem-gitignore" },
    ],
    leitura: "4 arquivos na pasta",
    css: `[data-part="lamp"] .iso-top,[data-part="lamp"] .iso-shade{transition:fill .5s var(--anatomy-ease)}
[data-part="lamp"][data-state="amber"] .iso-top{fill:var(--warning, orange)}[data-part="lamp"][data-state="amber"] .iso-shade{fill:color-mix(in oklab, var(--warning, orange) 78%, black)}[data-part="lamp"][data-state="amber"]{filter:drop-shadow(0 0 3px var(--warning, orange))}
[data-part="lamp"][data-state="green"] .iso-top{fill:var(--anatomy-green)}[data-part="lamp"][data-state="green"] .iso-shade{fill:color-mix(in oklab, var(--anatomy-green) 78%, black)}[data-part="lamp"][data-state="green"]{filter:drop-shadow(0 0 3px var(--anatomy-green))}
[data-part="lamp"][data-state="red"] .iso-top{fill:var(--anatomy-red)}[data-part="lamp"][data-state="red"] .iso-shade{fill:color-mix(in oklab, var(--anatomy-red) 78%, black)}[data-part="lamp"][data-state="red"]{filter:drop-shadow(0 0 3px var(--anatomy-red))}
[data-part="pusher"]{transition:opacity .4s}
[data-ignore="off"] [data-part="pusher"]{opacity:.18}`,
  };
}
