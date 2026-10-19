/**
 * A cena do `fog-garden`: uma trilha sinuosa num jardim na névoa, percorrida
 * pela câmera conforme o progresso.
 *
 * Mesma floresta do `fog-tree` (mesmos cinzas, mesmo `growTree`, mesmo
 * `fog-post`), outra escala: dezenas de árvores em vez de uma. O que torna isso
 * viável num notebook é a decisão 1.
 *
 * 1. **Sete árvores geradas, dezenas plantadas.** O ez-tree gera geometria na
 *    thread principal (dezenas de ms por árvore). Aqui nascem sete variantes,
 *    uma vez, e cada árvore da trilha é um `Group` com malhas que APONTAM para
 *    a geometria e o material da variante — memória de sete, custo de upload de
 *    sete. E o vento vem de graça: o uniform de tempo mora no material
 *    compartilhado, então atualizar a variante balança todos os clones dela.
 * 2. **Clone na mão, não `tree.clone()`.** O construtor do `Tree` cria duas
 *    malhas vazias; o `clone()` do three chama esse construtor e DEPOIS copia os
 *    filhos, então cada clone carregava duas malhas fantasmas com material
 *    próprio que ninguém descartava.
 * 3. **Semente fixa.** O plantio usa um LCG semeado: o jardim é o mesmo a cada
 *    visita e em toda máquina. Jardim que muda a cada recarga faz a pessoa
 *    achar que a página está quebrando, não que é generativa.
 * 4. **Clareiras são parâmetro.** Perto delas o plantio rareia e entra uma
 *    árvore protagonista (a copa redonda) ao lado da trilha, para a câmera
 *    passar perto. Os marcos (`landmark`) vêm de fora: a cena não sabe o que é
 *    o produto de ninguém.
 */

import * as THREE from "three";
import type { Tree } from "@dgreenheck/ez-tree";

import type { RGB } from "@/lib/css-color";
import {
  contactShadowTexture,
  createFogPost,
  createFogRenderer,
  disposeTree,
  gray,
  releaseRenderer,
} from "@/lib/fog-post";
import { growTree, roundCrown } from "@/lib/fog-tree-scene";

/**
 * Fábrica de marco para as clareiras (um objeto, um produto, uma escultura).
 *
 * Recebe o índice da clareira e devolve o objeto em unidades da cena (uma
 * árvore de fundo tem ~25 de altura; a câmera anda a 13 do chão). A cena
 * posiciona, gira `userData.spin` rad/s se houver, e DESCARTA geometria e
 * material do que for devolvido no fim — não reaproveite fora daqui.
 */
export type GardenLandmark = (index: number) => THREE.Object3D | null | undefined;

export interface GardenSceneOptions {
  seed: number;
  /** Quantas posições de plantio ao longo da trilha. */
  density: number;
  /** Pontos 0..1 da trilha com clareira. */
  clearings: number[];
  landmark?: GardenLandmark;
  trail: number;
  grain: number;
  reduce: boolean;
  light: boolean;
}

export interface GardenScene {
  setProgress(p: number): void;
  /** Ponteiro em -1..1; desvia o olhar da câmera para os lados. */
  setPointer(x: number, y: number): void;
  setColors(paper: RGB, ink: RGB): void;
  setRunning(on: boolean): void;
  dispose(): void;
}

// LCG de Numerical Recipes: curto, rápido e igual em todo motor JS
function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/** Um "clone" que compartilha geometria e material com a variante (decisão 2). */
function instance(base: Tree) {
  const g = new THREE.Group();
  for (const m of [base.branchesMesh, base.leavesMesh]) {
    g.add(new THREE.Mesh(m.geometry, m.material));
  }
  return g;
}

