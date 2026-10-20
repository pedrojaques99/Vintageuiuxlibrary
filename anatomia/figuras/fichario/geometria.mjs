// Fig 2.6 · O fichário de receitas. Geometria (roda no Node, no build do registry).
// Contrato em anatomia/CONTRATO.md. O movimento mora em registry/visant/lib/anatomia-fichario-controlador.ts.
export default function figura({ k }) {
  // ---- o modelo, medido em ~/.claude/skills no computador da Visant (19/10/2026)
  // etiqueta = letras do campo description do SKILL.md; corpo = linhas depois do cabeçalho;
  // refs = arquivos e linhas somadas da pasta references/
  const RECEITAS = [
    { nome: "anatomy", etiqueta: 1018, corpo: 178, refs: 10, refsLinhas: 2328 },
    { nome: "metodologia-visant", etiqueta: 299, corpo: 196, refs: 0, refsLinhas: 0 },
    { nome: "ia-para-artefinal", etiqueta: 579, corpo: 62, refs: 4, refsLinhas: 102 },
    { nome: "visant-copy", etiqueta: 351, corpo: 238, refs: 2, refsLinhas: 372 },
    { nome: "brand-mockup-kit", etiqueta: 269, corpo: 155, refs: 0, refsLinhas: 0 },
    { nome: "visant-premiere-editor", etiqueta: 533, corpo: 162, refs: 1, refsLinhas: 77 },
  ];
  const NA_CASA = { receitas: 53, letras: 15478 };
  const PEDIDOS = [
    { texto: "fecha a arte do outdoor pra gráfica", casa: "ia-para-artefinal" },
    { texto: "gera os mockups da marca", casa: "brand-mockup-kit" },
    { texto: "oi, tudo bem?", casa: null },
  ];

  const WIDTH = 640;
  const HEIGHT = 420;

  const PLATE = { x: -156, y: -56, w: 232, d: 108, r: 8 };
  const PLATE_H = 12;
  const FOOT_H = 5;

  const BOX = { x: -72, y: -31, w: 124, d: 62, r: 2 };
  const WALL = 2.4;
  const BOX_H = 26;
  const FLOOR = 3;

  const PITCH = 20;
  const X0 = -64;
  const xOf = (i) => X0 + PITCH * i;
  const DIV = { y: -27, d: 54, w: 1.4, top: 30 };
  const TAB = { d: 16, h: 7 };
  const TAB_Y = [-25, -8, 9, -25, -8, 9];
  const CARD_X = [3, 5, 7];
  const CARD = { y: -25, d: 50, w: 0.9 };
  const CARD_TOP = [FLOOR + 28, FLOOR + 24, FLOOR + 22];
  const RISE = 36;
  const REF = { dx: 10.5, y: -16, d: 28, w: 1.6, top: FLOOR + 19 };
  const REF_RISE = 26;

  const POST_Y = -42;
  const POSTS = [-100, 68];
  const BEAM_Z = 58;
  const HEAD_PARK = 57;
  const BAR_Z = 44;

  const SLIP = { x: -122, y: -12, w: 1, d: 24, r: 0.4 };
  const STAND = { x: -128, y: -16, w: 14, d: 32, r: 2 };
  const STAND_H = 5;
  const SLIP_TOP = STAND_H + 20;

  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [POSTS[0], POST_Y, BEAM_Z + 6], [POSTS[1], POST_Y, BEAM_Z + 6], [xOf(2) + CARD_X[0], 0, CARD_TOP[0] + RISE + 2]],
    WIDTH,
    HEIGHT,
    { pad: 26, azimuth: 36 },
  );

  const at = (point) => k.iso(point, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const seg = (a, b) => k.segment(a, b, P);
  const peca = (n, markup) => `<g data-peca="${n}">${markup}</g>`;

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
    // plaqueta na frente à esquerda
    const tag = { x: -146, y: 26, w: 42, d: 15, r: 1.2 };
    out.push(S(k.slabOf(tag, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(tag, 1.6), 0.8, P), { tone: "faint" }));
    [[30, 30.5], [22, 34], [26, 37.5]].forEach(([len, y]) => out.push(L(k.lineOnTop([tag.x + 5, y], [tag.x + 5 + len, y], 0.8, P), { tone: "lo", free: true })));
    out.push(D([at([tag.x + 2.6, tag.y + 2.6, 0.8]), at([tag.x + tag.w - 2.6, tag.y + tag.d - 2.6, 0.8])], { size: 0.4 }));
    // régua no pé da caixa
    const strip = { x: BOX.x + 4, y: BOX.y + BOX.d + 4, w: BOX.w - 8, d: 6, r: 0.8 };
    out.push(S(k.slabOf(strip, 0, 0.5, P, 3), { tone: "lo", crease: "none" }));
    const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.6, 0.5, [1.6, 3], P);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    return out.join("");
  }

  // o pedido: uma tira presa num suporte, à esquerda
  function stand() {
    const out = [`<path class="iso-halo" d="${k.haloOf(STAND, 0, STAND_H, P)}"/>`];
    out.push(S(k.slabOf(STAND, 0, STAND_H, P, 4, 0.8), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(STAND, 2.2), STAND_H, P, 4), { tone: "faint" }));
    out.push(L(k.planOutline({ x: SLIP.x - 0.6, y: SLIP.y - 0.6, w: SLIP.w + 1.2, d: SLIP.d + 1.2, r: 0.4 }, STAND_H, P, 2), { tone: "lo" }));
    out.push(D(k.corners(STAND, 2.4).map(([x, y]) => at([x, y, STAND_H])), { size: 0.4 }));
    return out.join("");
  }

  function slip() {
    const out = [];
    out.push(S(k.slabOf(SLIP, STAND_H - 4, SLIP_TOP - STAND_H + 4, P, 2), { tone: "hi", crease: "lo" }));
    const face = SLIP.x + SLIP.w;
    [[16, 21], [11, 18], [18, 15], [8, 12]].forEach(([len, z]) => out.push(L(seg([face, SLIP.y + 3, z + 0.5], [face, SLIP.y + 3 + len, z + 0.5]), { tone: "lo", free: true })));
    // o prendedor no topo
    out.push(S(k.slabOf({ x: SLIP.x - 1, y: -4, w: SLIP.w + 2, d: 8, r: 0.6 }, SLIP_TOP - 3, 4, P, 2, 0.3), { tone: "mid" }));
    out.push(D([at([SLIP.x + SLIP.w + 1, 0, SLIP_TOP - 1])], { size: 0.45 }));
    return out.join("");
  }

  function gantryBack() {
    const out = [];
    for (const x of POSTS) {
      out.push(S(k.cylinder(x, POST_Y, 5, 0, 3, P, 28), { tone: "mid" }));
      out.push(D(k.corners({ x: x - 5, y: POST_Y - 5, w: 10, d: 10, r: 5 }, 2.2).map(([px, py]) => at([px, py, 3])), { size: 0.35 }));
      out.push(S(k.cylinder(x, POST_Y, 2.4, 3, BEAM_Z - 3, P, 24), { tone: "mid", crease: "none" }));
      out.push(L(k.sideArc(x, POST_Y, 2.4, 30, P, 14), { tone: "faint" }));
    }
    const beam = { x: POSTS[0] - 4, y: POST_Y - 3, w: POSTS[1] - POSTS[0] + 8, d: 6, r: 1 };
    out.push(S(k.slabOf(beam, BEAM_Z, 4, P, 3, 0.5), { tone: "mid" }));
    out.push(D([POSTS[0], POSTS[1]].map((x) => at([x, POST_Y, BEAM_Z + 4])), { size: 0.45 }));
    const ticks = k.topTicks(beam.x + 8, beam.x + beam.w - 8, 4, 5, beam.y + 0.4, BEAM_Z + 4, [1.2, 2.4], P);
    out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
    return out.join("");
  }

  // o leitor: carro no trilho de cima, braço e a barra que lê as etiquetas
  function head() {
    const out = [];
    out.push(S(k.slabOf({ x: -6, y: POST_Y - 5, w: 12, d: 10, r: 1.5 }, BEAM_Z - 3, 9, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([-3.5, POST_Y - 2.5, BEAM_Z + 6]), at([3.5, POST_Y + 2.5, BEAM_Z + 6])], { size: 0.4 }));
    out.push(S(k.slabOf({ x: -2, y: POST_Y + 5, w: 4, d: 32 - POST_Y - 5, r: 0.8 }, BEAM_Z - 2, 3, P, 2, 0.4), { tone: "mid" }));
    for (const y of [-22, 22]) out.push(S(k.cylinder(0, y, 0.9, BAR_Z + 3, BEAM_Z - 2 - BAR_Z - 3, P, 14), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: -2.5, y: -29, w: 5, d: 58, r: 1 }, BAR_Z, 3, P, 3, 0.4), { tone: "hi", crease: "lo" }));
    out.push(D(Array.from({ length: 13 }, (_, i) => at([2.5, -26 + i * (52 / 12), BAR_Z + 0.8])), { size: 0.35, tone: "lo" }));
    return `<g data-part="head">${out.join("")}</g>`;
  }

  function boxBack() {
    const out = [`<path class="iso-halo" d="${k.haloOf(BOX, 0, BOX_H, P)}"/>`];
    out.push(S(k.slabOf(BOX, 0, FLOOR, P, 4, 0.6), { tone: "lo" }));
    out.push(S(k.slabOf({ x: BOX.x, y: BOX.y, w: BOX.w, d: WALL, r: 0.8 }, FLOOR, BOX_H - FLOOR, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: BOX.x, y: BOX.y + WALL, w: WALL, d: BOX.d - 2 * WALL, r: 0.8 }, FLOOR, BOX_H - FLOOR, P, 3, 0.4), { tone: "mid" }));
    // trilho no fundo onde as divisórias encaixam
    out.push(L(k.lineOnTop([BOX.x + WALL, -1.5], [BOX.x + BOX.w - WALL, -1.5], FLOOR, P), { tone: "faint" }));
    out.push(L(k.lineOnTop([BOX.x + WALL, 1.5], [BOX.x + BOX.w - WALL, 1.5], FLOOR, P), { tone: "faint" }));
    return out.join("");
  }

  function boxFront() {
    const out = [];
    const side = { x: BOX.x + BOX.w - WALL, y: BOX.y + WALL, w: WALL, d: BOX.d - 2 * WALL, r: 0.8 };
    const front = { x: BOX.x, y: BOX.y + BOX.d - WALL, w: BOX.w, d: WALL, r: 0.8 };
    out.push(S(k.slabOf(side, FLOOR, BOX_H - FLOOR, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf(front, FLOOR, BOX_H - FLOOR, P, 3, 0.4), { tone: "mid" }));
    out.push(D(k.corners(BOX, 1.2).map(([x, y]) => at([x, y, BOX_H])), { size: 0.4 }));
    // puxador e porta-etiqueta na frente
    const pull = { x: BOX.x + BOX.w - 0.2, y: -8, w: 2.4, d: 16, r: 1 };
    out.push(S(k.slabOf({ x: BOX.x + BOX.w - 0.2, y: -9, w: 1.4, d: 2.2, r: 0.5 }, 14, 2, P, 2), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: BOX.x + BOX.w - 0.2, y: 6.8, w: 1.4, d: 2.2, r: 0.5 }, 14, 2, P, 2), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: pull.x + 1.2, y: pull.y - 2, w: 1.6, d: pull.d + 4, r: 0.8 }, 13.6, 2.8, P, 3), { tone: "hi", crease: "lo" }));
    out.push(k.faceTextSvg(k.sideMatrix([BOX.x + BOX.w, 0], 20, P, "right"), "receitas", { size: 3.2, tone: "lo", anchor: "middle" }));
    return out.join("");
  }

  // uma divisória por receita: a aba de cima é a etiqueta; atrás dela, as folhas da receita
  function divider(i) {
    const x = xOf(i);
    const out = [];
    out.push(S(k.slabOf({ x, y: DIV.y, w: DIV.w, d: DIV.d, r: 0.4 }, FLOOR, DIV.top - FLOOR, P, 2), { tone: "mid", crease: "faint" }));
    const tab = { x, y: TAB_Y[i], w: DIV.w, d: TAB.d, r: 1.2 };
    out.push(`<g data-tab="${i}">${S(k.slabOf(tab, DIV.top, TAB.h, P, 3), { tone: "hi", crease: "lo" })}</g>`);
    const face = x + DIV.w;
    out.push(L(seg([face, TAB_Y[i] + 3, DIV.top + 3.5], [face, TAB_Y[i] + TAB.d - 3, DIV.top + 3.5]), { tone: "lo", free: true }));
    return `<g data-peca="3">${out.join("")}</g>`;
  }

  function recipeCard(i, j) {
    const x = xOf(i) + CARD_X[j];
    const top = CARD_TOP[j];
    const out = [S(k.slabOf({ x, y: CARD.y, w: CARD.w, d: CARD.d, r: 0.3 }, FLOOR, top - FLOOR, P, 2), { tone: "hi", crease: "lo" })];
    if (j === 0) {
      const face = x + CARD.w;
      [[30, 6], [22, 4.5], [34, 3], [18, 1.5]].forEach(([len, dz]) => out.push(L(seg([face, CARD.y + 4, top - dz - 1], [face, CARD.y + 4 + len, top - dz - 1]), { tone: "lo", free: true })));
      return `<g data-peca="6"><g data-card="${i}">${out.join("")}</g></g>`;
    }
    return `<g data-peca="6">${out.join("")}</g>`;
  }

  function refsCard(i) {
    if (!RECEITAS[i].refs) return "";
    const x = xOf(i) + REF.dx;
    const out = [];
    out.push(S(k.slabOf({ x, y: REF.y, w: REF.w, d: REF.d, r: 0.4 }, FLOOR, REF.top - FLOOR, P, 2), { tone: "mid", crease: "lo" }));
    // a orelha da pasta
    out.push(S(k.slabOf({ x, y: REF.y + 2, w: REF.w, d: 9, r: 0.8 }, REF.top, 2.4, P, 2), { tone: "mid", crease: "lo" }));
    return `<g data-peca="6"><g data-refs="${i}">${out.join("")}</g></g>`;
  }

  const boxContents = RECEITAS.map((_, i) => [divider(i), `<g data-slot-card="${i}">${recipeCard(i, 0)}</g>`, recipeCard(i, 1), recipeCard(i, 2), refsCard(i)].join("")).join("");

  const PECAS = [
    { n: 1, nome: "O pedido.", texto: "O que você escreve pro agente. Troque pra ver três casos: um pedido que casa com uma receita, outro que casa com outra, e uma conversa à toa que não casa com nenhuma.", ancora: [SLIP.x, 0, SLIP_TOP + 8], acao: "Trocar o pedido" },
    { n: 2, nome: "O leitor.", texto: "O agente passa os olhos só nas etiquetas, de divisória em divisória. Ele não abre receita nenhuma pra decidir.", ancora: [HEAD_PARK, POST_Y, BEAM_Z + 14] },
    { n: 3, nome: "As etiquetas.", texto: `O nome e a descrição de cada skill, umas poucas linhas. É a única parte que fica sempre na cabeça do agente. Aqui são ${RECEITAS.length}; no computador da Visant são ${NA_CASA.receitas}, com ${NA_CASA.letras.toLocaleString("pt-BR")} letras somadas.`, ancora: [xOf(1), TAB_Y[1] + TAB.d / 2, DIV.top + TAB.h + 6] },
    { n: 4, nome: "A receita aberta.", texto: "Quando o pedido casa com uma etiqueta, só essa receita sai da caixa e o agente lê inteira. O canto de leitura diz qual e quantas linhas.", ancora: [xOf(2) + CARD_X[0], 0, CARD_TOP[0] + 6], acao: "Abrir a pasta references/" },
    { n: 5, nome: "A pasta references/.", texto: "Material de apoio da receita. Só sai da caixa quando a própria receita manda buscar, e nem toda receita tem.", ancora: [xOf(2) + REF.dx, REF.y + REF.d / 2, REF.top + 6], acao: "Abrir a pasta references/" },
    { n: 6, nome: "As outras receitas.", texto: "Continuam fechadas. Ter cinquenta receitas na caixa não pesa, porque ninguém lê o que não foi chamado.", ancora: [xOf(5) + 6, 18, CARD_TOP[1] + 4] },
    { n: 7, nome: "A caixa.", texto: "A pasta de skills do teu computador. Cada divisória é uma receita da casa.", ancora: [BOX.x + BOX.w, BOX.y + BOX.d, 10] },
  ];

  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "Uma caixa de receitas com seis divisórias. Cada divisória tem uma aba com a etiqueta da receita. Um leitor corre num trilho por cima e passa sobre as abas sem abrir nada. À esquerda, o pedido preso num suporte. Quando o pedido casa com uma etiqueta, a aba acende e só aquela receita sobe da caixa; a pasta de apoio dela só sobe quando a receita pede.",
    body: [
      peca(0, plate()),
      peca(2, gantryBack()),
      peca(1, stand()),
      `<g data-peca="1"><g data-part="slip">${slip()}</g></g>`,
      peca(7, boxBack()),
      boxContents,
      peca(7, boxFront()),
      `<g data-slot="sky"></g>`,
      `<path data-part="raio" class="iso-line" data-tone="lit" d="" style="stroke-dasharray:1.2 1.6;opacity:0"/>`,
      `<g data-peca="2">${head()}</g>`,
    ],
  });

  const ART = RECEITAS.find((r) => r.nome === PEDIDOS[0].casa);
  const LETRAS = RECEITAS.reduce((soma, r) => soma + r.etiqueta, 0);
  return {
    id: "fichario",
    fig: "Fig 2.6",
    titulo: "O fichário de receitas",
    resumo: `Uma caixa de receitas: o agente lê só as etiquetas e abre a receita que casa com o pedido. Os números são das skills de verdade do computador da Visant: ${NA_CASA.receitas} receitas, ${NA_CASA.letras.toLocaleString("pt-BR")} letras de etiqueta. Na vida real ele recebe todas as etiquetas de uma vez; o leitor passa uma por uma só pra dar pra ver.`,
    width: WIDTH,
    height: HEIGHT,
    svg,
    P,
    modelo: {
      RECEITAS, PEDIDOS, NA_CASA, LETRAS, X: RECEITAS.map((_, i) => xOf(i)), TAB_Y, TAB, DIV, BAR_Z, HEAD_PARK, POST_Y, BEAM_Z,
      RISE, REF_RISE, CARD_X, CARD_TOP, REF, SLIP, SLIP_TOP, BOX, CARD,
    },
    pecas: PECAS,
    passos: [
      { titulo: "Chega um pedido", texto: `Você escreve "${PEDIDOS[0].texto}". O agente ainda não abriu receita nenhuma.`, foco: [1], pose: { pedido: 0, marca: "pedido" } },
      { titulo: "Ele lê só as etiquetas", texto: `O leitor passa por cima das ${RECEITAS.length} divisórias e lê o nome e a descrição de cada receita. Aqui são ${LETRAS.toLocaleString("pt-BR")} letras; na máquina da Visant, ${NA_CASA.letras.toLocaleString("pt-BR")}.`, foco: [2, 3], pose: { pedido: 0, marca: "lendo" } },
      { titulo: "Uma etiqueta casa", texto: `A etiqueta da ${ART.nome} casa com o pedido. Só essa receita sobe da caixa e é lida inteira: ${ART.corpo} linhas.`, foco: [3, 4], pose: { pedido: 0, marca: "fim" } },
      { titulo: "A pasta de apoio, se precisar", texto: `Quando a receita manda buscar, a pasta references/ sobe junto: mais ${ART.refs} arquivos, ${ART.refsLinhas} linhas. As outras receitas continuam fechadas.`, foco: [4, 5, 6], pose: { pedido: 0, marca: "fim", refs: true } },
      { titulo: "Pedido sem receita", texto: `"${PEDIDOS[2].texto}" não casa com etiqueta nenhuma. O agente responde sem abrir a caixa.`, foco: [1, 7], pose: { pedido: 2, marca: "fim" } },
    ],
    leitura: "pronto pra ler",
    css: `[data-tab] .iso-solid,[data-card] .iso-solid{transition:fill .4s}
[data-part="raio"]{transition:opacity .2s}`,
  };
}
