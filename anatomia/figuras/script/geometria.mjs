// Fig B.8 · Do briefing ao script. Contrato: Vintageuiuxlibrary-anatomia/anatomia/CONTRATO.md
// O objeto: a bancada do agente (lê o briefing, abre a caixa de ferramentas, gasta uma ficha por lote)
// e o carimbo (o script: feito uma vez, carimba de graça e para quando não entende um nome).
// Fonte: descrição da aula B.8 em cursos/ia-aplicada.json e a transcrição _curso/bonus/_out/aula-B.8.srt.

function figuraBase({ k, G }) {
  const WIDTH = 640;
  const HEIGHT = 420;

  const PLATE = { x: -162, y: -66, w: 290, d: 132, r: 8 };
  const PLATE_H = 12;
  const FOOT_H = 5;

  // entrada: a pasta do cliente
  const ENTRADA = { x: -152, y: -20, w: 38, d: 40, r: 2 };
  const ENTRADA_H = 5;
  const ENTRADA_AT = [-133, 0, ENTRADA_H];

  // o lote (o único acento): uma tábua com as peças de formatos diferentes
  const LOTE = { x: -12, y: -14, w: 24, d: 28, r: 1.2 };
  const LOTE_H = 1.6;

  // a bancada do agente, ao fundo
  const BANCADA = { x: -74, y: -60, w: 70, d: 38, r: 2 };
  const BANCADA_Z = 18;
  const BANCADA_H = 3;
  const BANCADA_TOP = BANCADA_Z + BANCADA_H;
  const CAIXA = { x: -70, y: -57, w: 26, d: 12, r: 1.2 };
  const CAIXA_H = 8;
  const GAVETA = { x: -68, y: -46.2, w: 22, d: 1.6, r: 0.5 };
  const BRIEFING = { x: -68, y: -41, w: 18, d: 16, r: 0.8 };
  const AGENTE_AT = [-23, -41, BANCADA_TOP];

  const POTE_A = [8, -34];
  const POTE_B = [-94, 30];
  const POTE_R = 7;
  const POTE_H = 18;
  const FICHA_H = 1.3;
  const FICHAS_MAX = 10;

  // o carimbo, na frente
  const PRENSA = { x: -74, y: 16, w: 54, d: 38, r: 2 };
  const PRENSA_H = 8;
  const COLUNA = [-28, 35];
  const COLUNA_TOP = 46;
  const BRACO = { x: -56, y: 30, w: 32, d: 10, r: 1.6 };
  const BRACO_Z = 40;
  const BRACO_H = 6;
  const CABECA = { x: -55, y: 24, w: 22, d: 22, r: 1.6 };
  const CABECA_Z = 24;
  const CABECA_H = 6;
  const DESCE = 12;
  const PRENSA_AT = [-44, 35, PRENSA_H + 1];
  const GABARITO = { x: -57, y: 20.5, w: 26, d: 29, r: 1 };

  // a saída: quatro subpastas novas
  const BIN = { w: 32, d: 34 };
  const BINS = [
    [44, -50],
    [82, -50],
    [44, 6],
    [82, 6],
  ];
  const BIN_H = 3;
  const SAIDA_MAX = 5;
  const PITCH = 1.7;

  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [COLUNA[0], COLUNA[1], COLUNA_TOP + 12], [BANCADA.x, BANCADA.y, BANCADA_TOP + 14]],
    WIDTH,
    HEIGHT,
    { pad: 24, azimuth: 36 },
  );

  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (pts, style) => k.dotsSvg(pts, style);
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const peca = (n, markup) => `<g data-peca="${n}">${markup}</g>`;

  function base() {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
      out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
    const cs = k.corners(PLATE, 10);
    out.push(L(cs.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(D(cs.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    // plaqueta
    const tag = { x: -152, y: 34, w: 44, d: 16, r: 1.2 };
    out.push(S(k.slabOf(tag, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(tag, 1.6), 0.8, P), { tone: "faint" }));
    [[30, 39], [22, 42.5], [26, 46]].forEach(([len, y]) => out.push(L(k.lineOnTop([tag.x + 5, y], [tag.x + 5 + len, y], 0.8, P), { tone: "lo", free: true })));
    out.push(D([at([tag.x + 2.6, tag.y + 2.6, 0.8]), at([tag.x + tag.w - 2.6, tag.y + tag.d - 2.6, 0.8])], { size: 0.4 }));
    // régua na frente, entre o carimbo e a saída
    const strip = { x: -8, y: 50, w: 46, d: 6, r: 0.8 };
    out.push(S(k.slabOf(strip, 0, 0.5, P, 3), { tone: "lo", crease: "none" }));
    const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.6, 0.5, [1.6, 3], P);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    return out.join("");
  }

  function entrada() {
    const out = [`<path class="iso-halo" d="${k.haloOf(ENTRADA, 0, ENTRADA_H, P)}"/>`];
    out.push(S(k.slabOf(ENTRADA, 0, ENTRADA_H, P, 3, 0.8), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(ENTRADA, 2.5), ENTRADA_H, P, 3), { tone: "faint" }));
    out.push(S(k.slabOf({ x: ENTRADA.x, y: ENTRADA.y, w: ENTRADA.w, d: 3, r: 0.8 }, ENTRADA_H, 6, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: ENTRADA.x, y: ENTRADA.y + 3, w: 3, d: ENTRADA.d - 3, r: 0.8 }, ENTRADA_H, 6, P, 3, 0.4), { tone: "mid" }));
    out.push(D([at([ENTRADA.x + ENTRADA.w - 3, ENTRADA.y + 1.5, ENTRADA_H + 6]), at([ENTRADA.x + 1.5, ENTRADA.y + ENTRADA.d - 3, ENTRADA_H + 6])], { size: 0.4 }));
    return out.join("");
  }

  // o lote: tábua + peças de formatos diferentes (quadrada, redonda, retrato, o PDF com a orelha)
  function lote() {
    const out = [];
    out.push(S(k.slabOf(LOTE, 0, LOTE_H, P, 3, 0.4), { tone: "hi", crease: "lo", lit: true }));
    const z = LOTE_H;
    out.push(S(k.slabOf({ x: -9, y: -11, w: 8, d: 8, r: 0.4 }, z, 1, P, 2), { tone: "hi", crease: "lo" }));
    out.push(S(k.cylinder(4.5, -7, 4, z, 1, P, 24), { tone: "hi", crease: "lo" }));
    out.push(S(k.slabOf({ x: -9, y: 0, w: 7, d: 10, r: 0.4 }, z, 1, P, 2), { tone: "hi", crease: "lo" }));
    out.push(S(k.slabOf({ x: 1, y: 1, w: 8, d: 10, r: 0.4 }, z, 1.4, P, 2), { tone: "hi", crease: "lo" }));
    out.push(L(k.onTop([[6, 1], [9, 4]], z + 1.4, P), { tone: "lo" }));
    [[2.5, 6], [2.5, 8]].forEach(([x, y]) => out.push(L(k.lineOnTop([x, y], [x + 4.5, y], z + 1.4, P), { tone: "lo", free: true })));
    return `<g data-part="lote">${out.join("")}</g>`;
  }

  function bancada() {
    const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BANCADA, 4), 0, BANCADA_Z, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(BANCADA, 4))) out.push(S(k.cylinder(x, y, 1.8, 0, BANCADA_Z, P, 16), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf(BANCADA, BANCADA_Z, BANCADA_H, P, 3, 0.8), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(BANCADA, 2.5), BANCADA_TOP, P, 3), { tone: "faint" }));
    out.push(D(k.corners(BANCADA, 1.6).map(([x, y]) => at([x, y, BANCADA_TOP])), { size: 0.4 }));
    // o briefing: prancheta deitada com o prendedor
    out.push(S(k.slabOf(BRIEFING, BANCADA_TOP, 0.8, P, 2), { tone: "hi", crease: "lo" }));
    out.push(S(k.slabOf({ x: BRIEFING.x + 5, y: BRIEFING.y - 0.6, w: 8, d: 3, r: 0.6 }, BANCADA_TOP + 0.8, 1.2, P, 2), { tone: "mid" }));
    [[12, 5], [9, 8], [11, 11], [7, 14]].forEach(([len, yy]) => out.push(L(k.lineOnTop([BRIEFING.x + 3, BRIEFING.y + yy], [BRIEFING.x + 3 + len, BRIEFING.y + yy], BANCADA_TOP + 0.8, P), { tone: "lo", free: true })));
    // a caixa de ferramentas
    const seam = L(k.sideSeam(CAIXA, BANCADA_TOP + 4, P, 2), { tone: "faint" });
    out.push(S(k.slabOf(CAIXA, BANCADA_TOP, CAIXA_H, P, 2, 0.6), { tone: "mid", inner: seam }));
    out.push(S(k.slabOf({ x: CAIXA.x + 9, y: CAIXA.y + 4, w: 8, d: 3, r: 1 }, BANCADA_TOP + CAIXA_H, 2, P, 2), { tone: "mid" }));
    return out.join("");
  }

  // a gaveta que abre quando o agente escolhe a ferramenta
  function gaveta() {
    const out = [];
    out.push(S(k.slabOf(GAVETA, BANCADA_TOP + 0.6, 3, P, 2, 0.3), { tone: "hi", crease: "lo" }));
    out.push(S(k.slabOf({ x: GAVETA.x + 8, y: GAVETA.y + GAVETA.d, w: 6, d: 1.2, r: 0.4 }, BANCADA_TOP + 1.4, 1.2, P, 2), { tone: "mid", crease: "none" }));
    return `<g data-part="gaveta">${out.join("")}</g>`;
  }

  // pote de fichas: base, gaiola de três hastes e as fichas dentro
  function pote([x, y], id, comFichas) {
    const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - POTE_R, y: y - POTE_R, w: POTE_R * 2, d: POTE_R * 2, r: POTE_R }, 0, 2, P)}"/>`];
    out.push(S(k.cylinder(x, y, POTE_R + 1, 0, 2, P, 32), { tone: "mid" }));
    const hastes = [0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 + 0.6;
      return [x + Math.cos(a) * POTE_R, y + Math.sin(a) * POTE_R];
    });
    const atras = hastes.filter(([hx, hy]) => k.depthOf([hx, hy, 0], P) < k.depthOf([x, y, 0], P));
    const frente = hastes.filter((h) => !atras.includes(h));
    for (const [hx, hy] of atras) out.push(S(k.cylinder(hx, hy, 0.7, 2, POTE_H, P, 10), { tone: "lo", crease: "none" }));
    if (comFichas) for (let i = 0; i < FICHAS_MAX; i++) out.push(`<g data-ficha="${id}-${i}" style="opacity:0">${S(k.cylinder(x, y, POTE_R - 2, 2 + i * FICHA_H, FICHA_H * 0.85, P, 28), { tone: "hi", crease: "lo" })}</g>`);
    for (const [hx, hy] of frente) out.push(S(k.cylinder(hx, hy, 0.7, 2, POTE_H, P, 10), { tone: "lo", crease: "none" }));
    out.push(S(k.cylinder(x, y, POTE_R + 0.6, POTE_H + 2, 1.2, P, 32), { tone: "mid" }));
    out.push(L(k.ring(x, y, POTE_R - 1, POTE_H + 3.2, P, 32), { tone: "lo" }));
    return out.join("");
  }

  function prensa() {
    const out = [`<path class="iso-halo" d="${k.haloOf(PRENSA, 0, PRENSA_H, P)}"/>`];
    out.push(S(k.slabOf(PRENSA, 0, PRENSA_H, P, 3, 0.8), { tone: "mid" }));
    out.push(D(k.corners(PRENSA, 2).map(([x, y]) => at([x, y, PRENSA_H])), { size: 0.45 }));
    // o gabarito: aparece quando o script fica pronto
    out.push(L(k.planOutline(k.insetPlan(GABARITO, -0.8), PRENSA_H, P, 2), { tone: "lo" }));
    out.push(`<g data-part="gabarito" style="opacity:0">${S(k.slabOf(GABARITO, PRENSA_H, 1, P, 2, 0.3), { tone: "hi", crease: "lo" })}${L(k.planOutline(k.insetPlan(GABARITO, 2.5), PRENSA_H + 1, P, 2), { tone: "faint" })}</g>`);
    return out.join("");
  }

  // a coluna fica na frente da cabeça (x maior), então é pintada depois dela
  function coluna() {
    const [cx, cy] = COLUNA;
    const out = [];
    out.push(S(k.cylinder(cx, cy, 5, PRENSA_H, 2, P, 28), { tone: "mid" }));
    out.push(S(k.cylinder(cx, cy, 3.2, PRENSA_H + 2, COLUNA_TOP - PRENSA_H - 2, P, 28), { tone: "mid", crease: "none" }));
    out.push(L([20, 30].map((z) => k.sideArc(cx, cy, 3.2, z, P, 16)).join(""), { tone: "faint" }));
    return out.join("");
  }

  // a haste sai do braço (rodOut): uma haste só, recortada na face de baixo do braço
  const HASTE = G.rodOut(G.frameAlong([-44, 35, BRACO_Z], [0, 0, -1]), 0, BRACO_Z - CABECA_Z - CABECA_H, 1.8, P, { stroke: DESCE });
  function cabeca() {
    const out = [];
    out.push(`<clipPath id="script-haste"><path data-hold d="${HASTE.clip}"/></clipPath><g clip-path="url(#script-haste)">${S(HASTE.paths, { tone: "hi", crease: "none" })}</g>`);
    out.push(S(k.slabOf(CABECA, CABECA_Z, CABECA_H, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(CABECA, CABECA_Z + 1.6, P, 3), { tone: "faint" }) }));
    out.push(D(k.corners(CABECA, 2).map(([x, y]) => at([x, y, CABECA_Z + CABECA_H])), { size: 0.4 }));
    return `<g data-part="cabeca">${out.join("")}</g>`;
  }

  function braco() {
    const [cx, cy] = COLUNA;
    const out = [];
    out.push(S(k.slabOf(BRACO, BRACO_Z, BRACO_H, P, 3, 0.6), { tone: "mid" }));
    out.push(S(k.cylinder(cx, cy, 4.4, COLUNA_TOP, 3, P, 28), { tone: "mid" }));
    out.push(D([at([BRACO.x + 3, BRACO.y + 5, BRACO_Z + BRACO_H]), at([BRACO.x + BRACO.w - 6, BRACO.y + 5, BRACO_Z + BRACO_H])], { size: 0.45 }));
    // a luz em cima da coluna
    out.push(`<g data-part="lamp" data-state="off">${S(k.cylinder(cx, cy, 2.6, COLUNA_TOP + 3, 4.4, P, 24), { tone: "hi", crease: "faint" })}</g>`);
    out.push(S(k.cylinder(cx, cy, 3, COLUNA_TOP + 7.4, 1, P, 24), { tone: "mid" }));
    return out.join("");
  }

  function bins() {
    const out = [];
    BINS.forEach(([x, y], b) => {
      const plan = { x, y, w: BIN.w, d: BIN.d, r: 2 };
      out.push(`<path class="iso-halo" d="${k.haloOf(plan, 0, BIN_H, P)}"/>`);
      out.push(S(k.slabOf(plan, 0, BIN_H, P, 3, 0.6), { tone: "mid" }));
      out.push(S(k.slabOf({ x, y, w: BIN.w, d: 2.4, r: 0.8 }, BIN_H, 4, P, 3, 0.4), { tone: "mid" }));
      out.push(S(k.slabOf({ x, y: y + 2.4, w: 2.4, d: BIN.d - 2.4, r: 0.8 }, BIN_H, 4, P, 3, 0.4), { tone: "mid" }));
      // o que sai de cada pedido: um jeito de peça diferente por pasta
      for (let i = 0; i < SAIDA_MAX; i++) {
        const z = BIN_H + i * PITCH;
        const c = [x + BIN.w / 2 + 1, y + BIN.d / 2 + 1];
        const forma =
          b === 3
            ? S(k.slabOf({ x: c[0] - 6, y: c[1] - 6, w: 12, d: 12, r: 1 }, z, 1.2, P, 2), { tone: "hi", crease: "lo" })
            : S(k.slabOf({ x: c[0] - 9, y: c[1] - 11, w: 18, d: 22, r: 0.8 }, z, 1.2, P, 2), { tone: "hi", crease: "lo" });
        out.push(`<g data-saida="${b}-${i}" style="opacity:0">${forma}</g>`);
      }
    });
    return out.join("");
  }

  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "Uma bancada com dois caminhos. À esquerda chega o lote do cliente. Ao fundo, a bancada do agente: ele lê o briefing, abre a caixa de ferramentas e resolve, e cada lote tira uma ficha do pote. Na frente, o carimbo: o script que ele escreveu, que carimba o lote sem ficha nenhuma e para com a luz vermelha quando não entende um nome. À direita, as quatro subpastas novas.",
    body: [
      peca(0, base()),
      peca(1, entrada()),
      `<g data-slot="entrada"></g>`,
      peca(2, bancada()),
      peca(2, gaveta()),
      `<g data-slot="bancada"></g>`,
      peca(3, pote(POTE_A, "a", true)),
      peca(4, prensa()),
      `<g data-slot="prensa"></g>`,
      peca(4, cabeca()),
      peca(4, coluna()),
      peca(4, braco()),
      peca(5, pote(POTE_B, "b", false)),
      peca(7, bins()),
      `<g data-slot="saida"></g>`,
      `<g data-slot="alto"></g>`,
      `<g hidden data-reserva><g data-peca="1" data-item="lote">${lote()}</g></g>`,
    ],
  });

  const pecas = [
    { n: 1, nome: "O lote do cliente.", texto: "Foto em todo formato (PNG, JPEG, webp, TIFF, BMP, GIF e HEIC do iPhone), um catálogo em PDF e o logo com a paleta. O briefing chegou por mensagem, sem explicação nenhuma.", ancora: [ENTRADA.x + 6, ENTRADA.y + 6, ENTRADA_H + 14], acao: "Chegou outro lote" },
    { n: 2, nome: "A bancada do agente.", texto: "O Claude Code lê o briefing sozinho e escolhe ferramentas abertas que já existem: ImageMagick pras fotos e pro logo, PyMuPDF pro PDF. Resolve, mas cada vez é uso da tua assinatura.", ancora: [BANCADA.x + 30, BANCADA.y + 2, BANCADA_TOP + 14], acao: "Mandar pro agente" },
    { n: 3, nome: "As fichas do agente.", texto: "Cada lote que passa pela bancada tira uma ficha do pote. A ficha aqui conta vezes, não preço: quanto cada vez gasta depende do tamanho do pedido.", ancora: [POTE_A[0], POTE_A[1], POTE_H + 10] },
    { n: 4, nome: "O carimbo.", texto: "O que se repete vira script. O agente escreve uma vez, e depois ele roda sozinho no teu computador, sem IA, com o mesmo resultado toda vez.", ancora: [BRACO.x + 4, BRACO.y + 6, BRACO_Z + 14], acao: "Virar script" },
    { n: 5, nome: "As fichas do carimbo.", texto: "Esse pote não enche. Script rodando não gasta token nenhum.", ancora: [POTE_B[0], POTE_B[1], POTE_H + 10] },
    { n: 6, nome: "A luz do carimbo.", texto: "O script é literal. Se chega um nome que ele não entende, ele para e pergunta, em vez de pular o arquivo calado.", ancora: [COLUNA[0] + 4, COLUNA[1] - 4, COLUNA_TOP + 22], acao: "Mandar um nome fora do padrão" },
    { n: 7, nome: "As quatro subpastas.", texto: "As fotos em JPEG, as do iPhone em JPEG, as fotos tiradas do catálogo e o logo num quadrado em cada cor da paleta. Tudo em pasta nova, e os originais do cliente ficam intactos.", ancora: [BINS[3][0] + BIN.w, BINS[3][1] + BIN.d, BIN_H + 10] },
  ];

  const passos = [
    { titulo: "Chega o briefing", texto: "Foto em todo formato, um catálogo em PDF e o logo com a paleta. Você só encaminha a mensagem do cliente.", foco: [1], pose: "p1" },
    { titulo: "O agente escolhe a ferramenta", texto: "Ele lê sozinho, abre a caixa e pega o que já existe: ImageMagick e PyMuPDF. Uma ficha sai do pote.", foco: [2, 3], pose: "p2" },
    { titulo: "Os quatro pedidos", texto: "Tudo sai em subpastas novas. Os originais ficam como chegaram.", foco: [7], pose: "p3" },
    { titulo: "Vira script", texto: "Isso vai se repetir. O agente escreve o script e ele vira o carimbo da bancada.", foco: [4], pose: "p4" },
    { titulo: "O próximo lote", texto: "Vai direto pro carimbo. Mesmo resultado, e o pote do carimbo continua vazio.", foco: [4, 5], pose: "p5" },
    { titulo: "Um nome fora do padrão", texto: "Story 9x16 sem fundo.png. O carimbo para, acende a luz e pergunta, em vez de pular calado.", foco: [6], pose: "p6" },
  ];

  return {
    id: "script",
    fig: "Fig B.8",
    titulo: "Do briefing ao script",
    resumo: "O agente resolve o pedido novo e gasta uso. O que se repete vira carimbo, que roda sem IA e para quando não entende.",
    width: WIDTH,
    height: HEIGHT,
    svg,
    P,
    modelo: { ENTRADA_AT, AGENTE_AT, PRENSA_AT, BINS: BINS.map(([x, y]) => [x + BIN.w / 2 + 1, y + BIN.d / 2 + 1]), BIN_H, SAIDA_MAX, PITCH, FICHAS_MAX, DESCE, LIFT: 44, ESTRANHO: "story 9x16 sem fundo.png" },
    pecas,
    passos,
    leitura: "esperando o briefing",
  };
}