export function createGardenScene(
  canvas: HTMLCanvasElement,
  opts: GardenSceneOptions,
): GardenScene | null {
  const renderer = createFogRenderer(canvas, opts.light);
  if (!renderer) return null;

  const scene = new THREE.Scene();
  const branco = gray(1);
  scene.background = branco;
  // densidade absoluta: o jardim tem escala fixa, diferente da árvore sozinha
  scene.fog = new THREE.FogExp2(branco, 0.0042);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 900);
  scene.add(new THREE.HemisphereLight(branco, gray(0.604), 2.2));
  const sol = new THREE.DirectionalLight(branco, 1.1);
  sol.position.set(40, 120, 60);
  scene.add(sol);

  // Trilha: senoide suave em profundidade. `centripetal` evita a laçada que a
  // Catmull-Rom uniforme faz quando dois pontos ficam próximos demais.
  const pontos = Array.from(
    { length: 14 },
    (_, i) => new THREE.Vector3(Math.sin(i * 0.85) * 55, 0, -i * 210),
  );
  const trilha = new THREE.CatmullRomCurve3(pontos, false, "centripetal");

  const chaoGeo = new THREE.PlaneGeometry(6000, 6000);
  const chaoMat = new THREE.MeshBasicMaterial({ color: gray(0.957) });
  const chao = new THREE.Mesh(chaoGeo, chaoMat);
  chao.rotation.x = -Math.PI / 2;
  chao.position.z = -1300;
  scene.add(chao);

  // Uma textura, uma geometria e um material de sombra para o jardim inteiro;
  // o tamanho de cada sombra vem da escala da malha.
  const sombraTex = contactShadowTexture(128, 0.32);
  const sombraGeo = new THREE.PlaneGeometry(1, 1);
  const sombraMat = new THREE.MeshBasicMaterial({
    map: sombraTex,
    transparent: true,
    depthWrite: false,
  });

  // Variantes (decisão 1). Folha mais rala nas de fundo: elas passam ao longe,
  // na névoa densa, e a contagem de folha é o grosso dos vértices.
  const folhas = opts.light ? 10 : 16;
  const rala = (t: Tree) => {
    t.options.leaves.count = folhas;
  };
  const protagonista = growTree("Oak Medium", 4242, roundCrown);
  const fundo = [
    growTree("Oak Medium", 11, rala),
    growTree("Ash Medium", 23, rala),
    growTree("Aspen Medium", 37, rala),
    growTree("Oak Small", 51, rala),
  ];
  const arbustos = [growTree("Bush 1", 7), growTree("Bush 2", 9)];
  const variantes = [protagonista, ...fundo, ...arbustos];
  const tamanho = new Map(
    variantes.map((v) => [v, new THREE.Box3().setFromObject(v).getSize(new THREE.Vector3())]),
  );

  const plantar = (base: Tree, pos: THREE.Vector3, escala: number, rot: number) => {
    const c = instance(base);
    c.position.copy(pos);
    c.scale.setScalar(escala);
    c.rotation.y = rot;
    scene.add(c);
    const tam = tamanho.get(base)!;
    const s = new THREE.Mesh(sombraGeo, sombraMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(pos.x, 0.05, pos.z);
    s.scale.set(tam.x * escala * 1.4, tam.z * escala * 1.1, 1);
    scene.add(s);
  };

  const tangente = new THREE.Vector3();
  const lado = new THREE.Vector3();
  /** Ponto da trilha deslocado para o lado (perpendicular à tangente, no chão). */
  const aoLado = (u: number, desvio: number, out = new THREE.Vector3()) => {
    trilha.getPointAt(THREE.MathUtils.clamp(u, 0, 1), out);
    trilha.getTangentAt(THREE.MathUtils.clamp(u, 0, 1), tangente);
    lado.set(-tangente.z, 0, tangente.x).normalize();
    return out.addScaledVector(lado, desvio);
  };

  // Plantio (decisão 3): mais ralo perto das clareiras, arbusto perto da
  // trilha e árvore mais longe, para a trilha ler como caminho aberto.
  const r = rng(opts.seed);
  const passos = Math.max(8, Math.round(opts.light ? opts.density * 0.6 : opts.density));
  for (let k = 0; k < passos; k++) {
    const u = 0.02 + (k / passos) * 0.97;
    const perto = opts.clearings.some((c) => Math.abs(c - u) < 0.035);
    if (perto && r() < 0.8) continue;
    const sinal = r() < 0.5 ? -1 : 1;
    const arbusto = r() < 0.3;
    const dist = arbusto ? 18 + r() * 26 : 50 + r() * 110;
    const base = arbusto
      ? arbustos[(r() * arbustos.length) | 0]
      : fundo[(r() * fundo.length) | 0];
    const escala = arbusto ? 1.2 + r() * 1.2 : 0.75 + r() * 0.6;
    plantar(base, aoLado(u, sinal * dist), escala, r() * Math.PI * 2);
  }

  // Protagonista em cada clareira, alternando o lado, um pouco à frente do
  // ponto: a câmera olha adiante, então a árvore entra no quadro ANTES de a
  // câmera chegar, e não de lado quando já passou.
  const marcos: THREE.Object3D[] = [];
  opts.clearings.forEach((u, i) => {
    const flanco = i % 2 ? 1 : -1;
    plantar(protagonista, aoLado(u + 0.012, flanco * 26), 1, i * 1.7);
    const marco = opts.landmark?.(i);
    if (marco) {
      // do lado oposto à árvore, mais perto da trilha: os dois dividem o quadro
      marco.position.copy(aoLado(u, -flanco * 15));
      scene.add(marco);
      marcos.push(marco);
    }
  });

  const post = createFogPost(renderer, scene, camera, {
    trail: opts.reduce ? 0 : opts.trail,
    grain: opts.grain,
    light: opts.light,
  });

  const resize = () => {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    post.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pedir();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const alvo = { p: 0, px: 0, py: 0 };
  const atual = { p: 0, px: 0, py: 0 };
  const posCam = new THREE.Vector3();
  const olhar = new THREE.Vector3();
  const relogio = new THREE.Clock();
  let visivel = false;
  let raf = 0;

  const quadro = () => {
    const t = relogio.getElapsedTime();
    const k = opts.reduce ? 1 : 0.055;
    atual.p += (alvo.p - atual.p) * k;
    atual.px += (alvo.px - atual.px) * 0.04;
    atual.py += (alvo.py - atual.py) * 0.04;

    // 0.995 e não 1: `getTangentAt(1)` na ponta da curva aberta vira o olhar
    // para o lado no último quadro da caminhada.
    const u = THREE.MathUtils.clamp(atual.p, 0, 0.995);
    trilha.getPointAt(u, posCam);
    // a respiração de quem caminha: sobe e desce quase nada
    camera.position.set(posCam.x, 13 + (opts.reduce ? 0 : Math.sin(t * 0.9) * 0.35), posCam.z);
    aoLado(u + 0.03, atual.px * 40, olhar);
    olhar.y = 16 - atual.py * 10;
    camera.lookAt(olhar);

    if (!opts.reduce) {
      variantes.forEach((v) => v.update(t));
      marcos.forEach((m) => {
        const spin = Number(m.userData.spin) || 0;
        if (spin) m.rotation.y = t * spin;
      });
      post.setTime(t);
    }
    post.render();
  };

  const animando = () =>
    visivel &&
    (!opts.reduce ||
      Math.abs(alvo.p - atual.p) > 1e-4 ||
      Math.abs(alvo.px - atual.px) > 1e-3 ||
      Math.abs(alvo.py - atual.py) > 1e-3);

  // `raf` só zera depois do quadro, para um `pedir()` de dentro dele não
  // agendar um segundo laço em paralelo
  const tick = () => {
    quadro();
    raf = animando() ? requestAnimationFrame(tick) : 0;
  };
  function pedir() {
    if (visivel && !raf) raf = requestAnimationFrame(tick);
  }

  resize();

  return {
    setProgress(p) {
      alvo.p = THREE.MathUtils.clamp(p, 0, 1);
      pedir();
    },
    setPointer(x, y) {
      // com movimento reduzido o olhar não segue o ponteiro: é deslocamento
      // de câmera que a pessoa não pediu
      if (opts.reduce) return;
      alvo.px = x;
      alvo.py = y;
      pedir();
    },
    setColors(paper, ink) {
      post.setColors(paper, ink);
      pedir();
    },
    setRunning(on) {
      if (on === visivel) return;
      visivel = on;
      if (on) {
        post.resetTrail();
        pedir();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    dispose() {
      visivel = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      // os clones só apontam para o que é das variantes (decisão 1)
      variantes.forEach(disposeTree);
      marcos.forEach(disposeTree);
      chaoGeo.dispose();
      chaoMat.dispose();
      sombraGeo.dispose();
      sombraMat.dispose();
      sombraTex.dispose();
      post.dispose();
      releaseRenderer(renderer);
    },
  };
}
