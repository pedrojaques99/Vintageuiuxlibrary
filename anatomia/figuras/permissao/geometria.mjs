// Fig 2.3b · A caixa de permissão. Contrato: Vintageuiuxlibrary-anatomia/anatomia/CONTRATO.md
// O objeto: o portão de entrada do estúdio. O agente manda o pedido por um trilho até o portão;
// três botões respondem (Yes · Yes, and don't ask again · No); o caderno guarda o que vale pra sempre.
// Fonte das respostas: code.claude.com/docs/en/permissions (prompt de comando Bash, modo Manual).

function figuraBase({ k }) {
  const WIDTH = 640;
  const HEIGHT = 420;

  // ---- o modelo
  const PEDIDOS = [
    { nome: "criar a pasta entregas", cmd: "mkdir entregas" },
    { nome: "copiar as 3 fotos", cmd: "cp padaria-*.jpg entregas" },
    { nome: "apagar a pasta antiga", cmd: "rm -r antiga" },
  ];
  const RESPOSTAS = [
    { id: "sim", rotulo: "Yes" },
    { id: "sempre", rotulo: "Yes, and don't ask again" },
    { id: "nao", rotulo: "No" },
  ];

  // ---- o mundo
  const PLATE = { x: -158, y: -62, w: 316, d: 124, r: 8 };
  const PLATE_H = 12;
  const FOOT_H = 5;

  const AGENTE = { x: -150, y: -24, w: 38, d: 48, r: 3 };
  const AGENTE_H = 24;

  const RAIL_FROM = -112;
  const RAIL_TO = 96;
  const SLED = { x: -13, y: -15, w: 26, d: 30, r: 2 };
  const SLED_Z = 3;
  const SLED_TOP = 6;
  const CARD = { x: -11, y: -13, w: 22, d: 26, r: 1.2 };
  const CARD_H = 1.4;

  const X_SAI = -124; // dentro do agente
  const X_FILA = -34; // esperando no portão
  const X_PASSOU = 74; // do lado de dentro

  const PORTAO_X = 0;
  const POSTE = { w: 8, d: 8 };
  const POSTE_Y = [-26, 18]; // y inicial de cada poste
  const POSTE_H = 34;
  const CAIXA = { x: -6, y: -26, w: 12, d: 52, r: 2 }; // caixa do portão em cima
  const CAIXA_Z = POSTE_H;
  const CAIXA_H = 10;
  const PORTA = { x: -1.6, y: -18, w: 3.2, d: 36, r: 0.6 };
  const PORTA_Z = 0;
  const PORTA_H = 29;
  const PORTA_DESCE = 28.4;

  const PAINEL = { x: -66, y: 14, w: 24, d: 44, r: 2 };
  const PAINEL_H = 10;
  // os botões em fila no sentido do y: os pinos descem pra esquerda e a dica, que abre à direita, não passa por cima do vizinho
  const BOTOES = [48, 35, 22].map((y, i) => ({ x: -56, y, r: 3.2, i }));

  const LIVRO_BASE = { x: 26, y: 26, w: 34, d: 26, r: 2 };
  const LIVRO_BASE_H = 6;
  const LIVRO = { x: 29, y: 28.5, w: 28, d: 21, r: 1.2 };
  const LIVRO_Z = LIVRO_BASE_H;
  const LIVRO_H = 3;
  const REGRAS_MAX = 4;

  const PASTA = { x: 92, y: -26, w: 56, d: 52, r: 3 };
  const PASTA_H = 6;
  const PASTA_AT = [120, 0];
  const PILHA_MAX = 6;
  const PITCH = 1.7;

  const LAMP = [PORTAO_X, -20];

  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [PORTAO_X, 0, CAIXA_Z + CAIXA_H + 10], [AGENTE.x, AGENTE.y, AGENTE_H + 2]],
    WIDTH,
    HEIGHT,
    { pad: 26, azimuth: 36 },
  );

  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (pts, style) => k.dotsSvg(pts, style);
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const peca = (n, markup, extra = "") => `<g data-peca="${n}"${extra}>${markup}</g>`;

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
    // trilho
    for (const y of [-10, 7]) {
      out.push(S(k.slabOf({ x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: 3, r: 0.8 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
      out.push(D([RAIL_FROM + 5, -60, 40, RAIL_TO - 5].map((x) => at([x, y + 1.5, 3])), { size: 0.35 }));
    }
    out.push(S(k.slabOf({ x: RAIL_TO, y: -13, w: 5, d: 26, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([RAIL_TO + 2.5, -9, 7]), at([RAIL_TO + 2.5, 9, 7])], { size: 0.45 }));
    // a fenda no piso por onde a porta desce
    out.push(L(k.planOutline(k.insetPlan(PORTA, -0.8), 0, P, 2), { tone: "lo" }));
    // régua entre os trilhos
    const strip = { x: RAIL_FROM + 4, y: -5, w: RAIL_TO - RAIL_FROM - 8, d: 6, r: 0.8 };
    out.push(S(k.slabOf(strip, 0, 0.5, P, 3), { tone: "lo", crease: "none" }));
    const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.6, 0.5, [1.6, 3], P);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    // plaqueta
    const tag = { x: -150, y: 36, w: 44, d: 16, r: 1.2 };
    out.push(S(k.slabOf(tag, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(tag, 1.6), 0.8, P), { tone: "faint" }));
    [[30, 41], [22, 44.5], [26, 48]].forEach(([len, y]) => out.push(L(k.lineOnTop([tag.x + 5, y], [tag.x + 5 + len, y], 0.8, P), { tone: "lo", free: true })));
    out.push(D([at([tag.x + 2.6, tag.y + 2.6, 0.8]), at([tag.x + tag.w - 2.6, tag.y + tag.d - 2.6, 0.8])], { size: 0.4 }));
    return out.join("");
  }

  function agente() {
    const out = [`<path class="iso-halo" d="${k.haloOf(AGENTE, 0, AGENTE_H, P)}"/>`];
    const seam = L(k.sideSeam(AGENTE, 6, P, 3), { tone: "faint" });
    out.push(S(k.slabOf(AGENTE, 0, AGENTE_H, P, 3, 1), { tone: "mid", inner: seam }));
    out.push(L(k.planOutline(k.insetPlan(AGENTE, 2.5), AGENTE_H, P, 3), { tone: "faint" }));
    // grade de ventilação no topo: fendas fechadas
    for (let i = 0; i < 5; i++) out.push(L(k.planOutline({ x: AGENTE.x + 7, y: AGENTE.y + 8 + i * 6, w: 16, d: 2.4, r: 1 }, AGENTE_H, P, 2), { tone: "lo" }));
    out.push(D(k.corners(AGENTE, 3).map(([x, y]) => at([x, y, AGENTE_H])), { size: 0.45 }));
    // boca por onde o pedido sai, na face +x
    out.push(S(k.slabOf({ x: AGENTE.x + AGENTE.w - 0.5, y: -16, w: 2.4, d: 32, r: 0.8 }, 2, 9, P, 3, 0.4), { tone: "lo" }));
    // botão de chamar
    out.push(S(k.cylinder(AGENTE.x + 30, AGENTE.y + 38, 3.4, AGENTE_H, 1.6, P, 24), { tone: "hi", crease: "lo" }));
    out.push(L(k.ring(AGENTE.x + 30, AGENTE.y + 38, 2, AGENTE_H + 1.6, P, 16), { tone: "lo" }));
    return out.join("");
  }

  function sled() {
    const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(SLED, 3), SLED_Z, 0.1, P)}" style="filter:blur(3px)"/>`];
    out.push(S(k.slabOf(SLED, SLED_Z, SLED_TOP - SLED_Z, P, 3, 0.5), { tone: "mid" }));
    out.push(D(k.corners(SLED, 2.6).map(([x, y]) => at([x, y, SLED_TOP])), { size: 0.4, tone: "lo" }));
    return out.join("");
  }

  function cartao() {
    const out = [];
    // o pedido em cima: um cartão com o comando escrito (linhas de texto)
    out.push(S(k.slabOf(CARD, SLED_TOP, CARD_H, P, 3, 0.4), { tone: "hi", crease: "lo", lit: true }));
    const z = SLED_TOP + CARD_H;
    [[14, -8], [9, -4.5], [12, -1]].forEach(([len, y]) => out.push(L(k.lineOnTop([-7, y], [-7 + len, y], z, P), { tone: "lo", free: true })));
    out.push(L(k.planOutline({ x: -7, y: 3, w: 14, d: 6, r: 0.6 }, z, P, 2), { tone: "faint" }));
    // o recado (aparece quando a resposta é No)
    out.push(`<g data-part="recado" style="opacity:0">${S(k.slabOf({ x: 2, y: 4, w: 8, d: 8, r: 0.6 }, z, 0.6, P, 2), { tone: "hi", crease: "lo" })}${L(k.lineOnTop([3.5, 6.5], [8.5, 6.5], z + 0.6, P), { tone: "lo", free: true })}${L(k.lineOnTop([3.5, 9], [7, 9], z + 0.6, P), { tone: "lo", free: true })}</g>`);
    return out.join("");
  }

  function postesTras() {
    const [y0] = POSTE_Y;
    const plan = { x: PORTAO_X - POSTE.w / 2, y: y0, w: POSTE.w, d: POSTE.d, r: 1.2 };
    const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, POSTE_H, P)}"/>`];
    out.push(S(k.slabOf({ x: plan.x - 2, y: plan.y - 2, w: plan.w + 4, d: plan.d + 4, r: 1.6 }, 0, 2, P, 3, 0.4), { tone: "lo" }));
    out.push(S(k.slabOf(plan, 2, POSTE_H - 2, P, 3, 0.6), { tone: "mid" }));
    // trilho da porta, na face de dentro do poste
    out.push(S(k.slabOf({ x: PORTAO_X - 2.6, y: y0 + POSTE.d, w: 5.2, d: 1.2, r: 0.4 }, 2, POSTE_H - 2, P, 2), { tone: "lo", crease: "none" }));
    return out.join("");
  }

  // A porta desce pro piso (portão de piso): o recorte é a silhueta dela fechada, então o que
  // afunda some embaixo da base. O recorte anda junto e o holdStill segura ele no lugar.
  function porta() {
    const out = [];
    const corpo = k.slabOf(PORTA, PORTA_Z, PORTA_H, P, 2, 0.4);
    out.push(S(corpo, { tone: "hi", crease: "lo" }));
    for (const z of [8, 15, 22]) out.push(L(k.sideSeam(PORTA, z, P, 2), { tone: "faint" }));
    out.push(D([at([PORTAO_X, PORTA.y + 3, PORTA_Z + PORTA_H]), at([PORTAO_X, PORTA.y + PORTA.d - 3, PORTA_Z + PORTA_H])], { size: 0.4 }));
    return `<g data-part="porta"><clipPath id="permissao-porta"><path data-hold d="${corpo.fill}"/></clipPath><g clip-path="url(#permissao-porta)">${out.join("")}</g></g>`;
  }

  function caixaEPosteFrente() {
    const [, y1] = POSTE_Y;
    const plan = { x: PORTAO_X - POSTE.w / 2, y: y1, w: POSTE.w, d: POSTE.d, r: 1.2 };
    const out = [];
    out.push(S(k.slabOf({ x: plan.x - 2, y: plan.y - 2, w: plan.w + 4, d: plan.d + 4, r: 1.6 }, 0, 2, P, 3, 0.4), { tone: "lo" }));
    out.push(S(k.slabOf(plan, 2, POSTE_H - 2, P, 3, 0.6), { tone: "mid" }));
    out.push(S(k.slabOf({ x: PORTAO_X - 2.6, y: y1 - 1.2, w: 5.2, d: 1.2, r: 0.4 }, 2, POSTE_H - 2, P, 2), { tone: "lo", crease: "none" }));
    // a caixa em cima, onde a porta some quando sobe
    const seam = L(k.sideSeam(CAIXA, CAIXA_Z + 5, P, 3), { tone: "faint" });
    out.push(S(k.slabOf(CAIXA, CAIXA_Z, CAIXA_H, P, 3, 0.8), { tone: "mid", inner: seam }));
    out.push(D(k.corners(CAIXA, 2).map(([x, y]) => at([x, y, CAIXA_Z + CAIXA_H])), { size: 0.4 }));
    return out.join("");
  }

  function luz() {
    const [x, y] = LAMP;
    const z = CAIXA_Z + CAIXA_H;
    const out = [];
    out.push(S(k.cylinder(x, y, 3.6, z, 1.4, P, 24), { tone: "mid" }));
    out.push(`<g data-part="lamp" data-state="amber">${S(k.cylinder(x, y, 2.8, z + 1.4, 5, P, 28), { tone: "hi", crease: "faint" })}</g>`);
    out.push(S(k.cylinder(x, y, 3.2, z + 6.4, 1.2, P, 24), { tone: "mid" }));
    return out.join("");
  }

  function painel() {
    const out = [`<path class="iso-halo" d="${k.haloOf(PAINEL, 0, PAINEL_H, P)}"/>`];
    out.push(S(k.slabOf(PAINEL, 0, PAINEL_H, P, 3, 0.8), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(PAINEL, 2), PAINEL_H, P, 3), { tone: "faint" }));
    out.push(D(k.corners(PAINEL, 1.6).map(([x, y]) => at([x, y, PAINEL_H])), { size: 0.4 }));
    return out.join("");
  }

  function botao({ x, y, r, i }) {
    const out = [];
    out.push(S(k.cylinder(x, y, r + 1, PAINEL_H, 0.8, P, 24), { tone: "lo" }));
    out.push(`<g data-part="botao-${i}">${S(k.cylinder(x, y, r, PAINEL_H + 0.8, 2.4, P, 28), { tone: "hi", crease: "lo" })}${L(k.ring(x, y, r * 0.55, PAINEL_H + 3.2, P, 16), { tone: "lo" })}</g>`);
    // marca do botão: 1, 2 ou 3 tracinhos gravados na frente do painel
    for (let t = 0; t <= i; t++) out.push(L(k.lineOnTop([PAINEL.x + PAINEL.w - 5, y - 1.2 + t * 1.2], [PAINEL.x + PAINEL.w - 3, y - 1.2 + t * 1.2], PAINEL_H, P), { tone: "mid", free: true }));
    return out.join("");
  }

  function caderno() {
    const out = [`<path class="iso-halo" d="${k.haloOf(LIVRO_BASE, 0, LIVRO_BASE_H, P)}"/>`];
    out.push(S(k.slabOf(LIVRO_BASE, 0, LIVRO_BASE_H, P, 3, 0.6), { tone: "mid" }));
    out.push(S(k.slabOf(LIVRO, LIVRO_Z, LIVRO_H, P, 2, 0.4), { tone: "hi", crease: "lo" }));
    // a lombada no meio: o caderno aberto
    const mid = LIVRO.x + LIVRO.w / 2;
    out.push(L(k.lineOnTop([mid, LIVRO.y], [mid, LIVRO.y + LIVRO.d], LIVRO_Z + LIVRO_H, P), { tone: "lo" }));
    const z = LIVRO_Z + LIVRO_H;
    out.push(k.faceTextSvg(k.topMatrix([LIVRO.x + 7, LIVRO.y + 4.2], z, P, "x"), ".claude", { size: 2.2, tone: "lo", anchor: "middle" }));
    // as regras: linhas escritas que aparecem uma a uma na página da direita
    for (let i = 0; i < REGRAS_MAX; i++) {
      const y = LIVRO.y + 5 + i * 4;
      out.push(`<g data-regra="${i}" style="opacity:0">${L(k.lineOnTop([mid + 2.5, y], [mid + 2.5 + (i % 2 ? 7 : 10), y], z, P), { tone: "mid", free: true })}</g>`);
    }
    // página da esquerda: o que já estava escrito
    [[9, 9], [7, 13], [10, 17]].forEach(([len, yy]) => out.push(L(k.lineOnTop([LIVRO.x + 2.5, LIVRO.y + yy], [LIVRO.x + 2.5 + len, LIVRO.y + yy], z, P), { tone: "lo", free: true })));
    return out.join("");
  }

  function pasta() {
    const out = [`<path class="iso-halo" d="${k.haloOf(PASTA, 0, PASTA_H, P)}"/>`];
    out.push(S(k.slabOf(PASTA, 0, PASTA_H, P, 4, 0.8), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(PASTA, 3), PASTA_H, P, 3), { tone: "faint" }));
    out.push(S(k.slabOf({ x: PASTA.x, y: PASTA.y, w: PASTA.w, d: 3, r: 0.8 }, PASTA_H, 6, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: PASTA.x, y: PASTA.y + 3, w: 3, d: PASTA.d - 3, r: 0.8 }, PASTA_H, 6, P, 3, 0.4), { tone: "mid" }));
    // a orelha de pasta, no canto de trás
    out.push(S(k.slabOf({ x: PASTA.x + 4, y: PASTA.y - 6, w: 18, d: 6, r: 1.2 }, 0, PASTA_H, P, 3, 0.4), { tone: "mid" }));
    // a pilha do que já entrou (aparece folha por folha)
    for (let i = 0; i < PILHA_MAX; i++) {
      const z = PASTA_H + i * PITCH;
      out.push(`<g data-pilha="${i}" style="opacity:0">${S(k.slabOf({ x: PASTA_AT[0] - 11, y: PASTA_AT[1] - 13, w: 22, d: 26, r: 1.2 }, z, CARD_H, P, 3, 0.4), { tone: "hi", crease: "lo" })}</g>`);
    }
    return out.join("");
  }

  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "O portão de entrada do estúdio. À esquerda, o agente manda cada pedido num carrinho pelo trilho. O portão fica fechado até você apertar um dos três botões do painel: Yes passa uma vez, Yes and don't ask again passa e escreve a regra no caderno, No barra e o pedido volta com o teu recado. Do outro lado está a pasta do cliente.",
    body: [
      peca(0, base()),
      peca(1, agente()),
      peca(6, postesTras()),
      `<g data-slot="fila"></g>`,
      peca(6, porta()),
      peca(6, caixaEPosteFrente()),
      peca(6, luz()),
      peca(8, pasta()),
      `<g data-slot="dentro"></g>`,
      peca(7, caderno()),
      peca(3, painel()),
      peca(3, botao(BOTOES[0])),
      peca(4, botao(BOTOES[1])),
      peca(5, botao(BOTOES[2])),
      `<g hidden data-reserva><g data-peca="0" data-item="sled"><g data-part="sled">${sled()}</g></g><g data-peca="2" data-item="pedido"><g data-part="pedido">${cartao()}</g></g></g>`,
    ],
  });

  const pecas = [
    { n: 1, nome: "O agente.", texto: "Ele não mexe em nada sozinho: tudo que vai mudar no teu computador sai daqui como um pedido e espera no portão.", ancora: [AGENTE.x + 10, AGENTE.y + 6, AGENTE_H + 8], acao: "Mandar um pedido" },
    { n: 2, nome: "O pedido.", texto: "A caixa mostra o comando inteiro antes de acontecer. Lê o que está escrito antes de responder.", ancora: [X_FILA, 0, SLED_TOP + 10] },
    { n: 3, nome: "Yes.", texto: "Passa só essa vez. Se o mesmo pedido voltar, ele pergunta de novo.", ancora: [BOTOES[0].x, BOTOES[0].y, PAINEL_H + 12], acao: "Responder Yes" },
    { n: 4, nome: "Yes, and don't ask again.", texto: "Passa e escreve a regra no caderno. Esse comando não pergunta mais nesse projeto. Use pra comando que você leu e entendeu.", ancora: [BOTOES[1].x, BOTOES[1].y, PAINEL_H + 12], acao: "Responder Yes, and don't ask again" },
    { n: 5, nome: "No.", texto: "Barra o pedido. Antes de confirmar, o Tab abre um campo pra você dizer o que ele deve fazer diferente.", ancora: [BOTOES[2].x, BOTOES[2].y, PAINEL_H + 12], acao: "Responder No" },
    { n: 6, nome: "O portão.", texto: "Fica fechado até você responder. A luz amarela é ele esperando, verde é passou, vermelha é barrado.", ancora: [PORTAO_X, 6, CAIXA_Z + CAIXA_H + 12] },
    { n: 7, nome: "O caderno de regras.", texto: "É o .claude/settings.local.json do projeto. O don't ask again de comando fica escrito aqui e vale nas próximas conversas. Pra edição de arquivo, ele só vale até fechar a conversa.", ancora: [LIVRO.x + LIVRO.w, LIVRO.y + LIVRO.d, LIVRO_Z + 8], acao: "Apagar as regras" },
    { n: 8, nome: "A pasta do cliente.", texto: "Do outro lado do portão: os teus arquivos. Só o que você aprovou chega aqui.", ancora: [PASTA.x + PASTA.w, PASTA.y + PASTA.d, PASTA_H + 8] },
  ];

  const passos = [
    { titulo: "O agente pede", texto: "Ele quer criar a pasta entregas. O pedido para no portão e a luz fica amarela: esperando você.", foco: [1, 2], pose: "p1" },
    { titulo: "Yes passa uma vez", texto: "Você leu e aprovou. O portão sobe, o pedido entra na pasta, e mais nada fica combinado.", foco: [3, 6], pose: "p2" },
    { titulo: "Yes, and don't ask again", texto: "Copiar as fotos é seguro e vai se repetir. A regra fica escrita no caderno do projeto.", foco: [4, 7], pose: "p3" },
    { titulo: "O mesmo pedido volta", texto: "Agora ele passa sem perguntar, porque a regra está no caderno.", foco: [7, 6], pose: "p4" },
    { titulo: "No barra", texto: "Apagar a pasta antiga você não quer. O pedido volta pro agente com o teu recado, e ele tenta outro caminho.", foco: [5, 2], pose: "p5" },
  ];

  return {
    id: "permissao",
    fig: "Fig 2.3b",
    titulo: "A caixa de permissão",
    resumo: "O portão do estúdio: nada do agente entra na tua pasta sem uma das três respostas, e só o don't ask again fica escrito.",
    width: WIDTH,
    height: HEIGHT,
    svg,
    P,
    modelo: {
      PEDIDOS, RESPOSTAS, X_SAI, X_FILA, X_PASSOU, PORTAO_X, PORTA_DESCE, MOUTH: [AGENTE.x + AGENTE.w + 4, 0, 14], SLED_TOP, PASTA_AT, PASTA_H, PITCH, PILHA_MAX, REGRAS_MAX,
      LIFT: 18,
    },
    pecas,
    passos,
    leitura: "esperando um pedido",
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
