"use client";

import * as React from "react";
import type * as THREE_NS from "three";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Lathe Object — um produto de revolução em 3D, a partir de um perfil.
 *
 * Colhido do rodapé da YURA (2026-10), onde um difusor de varetas girava ao
 * lado do fecho. Quase todo objeto de embalagem é um torno: frasco, vela, pote,
 * garrafa, xícara. Um perfil de meia silhueta (`[x, y][]`) revolvido em 64
 * segmentos dá o objeto inteiro, sem modelo baixado, sem GLTF, sem textura.
 *
 * Decisões que sobrevivem à colheita:
 *
 * 1. **O three só chega perto da tela.** O módulo é importado dentro do
 *    observer (200px de margem), não no topo do arquivo: contexto WebGL é
 *    recurso contado pelo navegador, e o chunk do three pesa mais que a página
 *    de rodapé onde a peça costuma morar.
 * 2. **Cor é token, relido a cada tema.** `body` e `detail` aceitam qualquer cor
 *    CSS; o padrão é `--muted-foreground` para o corpo (cinza médio nos dois
 *    temas, que é onde a luz da cena tem gradação para mostrar a forma) e
 *    `--foreground` para as varetas — vareta tem 0.03 de raio, e só o par
 *    foreground/background garante contraste para uma linha tão fina.
 * 3. **A câmera enquadra o objeto, não o contrário.** O grupo é centrado pela
 *    caixa envolvente e a distância sai do FOV, então trocar o perfil (pote
 *    baixo, garrafa alta) não exige reposicionar câmera nenhuma.
 * 4. **Arrastar gira, mas não aproxima nem desloca.** Zoom e pan num objeto de
 *    vitrine só servem para o visitante perdê-lo de vista; o ângulo polar fica
 *    preso para nunca mostrar o fundo chapado do torno.
 * 5. **Vento no hover.** As varetas balançam com fase própria cada uma; o
 *    ponteiro em cima quadruplica a amplitude, e ao sair ela assenta devagar.
 * 6. **Para quando ninguém vê** (fora da tela ou aba escondida). Com movimento
 *    reduzido não há laço nenhum: sem giro, sem vento, e a cena só redesenha
 *    quando o usuário arrasta.
 *
 * Requer `three`.
 */

export type LatheProfile = [number, number][];

/** O frasco do difusor YURA: base arredondada, ombro, gargalo e tampa. */
export const DIFFUSER_PROFILE: LatheProfile = [
  [0, 0], [0.86, 0], [0.98, 0.06], [1, 0.2], [1, 2.05], [0.96, 2.35], [0.82, 2.58],
  [0.5, 2.74], [0.4, 2.8], [0.4, 3.02], [0.48, 3.04], [0.5, 3.1], [0.5, 3.36], [0.44, 3.4], [0, 3.4],
];

export interface LatheSticks {
  /** Quantas varetas, em leque a partir do gargalo. */
  count?: number;
  /** Comprimento, nas mesmas unidades do perfil. */
  length?: number;
}

export interface LatheObjectProps extends React.HTMLAttributes<HTMLCanvasElement> {
  /** Meia silhueta, de baixo para cima: `[raio, altura]`. Feche no eixo (`x = 0`) nas pontas. */
  profile?: LatheProfile;
  /** Varetas de difusor saindo do topo. Ausente = só o objeto. */
  sticks?: LatheSticks | boolean;
  /** Cor do corpo. Qualquer cor CSS ou `var(--token)`. */
  body?: string;
  /** Cor das varetas. Qualquer cor CSS ou `var(--token)`. */
  detail?: string;
  /** Gira sozinho enquanto ninguém arrasta. Ignorado com movimento reduzido. */
  autoRotate?: boolean;
  /** Descrição para leitor de tela. O canvas é `role="img"`. */
  "aria-label"?: string;
}

interface Cena {
  setColors(body: string, detail: string): void;
  setRunning(on: boolean): void;
  setWind(on: boolean): void;
  dispose(): void;
}