// O CSS da figura (luz de estado). Sem hex: a cor vem do tema do site, com fallback por nome.
const CSS = `[data-part="lamp"] .iso-top,[data-part="lamp"] .iso-shade{transition:fill .4s var(--anatomy-ease)}
[data-part="lamp"][data-state="amber"] .iso-top{fill:var(--warning, orange)}[data-part="lamp"][data-state="amber"] .iso-shade{fill:color-mix(in oklab, var(--warning, orange) 78%, black)}[data-part="lamp"][data-state="amber"]{filter:drop-shadow(0 0 3px var(--warning, orange))}
[data-part="lamp"][data-state="green"] .iso-top{fill:var(--anatomy-green)}[data-part="lamp"][data-state="green"] .iso-shade{fill:color-mix(in oklab, var(--anatomy-green) 78%, black)}[data-part="lamp"][data-state="green"]{filter:drop-shadow(0 0 3px var(--anatomy-green))}
[data-part="lamp"][data-state="red"] .iso-top{fill:var(--anatomy-red)}[data-part="lamp"][data-state="red"] .iso-shade{fill:color-mix(in oklab, var(--anatomy-red) 78%, black)}[data-part="lamp"][data-state="red"]{filter:drop-shadow(0 0 3px var(--anatomy-red))}`;

export default function figura(ctx) {
  return { ...figuraBase(ctx), css: CSS };
}
