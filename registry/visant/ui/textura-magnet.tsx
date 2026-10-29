"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Magnet — limalha de ferro sobre papel: traços curtos espalhados ao
 * acaso que se alinham às linhas de campo de um ímã preso ao cursor. Perto
 * dele a limalha escurece e desenha o campo; longe, fica bagunçada como caiu.
 *
 * Original da Visant Labs, família texturas: superfície que reage ao ponteiro,
 * um gesto só.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Um ímã de barra, não um ponto.** Um polo só daria traços radiais, uma
 *    estrela sem graça. Com dois polos (norte e sul) a um palmo um do outro,
 *    o campo de dipolo faz os arcos de livro de física, e é isso que se lê
 *    como "limalha".
 * 2. **Direção misturada, não ângulo.** Cada traço tem uma direção própria
 *    sorteada e soma a do campo pesada pela força local. Misturar vetores,
 *    não ângulos, evita o salto de 359° para 0° e deixa a transição entre
 *    bagunça e ordem contínua.
 * 3. **Linha de campo não tem sentido.** O traço é um segmento centrado, então
 *    norte e sul desenham igual; não há seta para trair a física.
 * 4. **Vizinhos entram na conta.** Traço girado passa da própria célula, então
 *    cada pixel olha as 3×3 células em volta e fica com a tinta mais forte;
 *    sem isso os traços sairiam cortados na quina.
 * 5. **Sem laço à toa.** Limalha parada não pede quadro. O laço só vive
 *    enquanto o ímã ainda está chegando no cursor (ou voltando ao centro, ao
 *    sair), e com movimento reduzido ele pula direto.
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
uniform float uLen;
uniform float uForca;
uniform vec2 uIma;
uniform vec3 uFundo;
uniform vec3 uLimalha;

vec2 hash(vec2 p){
  p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));
  return fract(sin(p)*43758.5453);
}
float seg(vec2 p,vec2 a,vec2 b){
  vec2 pa=p-a,ba=b-a;
  float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
  return length(pa-ba*h);
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 ip=floor(px/uCell);
  float sep=uRes.y*.09;
  float aa=1.2;
  float w=max(.8,uCell*.045);
  float tinta=0.;
  for(int y=-1;y<=1;y++)
  for(int x=-1;x<=1;x++){
    vec2 id=ip+vec2(float(x),float(y));
    vec2 hz=hash(id);
    vec2 c=(id+.5+(hz-.5)*.7)*uCell;
    vec2 r1=(c-uIma-vec2(sep,0.))/uRes.y;
    vec2 r2=(c-uIma+vec2(sep,0.))/uRes.y;
    float l1=max(length(r1),.01);
    float l2=max(length(r2),.01);
    vec2 B=r1/(l1*l1*l1)-r2/(l2*l2*l2);
    float m=length(B);
    float peso=smoothstep(0.,1.,sqrt(m)*uForca*.25);
    float ang=hash(id+4.1).x*6.2832;
    vec2 solto=vec2(cos(ang),sin(ang));
    vec2 campo=m>0.?B/m:solto;
    vec2 dir=solto*(1.-peso)+campo*peso;
    float dl=length(dir);
    dir=dl>.001?dir/dl:campo;
    float meia=uCell*uLen*(.75+.35*peso)*(.7+.6*hz.y)*.5;
    float d=seg(px,c-dir*meia,c+dir*meia);
    float t=(1.-smoothstep(w-aa,w+aa,d))*(.3+.7*peso);
    tinta=max(tinta,t);
  }
  gl_FragColor=vec4(mix(uFundo,uLimalha,tinta),1.);
}
`;

/** Paradas padrão: papel e limalha. Tudo token. */
const CORES_PADRAO = ["var(--background)", "var(--brand)"];

export interface TexturaMagnetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Quantos grãos de limalha na altura.
   * @min 10
   * @max 60
   * @step 1
   */
  density?: number;
  /**
   * Comprimento de cada traço.
   * @min 0
   * @max 100
   * @step 1
   */
  length?: number;
  /**
   * Força do ímã: até onde a limalha se alinha.
   * @min 0
   * @max 100
   * @step 1
   */
  strength?: number;
  /** Paradas: papel e limalha. Qualquer cor CSS ou token. */
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

export function TexturaMagnet({
  density = 30,
  length = 55,
  strength = 60,
  colors,
  className,
  ...props
}: TexturaMagnetProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ density, length, strength });
  params.current = { density, length, strength };
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
      len: u("uLen"),
      forca: u("uForca"),
      ima: u("uIma"),
      fundo: u("uFundo"),
      limalha: u("uLimalha"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dpr = 1;
    let raf = 0;
    let ultimo = 0;
    let dentro = false;
    const alvo = { x: 0, y: 0 };
    const ima = { x: 0, y: 0 };

    const cores = () => {
      const [a, b] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.limalha, b ?? a);
    };

    // Em repouso o ímã fica no meio do palco: o primeiro quadro já mostra o campo.
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
        Object.assign(ima, alvo);
      }
    };

    const desenhar = () => {
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.cell, canvas.height / Math.max(10, Math.min(60, p.density)));
      gl.uniform1f(U.len, 0.45 + (p.length / 100) * 0.75);
      gl.uniform1f(U.forca, 0.25 + (p.strength / 100) * 0.75);
      gl.uniform2f(U.ima, ima.x, ima.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // O laço só vive enquanto o ímã ainda está chegando.
    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 1 / 60;
      ultimo = agora;
      const k = 1 - Math.pow(0.84, dt * 60);
      ima.x += (alvo.x - ima.x) * k;
      ima.y += (alvo.y - ima.y) * k;
      if (Math.hypot(alvo.x - ima.x, alvo.y - ima.y) < 0.5) Object.assign(ima, alvo);
      desenhar();
      raf = ima.x === alvo.x && ima.y === alvo.y ? 0 : requestAnimationFrame(quadro);
    };
    const pedirQuadro = () => {
      if (mq.matches) {
        Object.assign(ima, alvo);
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
  }, [density, length, strength]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Limalha de ferro alinhada ao campo de um ímã no cursor"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
