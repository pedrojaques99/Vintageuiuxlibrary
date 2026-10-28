/**
 * Fog Post — o pós-processamento comum às cenas de névoa (`fog-tree`,
 * `fog-garden`): render → rastro de longa exposição → duotone com grão.
 *
 * ── Por que duotone e não material colorido ────────────────────────────────
 *
 * A cena inteira é desenhada em CINZA (céu branco, névoa branca, tronco e copa
 * em cinzas numéricos) e só no último passe a luminância vira a mistura de dois
 * tokens: `paper` nas luzes, `ink` nas sombras. Três ganhos de uma vez:
 *
 * 1. **Nenhuma cor mora na cena.** Troca de marca é troca de dois uniforms.
 * 2. **O dark mode sai de graça.** No escuro, `--background` é escuro e
 *    `--foreground` é claro, então o mesmo passe inverte a foto: árvore clara
 *    numa névoa noturna, sem segunda paleta.
 * 3. **A névoa nunca briga com a marca.** FogExp2 tende ao branco da cena, e o
 *    branco da cena É o papel da marca depois do passe.
 *
 * ── As cores entram cruas no shader, de propósito ─────────────────────────
 *
 * `ShaderMaterial` não passa pela conversão de espaço de cor do three: o que o
 * fragment escreve vai direto para o canvas sRGB. O `resolveCssColor` já
 * devolve sRGB 0..1, então o uniform recebe esses números sem conversão
 * (`setRGB` no espaço de trabalho não converte). Passar por `Color.set(css)`
 * linearizaria o papel e ele sairia um tom mais escuro que o fundo da página —
 * a costura entre o canvas e o resto da seção fica visível.
 *
 * ── O rastro ───────────────────────────────────────────────────────────────
 *
 * `AfterimagePass` mistura o quadro novo com o anterior (`damp` 0..1). Com a
 * câmera andando, o vento nas folhas vira longa exposição em vez de tremor.
 * Com movimento reduzido o passe nem entra na cadeia: rastro sem movimento é
 * só um passe de GPU pago à toa.
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

import type { RGB } from "@/lib/css-color";

/**
 * O passe final. `TAPS` amostras em círculo, com raio que cresce longe do
 * centro: a borda fica mais sonhadora que o miolo, como lente velha. O modo
 * leve corta as amostras pela metade — é o laço mais caro do quadro.
 */
const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec3 uPaper, uInk;
  uniform float uTime, uGrain, uVignette;
  uniform vec2 uRes;
  varying vec2 vUv;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c * vec2(uRes.x / uRes.y, 1.0));
    vec3 acc = texture2D(tDiffuse, vUv).rgb;
    float raio = 1.6 * (1.0 + 3.0 * smoothstep(0.2, 0.9, r));
    for (int i = 0; i < TAPS; i++) {
      float a = float(i) * (6.2831853 / float(TAPS));
      acc += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * raio / uRes).rgb;
    }
    float L = dot(acc / float(TAPS + 1), vec3(0.299, 0.587, 0.114));
    L = smoothstep(0.02, 0.98, L);
    vec3 col = mix(uInk, uPaper, L);
    // a borda volta ao papel: a cena termina dentro da seção, sem moldura
    col = mix(col, uPaper, smoothstep(0.55, 1.1, r) * uVignette);
    // grão em células de 1.5px, sorteado a 24 quadros por segundo (cadência de
    // película); por pixel e por quadro ele vira chiado de TV
    float g = hash(floor(gl_FragCoord.xy / 1.5) + mod(floor(uTime * 24.0), 64.0) * 37.0) - 0.5;
    gl_FragColor = vec4(col + g * uGrain, 1.0);
  }
