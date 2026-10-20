// Fig 2.7 · A memória do agente. Contrato: anatomia/CONTRATO.md (@visant/anatomia).
// O objeto: o quadro CLAUDE.md na parede do estúdio, a mesa da conversa e a porta por onde
// toda conversa nova entra. Regra parafusada vale sempre; fato no clipe vale enquanto for verdade.
// Verdade (roteiro 04-memoria-do-estudio + modelo de CLAUDE.md da aula 2.7):
// - o agente lê o CLAUDE.md antes de responder, em toda sessão nova;
// - o que fica só na conversa some quando a janela fecha;
// - fato vai com motivo e data; quando a cliente muda de ideia, o fato velho sai;
// - AGENTS.md é o mesmo arquivo, com o nome que as outras IAs leem.

function figuraBase({ k }) {
  const WIDTH = 640;
  const HEIGHT = 420;

  const PLATE = { x: -124, y: -66, w: 266, d: 114, r: 8 };
  const PLATE_H = 12;
  const FOOT_H = 5;

  // o quadro (CLAUDE.md), em pé no fundo; a face da frente olha pra +y
  const BOARD = { x: -74, y: -56, w: 116, d: 5, r: 1 };
  const B_Z0 = 12;
  const B_Z1 = 76;
  const FACE = BOARD.y + BOARD.d; // -51
  const HEAD = { x: -77, y: -57, w: 122, d: 7.6, r: 1.4 };
  const HEAD_Z1 = 88;
  const LEGS = [-64, 30];

  // regras: placas parafusadas; fatos: cartões no clipe
  const REGRAS = [
    { x: -68, z: 52, w: 44, h: 16 },
    { x: -68, z: 30, w: 44, h: 16 },
  ];
  const SLOT_X = [-14, 4, 22];
  const CARD_W = 15;
  const CARD_TOP = 68;
  const CARD_H = 26;

  // a trilha do agente, na frente do quadro
  const TRACK_Y = -22;
  const TRACK_FROM = -112;
  const TRACK_TO = 112;
  const AT_BOARD = -14;
  const AT_DESK = 92;
  const AT_DOOR = -104;

  // a mesa da conversa e o bloco
  const DESK = { x: 60, y: -60, w: 66, d: 27, r: 2 };
  const DESK_Z = 22;
  const DESK_TOP = DESK_Z + 3;
  const PAD = { x: 70, y: -55, w: 28, d: 18, r: 1 };
  const PAD_TOP = DESK_TOP + 2;
  const SHEET = { x: -11, y: -7, w: 22, d: 14, r: 0.8 };
  const SHEET_AT = [84, -46];

  // a porta do estúdio
  const DOOR_X = -106;
  const DOOR_Y0 = -38;
  const DOOR_Y1 = -6;
  const DOOR_H = 64;

  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(HEAD, 0, HEAD_Z1 + 2), [DOOR_X + 4, DOOR_Y0, DOOR_H + 6], [SHEET_AT[0], SHEET_AT[1], 70]],
    WIDTH,
    HEIGHT,
    { pad: 24, azimuth: 40 },
  );

  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const seg = (a, b) => k.segment(a, b, P);
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const peca = (n, markup, extra = "") => `<g data-peca="${n}"${extra}>${markup}</g>`;

  function plate() {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
      out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
    const c = k.corners(PLATE, 10);
    out.push(L(c.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(D(c.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    // plaqueta de identificação na frente à esquerda
    const tag = { x: -60, y: 22, w: 40, d: 14, r: 1.2 };
    out.push(S(k.slabOf(tag, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(tag, 1.6), 0.8, P), { tone: "faint" }));
    [[28, 26.5], [20, 29.5], [24, 32.5]].forEach(([len, y]) => out.push(L(k.lineOnTop([tag.x + 5, y], [tag.x + 5 + len, y], 0.8, P), { tone: "lo", free: true })));
    return out.join("");
  }

  function track() {
    const out = [];
    for (const y of [TRACK_Y - 7, TRACK_Y + 5]) {
      out.push(S(k.slabOf({ x: TRACK_FROM, y, w: TRACK_TO - TRACK_FROM, d: 2.4, r: 0.6 }, 0, 1.6, P, 2, 0.3), { tone: "mid" }));
      out.push(D([TRACK_FROM + 4, (TRACK_FROM + TRACK_TO) / 2, TRACK_TO - 4].map((x) => at([x, y + 1.2, 1.6])), { size: 0.35 }));
    }
    out.push(S(k.slabOf({ x: TRACK_TO, y: TRACK_Y - 9, w: 4, d: 16.4, r: 1 }, 0, 4, P, 3, 0.4), { tone: "mid" }));
    // marcas no chão: quadro, mesa
    for (const x of [AT_BOARD, AT_DESK]) out.push(L(k.lineOnTop([x, TRACK_Y - 4], [x, TRACK_Y + 4], 0, P), { tone: "lo" }));
    return out.join("");
  }

  function board() {
    const out = [`<path class="iso-halo" d="${k.haloOf({ x: BOARD.x, y: BOARD.y, w: BOARD.w, d: 10, r: 2 }, 0, 4, P)}"/>`];
    for (const x of LEGS) {
      out.push(S(k.cylinder(x, BOARD.y + 2.5, 4.2, 0, 1.4, P, 24), { tone: "lo" }));
      out.push(S(k.cylinder(x, BOARD.y + 2.5, 2.2, 1.4, B_Z0 - 1.4, P, 20), { tone: "mid", crease: "none" }));
    }
    const groove = [
      seg([BOARD.x + 3, FACE, B_Z0 + 3], [BOARD.x + BOARD.w - 3, FACE, B_Z0 + 3]),
      seg([BOARD.x + BOARD.w - 3, FACE, B_Z0 + 3], [BOARD.x + BOARD.w - 3, FACE, B_Z1 - 3]),
      seg([BOARD.x + BOARD.w - 3, FACE, B_Z1 - 3], [BOARD.x + 3, FACE, B_Z1 - 3]),
      seg([BOARD.x + 3, FACE, B_Z1 - 3], [BOARD.x + 3, FACE, B_Z0 + 3]),
    ].join("");
    out.push(S(k.slabOf(BOARD, B_Z0, B_Z1 - B_Z0, P, 2, 0.6), { tone: "mid", inner: L(groove, { tone: "lo" }) }));
    // divisória entre regras e fatos
    out.push(L(seg([-19, FACE, B_Z0 + 3], [-19, FACE, B_Z1 - 3]), { tone: "faint" }));
    // cabeçalho gravado
    out.push(S(k.slabOf(HEAD, B_Z1, HEAD_Z1 - B_Z1, P, 3, 0.8), { tone: "mid" }));
    out.push(k.faceTextSvg(k.sideMatrix([-16, HEAD.y + HEAD.d], B_Z1 + 3.6, P, "left"), "CLAUDE.md", { size: 6, tone: "lo", anchor: "middle" }));
    out.push(D([[HEAD.x + 3, HEAD_Z1 - 3], [HEAD.x + HEAD.w - 3, HEAD_Z1 - 3]].map(([x, z]) => at([x, HEAD.y + HEAD.d, z])), { size: 0.45 }));
    return out.join("");
  }

  function regras() {
    const out = [];
    for (const r of REGRAS) {
      out.push(S(k.slabOf({ x: r.x, y: FACE, w: r.w, d: 1.4, r: 0.6 }, r.z, r.h, P, 2, 0.4), { tone: "hi", crease: "lo" }));
      const f = FACE + 1.4;
      [[30, r.z + r.h - 5], [36, r.z + r.h - 8.5], [22, r.z + 4.5]].forEach(([len, z]) => out.push(L(seg([r.x + 5, f, z], [r.x + 5 + len, f, z]), { tone: "lo", free: true })));
      out.push(D([[r.x + 2, r.z + 2], [r.x + r.w - 2, r.z + 2], [r.x + 2, r.z + r.h - 2], [r.x + r.w - 2, r.z + r.h - 2]].map(([x, z]) => at([x, f, z])), { size: 0.55, tone: "hi" }));
    }
    return out.join("");
  }

  // um cartão de fato, desenhado na origem do slot; o clipe fica no quadro
  function cartao(x0, nova) {
    const out = [];
    const f = FACE + 0.8;
    out.push(S(k.slabOf({ x: x0, y: FACE, w: CARD_W, d: 0.8, r: 0.4 }, CARD_TOP - CARD_H, CARD_H, P, 2, 0.3), { tone: "hi", crease: "lo" }));
    [[10, CARD_TOP - 7], [8, CARD_TOP - 10], [10, CARD_TOP - 13], [6, CARD_TOP - 16]].forEach(([len, z]) => out.push(L(seg([x0 + 2.5, f, z], [x0 + 2.5 + len, f, z]), { tone: "lo", free: true })));
    // etiqueta da data, embaixo
    out.push(S(k.slabOf({ x: x0 + 2, y: f, w: 7, d: 0.4, r: 0.2 }, CARD_TOP - CARD_H + 2, 3, P, 2), { tone: nova ? "mid" : "lo", crease: "none" }));
    return out.join("");
  }

  function clipes() {
    const out = [];
    for (const x0 of SLOT_X) {
      const cx = x0 + CARD_W / 2;
      out.push(S(k.slabOf({ x: cx - 3.5, y: FACE, w: 7, d: 2.6, r: 0.8 }, CARD_TOP - 3, 6, P, 2, 0.3), { tone: "mid" }));
      out.push(L(seg([cx - 2.5, FACE + 2.6, CARD_TOP + 1.6], [cx + 2.5, FACE + 2.6, CARD_TOP + 1.6]), { tone: "lo" }));
      out.push(D([at([cx, FACE + 2.6, CARD_TOP - 1])], { size: 0.45 }));
    }
    return out.join("");
  }

  function agente() {
    const out = [`<path class="iso-halo" d="${k.haloOf({ x: -10, y: -10, w: 20, d: 20, r: 10 }, 1.6, 0.1, P)}" style="filter:blur(3px)"/>`];
    for (const [x, y] of byDepth([[-6, -7], [6, -7], [-6, 7], [6, 7]])) out.push(S(k.cylinder(x, y, 2.2, 1.6, 2.4, P, 16), { tone: "lo" }));
    out.push(S(k.cylinder(0, 0, 9, 4, 3, P, 40, 0.5), { tone: "mid" }));
    out.push(S(k.slabOf({ x: -6, y: -6, w: 12, d: 12, r: 3 }, 7, 13, P, 4, 0.6), { tone: "mid" }));
    out.push(L(k.sideSeam({ x: -6, y: -6, w: 12, d: 12, r: 3 }, 13, P, 4), { tone: "faint" }));
    out.push(S(k.cylinder(0, 0, 1.6, 20, 6, P, 16), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: -8, y: -5, w: 16, d: 10, r: 2 }, 26, 10, P, 3, 0.6), { tone: "hi", crease: "lo" }));
    out.push(S(k.slabOf({ x: -5, y: 5, w: 10, d: 0.8, r: 0.4 }, 29, 3.4, P, 2), { tone: "hi", lit: true }));
    out.push(S(k.cylinder(4.5, 0, 0.6, 36, 6, P, 10), { tone: "mid", crease: "none" }));
    out.push(D([at([4.5, 0, 42.4])], { size: 0.9, tone: "hi" }));
    return out.join("");
  }

  // a leitura: fios do olho do agente até cada placa e cada fato (agente parado no quadro)
  function leitura() {
    const eye = [AT_BOARD, TRACK_Y + 5.8, 30.7];
    const alvos = [
      ...REGRAS.map((r) => [r.x + r.w / 2, FACE + 1.4, r.z + r.h / 2]),
      ...SLOT_X.map((x0) => [x0 + CARD_W / 2, FACE + 0.8, CARD_TOP - CARD_H / 2]),
    ];
    return alvos.map((p) => k.wireSvg(at(eye), at(p), { tone: "lo", dashed: true, size: 0.8 })).join("");
  }

  function desk() {
    const out = [`<path class="iso-halo" d="${k.haloOf(DESK, 0, DESK_TOP, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(DESK, 4))) out.push(S(k.cylinder(x, y, 2, 0, DESK_Z, P, 16), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: DESK.x + 6, y: DESK.y + DESK.d - 5, w: 32, d: 3, r: 0.6 }, DESK_Z - 7, 7, P, 2, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: DESK.x + 17, y: DESK.y + DESK.d - 2.2, w: 10, d: 1.6, r: 0.6 }, DESK_Z - 4.2, 1.6, P, 2), { tone: "hi", crease: "lo" }));
    out.push(S(k.slabOf(DESK, DESK_Z, 3, P, 4, 0.8), { tone: "mid" }));
    out.push(S(k.slabOf(PAD, DESK_TOP, 2, P, 3, 0.4), { tone: "lo" }));
    out.push(L(k.planOutline(k.insetPlan(PAD, 2), PAD_TOP, P, 3), { tone: "faint" }));
    // a caneca
    out.push(S(k.cylinder(112, -46, 4, DESK_TOP, 8, P, 28), { tone: "mid" }));
    out.push(L(k.ring(112, -46, 3.2, DESK_TOP + 8, P, 24), { tone: "lo" }));
    out.push(S(k.slabOf({ x: 115.6, y: -47, w: 2.6, d: 2, r: 0.6 }, DESK_TOP + 2, 4, P, 2), { tone: "mid", crease: "none" }));
    return out.join("");
  }

  function folha(id) {
    const out = [S(k.slabOf(SHEET, 0, 0.6, P, 2, 0.3), { tone: "hi", crease: "lo" })];
    [[14, -4], [10, -1], [16, 2], [8, 5]].forEach(([len, y]) => out.push(L(k.lineOnTop([-9, y], [-9 + len, y], 0.6, P), { tone: "lo", free: true })));
    return `<g data-peca="2"><g data-part="${id}">${out.join("")}</g></g>`;
  }

  function doorBack() {
    return S(k.slabOf({ x: DOOR_X - 2, y: DOOR_Y0 - 2, w: 10, d: DOOR_Y1 - DOOR_Y0 + 4, r: 0.8 }, 0, 1, P, 2), { tone: "lo", crease: "none" }) + S(k.slabOf({ x: DOOR_X, y: DOOR_Y0, w: 4, d: 4, r: 0.6 }, 1, DOOR_H - 1, P, 2, 0.4), { tone: "mid" });
  }
  function doorFront() {
    const out = [];
    out.push(S(k.slabOf({ x: DOOR_X, y: DOOR_Y1 - 4, w: 4, d: 4, r: 0.6 }, 1, DOOR_H - 1, P, 2, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: DOOR_X - 1, y: DOOR_Y0 - 1, w: 6, d: DOOR_Y1 - DOOR_Y0 + 2, r: 0.8 }, DOOR_H, 5, P, 2, 0.5), { tone: "mid" }));
    out.push(D([16, 46].map((z) => at([DOOR_X + 4, DOOR_Y1 - 2, z])), { size: 0.55 }));
    return out.join("");
  }

  const fatoGroup = (id, x0, nova) => `<g data-part="${id}">${cartao(x0, nova)}</g>`;

  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "O quadro CLAUDE.md na parede do estúdio, com duas regras parafusadas e fatos presos em clipe. Na frente, um agente anda num trilho entre a porta, o quadro e a mesa da conversa, onde fica um bloco de folhas. O que está no quadro ele lê toda vez que entra. O que ficou só no bloco some quando a janela fecha.",
    body: [
      peca(0, plate()),
      peca(5, board()),
      peca(3, regras()),
      peca(4, clipes() + fatoGroup("fato-1", SLOT_X[0], false) + fatoGroup("fato-1b", SLOT_X[0], true) + fatoGroup("fato-2", SLOT_X[1], true)),
      peca(2, desk()),
      `<g data-slot="bloco"></g>`,
      peca(0, track()),
      peca(6, doorBack()),
      `<g data-peca="1"><g data-part="leitura">${leitura()}</g><g data-part="agente">${agente()}</g></g>`,
      peca(6, doorFront()),
      `<g data-slot="ceu"></g>`,
      `<g hidden data-folhas>${folha("folha-1")}${folha("folha-2")}</g>`,
    ],
  });

  const pecas = [
    { n: 1, nome: "O agente.", texto: "Começa toda conversa sem saber nada de você. O que ele sabe de saída chega pelo arquivo que ele lê ao entrar.", ancora: [AT_DESK, TRACK_Y, 48], acao: "Fechar e abrir a janela" },
    { n: 2, nome: "A mesa da conversa.", texto: "O que você fala no chat vira folha neste bloco. Fechou a janela, o bloco vai pro lixo.", ancora: [DESK.x + DESK.w - 2, DESK.y + DESK.d - 2, DESK_TOP + 6], acao: "Guardar no arquivo" },
    { n: 3, nome: "As regras parafusadas.", texto: "Regra vale sempre: fale em português, com as palavras da mesa. Logo nunca distorcido. Ninguém tira toda semana.", ancora: [REGRAS[0].x + 4, FACE + 2, REGRAS[0].z + REGRAS[0].h + 2] },
    { n: 4, nome: "Os fatos no clipe.", texto: "Fato vale enquanto for verdade, com motivo e data. A dona da padaria reprovou o marrom escuro: achou que parecia pão queimado.", ancora: [SLOT_X[1] + CARD_W / 2, FACE + 3, CARD_TOP + 6], acao: "A cliente mudou de ideia" },
    { n: 5, nome: "O quadro CLAUDE.md.", texto: "O arquivo que ele lê antes de te responder, em toda conversa nova. Usa outra IA também? Uma cópia chamada AGENTS.md vale pra ela.", ancora: [BOARD.x + BOARD.w - 4, HEAD.y + HEAD.d, HEAD_Z1 + 3] },
    { n: 6, nome: "A porta.", texto: "Toda conversa nova entra por aqui, de mãos vazias. Por isso peça arquivo e diga a pasta: \"guarda isso no CLAUDE.md da pasta do cliente\".", ancora: [DOOR_X + 2, DOOR_Y0 + 2, DOOR_H + 9] },
  ];

  // a história inteira numa linha do tempo; cada passo é um instante dela
  const passos = [
    { titulo: "A conversa", texto: "O agente está na mesa. O que vocês combinam no chat vira folha no bloco.", foco: [1, 2], pose: 0.6 },
    { titulo: "Guardar no arquivo", texto: "\"Guarda no CLAUDE.md que a gráfica pede 3 mm de sangria.\" A folha vira cartão no quadro, com data.", foco: [2, 4], pose: 4.6 },
    { titulo: "Fechou a janela", texto: "O que ficou só no chat, como o \"pode usar Manrope\", foi pro lixo junto com o bloco.", foco: [2], pose: 8.2 },
    { titulo: "Conversa nova", texto: "Ele entra pela porta sem saber nada e, antes de responder, lê o quadro inteiro.", foco: [1, 5, 6], pose: 15 },
    { titulo: "Regra e fato", texto: "Regra vale sempre. Fato vale enquanto for verdade: a dona mudou de ideia, o cartão velho sai e o novo entra.", foco: [3, 4], pose: 20.2 },
  ];

  const modelo = {
    TRACK_Y, AT_BOARD, AT_DESK, AT_DOOR, PAD_TOP, SHEET_AT, CARD_TOP, CARD_W, FACE, SLOT_X,
    REGRAS: REGRAS.length,
    POSES: passos.map((p) => p.pose),
    PINO_AGENTE: [0, TRACK_Y, 48],
    ALVO_FOLHA: [SLOT_X[1] + CARD_W / 2, FACE + 12, CARD_TOP - 8],
  };

  return {
    id: "memoria",
    fig: "Fig 2.7",
    titulo: "A memória do agente",
    resumo: "O agente esquece a conversa quando a janela fecha e lembra o que está no CLAUDE.md, que ele lê toda vez que entra.",
    width: WIDTH,
    height: HEIGHT,
    svg,
    P,
    modelo,
    pecas,
    passos,
    leitura: "na conversa: 1 folha no bloco",
  };
}

// O CSS da figura (luz de estado). Sem hex: a cor vem do tema do site, com fallback por nome.
const CSS = "";

export default function figura(ctx) {
  return { ...figuraBase(ctx), css: CSS };
}