async function criarCena(
  canvas: HTMLCanvasElement,
  opts: {
    profile: LatheProfile;
    sticks: Required<LatheSticks> | null;
    autoRotate: boolean;
    reduce: boolean;
  },
): Promise<Cena> {
  const [THREE, { OrbitControls }] = await Promise.all([
    import("three"),
    import("three/examples/jsm/controls/OrbitControls.js"),
  ]);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Transparente: o fundo é o da página, então a peça vive em qualquer tema.
  renderer.setClearColor(0, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  // Luz neutra (branco e cinza em matemática pura): quem tinge é o material.
  scene.add(new THREE.HemisphereLight(new THREE.Color(1, 1, 1), new THREE.Color(0.27, 0.27, 0.27), 1.6));
  const luz = new THREE.DirectionalLight(new THREE.Color(1, 1, 1), 1.8);
  luz.position.set(4, 6, 5);
  scene.add(luz);

  const matCorpo = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 });
  const matVareta = new THREE.MeshStandardMaterial({ roughness: 0.9 });

  const geoCorpo = new THREE.LatheGeometry(
    opts.profile.map(([x, y]) => new THREE.Vector2(x, y)),
    64,
  );
  const corpo = new THREE.Mesh(geoCorpo, matCorpo);

  const peca = new THREE.Group();
  peca.add(corpo);

  // Varetas: leque a partir do gargalo, cada uma com fase própria para o vento.
  const varetas = new THREE.Group();
  let geoVareta: THREE_NS.CylinderGeometry | null = null;
  const fases: number[] = [];
  if (opts.sticks) {
    const { count, length } = opts.sticks;
    const topo = Math.max(...opts.profile.map(([, y]) => y));
    // O gargalo é o maior raio no alto do perfil (descontado o fecho no eixo).
    const noTopo = opts.profile.filter(([x, y]) => x > 0 && y > topo - 0.5);
    const gargalo = noTopo.length ? Math.min(...noTopo.map(([x]) => x)) : 0.4;
    varetas.position.y = topo - 0.1;
    geoVareta = new THREE.CylinderGeometry(0.028, 0.028, length, 8);
    // Pivô na base: a vareta balança presa no gargalo, não pelo meio.
    geoVareta.translate(0, length / 2, 0);
    const leque = gargalo * 0.3;
    for (let i = 0; i < count; i++) {
      const v = new THREE.Mesh(geoVareta, matVareta);
      const a = (i / count) * Math.PI * 2;
      v.position.set(Math.cos(a) * leque, 0, Math.sin(a) * leque);
      v.rotation.z = Math.cos(a) * 0.16;
      v.rotation.x = Math.sin(a) * 0.16;
      v.userData.base = { x: v.rotation.x, z: v.rotation.z };
      fases.push(i * 0.9);
      varetas.add(v);
    }
    peca.add(varetas);
  }

  // Centraliza pela caixa e guarda o tamanho para o enquadramento.
  const caixa = new THREE.Box3().setFromObject(peca);
  const tamanho = caixa.getSize(new THREE.Vector3());
  const centro = caixa.getCenter(new THREE.Vector3());
  peca.position.sub(centro);
  scene.add(peca);

  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = !opts.reduce;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.8;
  controls.minPolarAngle = Math.PI * 0.3;
  controls.maxPolarAngle = Math.PI * 0.62;
  const giroLivre = opts.autoRotate && !opts.reduce;
  controls.autoRotate = giroLivre;
  controls.autoRotateSpeed = 1.2;
  const pegar = () => {
    controls.autoRotate = false;
  };
  const soltar = () => {
    controls.autoRotate = giroLivre;
  };
  controls.addEventListener("start", pegar);
  controls.addEventListener("end", soltar);

  const quadroUnico = () => renderer.render(scene, camera);
  // Sem laço (movimento reduzido), o arrasto redesenha sob demanda.
  if (opts.reduce) controls.addEventListener("change", quadroUnico);

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Distância que faz caber a altura OU a largura (a que apertar mais), com
    // um respiro curto: a peça é o assunto, e o original ocupava o quadro quase
    // inteiro. Somar meio raio compensa a face da frente, que fica mais perto
    // da câmera que o eixo. Levemente de cima, como no original (3.2 / 13.5).
    const meiaVert = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const raio = Math.max(tamanho.x, tamanho.z) / 2;
    const dist = Math.max(tamanho.y / 2 / meiaVert, raio / (meiaVert * camera.aspect)) * 1.04 + raio * 0.5;
    const dir = new THREE.Vector3(0, 0.237, 1).normalize();
    camera.position.copy(dir.multiplyScalar(dist));
    camera.updateProjectionMatrix();
    controls.update();
    if (!rodando) quadroUnico();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let rodando = false;
  let vento = 0;
  let ventoAlvo = 0.25;
  const relogio = new THREE.Clock();

  const quadro = () => {
    const t = relogio.getElapsedTime();
    vento += (ventoAlvo - vento) * 0.05;
    varetas.children.forEach((v, i) => {
      const b = v.userData.base as { x: number; z: number };
      v.rotation.z = b.z + Math.sin(t * 1.3 + fases[i]) * 0.05 * vento;
      v.rotation.x = b.x + Math.cos(t * 1.1 + fases[i]) * 0.05 * vento;
    });
    controls.update();
    renderer.render(scene, camera);
  };

  resize();

  return {
    setColors: (body, detail) => {
      matCorpo.color.setRGB(...resolveCssColor(body, canvas), THREE.SRGBColorSpace);
      matVareta.color.setRGB(...resolveCssColor(detail, canvas), THREE.SRGBColorSpace);
      if (!rodando) quadroUnico();
    },
    setRunning: (on) => {
      const deve = on && !opts.reduce;
      if (deve === rodando) return;
      rodando = deve;
      renderer.setAnimationLoop(deve ? quadro : null);
      if (!deve) quadroUnico();
    },
    setWind: (on) => {
      ventoAlvo = on ? 1 : 0.25;
    },
    dispose: () => {
      rodando = false;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.removeEventListener("start", pegar);
      controls.removeEventListener("end", soltar);
      controls.removeEventListener("change", quadroUnico);
      controls.dispose();
      geoCorpo.dispose();
      geoVareta?.dispose();
      matCorpo.dispose();
      matVareta.dispose();
      renderer.dispose();
    },
  };
}

