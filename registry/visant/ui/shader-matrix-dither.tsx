"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Matrix Dither — uma imagem em 1 bit pelo dither ordenado de Bayer:
 * só papel e tinta, e o meio-tom sai da trama xadrez que os jogos e os Macs
 * antigos usavam. Matriz 2×2, 4×4 ou 8×8, cada uma com o seu desenho.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `matrixDither` do ImageLab). Lá ele sai em preto e branco; aqui
 * papel e tinta são do tema.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **A matriz é conta, não tabela.** O original guardava a 8×8 em 64 `if`.
 *    Aqui ela sai da recursão de Bayer (`b2(a) = fract(x/2 + y²·3/4)`, e cada
 *    tamanho é o anterior a meia escala somado ao 2×2), que dá os mesmos
 *    limiares com três linhas e sem desvio no shader.
 * 2. **Cobertura, não cor.** Onde a imagem escurece, a célula vira tinta;
 *    onde clareia, papel. Com marca e fundo como padrão, a foto fica com a
 *    cara da marca nos dois temas, igual ao `shader-halftone`.
 * 3. **O ponto tem tamanho.** O original pontilhava pixel a pixel, o que num
 *    retina some e vira cinza. `scale` define quantos px de tela tem cada ponto
 *    da trama, e a imagem é lida no centro de cada ponto.
 * 4. **Sem laço.** Imagem parada não pede quadro: desenha na carga, no tema,
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
uniform float uMatriz;
uniform float uVies;
uniform vec3 uPapel;
uniform vec3 uTinta;

float b2(vec2 a){a=mod(a,2.);return fract(a.x*.5+a.y*a.y*.75);}
float bayer(vec2 a){
  a=floor(a);
  if(uMatriz<1.5)return b2(a);
  float b4=b2(floor(a*.5))*.25+b2(a);
  if(uMatriz<2.5)return b4;
  vec2 m=floor(a*.5);
  return (b2(floor(m*.5))*.25+b2(m))*.25+b2(a);
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
    lum=mix(1.,dot(c.rgb,vec3(.2126,.7152,.0722)),c.a);
  }
  float tinta=lum<bayer(cel)+uVies?1.:0.;
  gl_FragColor=vec4(mix(uPapel,uTinta,tinta),1.);
}
`;

/** Paradas padrão: papel e tinta. Tudo token. */
const CORES_PADRAO = ["var(--background)", "var(--brand)"];

const MATRIZES = { "2x2": 1, "4x4": 2, "8x8": 3 } as const;

export interface ShaderMatrixDitherProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a pontilhar. Fundo branco ou transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /** Tamanho da matriz de Bayer: muda o desenho da trama. */
  matrix?: "2x2" | "4x4" | "8x8";
  /**
   * Viés do limiar: positivo puxa para a tinta, negativo para o papel.
   * @min -50
   * @max 50
   * @step 1
   */
  bias?: number;
  /**
   * Tamanho de cada ponto da trama, em px.
   * @min 1
   * @max 8
   * @step 1
   */
  scale?: number;
  /** Paradas: papel e tinta. Qualquer cor CSS ou token. */
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

export function ShaderMatrixDither({
  src,
  alt = "Imagem pontilhada em 1 bit",
  matrix = "4x4",
  bias = 0,
  scale = 2,
  colors,
  className,
  ...props
}: ShaderMatrixDitherProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ matrix, bias, scale });
  params.current = { matrix, bias, scale };
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
      matriz: u("uMatriz"),
      vies: u("uVies"),
      papel: u("uPapel"),
      tinta: u("uTinta"),
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
      const [a, b] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.papel, a);
      gl.uniform3fv(U.tinta, b ?? a);
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
      gl.uniform1f(U.ponto, Math.max(1, Math.round(Math.max(1, Math.min(8, p.scale)) * dpr)));
      gl.uniform1f(U.matriz, MATRIZES[p.matrix] ?? 2);
      gl.uniform1f(U.vies, Math.max(-50, Math.min(50, p.bias)) / 100);
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
  }, [matrix, bias, scale]);

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
