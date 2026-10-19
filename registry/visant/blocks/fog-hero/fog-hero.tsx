"use client";

import * as React from "react";
import * as THREE from "three";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";
import { fragmentShader, vertexShader } from "./shader";
import { FOG_HERO_PRESET, type FogHeroParams } from "./params";

/**
 * Fog Hero — a dobra de abertura que nasce da névoa.
 *
 * Colhido da hero da YURA (2026-10). Uma tela cheia de fumaça (fbm com domain
 * warp) abre uma clareira do centro, e pela borda da fumaça aparece uma
 * playlist de vídeo em P&B, pintada de tinta sobre papel. O logo, se houver,
 * surge por um dissolve de ruído depois da clareira. Ao rolar, a dobra inteira
 * perde nitidez e some.
 *
 * Decisões que sobrevivem à colheita:
 *
 * 1. **Duas cores, ambas tokens.** `paper` e `ink` (padrão `--background` e
 *    `--foreground`) são resolvidas pelo navegador via `css-color` e relidas a
 *    cada troca de tema. O original tinha dois pares de hex, claro e escuro; o
 *    tema escuro agora é só a marca virando.
 * 2. **A cor vai crua para o shader.** O uniform é `Vector3`, não `THREE.Color`:
 *    o `Color` converte sRGB para linear e o `ShaderMaterial` não converte de
 *    volta, então a borda da hero sairia mais escura que o `bg-background` da
 *    página. Assim o papel do shader é o MESMO pixel do papel do site.
 * 3. **A troca de vídeo acontece no shader, pela névoa.** O próximo vídeo
 *    aparece através do mesmo ruído da fumaça (`uSwap`), e a borda da
 *    dissolução clareia. Cortar seco num `<video>` quebraria a ilusão de que é
 *    tudo a mesma matéria.
 * 4. **Para quando ninguém vê.** Fora da tela ou com a aba escondida o laço sai
 *    e o vídeo pausa. O relógio da hero só anda com ela rodando, então a
 *    abertura e a agenda da troca não "pulam" ao voltar.
 * 5. **Movimento reduzido:** clareira já aberta, logo já assentado, fumaça e
 *    grão congelados, sem troca de vídeo (o primeiro fica parado no primeiro
 *    quadro). O rastro do cursor continua, porque é gesto de quem usa.
 *
 * **O `<h1>` é de quem consome.** O canvas é `aria-hidden`; a hero não sabe o
 * título da página. Ponha o título em `children` (visível) ou como
 * `<h1 className="sr-only">` dentro dele — sem isso a página fica sem h1.
 *
 * Vídeo e logo de outro domínio precisam de CORS (`Access-Control-Allow-Origin`):
 * textura sem isso suja o canvas e o three recusa.
 *
 * Requer `three` e `framer-motion`.
 */

export interface FogHeroProps extends React.HTMLAttributes<HTMLElement> {
  /** Playlist de vídeo. P&B por desenho: o shader lê só a luminância. Vazio = só névoa. */
  videos?: string[];
  /** Imagem com alpha (PNG/WebP) desenhada em tinta no centro. Opcional. */
  logo?: string;
  /** Cor do papel. Qualquer cor CSS ou `var(--token)`. */
  paper?: string;
  /** Cor da tinta (fumaça, vídeo, logo). Qualquer cor CSS ou `var(--token)`. */
  ink?: string;
  /** Ajuste parcial do preset aprovado (`FOG_HERO_PRESET`). */
  params?: Partial<FogHeroParams>;
  /** Intervalo entre trocas de vídeo, em ms. */
  swapEvery?: number;
  /** Duração da dissolução entre dois vídeos, em ms. Longa de propósito: é cena, não corte. */
  swapDuration?: number;
  /** Conteúdo acima do canvas (título, CTA). Ver a nota do `<h1>`. */
  children?: React.ReactNode;
}

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp = (x: number) => Math.min(1, Math.max(0, x));
// O rastro do cursor é desenhado num canvas 2D pequeno: 256² basta para uma
// mancha que vai ser borrada pelo ruído de qualquer jeito.
const TRAIL = 256;