`;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BRANCO = new THREE.Color(1, 1, 1);

export interface FogPostOptions {
  /** Rastro (damp do AfterimagePass), 0..0.98. 0 tira o passe da cadeia. */
  trail?: number;
  /** Intensidade do grão, 0..0.2. */
  grain?: number;
  /** Quanto a borda volta ao papel, 0..1. */
  vignette?: number;
  /** Modo leve: metade das amostras de desfoque. */
  light?: boolean;
}

export interface FogPost {
  setSize(w: number, h: number): void;
  setColors(paper: RGB, ink: RGB): void;
  /** Tempo em segundos — só o grão lê. Congelado, o grão fica parado. */
  setTime(t: number): void;
  render(): void;
  /**
   * Zera o rastro. Sem isto, voltar de uma aba escondida mostra por alguns
   * quadros o fantasma do último quadro de minutos atrás.
   */
  resetTrail(): void;
  dispose(): void;
}

export function createFogPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  { trail = 0.86, grain = 0.05, vignette = 0.55, light = false }: FogPostOptions = {},
): FogPost {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const damp = THREE.MathUtils.clamp(trail, 0, 0.98);
  const rastro = damp > 0 ? new AfterimagePass(damp) : null;
  if (rastro) composer.addPass(rastro);

  const final = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      // pretos até o primeiro setColors; a cena chama logo depois de nascer
      uPaper: { value: new THREE.Color(1, 1, 1) },
      uInk: { value: new THREE.Color(0, 0, 0) },
      uTime: { value: 0 },
      uGrain: { value: grain },
      uVignette: { value: vignette },
      uRes: { value: new THREE.Vector2(1, 1) },
    },
    defines: { TAPS: light ? 4 : 8 },
    vertexShader,
    fragmentShader,
  });
  composer.addPass(final);

  return {
    setSize(w, h) {
      composer.setSize(w, h);
      final.uniforms.uRes.value.set(w, h);
    },
    setColors(paper, ink) {
      (final.uniforms.uPaper.value as THREE.Color).setRGB(...paper);
      (final.uniforms.uInk.value as THREE.Color).setRGB(...ink);
    },
    setTime(t) {
      final.uniforms.uTime.value = t;
    },
    render() {
      composer.render();
    },
    resetTrail() {
      if (!rastro) return;
      // os dois alvos do afterimage guardam a memória; limpar ambos
      const prev = renderer.getRenderTarget();
      const cor = renderer.getClearColor(new THREE.Color());
      const alfa = renderer.getClearAlpha();
      // branco = papel depois do duotone: o rastro recomeça da névoa, não do preto
      renderer.setClearColor(BRANCO, 1);
      for (const rt of [rastro.textureComp, rastro.textureOld]) {
        renderer.setRenderTarget(rt);
        renderer.clear();
      }
      renderer.setRenderTarget(prev);
      renderer.setClearColor(cor, alfa);
    },
    dispose() {
      rastro?.dispose();
      final.dispose();
      composer.dispose();
    },
  };
}

/**
 * Cinza sRGB 0..1 como o número que `ez-tree` espera em `tint`.
 *
 * O ez-tree lê `tint` como inteiro de cor. Escrever o literal no código seria
 * hex numa pasta que proíbe hex — e, pior, esconderia que o valor é uma
 * LUMINÂNCIA para o duotone, não uma cor. `SRGBColorSpace` explícito para o
 * número sair igual ao que a mão escreveria; sem ele o `Color` lê os floats
 * como lineares e devolve um cinza mais claro.
 */
export function grayTint(v: number): number {
  return gray(v).getHex();
}

/** Cinza sRGB 0..1 como `THREE.Color` — para chão, luz e materiais da cena. */
export function gray(v: number): THREE.Color {
  return new THREE.Color().setRGB(v, v, v, THREE.SRGBColorSpace);
}

/**
 * Sombra de contato: gradiente radial num canvas, sem textura baixada.
 *
 * Na névoa não há sombra projetada que se leia — a luz é difusa. O que ancora
 * a árvore no chão é a mancha escura logo abaixo da copa, e um shadow map de
 * verdade custaria um passe de profundidade inteiro por esse efeito.
 */
export function contactShadowTexture(size = 256, strength = 0.38): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (g) {
    const h = size / 2;
    const grd = g.createRadialGradient(h, h, 0, h, h, h);
    grd.addColorStop(0, `rgba(0,0,0,${strength})`);
    grd.addColorStop(0.58, `rgba(0,0,0,${strength * 0.4})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(c);
}

/** Descarta geometria e material de tudo abaixo de `root`. Textura fica: quem
 *  a criou é quem a guarda (as do ez-tree são cache de módulo, compartilhadas
 *  entre montagens — descartá-las quebraria a próxima árvore). */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    mats.forEach((mat) => mat.dispose());
  });
}

/**
 * Cria o renderer das cenas de névoa, ou devolve `null` se o WebGL não existir.
 *
 * `null` e não exceção: máquina sem WebGL (driver na lista negra, VM, modo de
 * economia) tem de ver a seção com o papel liso e o texto por cima, não uma
 * tela de erro. O componente já pinta o papel por baixo do canvas.
 */
export function createFogRenderer(canvas: HTMLCanvasElement, light: boolean) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !light,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(densidadeDoCanvas(canvas, light));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    return renderer;
  } catch {
    return null;
  }
}

/**
 * Pixels de desenho por pixel de layout, contando a escala VISUAL do canvas.
 *
 * Quem mostra a cena reduzida com `transform: scale` (uma vitrine, um card de
 * preview) não muda o tamanho de layout do canvas, só o desenhado. Com o
 * `devicePixelRatio` cheio no tamanho de layout, a cena pintava 3 a 4,4x mais
 * pixels do que apareciam. Medido sem GPU forte: a fog-tree acordada caía a
 * 9 fps, e metade dos pixels já levava de 13 a 20 fps. Desenhando no tamanho
 * que aparece, a nitidez na tela é a mesma, porque o bitmap e a redução se
 * anulam. Fora de escala (`1`), o resultado é o de antes.
 *
 * Quem chama de novo no `resize` da janela: o `ResizeObserver` não dispara
 * quando só a escala de um ancestral muda.
 */
export function densidadeDoCanvas(canvas: HTMLCanvasElement, light: boolean) {
  const teto = Math.min(window.devicePixelRatio || 1, light ? 1 : 1.5);
  const layout = canvas.offsetWidth;
  const visivel = canvas.getBoundingClientRect().width;
  const escala = layout > 0 && visivel > 0 ? Math.min(1, visivel / layout) : 1;
  // Piso em 0,5: abaixo disso a cena vira borrão mesmo reduzida.
  return Math.max(0.5, teto * escala);
}

/**
 * Devolve o contexto ao navegador já, em vez de esperar o GC.
 *
 * O teto é ≈16 contextos vivos no Chrome. Uma SPA que entra e sai de rota com
 * cena 3D estoura esse teto sem nunca ter duas cenas na tela — e o sintoma é a
 * cena MAIS ANTIGA perdendo o contexto, sem erro que aponte para cá.
 */
export function releaseRenderer(renderer: THREE.WebGLRenderer) {
  renderer.dispose();
  try {
    renderer.forceContextLoss();
  } catch {
    /* contexto já perdido */
  }
}