export function LatheObject({
  profile = DIFFUSER_PROFILE,
  sticks,
  body = "var(--muted-foreground)",
  detail = "var(--foreground)",
  autoRotate = true,
  "aria-label": ariaLabel = "Objeto em 3D, arraste para girar",
  className,
  onPointerEnter,
  onPointerLeave,
  ...props
}: LatheObjectProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const cenaRef = React.useRef<Cena | null>(null);
  const coresRef = React.useRef({ body, detail });
  coresRef.current = { body, detail };

  // Geometria entra por valor: um `profile` literal no JSX muda de identidade a
  // cada render, e recriar o renderer por isso derrubaria o contexto WebGL.
  const chave = JSON.stringify({ profile, sticks, autoRotate });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cfg = JSON.parse(chave) as {
      profile: LatheProfile;
      sticks?: LatheSticks | boolean;
      autoRotate: boolean;
    };
    const st = cfg.sticks
      ? { count: 7, length: 3.2, ...(cfg.sticks === true ? {} : cfg.sticks) }
      : null;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cena: Cena | null = null;
    let criando = false;
    let vivo = true;
    let naTela = false;
    const aplicar = () => cena?.setRunning(naTela && !document.hidden);

    const io = new IntersectionObserver(
      async ([e]) => {
        naTela = e.isIntersecting;
        if (naTela && !cena && !criando) {
          criando = true;
          const nova = await criarCena(canvas, {
            profile: cfg.profile,
            sticks: st,
            autoRotate: cfg.autoRotate,
            reduce,
          });
          // Desmontou enquanto o three baixava: descarta em vez de vazar o contexto.
          if (!vivo) return nova.dispose();
          cena = nova;
          cenaRef.current = nova;
          nova.setColors(coresRef.current.body, coresRef.current.detail);
        }
        aplicar();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(canvas);
    document.addEventListener("visibilitychange", aplicar);
    const pararTema = onThemeChange(() =>
      cena?.setColors(coresRef.current.body, coresRef.current.detail),
    );

    return () => {
      vivo = false;
      io.disconnect();
      pararTema();
      document.removeEventListener("visibilitychange", aplicar);
      cena?.dispose();
      cenaRef.current = null;
    };
  }, [chave]);

  React.useEffect(() => {
    cenaRef.current?.setColors(body, detail);
  }, [body, detail]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        cenaRef.current?.setWind(true);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        cenaRef.current?.setWind(false);
      }}
      // `touch-none`: sem isso o arrasto no celular rola a página em vez de girar.
      className={cn("block h-full w-full cursor-grab touch-none active:cursor-grabbing", className)}
      {...props}
    />
  );
}