export function FogHero({
  videos = [],
  logo,
  paper = "var(--background)",
  ink = "var(--foreground)",
  params,
  swapEvery = 9000,
  swapDuration = 2800,
  className,
  children,
  ...props
}: FogHeroProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const secRef = React.useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;

  // O laço lê o que estiver nos refs no quadro atual: trocar `params` ou as
  // cores não recria o renderer, só muda o próximo quadro.
  const paramsRef = React.useRef<FogHeroParams>({ ...FOG_HERO_PRESET, ...params });
  paramsRef.current = { ...FOG_HERO_PRESET, ...params };
  const coresRef = React.useRef({ paper, ink });
  coresRef.current = { paper, ink };
  const swapRef = React.useRef({ every: swapEvery, duration: swapDuration });
  swapRef.current = { every: swapEvery, duration: swapDuration };
  const ressincRef = React.useRef<() => void>(() => {});

  // Saída em névoa: ao rolar, a hero perde nitidez e some. A mola não é
  // enfeite — ligado direto no `style`, o `useScroll` pode virar ScrollTimeline
  // nativo, que mede o alcance do offset de outro jeito e terminava a saída
  // antes da hora. Passando pela mola, o cálculo fica em JS e respeita o offset.
  const { scrollYProgress } = useScroll({ target: secRef, offset: ["start start", "end start"] });
  const saida = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.0005 });
  const opacity = useTransform(saida, [0, 0.85], [1, 0]);
  // Desfoque e zoom são movimento; com movimento reduzido a saída é só opacidade.
  const filter = useTransform(saida, [0, 0.85], reduce ? ["none", "none"] : ["blur(0px)", "blur(16px)"]);
  const scale = useTransform(saida, [0, 1], reduce ? [1, 1] : [1, 1.06]);

  const playlist = videos.join("\n");

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fontes = playlist ? playlist.split("\n") : [];

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    // 1.5 de teto: tela cheia de fbm em 3× de densidade custa o triplo e o olho
    // não vê diferença numa imagem que é névoa e grão por definição.
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

    const U = <T,>(value: T) => ({ value });
    const uniforms = {
      uVideo: U<THREE.Texture | null>(null),
      uVideoB: U<THREE.Texture | null>(null),
      uSwap: U(0),
      uLogo: U<THREE.Texture | null>(null),
      uLogoOn: U(0),
      uTrail: U<THREE.Texture | null>(null),
      uRes: U(new THREE.Vector2()),
      uVideoRes: U(new THREE.Vector2(16, 9)),
      uVideoResB: U(new THREE.Vector2(16, 9)),
      uLogoRes: U(new THREE.Vector2(1, 1)),
      uTime: U(0),
      uIntro: U(reduce ? 1 : 0),
      uLogoIn: U(reduce ? 1 : 0),
      uScroll: U(0),
      uVideoReady: U(0),
      uPaper: U(new THREE.Vector3()),
      uInk: U(new THREE.Vector3()),
      uGrain: U(0), uGrainSize: U(1), uGrainFps: U(24), uSoft: U(0), uSpray: U(0),
      uFogOpacity: U(1), uSmokeLift: U(0), uContrast: U(1), uHaze: U(0), uClear: U(0.9),
      uCenter: U(0.8), uScale: U(1), uSpeed: U(1), uWarp: U(0.7), uDetail: U(0.06),
      uPhoto: U(0.7), uFlipY: U(1), uVideoZoom: U(1), uVideoY: U(0), uVignette: U(0.15),
      uLogoSize: U(0.3), uLogoBleed: U(0.006), uCursor: U(0.5),
    };

    // ── Mídia ───────────────────────────────────────────────────────────────
    const els = fontes.map((src, i) => {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.loop = true;
      // Sem `playsInline` o iOS abre o vídeo em tela cheia no primeiro play.
      v.playsInline = true;
      // Só o primeiro baixa inteiro; os outros esperam a vez com metadata.
      v.preload = i === 0 ? "auto" : "metadata";
      v.src = src;
      return v;
    });
    const texs = els.map((v) => new THREE.VideoTexture(v));
    const resDe = (i: number, alvo: THREE.Vector2) => {
      const v = els[i];
      if (v?.videoWidth) alvo.set(v.videoWidth, v.videoHeight);
    };
    els.forEach((v, i) =>
      v.addEventListener("loadedmetadata", () => {
        if (i === atual) resDe(i, uniforms.uVideoRes.value);
        if (i === proxima) resDe(i, uniforms.uVideoResB.value);
      }),
    );
    if (els[0]) {
      uniforms.uVideo.value = texs[0];
      uniforms.uVideoB.value = texs[0];
      const pronto = () => {
        uniforms.uVideoReady.value = 1;
        // Parado (movimento reduzido), o VideoTexture não recebe quadro novo
        // sozinho: sem este empurrão a foto nunca sobe para a GPU.
        texs[0].needsUpdate = true;
      };
      els[0].addEventListener(reduce ? "loadeddata" : "playing", pronto, { once: true });
    }

    let logoTex: THREE.Texture | null = null;
    if (logo) {
      logoTex = new THREE.TextureLoader().load(logo, (tex) => {
        const img = tex.image as HTMLImageElement;
        uniforms.uLogoRes.value.set(img.width, img.height);
        uniforms.uLogo.value = tex;
        uniforms.uLogoOn.value = 1;
      });
    }

    // ── Rastro do cursor: canvas 2D que desbota a cada quadro ────────────────
    // É máscara, não cor: preto = sem rastro, branco = rastro cheio. O shader só
    // lê o canal R, por isso aqui pode ter preto e branco literais.
    const trail = document.createElement("canvas");
    trail.width = trail.height = TRAIL;
    const tctx = trail.getContext("2d")!;
    tctx.fillStyle = "rgb(0 0 0)";
    tctx.fillRect(0, 0, TRAIL, TRAIL);
    const trailTex = new THREE.CanvasTexture(trail);
    uniforms.uTrail.value = trailTex;
    const pointer = { x: -1, y: -1, px: -1, py: -1 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * TRAIL;
      pointer.y = ((e.clientY - r.top) / r.height) * TRAIL;
    };
    // Na janela, não no canvas: o `children` fica por cima e engoliria o evento.
    window.addEventListener("pointermove", onMove, { passive: true });

    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.Camera();

    const resize = () => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      renderer.getDrawingBufferSize(uniforms.uRes.value);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // ── Cor: tokens resolvidos, com transição suave na troca de tema ─────────
    const alvo = { paper: new THREE.Vector3(), ink: new THREE.Vector3() };
    const sincCores = () => {
      const el = secRef.current ?? document.documentElement;
      alvo.paper.fromArray(resolveCssColor(coresRef.current.paper, el));
      alvo.ink.fromArray(resolveCssColor(coresRef.current.ink, el));
    };
    sincCores();
    uniforms.uPaper.value.copy(alvo.paper);
    uniforms.uInk.value.copy(alvo.ink);
    ressincRef.current = sincCores;
    const pararTema = onThemeChange(sincCores);

    // ── Agenda e relógio ─────────────────────────────────────────────────────
    let atual = 0;
    let proxima = -1;
    let trocaInicio = -1; // em segundos do relógio da hero
    let ultimaTroca = 0;
    let s = 0;
    let ultimoQuadro = -1;

    const quadro = (agora: number) => {
      // dt com teto: depois de uma pausa o relógio retoma de onde parou em vez
      // de saltar o tempo que a hero ficou fora da tela.
      const dt = ultimoQuadro < 0 ? 0 : Math.min(0.25, (agora - ultimoQuadro) / 1000);
      ultimoQuadro = agora;
      s += dt;
      const p = paramsRef.current;
      const u = uniforms;
      // Movimento reduzido: tempo fixo num ponto qualquer da deriva (o t = 0
      // do ruído tem um padrão simétrico que denuncia a origem).
      u.uTime.value = reduce ? 12 : s;

      const { every, duration } = swapRef.current;
      if (!reduce && els.length > 1 && trocaInicio < 0 && (s - ultimaTroca) * 1000 > every) {
        proxima = (atual + 1) % els.length;
        els[proxima].currentTime = 0;
        els[proxima].play().catch(() => {});
        u.uVideoB.value = texs[proxima];
        resDe(proxima, u.uVideoResB.value);
        trocaInicio = s;
      }
      if (trocaInicio >= 0) {
        const k = clamp(((s - trocaInicio) * 1000) / Math.max(1, duration));
        u.uSwap.value = easeInOut(k);
        if (k >= 1) {
          els[atual].pause();
          atual = proxima;
          proxima = -1;
          u.uVideo.value = texs[atual];
          u.uVideoRes.value.copy(u.uVideoResB.value);
          u.uSwap.value = 0;
          trocaInicio = -1;
          ultimaTroca = s;
        }
      }
      if (!reduce) {
        const d = p.introDur;
        u.uIntro.value = easeInOut(clamp((s - 0.5) / d));
        u.uLogoIn.value = easeInOut(clamp((s - 0.5 - d * 0.47) / (d * 0.56)));
      }
      u.uScroll.value = p.scrollClose ? easeInOut(clamp(saida.get())) : 0;

      // Troca de tema em ~0.5s, não num corte: o papel do site muda por CSS
      // num quadro, e a hero acompanhando devagar lê como névoa assentando.
      u.uPaper.value.lerp(alvo.paper, 0.08);
      u.uInk.value.lerp(alvo.ink, 0.08);

      u.uGrain.value = p.grain; u.uGrainSize.value = p.grainSize;
      u.uGrainFps.value = reduce ? 0 : p.grainFps;
      u.uSoft.value = p.soft; u.uSpray.value = p.spray; u.uFogOpacity.value = p.fogOpacity;
      u.uSmokeLift.value = p.smokeLift; u.uContrast.value = p.contrast; u.uHaze.value = p.haze;
      u.uClear.value = p.clear; u.uCenter.value = p.center; u.uScale.value = p.scale;
      u.uSpeed.value = p.speed; u.uWarp.value = p.warp; u.uDetail.value = p.detail;
      u.uPhoto.value = p.photo; u.uFlipY.value = p.flipY ? 1 : 0;
      u.uVideoZoom.value = p.videoZoom; u.uVideoY.value = p.videoY; u.uVignette.value = p.vignette;
      u.uLogoSize.value = p.logoSize; u.uLogoBleed.value = p.logoBleed; u.uCursor.value = p.cursor;

      tctx.fillStyle = `rgba(0,0,0,${p.trailFade})`;
      tctx.fillRect(0, 0, TRAIL, TRAIL);
      if (pointer.x >= 0) {
        const vel = pointer.px < 0 ? 0 : Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
        const rad = 18 + Math.min(vel, 30) * 1.2;
        const grd = tctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, rad);
        grd.addColorStop(0, `rgba(255,255,255,${0.12 + Math.min(vel, 30) * 0.012})`);
        grd.addColorStop(1, "rgba(255,255,255,0)");
        tctx.fillStyle = grd;
        tctx.beginPath();
        tctx.arc(pointer.x, pointer.y, rad, 0, Math.PI * 2);
        tctx.fill();
        pointer.px = pointer.x;
        pointer.py = pointer.y;
      }
      trailTex.needsUpdate = true;

      renderer.render(scene, camera);
    };

    // ── Rodar só quando visível ──────────────────────────────────────────────
    let naTela = true;
    let rodando = false;
    const aplicar = () => {
      const deve = naTela && !document.hidden;
      if (deve === rodando) return;
      rodando = deve;
      if (deve) {
        ultimoQuadro = -1;
        renderer.setAnimationLoop(quadro);
        if (!reduce) {
          els[atual]?.play().catch(() => {});
          if (proxima >= 0) els[proxima].play().catch(() => {});
        }
      } else {
        renderer.setAnimationLoop(null);
        els.forEach((v) => v.pause());
      }
    };
    const io = new IntersectionObserver(([e]) => {
      naTela = e.isIntersecting;
      aplicar();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", aplicar);
    aplicar();

    return () => {
      renderer.setAnimationLoop(null);
      io.disconnect();
      ro.disconnect();
      pararTema();
      ressincRef.current = () => {};
      document.removeEventListener("visibilitychange", aplicar);
      window.removeEventListener("pointermove", onMove);
      // Soltar o src é o que libera o decodificador; só `pause()` deixa o
      // buffer do vídeo preso até o GC decidir.
      els.forEach((v) => {
        v.pause();
        v.removeAttribute("src");
        v.load();
      });
      [...texs, logoTex, trailTex].forEach((tex) => tex?.dispose());
      material.dispose();
      geometry.dispose();
      renderer.dispose();
    };
    // `saida` é estável (motion value); `reduce` muda raramente e pede cena nova.
  }, [playlist, logo, reduce, saida]);

  // Cor trocada por prop (não por tema) também precisa reler os tokens.
  React.useEffect(() => {
    ressincRef.current();
  }, [paper, ink]);

  return (
    <section
      ref={secRef}
      className={cn("relative h-svh overflow-hidden bg-background", className)}
      {...props}
    >
      <motion.div className="h-full w-full" style={{ opacity, filter, scale }}>
        <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
      </motion.div>
      {children ? <div className="absolute inset-0 z-10">{children}</div> : null}
    </section>
  );
}
