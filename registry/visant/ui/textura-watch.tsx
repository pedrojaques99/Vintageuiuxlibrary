"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Watch — uma grade de mostradores de relógio em que os ponteiros
 * apontam para o cursor. O ponteiro longo vai direto; o curto chega atrasado,
 * como hora que anda devagar. Fundo de dobra que olha para quem está lendo.
 *
 * Original da Visant Labs, família texturas: superfície que reage ao ponteiro,
 * um gesto só.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Dois alvos, duas pressas.** O ponteiro longo persegue o cursor rápido e
 *    o curto persegue um segundo alvo, mais lento. Parado, os dois se
 *    encontram e o relógio vira bússola; andando, eles se abrem e o mostrador
 *    lê como hora. É isso que separa a peça de uma grade de setas.
 * 2. **Sem laço à toa.** Nada se mexe sem o ponteiro, então não existe quadro
 *    parado sendo redesenhado: o laço só vive enquanto um dos ponteiros ainda
 *    está chegando, e desliga sozinho quando os dois assentam. Com movimento
 *    reduzido eles pulam direto pro alvo.
 * 3. **Escala pela altura.** `rows` conta mostradores na altura; a largura
 *    mostra quantos couberem, centrados. Card largo ganha relógio, não
 *    relógio oval.
 * 4. **Ponteiro em px locais.** A vitrine escala o palco com transform; o
 *    cursor é convertido pela razão entre o tamanho de layout e o desenhado,
 *    senão os ponteiros mirariam ao lado da seta.
 * 5. **Em repouso, o centro.** Sem cursor, todos apontam pro meio do palco: o
 *    primeiro quadro já é um desenho (um leque radial), não uma grade morta.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uCell;
uniform float uPeso;
uniform vec2 uMin;
uniform vec2 uHora;
uniform vec3 uFundo;
uniform vec3 uFace;
uniform vec3 uLongo;
uniform vec3 uCurto;

