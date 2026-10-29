"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Edge Detect — só os contornos de uma imagem, traçados pelo filtro de
 * Sobel: vira desenho a traço na cor da marca, ou traço por cima da foto
 * quando `overlay` sobe.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `edgeDetect` do ImageLab). Lá o traço era branco sobre preto; aqui
 * fundo e traço são do tema.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **O vizinho é um px de tela, não um texel.** O original media a borda
 *    entre texels da imagem, o que numa foto grande mostrada pequena dá traço
 *    fino demais para ver, e numa pequena ampliada dá traço gordo e borrado.
 *    Aqui os oito vizinhos ficam a 1px CSS, então o traço tem a mesma
 *    espessura em qualquer tamanho de foto.
 * 2. **Traço na cor, não em branco.** A força da borda decide só o quanto o
 *    pixel puxa do fundo para o traço. Com fundo e marca como padrão, o
 *    desenho lê como nanquim no claro e como neon no escuro.
 * 3. **Transparente não tem borda falsa.** O alfa mistura com o papel antes
 *    do Sobel, então o recorte de um PNG vira contorno de verdade, e o fundo
 *    vazio não vira um retângulo traçado.
 * 4. **Sem laço.** Imagem parada não pede quadro: desenha na carga, no tema,
 *    no tamanho e no knob.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uImg;
uniform sampler2D uTex;
uniform float uDpr;
uniform float uLimiar;
uniform float uForca;
uniform float uSobre;
uniform vec3 uFundo;
uniform vec3 uTraco;

vec3 ler(vec2 uv){
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return uFundo;
  vec4 c=texture2D(uTex,uv);
  return mix(uFundo,c.rgb,c.a);
}
float luma(vec2 uv){return dot(ler(uv),vec3(.299,.587,.114));}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  vec2 p=uDpr/tam;
  float tl=luma(uv+vec2(-p.x,-p.y));
  float t =luma(uv+vec2(0.,-p.y));
  float tr=luma(uv+vec2(p.x,-p.y));
  float l =luma(uv+vec2(-p.x,0.));
  float r =luma(uv+vec2(p.x,0.));
  float bl=luma(uv+vec2(-p.x,p.y));
  float b =luma(uv+vec2(0.,p.y));
  float br=luma(uv+vec2(p.x,p.y));
  float gx=-tl-2.*l-bl+tr+2.*r+br;
  float gy=-tl-2.*t-tr+bl+2.*b+br;
  float borda=length(vec2(gx,gy))*uForca;
  borda=smoothstep(uLimiar*.5,uLimiar,borda);
  vec3 traco=mix(uFundo,uTraco,borda);
  vec3 sobre=mix(ler(uv),uTraco,borda);
  gl_FragColor=vec4(mix(traco,sobre,uSobre),1.);
}
`;

/** Paradas padrão: fundo e traço. Tudo token. */
const CORES_PADRAO = ["var(--background)", "var(--brand)"];

export interface ShaderEdgeDetectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a traçar. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Limiar: quanto mais alto, só as bordas fortes viram traço.
   * @min 1
   * @max 100
   * @step 1
   */
  threshold?: number;
  /**
   * Força do traço.
   * @min 0
   * @max 100
   * @step 1
   */
  strength?: number;
  /**
   * Quanto da foto aparece por baixo do traço.
   * @min 0
   * @max 100
   * @step 1
   */
  overlay?: number;
  /** Paradas: fundo e traço. Qualquer cor CSS ou token. */
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

export function ShaderEdgeDetect({
  src,
  alt = "Contornos da imagem",
  threshold = 20,
  strength = 40,
  overlay = 0,
  colors,
  className,
  ...props
}: ShaderEdgeDetectProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ threshold, strength, overlay });
  params.current = { threshold, strength, overlay };
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
      dpr: u("uDpr"),
      limiar: u("uLimiar"),
      forca: u("uForca"),
      sobre: u("uSobre"),
      fundo: u("uFundo"),
      traco: u("uTraco"),
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
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.traco, b ?? a);
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
      gl.uniform1f(U.dpr, dpr);
      gl.uniform1f(U.limiar, Math.max(1, Math.min(100, p.threshold)) / 200);
      gl.uniform1f(U.forca, (Math.max(0, Math.min(100, p.strength)) / 100) * 5);
      gl.uniform1f(U.sobre, Math.max(0, Math.min(100, p.overlay)) / 100);
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
  }, [threshold, strength, overlay]);

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
