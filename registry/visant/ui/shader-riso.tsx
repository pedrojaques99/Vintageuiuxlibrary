"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Riso — uma imagem impressa em duas tintas de risografia: a marca nos
 * tons e uma tinta escura só nas sombras, cada uma com seu ângulo, seu grão e
 * um registro que não bate direito, como sai da máquina de verdade.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader de risografia que o estúdio e o servidor rodam igual). Lá são até
 * quatro tintas escolhidas pelo usuário; aqui são duas, tiradas do tema.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Separação por cobertura, não por cor da tinta.** O original separa cada
 *    tinta medindo a distância do pixel até a cor dela sobre o papel, o que
 *    pressupõe papel claro. Aqui a primeira tinta pega toda a cobertura
 *    (1 − luminância) e a segunda só o terço mais escuro. Funciona com papel
 *    escuro no tema escuro, e a imagem continua legível nas duas.
 * 2. **Sobrepor, não multiplicar.** Tinta de riso multiplica no papel branco;
 *    no papel escuro a multiplicação apaga tudo. As camadas entram por cima
 *    (`mix`), o que lê como serigrafia no escuro e como riso no claro.
 * 3. **As três retículas do original ficam.** Grão estocástico (o riso), ponto
 *    de retícula e Bayer, escolhidos por `mode`, com o hash e a queda de tinta
 *    (`dropout`) de lá. É o que dá falha de máquina e não de filtro.
 * 4. **Desenha sob demanda.** Imagem parada não pede quadro: desenha na carga,
 *    no tema, no tamanho e no knob. Não há laço para pausar fora da tela.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform vec2 uImg;
uniform sampler2D uTex;
uniform float uCell;
uniform float uMis;
uniform float uModo;
uniform float uRuido;
uniform vec3 uPapel;
uniform vec3 uTinta0;
uniform vec3 uTinta1;

float hash(vec2 p){
  p=50.*fract(p*.3183099+vec2(.71,.113));
  return fract(p.x*p.y*(p.x+p.y));
}

float cobertura(vec2 px){
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return 0.;
  vec4 c=texture2D(uTex,uv);
  float lum=dot(c.rgb,vec3(.299,.587,.114));
  return clamp(((1.-lum)*c.a-.5)*1.4+.5,0.,1.);
}

vec2 girar(vec2 px,float graus){
  float r=radians(graus);
  vec2 c=px-uRes*.5;
  return mat2(cos(r),-sin(r),sin(r),cos(r))*c+uRes*.5;
}

float bayer4(vec2 p){
  float i=mod(p.x,4.)+mod(p.y,4.)*4.;
  if(i<.5)return 0.;if(i<1.5)return 8.;if(i<2.5)return 2.;if(i<3.5)return 10.;
  if(i<4.5)return 12.;if(i<5.5)return 4.;if(i<6.5)return 14.;if(i<7.5)return 6.;
  if(i<8.5)return 3.;if(i<9.5)return 11.;if(i<10.5)return 1.;if(i<11.5)return 9.;
  if(i<12.5)return 15.;if(i<13.5)return 7.;if(i<14.5)return 13.;return 5.;
}