float seg(vec2 p,vec2 a,vec2 b){
  vec2 pa=p-a,ba=b-a;
  float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
  return length(pa-ba*h);
}
vec2 rumo(vec2 alvo,vec2 c){
  vec2 d=alvo-c;
  float l=length(d);
  return l>.5?d/l:vec2(0.,-1.);
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float cols=ceil(uRes.x/uCell);
  float ox=(uRes.x-cols*uCell)*.5;
  vec2 id=floor(vec2(px.x-ox,px.y)/uCell);
  vec2 c=vec2(ox,0.)+(id+.5)*uCell;
  vec2 f=px-c;
  float d=length(f);
  float r=uCell*.4;
  float aa=1.2;
  float w=max(1.,uPeso);

  vec3 col=uFundo;
  col=mix(col,uFace,1.-smoothstep(r-aa,r,d));
  float aro=1.-smoothstep(w*.5,w*.5+aa,abs(d-r));
  col=mix(col,mix(uFace,uCurto,.55),aro);
  float marca=(1.-smoothstep(w*.5,w*.5+aa,min(abs(f.x),abs(f.y))))*step(r*.74,d)*step(d,r*.88);
  col=mix(col,mix(uFace,uCurto,.7),marca);

  vec2 uh=rumo(uHora,c);
  vec2 um=rumo(uMin,c);
  float curto=seg(px,c-uh*r*.12,c+uh*r*.52);
  float longo=seg(px,c-um*r*.16,c+um*r*.82);
  col=mix(col,uCurto,1.-smoothstep(w*.9,w*.9+aa,curto));
  col=mix(col,uLongo,1.-smoothstep(w*.5,w*.5+aa,longo));
  col=mix(col,uLongo,1.-smoothstep(w*1.4,w*1.4+aa,d));
  gl_FragColor=vec4(col,1.);
}
`;

/** Paradas padrão: fundo, mostrador, ponteiro longo, ponteiro curto. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "color-mix(in oklab, var(--brand) 12%, var(--background))",
  "var(--brand)",
  "color-mix(in oklab, var(--brand) 55%, var(--foreground))",
];

export interface TexturaWatchProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Quantos mostradores cabem na altura.
   * @min 2
   * @max 12
   * @step 1
   */
  rows?: number;
  /**
   * Quanto o ponteiro curto se atrasa atrás do longo.
   * @min 0
   * @max 100
   * @step 1
   */
  trail?: number;
  /**
   * Espessura dos ponteiros.
   * @min 0
   * @max 100
   * @step 1
   */
  weight?: number;
  /** Paradas: fundo, mostrador, ponteiro longo e ponteiro curto. Qualquer cor CSS ou token. */
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

export function TexturaWatch({
  rows = 5,
  trail = 60,
  weight = 40,
  colors,
  className,
  ...props
}: TexturaWatchProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ rows, trail, weight });
  params.current = { rows, trail, weight };
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
      cell: u("uCell"),
      peso: u("uPeso"),
      min: u("uMin"),
      hora: u("uHora"),
      fundo: u("uFundo"),
      face: u("uFace"),
      longo: u("uLongo"),
      curto: u("uCurto"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dpr = 1;
    let raf = 0;
    let ultimo = 0;
    let dentro = false;
    const alvo = { x: 0, y: 0 };
    const longo = { x: 0, y: 0 };
    const curto = { x: 0, y: 0 };

    const cores = () => {
      const [a, b, c, d] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.face, b ?? a);
      gl.uniform3fv(U.longo, c ?? b ?? a);
      gl.uniform3fv(U.curto, d ?? c ?? b ?? a);
    };

    const repousar = () => {
      alvo.x = canvas.width / 2;
      alvo.y = canvas.height / 2;
    };

    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(wrap.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (!dentro) {
        repousar();
        Object.assign(longo, alvo);
        Object.assign(curto, alvo);
      }
    };

    const desenhar = () => {
      const p = params.current;
      const cell = canvas.height / Math.max(2, Math.min(12, p.rows));
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.cell, cell);
      gl.uniform1f(U.peso, cell * (0.012 + (p.weight / 100) * 0.04));
      gl.uniform2f(U.min, longo.x, longo.y);
      gl.uniform2f(U.hora, curto.x, curto.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const chegar = (o: { x: number; y: number }, taxa: number, dt: number) => {
      const k = 1 - Math.pow(1 - taxa, dt * 60);
      o.x += (alvo.x - o.x) * k;
      o.y += (alvo.y - o.y) * k;
      if (Math.hypot(alvo.x - o.x, alvo.y - o.y) < 0.5) Object.assign(o, alvo);
      return o.x === alvo.x && o.y === alvo.y;
    };

    // O laço só vive enquanto um dos ponteiros ainda está chegando.
    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 1 / 60;
      ultimo = agora;
      const lento = 0.14 - (params.current.trail / 100) * 0.12;
      const a = chegar(longo, 0.2, dt);
      const b = chegar(curto, lento, dt);
      desenhar();
      raf = a && b ? 0 : requestAnimationFrame(quadro);
    };
    const pedirQuadro = () => {
      if (mq.matches) {
        Object.assign(longo, alvo);
        Object.assign(curto, alvo);
        desenhar();
      } else if (!raf) {
        ultimo = 0;
        raf = requestAnimationFrame(quadro);
      }
    };

    redesenhar.current = () => {
      if (!raf) desenhar();
    };

    const mover = (e: PointerEvent) => {
      // Ponteiro em px locais: a vitrine escala o palco com transform.
      const r = wrap.getBoundingClientRect();
      const k = r.width ? wrap.offsetWidth / r.width : 1;
      alvo.x = (e.clientX - r.left) * k * dpr;
      alvo.y = (e.clientY - r.top) * k * dpr;
      dentro = true;
      pedirQuadro();
    };
    const sair = () => {
      dentro = false;
      repousar();
      pedirQuadro();
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
  }, [rows, trail, weight]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Grade de relógios cujos ponteiros apontam para o cursor"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
