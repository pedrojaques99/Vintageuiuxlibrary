/**
 * Fog Tree Scene — a cena do `fog-tree`, em three puro (sem react-three-fiber).
 *
 * Árvore procedural do `@dgreenheck/ez-tree` (MIT), FogExp2, rastro de longa
 * exposição e o duotone do `fog-post`. Vive num arquivo próprio para ser
 * carregada por `import()` só quando a seção chega perto da tela: o ez-tree
 * embute as texturas de casca e folha no bundle, e isso não pode entrar no
 * chunk de quem só renderiza o texto da seção.
 *
 * ── Por que three puro e não fiber ─────────────────────────────────────────
 *
 * A cena é UM objeto, sem estado React dentro: progresso, cor e arrasto chegam
 * por método, 60× por segundo, sem re-render. O fiber cobraria a reconciliação
 * e a linha de versão travada (fiber 8 × React 18, ver `book-3d`) para ganhar
 * nada aqui.
 *
 * Também exporta `growTree`, que o `fog-garden` usa para gerar as variantes do
 * jardim com os mesmos cinzas — as duas cenas têm de ser da mesma floresta.
 */

import * as THREE from "three";
import { Tree, TreePreset } from "@dgreenheck/ez-tree";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { RGB } from "@/lib/css-color";
import {
  contactShadowTexture,
  createFogPost,
  createFogRenderer,
  disposeTree,
  gray,
  grayTint,
  releaseRenderer,
} from "@/lib/fog-post";

/** Os presets do ez-tree, menos a treliça (que não é árvore). */
export type FogTreePreset = Exclude<keyof typeof TreePreset, "Trellis">;

type TreeOptions = Tree["options"];

/**
 * Cinzas do tronco e da copa, em luminância sRGB.
 *
 * Tronco bem escuro e copa no meio da escala: depois do duotone o tronco lê
 * como tinta e a copa como tinta diluída, que é como a névoa come a folhagem
 * antes do tronco numa foto de verdade. Copa escura demais vira um borrão
 * chapado; clara demais some na névoa antes do tronco aparecer.
 */
export const TREE_GRAYS = { bark: 0.165, leaves: 0.435 };

/**
 * A copa redonda da referência (a árvore solitária na neblina).
 *
 * O `Oak Medium` cru sai alto e ralo; estes ajustes o deixam com a copa cheia e
 * baixa e o tronco aparente, que é o que faz a silhueta ler de longe, no meio
 * da névoa. Só se aplica ao preset padrão: nos outros, mexer em ângulo e
 * contagem de galho deforma o que o preset tem de característico.
 */
export function roundCrown(t: Tree) {
  Object.assign(t.options.leaves, { count: 30, size: 3.6, angle: 50 });
  Object.assign(t.options.branch.children, { 0: 8, 1: 5, 2: 3 });
  Object.assign(t.options.branch.angle, { 1: 62, 2: 58, 3: 40 });
}

/**
 * Gera uma árvore em cinza, pronta para o duotone.
 *
 * `options.copy` em vez de `loadPreset`: o `loadPreset` do ez-tree já chama
 * `generate()` por dentro, e gerar de novo depois do ajuste dobrava o custo —
 * no jardim são sete variantes, e cada geração bloqueia a thread principal.
 */
export function growTree(
  preset: FogTreePreset,
  seed: number,
  tweak?: (t: Tree) => void,
): Tree {
  const t = new Tree();
  t.options.copy(TreePreset[preset] as unknown as TreeOptions);
  t.options.seed = seed;
  t.options.bark.tint = grayTint(TREE_GRAYS.bark);
  t.options.leaves.tint = grayTint(TREE_GRAYS.leaves);
  tweak?.(t);
  t.generate();
  return t;
}

export interface FogTreeSceneOptions {
  preset: FogTreePreset;
  seed: number;
  /** Densidade da névoa no começo e no fim do progresso (unidades relativas à
   *  altura da árvore: 1 ≈ a árvore some na distância inicial da câmera). */
  fog: { start: number; end: number };
  trail: number;
  grain: number;
  draggable: boolean;
  reduce: boolean;
  /** Toque ou tela pequena: menos folhas, pixel ratio 1, desfoque mais barato. */
  light: boolean;
}

export interface FogTreeScene {
  setProgress(p: number): void;
  setColors(paper: RGB, ink: RGB): void;
  setRunning(on: boolean): void;
  setDraggable(on: boolean): void;
  dispose(): void;
}

