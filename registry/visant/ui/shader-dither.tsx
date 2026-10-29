"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Dither — uma imagem pixelada e reduzida a poucos tons, com o dither
 * de Bayer 8×8 fazendo a passagem entre um tom e o próximo. É a foto de jogo
 * de 8 bits e de tela de Game Boy, só que pintada com a rampa da marca.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `dither` do ImageLab, que por sua vez veio de um shader de Godot).
 * Lá ele tinha cinco paletas de cor fixa (Game Boy, âmbar, fósforo verde,
 * sépia) e uma cor livre; aqui a paleta é uma rampa de tokens.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **A paleta é a rampa do tema.** No lugar das paletas de cor fixa, de
 *    duas a quatro paradas de `colors`, do papel à tinta mais funda. O padrão
 *    vai do fundo à marca e da marca a um tom dela puxado para o texto, e a
 *    rampa troca sozinha com o tema.
 * 2. **Cobertura, não luminância.** O tom zero é onde a imagem é clara, e cai
 *    no papel. No tema escuro o papel é escuro, então a foto continua lida
 *    como impressão sobre a página, igual ao `shader-halftone`.
 * 3. **`levels` é o número de tons, de verdade.** O original chamava de "bit
 *    depth" o número de degraus e entregava um tom a mais. Aqui 2 é papel e
 *    tinta, 4 são quatro tons espalhados pela rampa.
 * 4. **A matriz é conta, não tabela.** A 8×8 do original eram 64 `if`; aqui
 *    sai da recursão de Bayer em três linhas, com os mesmos limiares.
 * 5. **Sem laço.** Imagem parada não pede quadro: desenha na carga, no tema,
 *    no tamanho e no knob.
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
uniform float uPonto;
uniform float uContraste;
uniform float uDesvio;
uniform float uNiveis;
uniform vec3 uRampa[4];
uniform float uParadas;

float b2(vec2 a){a=mod(a,2.);return fract(a.x*.5+a.y*a.y*.75);}
float bayer8(vec2 a){
  a=floor(a);
  vec2 m=floor(a*.5);
  return (b2(floor(m*.5))*.25+b2(m))*.25+b2(a);
}

vec3 rampa(float t){
  float n=uParadas-1.;
  float pos=clamp(t,0.,1.)*n;
  vec3 c=uRampa[0];
  for(int i=0;i<3;i++){
    if(float(i)<n)c=mix(c,uRampa[i+1],clamp(pos-float(i),0.,1.));
  }
  return c;
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 cel=floor(px/uPonto);
  vec2 centro=(cel+.5)*uPonto;
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(centro-(uRes-tam)*.5)/tam;
  float lum=1.;
  if(uv.x>=0.&&uv.y>=0.&&uv.x<=1.&&uv.y<=1.){
    vec4 c=texture2D(uTex,uv);
    lum=mix(1.,dot(c.rgb,vec3(.299,.587,.114)),c.a);
  }
  float v=clamp((1.-lum-.5+uDesvio)*uContraste+.5,0.,1.);
  float passos=uNiveis-1.;
  float x=max(v-.00001,0.)*passos;
  float baixo=floor(x);
  float limiar=bayer8(cel)*.99+.005;
  float tom=(fract(x)<limiar?baixo:baixo+1.)/passos;
  gl_FragColor=vec4(rampa(tom),1.);
}
`;

/** Rampa padrão: papel, meio-tom da marca, marca e marca funda. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "color-mix(in oklab, var(--brand) 45%, var(--background))",
  "var(--brand)",
  "color-mix(in oklab, var(--brand) 45%, var(--foreground))",
];

export interface ShaderDitherProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a pontilhar. Fundo branco ou transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Tamanho do pixel da imagem e do ponto da trama, em px.
   * @min 1
   * @max 16
   * @step 1
   */
  size?: number;
  /**
   * Quantos tons a imagem usa, espalhados pela rampa.
   * @min 2
   * @max 8
   * @step 1
   */
  levels?: number;
  /**
   * Contraste antes de reduzir os tons.
   * @min 0
   * @max 100
   * @step 1
   */
  contrast?: number;
  /**
   * Desvio: positivo escurece a imagem (mais tinta), negativo clareia.
   * @min -50
   * @max 50
   * @step 1
   */
  offset?: number;
  /** Rampa de duas a quatro paradas, do papel à tinta mais funda. Qualquer cor CSS ou token. */
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

export function ShaderDither({
  src,
  alt = "Imagem pontilhada em poucos tons",
  size = 4,
  levels = 4,
  contrast = 50,
  offset = 0,
  colors,
  className,
  ...props
}: ShaderDitherProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ size, levels, contrast, offset });
  params.current = { size, levels, contrast, offset };
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
      ponto: u("uPonto"),
      contraste: u("uContraste"),
      desvio: u("uDesvio"),
      niveis: u("uNiveis"),
      rampa: u("uRampa"),
      paradas: u("uParadas"),
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
      const paradas = coresChave
        .split("|")
        .slice(0, 4)
        .map((cor) => resolveCssColor(cor, wrap));
      const n = Math.max(1, paradas.length);
      const cheia = [0, 1, 2, 3].flatMap((i) => paradas[Math.min(i, n - 1)] ?? [0, 0, 0]);
      gl.uniform3fv(U.rampa, cheia);
      gl.uniform1f(U.paradas, Math.max(2, n));
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
      gl.uniform1f(U.ponto, Math.max(1, Math.round(Math.max(1, Math.min(16, p.size)) * dpr)));
      gl.uniform1f(U.niveis, Math.max(2, Math.min(8, Math.round(p.levels))));
      gl.uniform1f(U.contraste, 0.25 + (Math.max(0, Math.min(100, p.contrast)) / 100) * 2.5);
      gl.uniform1f(U.desvio, Math.max(-50, Math.min(50, p.offset)) / 100);
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
  }, [size, levels, contrast, offset]);

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
