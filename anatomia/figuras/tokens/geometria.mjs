// Fig B.7 · O tanque da conversa. Contrato: anatomia/CONTRATO.md (@visant/anatomia).
// O objeto: um tanque com visor e régua (a janela de contexto), um funil por onde entra o que
// você manda, a banca com o parágrafo e o print, o relógio de releitura e o registro de esvaziar.
// Verdade (docs da Anthropic, lidas em 20/10/2026):
// - platform.claude.com/docs/en/build-with-claude/context-windows: cada volta guarda a mensagem e a
//   resposta, e a entrada de cada volta é a conversa inteira até ali; Opus 5.5 e Sonnet 5.5 têm 1M tokens.
// - platform.claude.com/docs/en/build-with-claude/vision: imagem custa ⌈largura/28⌉ × ⌈altura/28⌉ tokens.
// O tamanho de cada camada no tanque é ilustrativo; os números do canto são contados (voltas,
// palavras do parágrafo, tokens do print pela fórmula).

function figuraBase({ k, G }) {
  const WIDTH = 640;
  const HEIGHT = 440;

  const PLATE = { x: -124, y: -74, w: 238, d: 118, r: 8 };
  const PLATE_H = 12;
  const FOOT_H = 5;

  // a banca, com o parágrafo e o print
  const BANCA = { x: -114, y: -60, w: 74, d: 46, r: 2 };
  const BANCA_H = 12;
  const PILHA_AT = [-96, -37];
  const PRINT_AT = [-60, -37];
  const FOLHA = { x: -11, y: -8, w: 22, d: 16, r: 0.8 };
  const FOLHA_H = 1.1;
  const PRINT = { x: -12, y: -8, w: 24, d: 16, r: 0.8 };

  // o tanque: frente em +y, visor e régua na frente
  const TANK = { x: -16, y: -60, w: 54, d: 46, r: 4 };
  const TANK_H = 96;
  const FRONT = TANK.y + TANK.d; // -14
  const WIN = { x: -8, w: 16 };
  const WIN_Z0 = 14;
  const WIN_Z1 = 84;
  const BASE_CAMADA = 6; // o CLAUDE.md, que entra em toda conversa
  const FUNIL_AT = [11, -37];
  const FUNIL_Z = TANK_H + 3;

  // o agente responde por uma mangueira até o funil
  const AGENTE = { x: 52, y: -58, w: 22, d: 22, r: 3 };
  const AGENTE_H = 34;
  const CANO_Z = 26;
  // o relógio de releitura
  const PEDESTAL = { x: -42, y: 2, w: 28, d: 28, r: 3 };
  const PED_H = 26;
  const DIAL = [-28, 16];
  const DIAL_R = 10;
  const DIAL_TOP = PED_H + 3;
  // o registro de esvaziar, na face +x do tanque
  const VALV = [TANK.x + TANK.w, -24, 12];

  // o parágrafo de verdade (as palavras são contadas, não estimadas)
  const PARAGRAFO = "O botão de baixar fica no canto de cima, do lado direito, mas não é o azul grande, é o cinza pequeno que só aparece quando você passa o mouse em cima da terceira foto, e ele tem que ficar alinhado com o título, não com a borda da foto.";
  const PALAVRAS = PARAGRAFO.split(/\s+/).length;
  const PRINT_PX = [800, 500];
  const PRINT_TOKENS = Math.ceil(PRINT_PX[0] / 28) * Math.ceil(PRINT_PX[1] / 28);

  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(TANK, 0, TANK_H + 22), [FUNIL_AT[0], FUNIL_AT[1], FUNIL_Z + 24]],
    WIDTH,
    HEIGHT,
    { pad: 22, azimuth: 40 },
  );

  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const seg = (a, b) => k.segment(a, b, P);
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const peca = (n, markup) => `<g data-peca="${n}">${markup}</g>`;

  function plate() {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
      out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
    const c = k.corners(PLATE, 10);
    out.push(L(c.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(D(c.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    const tag = { x: -110, y: 18, w: 40, d: 14, r: 1.2 };
    out.push(S(k.slabOf(tag, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(tag, 1.6), 0.8, P), { tone: "faint" }));
    [[28, 22.5], [20, 25.5], [24, 28.5]].forEach(([len, y]) => out.push(L(k.lineOnTop([tag.x + 5, y], [tag.x + 5 + len, y], 0.8, P), { tone: "lo", free: true })));
    return out.join("");
  }

  function banca() {
    const out = [`<path class="iso-halo" d="${k.haloOf(BANCA, 0, BANCA_H, P)}"/>`];
    out.push(S(k.slabOf(BANCA, 0, BANCA_H, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(BANCA, 5, P, 4), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(BANCA, 2.5), BANCA_H, P, 4), { tone: "faint" }));
    out.push(D(k.corners(BANCA, 3).map(([x, y]) => at([x, y, BANCA_H])), { size: 0.4 }));
    // berços marcados no tampo
    out.push(L(k.planOutline({ x: PILHA_AT[0] - 13, y: PILHA_AT[1] - 10, w: 26, d: 20, r: 1 }, BANCA_H, P, 2), { tone: "lo" }));
    out.push(L(k.planOutline({ x: PRINT_AT[0] - 14, y: PRINT_AT[1] - 10, w: 28, d: 20, r: 1 }, BANCA_H, P, 2), { tone: "lo" }));
    return out.join("");
  }

  // um maço de duas folhas: o que você manda numa volta explicando com palavras
  function maco(id) {
    const out = [];
    for (let i = 0; i < 2; i++) {
      out.push(S(k.slabOf(FOLHA, i * FOLHA_H, FOLHA_H, P, 2, 0.3), { tone: "hi", crease: "lo" }));
    }
    [[15, -4], [12, -1], [16, 2], [9, 5]].forEach(([len, y]) => out.push(L(k.lineOnTop([-8, y], [-8 + len, y], 2 * FOLHA_H, P), { tone: "lo", free: true })));
    return `<g data-peca="4"><g data-part="${id}">${out.join("")}</g></g>`;
  }

  function printCard() {
    const out = [S(k.slabOf(PRINT, 0, 0.9, P, 2, 0.3), { tone: "hi", crease: "lo" })];
    const z = 0.9;
    out.push(L(k.planOutline(k.insetPlan(PRINT, 2), z, P, 2), { tone: "lo" }));
    // a imagem do print: uma janela com um botão marcado
    out.push(L(k.onTop([[-10, 4], [-4, -1], [0, 3], [4, -3], [10, 4]], z, P), { tone: "lo" }));
    out.push(L(k.ring(5, -3, 1.6, z, P, 16), { tone: "lo" }));
    return `<g data-peca="5"><g data-part="print">${out.join("")}</g></g>`;
  }

  function tank() {
    const out = [`<path class="iso-halo" d="${k.haloOf(TANK, 0, TANK_H, P)}"/>`];
    const seams = [32, 64].map((z) => L(k.sideSeam(TANK, z, P, 4), { tone: "faint" })).join("");
    out.push(S(k.slabOf(TANK, 0, TANK_H, P, 4, 1.2), { tone: "mid", inner: seams }));
    // tampa
    const lid = k.insetPlan(TANK, -1.5);
    out.push(S(k.slabOf(lid, TANK_H, 3, P, 4, 0.8), { tone: "mid" }));
    out.push(D(k.corners(lid, 3).map(([x, y]) => at([x, y, TANK_H + 3])), { size: 0.45 }));
    // gravado na frente
    out.push(k.faceTextSvg(k.sideMatrix([27, FRONT], 88, P, "left"), "CONVERSA", { size: 4, tone: "lo", anchor: "middle" }));
    return out.join("");
  }

  // visor: vidro, nível (o acento), a camada do CLAUDE.md e a moldura
  function visor() {
    const out = [];
    const fy = FRONT;
    out.push(S(k.slabOf({ x: WIN.x, y: fy, w: WIN.w, d: 0.8, r: 0.3 }, WIN_Z0, WIN_Z1 - WIN_Z0, P, 2), { tone: "faint", crease: "none" }));
    const nivelMax = k.slabOf({ x: WIN.x, y: fy + 0.8, w: WIN.w, d: 0.8, r: 0.3 }, WIN_Z0, WIN_Z1 - WIN_Z0, P, 2);
    out.push(`<clipPath id="visor-tanque"><path d="${nivelMax.fill}"/></clipPath>`);
    const liquido = [];
    for (let z = WIN_Z0 + 1.5; z < WIN_Z1; z += 2.2) liquido.push(seg([WIN.x, fy + 1.6, z], [WIN.x + WIN.w, fy + 1.6, z]));
    out.push(`<g clip-path="url(#visor-tanque)"><g data-part="nivel">${S(nivelMax, { tone: "lo", crease: "none" })}${L(liquido.join(""), { tone: "mid" })}</g></g>`);
    out.push(S(k.slabOf({ x: WIN.x, y: fy + 0.8, w: WIN.w, d: 1, r: 0.3 }, WIN_Z0, BASE_CAMADA, P, 2), { tone: "mid", crease: "lo" }));
    // a boia: corre no visor, na altura do nível (o acento da figura)
    out.push(`<g data-part="boia">${S(k.slabOf({ x: WIN.x + 0.6, y: fy + 1.6, w: WIN.w - 1.2, d: 1, r: 0.3 }, WIN_Z0 - 0.8, 1.6, P, 2), { tone: "hi", lit: true, crease: "none" })}</g>`);
    // moldura: esquerda, base, topo; a régua faz a direita
    out.push(S(k.slabOf({ x: WIN.x - 2.6, y: fy, w: 2.6, d: 2.6, r: 0.6 }, WIN_Z0 - 2.4, WIN_Z1 - WIN_Z0 + 4.8, P, 2, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: WIN.x, y: fy, w: WIN.w, d: 2.6, r: 0.6 }, WIN_Z0 - 2.4, 2.4, P, 2, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: WIN.x, y: fy, w: WIN.w, d: 2.6, r: 0.6 }, WIN_Z1, 2.4, P, 2, 0.4), { tone: "mid" }));
    // régua
    const rx = WIN.x + WIN.w;
    out.push(S(k.slabOf({ x: rx, y: fy, w: 5, d: 2.6, r: 0.6 }, WIN_Z0 - 2.4, WIN_Z1 - WIN_Z0 + 4.8, P, 2, 0.4), { tone: "mid" }));
    const minor = [];
    const major = [];
    for (let z = WIN_Z0 + 2, i = 0; z <= WIN_Z1 - 1; z += 4, i++) (i % 5 === 0 ? major : minor).push(seg([rx, fy + 2.6, z], [rx + (i % 5 === 0 ? 3.4 : 1.8), fy + 2.6, z]));
    out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
    out.push(D([[WIN.x - 1.3, WIN_Z0 - 1.2], [WIN.x - 1.3, WIN_Z1 + 1.2], [rx + 3.6, WIN_Z0 - 1.2], [rx + 3.6, WIN_Z1 + 1.2]].map(([x, z]) => at([x, fy + 2.6, z])), { size: 0.45 }));
    return out.join("");
  }

  function funil() {
    const F = G.frameAlong([FUNIL_AT[0], FUNIL_AT[1], FUNIL_Z], [0, 0, 1]);
    const out = [];
    out.push(S(k.cylinder(FUNIL_AT[0], FUNIL_AT[1], 7, TANK_H + 3, 1.6, P, 28), { tone: "mid" }));
    out.push(S(G.solidOf([[0, 3.2], [6, 3.2], [7, 4.5], [20, 15], [21.4, 15.6]], F, P), { tone: "mid" }));
    out.push(L(G.circleOf(F, 21.4, 13.6, P), { tone: "lo" }));
    return out.join("");
  }

  function agente() {
    const out = [`<path class="iso-halo" d="${k.haloOf(AGENTE, 0, AGENTE_H, P)}"/>`];
    out.push(S(k.slabOf(AGENTE, 0, AGENTE_H, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(AGENTE, 9, P, 3), { tone: "faint" }) }));
    out.push(S(k.slabOf({ x: AGENTE.x + 5, y: AGENTE.y + AGENTE.d, w: 12, d: 0.8, r: 0.4 }, 20, 4, P, 2), { tone: "hi", crease: "lo" }));
    out.push(`<g data-part="luz-agente" style="opacity:.25">${D([at([AGENTE.x + 11, AGENTE.y + AGENTE.d + 0.8, 22])], { size: 1.4, tone: "hi" })}</g>`);
    // o cano da resposta: sai do agente e entra na face do tanque
    const F = G.frameAlong([TANK.x + TANK.w, AGENTE.y + AGENTE.d / 2, CANO_Z], [1, 0, 0]);
    out.push(S(G.disc(0, AGENTE.x - TANK.x - TANK.w, 2.2, F, P), { tone: "mid" }));
    out.push(S(G.disc(0, 1.6, 3.6, F, P), { tone: "mid" }));
    out.push(S(G.disc(AGENTE.x - TANK.x - TANK.w - 1.6, AGENTE.x - TANK.x - TANK.w, 3.6, F, P), { tone: "mid" }));
    return out.join("");
  }

  function relogio() {
    const out = [`<path class="iso-halo" d="${k.haloOf(PEDESTAL, 0, PED_H, P)}"/>`];
    out.push(S(k.slabOf(PEDESTAL, 0, PED_H, P, 3, 0.8), { tone: "mid" }));
    const [x, y] = DIAL;
    out.push(S(k.cylinder(x, y, DIAL_R, PED_H, 3, P, 56, 0.6), { tone: "hi", crease: "lo" }));
    out.push(L(k.knurl(x, y, DIAL_R, PED_H + 0.6, PED_H + 3, 60, P, 0.3), { tone: "lo" }));
    out.push(L(k.ring(x, y, DIAL_R - 1.6, DIAL_TOP, P, 56), { tone: "lo" }));
    const ticks = k.radialTicks(x, y, DIAL_R - 2, 20, 5, DIAL_TOP, [1, 2.2], P, -Math.PI * 0.75, Math.PI * 1.5);
    out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
    out.push(L(k.ring(x, y, 1.2, DIAL_TOP, P, 14), { tone: "mid" }));
    return out.join("");
  }

  function registro() {
    const [vx, vy, vz] = VALV;
    const F = G.frameAlong([vx, vy, vz], [1, 0, 0]);
    const out = [];
    out.push(S(G.disc(0, 4, 3.4, F, P), { tone: "mid" }));
    out.push(S(G.disc(4, 5.4, 1.4, F, P), { tone: "mid" }));
    out.push(L(G.spokesOf(F, 6.2, 0.8, 5.6, 3, P), { tone: "lo" }));
    out.push(S(G.ringBand(5.4, 6.8, 5, 6.6, F, P), { tone: "hi", crease: "lo" }));
    out.push(S(G.disc(5.4, 7.4, 1.4, F, P), { tone: "mid" }));
    // bica de esvaziar, embaixo
    out.push(S(k.slabOf({ x: vx, y: vy + 10, w: 6, d: 5, r: 1 }, 1, 4, P, 2, 0.4), { tone: "mid" }));
    return out.join("");
  }

  const ponteiro = (frac) => {
    const ang = -Math.PI * 0.75 + Math.PI * 1.5 * frac;
    const [x, y] = DIAL;
    return k.lineOnTop([x - Math.sin(ang) * 2.4, y + Math.cos(ang) * 2.4], [x + Math.sin(ang) * (DIAL_R - 3), y - Math.cos(ang) * (DIAL_R - 3)], DIAL_TOP + 0.2, P);
  };

  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "Um tanque com visor e régua, que é a conversa com o agente. Tudo que você manda entra pelo funil, e a resposta do agente entra por um cano do lado. Na banca, um maço de folhas (explicar com palavras) e um print. Um relógio mostra quanto ele relê a cada volta, e um registro esvazia o tanque quando você começa uma conversa nova.",
    body: [
      peca(0, plate()),
      peca(0, banca()),
      `<g data-slot="banca"></g>`,
      peca(1, tank()),
      peca(2, visor()),
      peca(3, funil()),
      peca(7, registro()),
      peca(8, agente()),
      peca(6, relogio() + `<path data-part="ponteiro" class="iso-line" data-tone="hi" data-free="" d="${ponteiro(0)}" style="stroke-width:1"/>`),
      `<g data-slot="ceu"></g>`,
      `<g hidden data-itens>${maco("maco-1")}${maco("maco-2")}${maco("maco-3")}${printCard()}</g>`,
    ],
  });

  // relógio em JSON pro controlador redesenhar o ponteiro
  const pecas = [
    { n: 1, nome: "O tanque é a conversa.", texto: `Tudo que entra fica aqui: o que você manda e o que ele responde. Cabe muito (1 milhão de tokens no Opus 5.5 e no Sonnet 5.5), mas cada volta custa o que já está dentro.`, ancora: [TANK.x + TANK.w, TANK.y + 10, 74] },
    { n: 2, nome: "O visor e a régua.", texto: "Mostram o quanto o tanque já encheu. A faixa de baixo é o CLAUDE.md, que entra em toda conversa: por isso ele tem que ser curto.", ancora: [WIN.x - 4, FRONT + 3, WIN_Z1 + 6] },
    { n: 3, nome: "O funil.", texto: "Tudo que você manda entra por aqui: texto, arquivo, print. A resposta dele entra pelo cano do lado e também fica.", ancora: [FUNIL_AT[0] - 16, FUNIL_AT[1] + 4, FUNIL_Z + 22] },
    { n: 4, nome: "O parágrafo.", texto: `Descrever com palavras costuma pedir ida e volta: "não, o cinza pequeno". O parágrafo aqui tem ${PALAVRAS} palavras e ainda assim deu 3 voltas.`, ancora: [PILHA_AT[0], PILHA_AT[1] + 10, BANCA_H + 10], acao: "Explicar em parágrafo" },
    { n: 5, nome: "O print.", texto: `Mostra de uma vez o que o parágrafo tenta descrever. Um print de ${PRINT_PX[0]}×${PRINT_PX[1]} vira ${PRINT_TOKENS} tokens: a conta da Anthropic é um token por bloco de 28 px.`, ancora: [PRINT_AT[0], PRINT_AT[1] + 10, BANCA_H + 8], acao: "Mandar print" },
    { n: 6, nome: "O relógio de releitura.", texto: "A cada volta ele relê o tanque inteiro, do começo. O ponteiro mostra quanto ele leu nesta volta: quanto mais cheio, mais cara a próxima.", ancora: [DIAL[0], DIAL[1] + DIAL_R, DIAL_TOP + 6] },
    { n: 7, nome: "O registro.", texto: "Assunto novo, conversa nova: o tanque esvazia e só o CLAUDE.md volta. É o hábito mais barato que existe.", ancora: [VALV[0] + 12, VALV[1] + 4, VALV[2] + 8], acao: "Conversa nova" },
    { n: 8, nome: "O agente.", texto: "Responde pelo cano. A resposta também fica no tanque e é relida na volta seguinte, junto com tudo.", ancora: [AGENTE.x + AGENTE.w / 2, AGENTE.y + AGENTE.d / 2, AGENTE_H + 7] },
  ];

  const passos = [
    { titulo: "O tanque é a conversa", texto: "Conversa nova começa quase vazia: só a faixa do CLAUDE.md.", foco: [1, 2], pose: 0.8 },
    { titulo: "Explicando com palavras", texto: "Três voltas de \"não, o outro botão\". Cada volta é mais uma mensagem e mais uma resposta no tanque.", foco: [4, 2], pose: 10.6 },
    { titulo: "Cada volta relê tudo", texto: "Na volta 3 ele relê as voltas 1 e 2 inteiras. O relógio mostra isso.", foco: [6], pose: 10.6 },
    { titulo: "Conversa nova", texto: "Mudou de assunto? Abre outra conversa. O tanque esvazia e o CLAUDE.md volta.", foco: [7, 2], pose: 13.6 },
    { titulo: "Mostrando com um print", texto: `Uma volta só. O print de ${PRINT_PX[0]}×${PRINT_PX[1]} custa ${PRINT_TOKENS} tokens e resolve de primeira.`, foco: [5, 2], pose: 18 },
    { titulo: "Os outros hábitos", texto: "Deixar ele perguntar antes, procurar lib pronta, reaproveitar componente, virar script o que se repete e escolher Sonnet ou Opus pela tarefa: todos enchem menos o tanque.", foco: [1], pose: 18 },
  ];

  const modelo = {
    PILHA_AT, PRINT_AT, BANCA_H, FOLHA_H, FUNIL_AT, FUNIL_Z, WIN_Z0, WIN_Z1, BASE_CAMADA, DIAL, DIAL_R, DIAL_TOP,
    PALAVRAS, PRINT_PX, PRINT_TOKENS,
    // camadas (em unidades do visor): ilustrativas, a régua não é escala de token
    CAMADA: { msg: 9, resp: 7, print: 10 },
    POSES: passos.map((p) => p.pose),
  };

  return {
    id: "tokens",
    fig: "Fig B.7",
    titulo: "O tanque da conversa",
    resumo: "Cada mensagem e cada resposta ficam na conversa, e a cada volta o agente relê tudo. Print resolve em uma volta o que o parágrafo leva três. Conversa nova esvazia o tanque.",
    width: WIDTH,
    height: HEIGHT,
    svg,
    P,
    modelo,
    pecas,
    passos,
    leitura: "conversa nova: só o CLAUDE.md no tanque",
  };
}

// O CSS da figura (luz de estado). Sem hex: a cor vem do tema do site, com fallback por nome.
const CSS = "";

export default function figura(ctx) {
  return { ...figuraBase(ctx), css: CSS };
}
