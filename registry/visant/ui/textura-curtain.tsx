"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Curtain — uma cortina de teatro, dobras verticais de tecido que
 * ondulam onde o ponteiro passa, como mão roçando o veludo. A onda corre pelo
 * pano e morre sozinha. Fundo de abertura, de "o show vai começar", de
 * lançamento.
 *
 * Original da Visant Labs, família texturas: superfície que reage ao ponteiro,
 * um gesto só.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **A onda desloca a fase da dobra, não o pixel.** Cada passada do ponteiro
 *    vira um impulso que empurra a FASE das dobras para o lado em que ele
 *    andou. As dobras balançam inteiras, como pano, em vez de a imagem
 *    entortar como água.
 * 2. **O pano propaga mais na vertical.** A onda se espalha com distância
 *    achatada (anda mais para baixo e para cima que para o lado), como uma
 *    cortina presa no varão: mexer embaixo balança a dobra inteira.
 * 3. **Dobras em leque.** A frequência cai um pouco de cima para baixo: o pano
 *    franzido no varão se abre no chão. Com dobras paralelas a peça leria
 *    como listra.
 * 4. **Memória curta.** Os impulsos moram num anel de 8 posições na CPU; o
 *    mais velho é substituído. Oito bastam: cada um morre em ~2s.
 * 5. **Sem laço à toa.** Pano parado não pede quadro: o laço só vive enquanto
 *    algum impulso está vivo. Com movimento reduzido não há onda que corra;
 *    o pano só se curva parado debaixo do ponteiro e volta ao sair.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uDobras;