float tinta(vec2 px,float v,float graus,float semente){
  if(v<.005)return 0.;
  if(v>.995)return 1.;
  vec2 pos=girar(px,graus)/uCell;
  vec2 cel=floor(pos);
  vec2 f=fract(pos)-.5;
  float g;
  if(uModo<.5){
    // grão de riso: limiar por célula com ruído médio, ponto redondo
    float n=hash(cel+semente);
    float med=hash(floor(pos*.2)+semente+43.);
    float limiar=1.-clamp(v*(.85+.3*med),0.,1.);
    float suave=mix(.1,.03,v);
    g=smoothstep(limiar-suave,limiar+suave,n);
    g*=1.-smoothstep(.85-.08,.85+.08,length(f)*2.);
  }else if(uModo<1.5){
    float r=sqrt(v)*.56;
    g=1.-smoothstep(r-.04,r+.04,length(f));
  }else{
    vec2 b=floor(girar(px,graus)/(uCell*.5));
    g=step((bayer4(b)+.5)/16.,v);
  }
  if(hash(cel+semente+200.)<.03)g=0.;
  return g;
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);

  float grao=hash(px*.4)*.5+hash(px*.2+7.3)*.3+hash(px*.08+13.7)*.2;
  vec3 c=uPapel+(grao-.5)*uRuido*.08;
  float absorve=1.-.06*(hash(px*.15+31.)-.5);

  vec2 o0=vec2(.6,-.4)*uMis;
  vec2 o1=vec2(-.5,.35)*uMis;
  float v0=pow(cobertura(px+o0),.9);
  float v1=smoothstep(.55,1.,cobertura(px+o1));

  c=mix(c,uTinta0,tinta(px+o0,v0,15.,0.)*.94*absorve);
  c=mix(c,uTinta1,tinta(px+o1,v1,75.,100.)*.88*absorve);
  gl_FragColor=vec4(c,1.);
}
`;

/** Paradas padrão: papel, tinta da marca e tinta escura. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "var(--brand)",
  "color-mix(in oklab, var(--brand) 30%, var(--foreground))",
];

const MODOS = { grain: 0, halftone: 1, bayer: 2 } as const;

export interface ShaderRisoProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a imprimir. Fundo branco ou transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /** Como a tinta assenta: grão de riso, ponto de retícula ou Bayer. */
  mode?: "grain" | "halftone" | "bayer";
  /** 2–16. Tamanho da célula de tinta, em px. */
  cell?: number;
  /** 0–100. Quanto as duas tintas saem do registro. */
  misregistration?: number;
  /** 0–100. Textura do papel. */
  paper?: number;
  /** Paradas: papel, primeira tinta e segunda tinta. Qualquer cor CSS ou token. */
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

export function ShaderRiso({
  src,
  alt = "Imagem em risografia",
  mode = "grain",
  cell = 4,
  misregistration = 35,
  paper = 40,
  colors,
  className,
  ...props
}: ShaderRisoProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ mode, cell, misregistration, paper });
  params.current = { mode, cell, misregistration, paper };
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
      img: u("uImg"),
      tex: u("uTex"),
      cell: u("uCell"),
      mis: u("uMis"),
      modo: u("uModo"),
      ruido: u("uRuido"),
      papel: u("uPapel"),
      tinta0: u("uTinta0"),
      tinta1: u("uTinta1"),
    };

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // 1×1 transparente até a imagem chegar: o primeiro quadro é só papel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(U.tex, 0);
    gl.uniform2f(U.img, 1, 1);

    let dpr = 1;

    const cores = () => {
      const [a, b, c] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.papel, a);
      gl.uniform3fv(U.tinta0, b ?? a);
      gl.uniform3fv(U.tinta1, c ?? b ?? a);
    };

    const medir = () => {
      // offsetWidth é a medida local: a vitrine escala o palco com transform.
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(wrap.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const desenhar = () => {
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.cell, Math.max(2, Math.min(16, p.cell)) * dpr);
      gl.uniform1f(U.mis, (p.misregistration / 100) * 8 * dpr);
      gl.uniform1f(U.modo, MODOS[p.mode] ?? 0);
      gl.uniform1f(U.ruido, p.paper / 100);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    redesenhar.current = desenhar;

    let vivo = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (!vivo) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.uniform2f(U.img, img.naturalWidth || 1, img.naturalHeight || 1);
      desenhar();
    };
    img.src = src;

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

    return () => {
      vivo = false;
      img.onload = null;
      ro.disconnect();
      offTema();
      redesenhar.current = () => {};
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [src, coresChave]);

  React.useEffect(() => {
    redesenhar.current();
  }, [mode, cell, misregistration, paper]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={alt}
      className={cn("relative block aspect-square w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
