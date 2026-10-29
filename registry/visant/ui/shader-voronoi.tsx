"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Voronoi — um mosaico de células que derivam devagar, cada uma com um
 * núcleo aceso na cor da marca. Fundo vivo de textura orgânica, para dobra,
 * card de destaque ou tela de espera.
 *
 * Veio do visualizador de áudio do 7Panel Studio (`SHADER_VORONOI`), onde o
 * médio do som empurrava os núcleos. Aqui quem empurra é o ponteiro: passar o
 * mouse rápido desloca os núcleos de fase, e a energia escoa em ~1s.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Duas cores e um tom por célula, não um matiz.** O original dava a cada
 *    célula um matiz do círculo cromático, o que é arco-íris em qualquer
 *    marca. Aqui cada célula sorteia só o QUANTO puxa da cor de célula; a
 *    paleta continua sendo a do tema.
 * 2. **Escala pela altura.** A coordenada divide pela altura do canvas, então
 *    a célula tem o mesmo tamanho num card largo e num quadrado: mudar a
 *    proporção mostra mais células, não células esticadas.
 * 3. **O canvas nasce dentro do efeito**, perde o contexto no unmount e o laço
 *    dorme fora da tela e com movimento reduzido (um quadro parado). Mesmo
 *    contrato do `shader-neon`.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uScale;
uniform float uPulse;
uniform float uDot;
uniform vec3 uFundo;
uniform vec3 uCelula;
uniform vec3 uNucleo;

vec2 hash(vec2 p){
  p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));
  return fract(sin(p)*43758.5453);
}

void main(){
  vec2 uv=gl_FragCoord.xy/uRes.y;
  float t=uTime;
  vec2 p=uv*uScale+vec2(t*.2);
  vec2 ip=floor(p);
  vec2 fp=fract(p);
  float md=8.;
  vec2 mg=vec2(0.);
  vec2 mc=vec2(0.);
  for(int y=-1;y<=1;y++)
  for(int x=-1;x<=1;x++){
    vec2 g=vec2(float(x),float(y));
    vec2 o=hash(ip+g);
    o=.5+.5*sin(t+6.28*o+uPulse*2.);
    vec2 r=g+o-fp;
    float d=dot(r,r);
    if(d<md){md=d;mg=r;mc=ip+g;}
  }
  float dist=sqrt(md);
  float tom=hash(mc+3.7).x;
  vec3 c=mix(uFundo,uCelula,(1.-smoothstep(0.,.9,dist))*(.35+.65*tom));
  float nucleo=1.-smoothstep(0.,uDot+uPulse*.06,dist-.02);
  c=mix(c,uNucleo,nucleo);
  gl_FragColor=vec4(c,1.);
}
`;

/** Paradas padrão: fundo, célula, núcleo. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "color-mix(in oklab, var(--brand) 38%, var(--background))",
  "var(--brand)",
];

export interface ShaderVoronoiProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Tamanho das células: maior é menos célula na tela.
   * @min 0
   * @max 100
   * @step 1
   */
  size?: number;
  /**
   * Velocidade da deriva.
   * @min 0
   * @max 100
   * @step 1
   */
  speed?: number;
  /**
   * Tamanho do núcleo aceso de cada célula.
   * @min 0
   * @max 100
   * @step 1
   */
  core?: number;
  /** Paradas: fundo, célula e núcleo. Qualquer cor CSS ou token. */
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

export function ShaderVoronoi({
  size = 50,
  speed = 35,
  core = 40,
  colors,
  className,
  ...props
}: ShaderVoronoiProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ size, speed, core });
  params.current = { size, speed, core };
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
      time: u("uTime"),
      scale: u("uScale"),
      pulse: u("uPulse"),
      dot: u("uDot"),
      fundo: u("uFundo"),
      celula: u("uCelula"),
      nucleo: u("uNucleo"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduzido = mq.matches;
    let visivel = false;
    let raf = 0;
    let ultimo = 0;
    let tempo = 2;
    let energia = 0;
    let px = -1;
    let py = -1;

    const cores = () => {
      const [a, b, c] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.celula, b ?? a);
      gl.uniform3fv(U.nucleo, c ?? b ?? a);
    };

    const medir = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(wrap.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const desenhar = () => {
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.time, tempo);
      // 0 → 8 células na altura, 100 → 2
      gl.uniform1f(U.scale, 8 - (p.size / 100) * 6);
      gl.uniform1f(U.dot, 0.015 + (p.core / 100) * 0.09);
      gl.uniform1f(U.pulse, energia);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      tempo += dt * (0.05 + (params.current.speed / 100) * 1.4);
      energia *= Math.pow(0.04, dt);
      desenhar();
      raf = visivel && !reduzido ? requestAnimationFrame(quadro) : 0;
    };

    const ligar = () => {
      if (!raf && visivel && !reduzido) {
        ultimo = 0;
        raf = requestAnimationFrame(quadro);
      }
    };
    const desligar = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    redesenhar.current = () => {
      if (!raf) desenhar();
    };

    const mover = (e: PointerEvent) => {
      if (px >= 0) {
        const passo = Math.hypot(e.clientX - px, e.clientY - py);
        energia = Math.min(1, energia + passo * 0.004);
      }
      px = e.clientX;
      py = e.clientY;
    };
    const sair = () => {
      px = py = -1;
    };
    const trocarMovimento = () => {
      reduzido = mq.matches;
      if (reduzido) {
        desligar();
        desenhar();
      } else ligar();
    };

    cores();
    medir();
    desenhar();

    const ro = new ResizeObserver(() => {
      medir();
      desenhar();
    });
    ro.observe(wrap);
    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel) ligar();
      else desligar();
    });
    io.observe(wrap);
    const offTema = onThemeChange(() => {
      cores();
      desenhar();
    });
    mq.addEventListener("change", trocarMovimento);
    wrap.addEventListener("pointermove", mover);
    wrap.addEventListener("pointerleave", sair);

    return () => {
      desligar();
      ro.disconnect();
      io.disconnect();
      offTema();
      mq.removeEventListener("change", trocarMovimento);
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
  }, [size, speed, core]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Mosaico de células em deriva"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