/** `null` quando não há WebGL — o componente fica com o papel liso. */
export function createFogTreeScene(
  canvas: HTMLCanvasElement,
  opts: FogTreeSceneOptions,
): FogTreeScene | null {
  const renderer = createFogRenderer(canvas, opts.light);
  if (!renderer) return null;

  const scene = new THREE.Scene();
  const branco = gray(1);
  scene.background = branco;
  const fog = new THREE.FogExp2(branco, 0.02);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 2000);
  scene.add(new THREE.HemisphereLight(branco, gray(0.604), 2.2));
  const sol = new THREE.DirectionalLight(branco, 1.2);
  sol.position.set(20, 60, 30);
  scene.add(sol);

  const tree = growTree(opts.preset, opts.seed, (t) => {
    if (opts.preset === "Oak Medium") roundCrown(t);
    // menos folha no modo leve: é a maior contagem de vértice da cena
    if (opts.light) t.options.leaves.count = Math.round(t.options.leaves.count * 0.6);
  });
  scene.add(tree);

  const box = new THREE.Box3().setFromObject(tree);
  const size = box.getSize(new THREE.Vector3());
  const altura = size.y;
  const copaY = box.min.y + altura * 0.62;

  // Chão quase branco: depois do duotone vira papel, e a linha do horizonte
  // dissolve na névoa em vez de cortar a cena.
  const chaoGeo = new THREE.PlaneGeometry(altura * 40, altura * 40);
  const chaoMat = new THREE.MeshBasicMaterial({ color: gray(0.957) });
  const chao = new THREE.Mesh(chaoGeo, chaoMat);
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = box.min.y;
  scene.add(chao);

  const sombraTex = contactShadowTexture(256, 0.38);
  const sombraGeo = new THREE.PlaneGeometry(size.x * 1.5, size.x * 1.1);
  const sombraMat = new THREE.MeshBasicMaterial({
    map: sombraTex,
    transparent: true,
    depthWrite: false,
  });
  const sombra = new THREE.Mesh(sombraGeo, sombraMat);
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = box.min.y + 0.05;
  scene.add(sombra);

  const post = createFogPost(renderer, scene, camera, {
    trail: opts.reduce ? 0 : opts.trail,
    grain: opts.grain,
    light: opts.light,
  });

  /*
   * Órbita: o controle decide só o ÂNGULO. A distância é do progresso (abaixo),
   * reescrita a cada quadro — por isso zoom e pan desligados, e o polar preso
   * numa faixa estreita: abaixo dela a câmera entra no chão, acima ela vira
   * planta baixa e a árvore perde a silhueta.
   *
   * Sem `domElement` quando não é arrastável. O OrbitControls põe
   * `touch-action: none` no elemento ao conectar, e isso mata o scroll vertical
   * de quem encosta o dedo na árvore — no celular, a seção vira uma armadilha.
   * O giro ocioso continua: ele roda no `update()`, não depende de evento.
   */
  const foco = new THREE.Vector3(0, copaY * 0.82, 0);
  camera.position.set(0, copaY * 0.55, altura * 3.6);
  const controls = new OrbitControls(camera, null);
  controls.target.copy(foco);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = !opts.reduce;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.45;
  controls.minPolarAngle = Math.PI * 0.36;
  controls.maxPolarAngle = Math.PI * 0.53;
  controls.autoRotate = !opts.reduce;
  controls.autoRotateSpeed = 0.25;
  let arrastando = false;
  const pegar = () => {
    arrastando = true;
    controls.autoRotate = false;
  };
  const soltar = () => {
    arrastando = false;
    controls.autoRotate = !opts.reduce;
  };
  controls.addEventListener("start", pegar);
  controls.addEventListener("end", soltar);
  // com movimento reduzido não há laço: cada arrasto pede o seu quadro
  controls.addEventListener("change", () => pedir());

  let conectado = false;
  const setDraggable = (on: boolean) => {
    if (on === conectado) return;
    conectado = on;
    if (on) {
      controls.domElement = canvas;
      controls.connect();
    } else {
      controls.disconnect();
      soltar();
    }
  };
  setDraggable(opts.draggable);

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

  const alvo = { p: 0 };
  const atual = { p: 0 };
  const dir = new THREE.Vector3();
  const relogio = new THREE.Clock();
  let visivel = false;
  let raf = 0;

  const quadro = () => {
    const t = relogio.getElapsedTime();
    // O progresso chega com inércia própria além da mola do componente: a mola
    // suaviza o scroll, esta suaviza o progresso passado à mão (número cru).
    atual.p += (alvo.p - atual.p) * (opts.reduce ? 1 : 0.06);

    controls.update();
    // Retrato: a copa é mais larga que a tela estreita e sairia cortada nos
    // lados. Recuar pela raiz da proporção devolve a silhueta sem afastar a
    // árvore tanto que ela vire um ponto.
    const retrato = camera.aspect < 0.8 ? Math.sqrt(0.8 / camera.aspect) : 1;
    const dist = THREE.MathUtils.lerp(altura * 3.1, altura * 2.2, atual.p) * retrato;
    dir.subVectors(camera.position, foco).normalize();
    camera.position.copy(foco).addScaledVector(dir, dist);
    camera.lookAt(foco);
    fog.density = THREE.MathUtils.lerp(opts.fog.start, opts.fog.end, atual.p) / (altura * 3);

    if (!opts.reduce) {
      // a árvore inteira balança quase nada, além do vento do shader nas folhas
      tree.rotation.z = Math.sin(t * 0.6) * 0.012;
      tree.update(t);
      post.setTime(t);
    }
    post.render();
  };

  const animando = () =>
    visivel && (!opts.reduce || arrastando || Math.abs(alvo.p - atual.p) > 1e-4);

  // `raf` só zera DEPOIS do quadro: o `controls.update()` lá dentro dispara
  // "change", que chama `pedir()` — com `raf` já zerado, cada quadro agendaria
  // dois, e o laço dobraria a cada volta.
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
    setDraggable,
    dispose() {
      visivel = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      controls.removeEventListener("start", pegar);
      controls.removeEventListener("end", soltar);
      controls.dispose();
      disposeTree(tree);
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