uniform float uFundura;
uniform float uOnda;
uniform vec4 uImpulso[8];
uniform vec3 uSombra;
uniform vec3 uTecido;
uniform vec3 uBrilho;

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 p=px/uRes.y;
  float desloca=0.;
  for(int i=0;i<8;i++){
    vec4 o=uImpulso[i];
    if(o.w==0.)continue;
    vec2 d=p-o.xy;
    float dist=length(d*vec2(1.,.45));
    float frente=dist-o.z*.55;
    float anel=exp(-frente*frente*40.)*exp(-o.z*1.8);
    desloca+=o.w*anel*sin(frente*24.+1.57);
  }
  float meio=uRes.x/uRes.y*.5;
  float leque=1.12-.24*p.y;
  float u=(p.x-meio)*uDobras*leque+.18*sin(p.x*uDobras*.37+1.3)+desloca*uOnda;
  float dobra=.5+.5*cos(u*6.2832);
  float relevo=pow(dobra,.75);
  float vinco=pow(1.-dobra,6.);
  vec3 col=mix(uSombra,uTecido,mix(1.,relevo,uFundura));
  col=mix(col,uBrilho,smoothstep(.78,1.,dobra)*.55);
  col=mix(col,uSombra,vinco*.6*uFundura);
  float varao=1.-smoothstep(0.,.12,p.y);
  float chao=smoothstep(.86,1.,p.y);
  col=mix(col,uSombra,(varao*.55+chao*.35)*uFundura);
  gl_FragColor=vec4(col,1.);
}
`;

/** Paradas padrão: sombra da dobra, tecido, brilho. Tudo token. */
const CORES_PADRAO = [
  "color-mix(in oklab, var(--brand) 35%, var(--background))",
  "color-mix(in oklab, var(--brand) 80%, var(--background))",
  "color-mix(in oklab, var(--brand) 70%, var(--foreground))",
];

const VIDA = 2.4;

export interface TexturaCurtainProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Quantas dobras na altura.
   * @min 2
   * @max 24
   * @step 1
   */
  folds?: number;
  /**
   * Profundidade das dobras: o quanto a sombra afunda.
   * @min 0
   * @max 100
   * @step 1
   */
  depth?: number;
  /**
   * Força da onda que o ponteiro deixa.
   * @min 0
   * @max 100
   * @step 1
   */
  ripple?: number;
  /** Paradas: sombra da dobra, tecido e brilho. Qualquer cor CSS ou token. */
  colors?: string[];
}

function compilar(gl: WebGLRenderingContext, frag: string): WebGLProgram | null {
  const shader = (tipo: number, src: string) => {
    const s = gl.createShader(tipo);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERT);
  const fs = shader(gl.FRAGMENT_SHADER, frag);
  const p = gl.createProgram();
  if (!vs || !fs || !p) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}

export function TexturaCurtain({
  folds = 7,
  depth = 65,
  ripple = 55,
  colors,
  className,
  ...props
}: TexturaCurtainProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ folds, depth, ripple });
  params.current = { folds, depth, ripple };
  const redesenhar = React.useRef<() => void>(() => {});
  const coresChave = (colors ?? CORES_PADRAO).join("|");

  React.useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "absolute inset-0 block h-full w-full";
    wrap.appendChild(canvas);
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    const prog = gl && compilar(gl, FRAG);
    if (!gl || !prog) {
      canvas.remove();
      return;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(prog);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      res: u("uRes"),
      dobras: u("uDobras"),
      fundura: u("uFundura"),
      onda: u("uOnda"),
      impulso: u("uImpulso"),
      sombra: u("uSombra"),
      tecido: u("uTecido"),
      brilho: u("uBrilho"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dpr = 1;
    let raf = 0;
    let lx = -1;
    let ly = -1;
    let ultimoImpulso = 0;
    // Anel de impulsos: x, y (em alturas), nascimento (ms) e força com sinal.
    const anel = Array.from({ length: 8 }, () => ({ x: 0, y: 0, t0: 0, f: 0 }));
    let proximo = 0;
    const dados = new Float32Array(32);

    const cores = () => {
      const [a, b, c] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.sombra, a);
      gl.uniform3fv(U.tecido, b ?? a);
      gl.uniform3fv(U.brilho, c ?? b ?? a);
    };

    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(wrap.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    // Devolve se ainda há impulso vivo.
    const desenhar = (agora = performance.now()) => {
      const p = params.current;
      let vivo = false;
      anel.forEach((o, i) => {
        const idade = mq.matches ? 0.18 : (agora - o.t0) / 1000;
        const ativo = o.f !== 0 && idade < VIDA;
        if (ativo) vivo = true;
        dados.set([o.x, o.y, idade, ativo ? o.f : 0], i * 4);
      });
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.dobras, Math.max(2, Math.min(24, p.folds)));
      gl.uniform1f(U.fundura, 0.25 + (p.depth / 100) * 0.75);
      gl.uniform1f(U.onda, (p.ripple / 100) * 0.9);
      gl.uniform4fv(U.impulso, dados);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return vivo;
    };

    // O laço só vive enquanto algum impulso ainda corre pelo pano.
    const quadro = (agora: number) => {
      raf = desenhar(agora) ? requestAnimationFrame(quadro) : 0;
    };

    redesenhar.current = () => {
      if (!raf) desenhar();
    };

    const mover = (e: PointerEvent) => {
      // Ponteiro em px locais: a vitrine escala o palco com transform.
      const r = wrap.getBoundingClientRect();
      const k = r.width ? wrap.offsetWidth / r.width : 1;
      const x = ((e.clientX - r.left) * k * dpr) / canvas.height;
      const y = ((e.clientY - r.top) * k * dpr) / canvas.height;
      if (mq.matches) {
        // Sem onda correndo: um impulso só, parado debaixo do ponteiro.
        anel.forEach((o) => (o.f = 0));
        Object.assign(anel[0], { x, y, t0: 0, f: 0.8 });
        desenhar();
        return;
      }
      const agora = performance.now();
      const passo = lx < 0 ? 0 : Math.hypot(x - lx, y - ly);
      const lado = x >= lx ? 1 : -1;
      lx = x;
      ly = y;
      if (agora - ultimoImpulso < 70 || passo < 0.004) return;
      ultimoImpulso = agora;
      // A força tem o sinal do lado em que o ponteiro andou.
      const f = lado * Math.min(1, passo * 18);
      Object.assign(anel[proximo], { x, y: ly, t0: agora, f });
      proximo = (proximo + 1) % anel.length;
      if (!raf) raf = requestAnimationFrame(quadro);
    };
    const sair = () => {
      lx = ly = -1;
      if (mq.matches) {
        anel.forEach((o) => (o.f = 0));
        desenhar();
      }
    };

    cores();
    medir();
    desenhar();

    const ro = new ResizeObserver(() => {
      medir();
      desenhar();
    });
    ro.observe(wrap);
    const offTema = onThemeChange(() => {
      cores();
      desenhar();
    });
    wrap.addEventListener("pointermove", mover);
    wrap.addEventListener("pointerleave", sair);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      offTema();
      wrap.removeEventListener("pointermove", mover);
      wrap.removeEventListener("pointerleave", sair);
      redesenhar.current = () => {};
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [coresChave]);

  React.useEffect(() => {
    redesenhar.current();
  }, [folds, depth, ripple]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Cortina de dobras que ondula onde o cursor passa"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
