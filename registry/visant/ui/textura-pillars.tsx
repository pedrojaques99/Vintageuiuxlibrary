"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Pillars — um campo de pilares quadrados visto de cima e de frente,
 * em pseudo-3D, que sobem perto do ponteiro como teclas de um pin art. Longe
 * dele ficam baixos, cada um numa altura levemente diferente. Fundo de dobra
 * de dado, de infraestrutura, de "cidade".
 *
 * Original da Visant Labs, família texturas: superfície que reage ao ponteiro,
 * um gesto só.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Sem 3D de verdade.** Cada fileira é um degrau na vertical da tela; o
 *    pilar é uma face da frente e um tampo, deslocados para cima pela altura.
 *    Para cada pixel o shader percorre as fileiras da mais próxima para a mais
 *    funda e para na primeira que cobre o pixel: oclusão certa, sem malha e
 *    sem buffer de profundidade.
 * 2. **Fileiras desencontradas.** Fileira ímpar anda meio pilar para o lado,
 *    como tijolo. Alinhadas, as frestas virariam corredores retos de cima a
 *    baixo e o campo leria como gráfico de barras.
 * 3. **A altura mede no chão.** A distância ao ponteiro é medida da BASE de
 *    cada pilar, não do tampo; senão o pilar alto "fugiria" do cursor ao
 *    subir e o morro tremeria.
 * 4. **Escala pela altura.** `rows` conta fileiras na altura; o card largo
 *    ganha mais pilares, não pilares esticados.
 * 5. **Sem laço à toa.** Pilar parado não pede quadro: o laço só vive enquanto
 *    o morro está subindo, andando ou descendo. Com movimento reduzido ele
 *    aparece já de pé, sem transição.
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
uniform float uAlt;
uniform float uRaio;
uniform vec3 uMorro;
uniform vec3 uFundo;
uniform vec3 uFrente;
uniform vec3 uTopo;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float passo=uCell*.62;
  float tampo=passo*.6;
  float largura=uCell*.66;
  float aa=1.;
  vec3 col=uFundo;
  float jMax=floor((px.y+uAlt+tampo+passo)/passo);
  float jMin=floor(px.y/passo)-1.;
  for(int k=0;k<48;k++){
    float j=jMax-float(k);
    if(j<jMin)break;
    float base=(j+1.)*passo;
    float desvio=mod(j,2.)*.5;
    float i=floor(px.x/uCell-desvio);
    float cx=(i+.5+desvio)*uCell;
    float fx=abs(px.x-cx);
    if(fx>largura*.5)continue;
    vec2 chao=vec2(cx,base-tampo*.5);
    float d=length((chao-uMorro.xy)*vec2(1.,1.6))/uRaio;
    float h=passo*(.25+.45*hash(vec2(i,j)))+uAlt*exp(-d*d)*uMorro.z;
    float topoY=base-h;
    if(px.y>base||px.y<topoY-tampo)continue;
    float lado=smoothstep(largura*.5-aa,largura*.5,fx);
    if(px.y<topoY){
      col=mix(uTopo,uFrente,lado*.4);
    }else{
      float desce=(px.y-topoY)/max(h,1.);
      col=mix(uFrente,uTopo,.3*(1.-desce));
      col=mix(col,uFrente,lado*.5);
    }
    break;
  }
  gl_FragColor=vec4(col,1.);
}
`;

/** Paradas padrão: chão, face da frente, tampo. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "color-mix(in oklab, var(--brand) 60%, black)",
  "var(--brand)",
];

export interface TexturaPillarsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Quantas fileiras de pilares na altura.
   * @min 4
   * @max 24
   * @step 1
   */
  rows?: number;
  /**
   * Altura máxima do morro sob o ponteiro.
   * @min 0
   * @max 100
   * @step 1
   */
  height?: number;
  /**
   * Raio do morro.
   * @min 0
   * @max 100
   * @step 1
   */
  radius?: number;
  /** Paradas: chão, face da frente e tampo. Qualquer cor CSS ou token. */
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

export function TexturaPillars({
  rows = 10,
  height = 60,
  radius = 45,
  colors,
  className,
  ...props
}: TexturaPillarsProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ rows, height, radius });
  params.current = { rows, height, radius };
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
      alt: u("uAlt"),
      raio: u("uRaio"),
      morro: u("uMorro"),
      fundo: u("uFundo"),
      frente: u("uFrente"),
      topo: u("uTopo"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dpr = 1;
    let raf = 0;
    let ultimo = 0;
    const alvo = { x: 0, y: 0, f: 0 };
    const morro = { x: 0, y: 0, f: 0 };

    const cores = () => {
      const [a, b, c] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.frente, b ?? a);
      gl.uniform3fv(U.topo, c ?? b ?? a);
    };

    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(wrap.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const desenhar = () => {
      const p = params.current;
      const cell = canvas.height / Math.max(4, Math.min(24, p.rows)) / 0.62;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.cell, cell);
      // Teto do morro em fileiras: o laço do shader cobre até 48.
      gl.uniform1f(U.alt, Math.min(cell * 0.62 * 40, canvas.height * (0.05 + (p.height / 100) * 0.4)));
      gl.uniform1f(U.raio, canvas.height * (0.08 + (p.radius / 100) * 0.3));
      gl.uniform3f(U.morro, morro.x, morro.y, morro.f);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // O laço só vive enquanto o morro ainda está chegando.
    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 1 / 60;
      ultimo = agora;
      const k = 1 - Math.pow(0.86, dt * 60);
      morro.x += (alvo.x - morro.x) * k;
      morro.y += (alvo.y - morro.y) * k;
      morro.f += (alvo.f - morro.f) * k * 0.8;
      const parado =
        Math.hypot(alvo.x - morro.x, alvo.y - morro.y) < 0.5 && Math.abs(alvo.f - morro.f) < 0.003;
      if (parado) Object.assign(morro, alvo);
      desenhar();
      raf = parado ? 0 : requestAnimationFrame(quadro);
    };
    const pedirQuadro = () => {
      if (mq.matches) {
        Object.assign(morro, alvo);
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
      alvo.f = 1;
      // O morro nasce onde o ponteiro entrou, não desliza do canto.
      if (morro.f < 0.02) {
        morro.x = alvo.x;
        morro.y = alvo.y;
      }
      pedirQuadro();
    };
    const sair = () => {
      alvo.f = 0;
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
  }, [rows, height, radius]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Campo de pilares que sobem perto do cursor"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
