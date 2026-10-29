"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Gaze — uma grade de olhos cujas pupilas seguem o cursor, e que de
 * vez em quando piscam, cada um no seu tempo. Fundo de dobra que encara de
 * volta: bom para página de erro, tela de espera ou um "estamos de olho".
 *
 * Original da Visant Labs, família texturas: superfície que reage ao ponteiro,
 * um gesto só.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Cada olho mira por conta própria.** A direção sai do centro de CADA
 *    olho até o cursor, então os olhos convergem nele, como uma plateia, em
 *    vez de todos desviarem iguais. Longe, a pupila vai até a borda; perto,
 *    ela recua pro meio e o olho parece focar.
 * 2. **A pupila anda dentro da amêndoa, não do quadrado.** O deslocamento é
 *    achatado na vertical (o olho é mais largo que alto), e a íris é recortada
 *    pela pálpebra; quando o olho pisca, ela some debaixo dela sem truque.
 * 3. **Cada olho pisca no seu ritmo.** Fase e período sorteados por célula,
 *    num hash do índice: nunca pisca a grade inteira junto, e nada fica
 *    guardado em memória por olho.
 * 4. **Sem cursor, olha pra você.** Ao sair, a mira escoa até o centro do
 *    olho: a grade encara quem está lendo. É também o primeiro quadro.
 * 5. **O laço dorme.** O piscar pede tempo, então há laço, mas ele para fora
 *    da tela (IntersectionObserver). Com movimento reduzido, um quadro de
 *    olhos abertos, redesenhado só quando o cursor mexe.
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
uniform float uTime;
uniform vec2 uMira;
uniform float uFoco;
uniform float uSegue;
uniform float uIris;
uniform float uPisca;
uniform vec3 uFundo;
uniform vec3 uOlho;
uniform vec3 uIrisCor;
uniform vec3 uPupila;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float cols=ceil(uRes.x/uCell);
  float ox=(uRes.x-cols*uCell)*.5;
  vec2 id=floor(vec2(px.x-ox,px.y)/uCell);
  vec2 c=vec2(ox,0.)+(id+.5)*uCell;
  vec2 f=(px-c)/uCell;
  float aa=1.4/uCell;

  // piscar: período e fase por olho
  float h=hash(id);
  float periodo=mix(9.,2.6,uPisca)*(.7+.6*hash(id+7.3));
  float fase=fract(uTime/periodo+h)*periodo;
  float fecha=fase<.18?sin(3.14159*fase/.18):0.;
  float abre=1.-fecha*.96;

  float a=.42;
  float b=.25*abre;
  float x=clamp(f.x/a,-1.,1.);
  float borda=abs(f.y)-b*(1.-x*x);
  float dentro=(1.-smoothstep(-aa,aa,borda))*step(abs(f.x),a);

  vec2 d=uMira-c;
  float l=length(d)/uCell;
  vec2 dir=l>.001?d/(l*uCell):vec2(0.);
  float alcance=min(l/2.5,1.)*uFoco*uSegue;
  vec2 ic=dir*alcance*vec2(a*.55,.25*.45);
  float ri=uIris;
  float di=length(f-ic);
  float iris=1.-smoothstep(ri-aa,ri+aa,di);
  float pupila=1.-smoothstep(ri*.45-aa,ri*.45+aa,di);
  float luz=1.-smoothstep(ri*.16-aa,ri*.16+aa,length(f-ic-vec2(-ri*.35,-ri*.35)));

  vec3 olho=uOlho;
  olho=mix(olho,uIrisCor,iris);
  olho=mix(olho,uPupila,pupila);
  olho=mix(olho,uOlho,luz*iris);
  vec3 col=mix(uFundo,olho,dentro);
  float linha=(1.-smoothstep(aa*.5,aa*2.,abs(borda)))*step(abs(f.x),a+aa);
  col=mix(col,uIrisCor,linha*.55);
  gl_FragColor=vec4(col,1.);
}
`;

/** Paradas padrão: fundo, branco do olho, íris, pupila. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "color-mix(in oklab, var(--brand) 10%, var(--background))",
  "var(--brand)",
  "color-mix(in oklab, var(--brand) 25%, var(--foreground))",
];

export interface TexturaGazeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Quantas fileiras de olhos cabem na altura.
   * @min 2
   * @max 10
   * @step 1
   */
  rows?: number;
  /**
   * O quanto a pupila corre atrás do cursor.
   * @min 0
   * @max 100
   * @step 1
   */
  follow?: number;
  /**
   * Tamanho da íris.
   * @min 0
   * @max 100
   * @step 1
   */
  iris?: number;
  /**
   * Frequência das piscadas.
   * @min 0
   * @max 100
   * @step 1
   */
  blink?: number;
  /** Paradas: fundo, branco do olho, íris e pupila. Qualquer cor CSS ou token. */
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

export function TexturaGaze({
  rows = 4,
  follow = 75,
  iris = 50,
  blink = 35,
  colors,
  className,
  ...props
}: TexturaGazeProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ rows, follow, iris, blink });
  params.current = { rows, follow, iris, blink };
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
      time: u("uTime"),
      mira: u("uMira"),
      foco: u("uFoco"),
      segue: u("uSegue"),
      iris: u("uIris"),
      pisca: u("uPisca"),
      fundo: u("uFundo"),
      olho: u("uOlho"),
      irisCor: u("uIrisCor"),
      pupila: u("uPupila"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduzido = mq.matches;
    let visivel = false;
    let raf = 0;
    let ultimo = 0;
    let tempo = 0.5;
    let dpr = 1;
    const alvo = { x: 0, y: 0, foco: 0 };
    const mira = { x: 0, y: 0, foco: 0 };

    const cores = () => {
      const [a, b, c, d] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.olho, b ?? a);
      gl.uniform3fv(U.irisCor, c ?? b ?? a);
      gl.uniform3fv(U.pupila, d ?? a);
    };

    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(wrap.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const desenhar = () => {
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.cell, canvas.height / Math.max(2, Math.min(10, p.rows)));
      // Com movimento reduzido ninguém pisca: o tempo fica longe da janela da piscada.
      gl.uniform1f(U.time, reduzido ? 0.5 : tempo);
      gl.uniform2f(U.mira, mira.x, mira.y);
      gl.uniform1f(U.foco, mira.foco);
      gl.uniform1f(U.segue, p.follow / 100);
      gl.uniform1f(U.iris, 0.08 + (p.iris / 100) * 0.12);
      gl.uniform1f(U.pisca, p.blink / 100);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      tempo += dt;
      const k = 1 - Math.pow(0.82, dt * 60);
      mira.x += (alvo.x - mira.x) * k;
      mira.y += (alvo.y - mira.y) * k;
      mira.foco += (alvo.foco - mira.foco) * k * 0.6;
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
      // Ponteiro em px locais: a vitrine escala o palco com transform.
      const r = wrap.getBoundingClientRect();
      const k = r.width ? wrap.offsetWidth / r.width : 1;
      alvo.x = (e.clientX - r.left) * k * dpr;
      alvo.y = (e.clientY - r.top) * k * dpr;
      alvo.foco = 1;
      if (mira.foco === 0) {
        mira.x = alvo.x;
        mira.y = alvo.y;
      }
      if (reduzido) {
        Object.assign(mira, alvo);
        desenhar();
      }
    };
    const sair = () => {
      alvo.foco = 0;
      if (reduzido) {
        mira.foco = 0;
        desenhar();
      }
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
  }, [rows, follow, iris, blink]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Grade de olhos que seguem o cursor"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
