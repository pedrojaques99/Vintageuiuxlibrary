"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Upscale — uma imagem pequena ampliada por interpolação bicúbica
 * (Catmull-Rom) com nitidez de máscara, ao lado da mesma imagem ampliada por
 * vizinho mais próximo. Uma linha divide as duas e segue o cursor, como
 * comparador de antes e depois.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `upscale` do ImageLab). Lá ele amplia a foto do cliente antes de
 * imprimir; aqui ele mostra o que a ampliação faz.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **A peça encolhe a imagem antes.** Ampliar uma foto que já é maior que a
 *    tela não mostra nada. `resolution` reduz a imagem num canvas 2D até o
 *    lado maior ter esse tanto de px, e é essa versão pequena que o shader
 *    amplia. Mudar o knob refaz só a redução, nunca o contexto.
 * 2. **Textura em vizinho mais próximo.** Com filtro linear, o lado "antes"
 *    sairia borrado em vez de em blocos, e as 16 leituras do bicúbico
 *    sairiam misturadas antes da conta. `NEAREST` deixa cada leitura cair num
 *    texel inteiro, que é o que o filtro de Catmull-Rom pressupõe.
 * 3. **A nitidez sai das leituras que já existem.** O original fazia a
 *    máscara de nitidez com quatro leituras extras a uma distância menor que
 *    um texel, o que na prática não afiava nada. Aqui o borrado de referência
 *    é o bilinear dos quatro texels do meio, que o bicúbico já leu: nitidez
 *    de verdade, sem leitura nova.
 * 4. **A linha fica onde o cursor deixou.** Comparador que volta sozinho
 *    para o meio esconde justamente o pedaço que a pessoa queria ver.
 * 5. **Sem laço.** Imagem parada não pede quadro: desenha na carga, no tema,
 *    no tamanho, no knob e quando a linha anda.
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
uniform float uNitidez;
uniform float uCorte;
uniform float uDpr;
uniform vec3 uPapel;
uniform vec3 uLinha;

float mitchell(float x){
  const float B=0.;
  const float C=.5;
  float ax=abs(x);
  if(ax<1.)return((12.-9.*B-6.*C)*ax*ax*ax+(-18.+12.*B+6.*C)*ax*ax+(6.-2.*B))/6.;
  if(ax<2.)return((-B-6.*C)*ax*ax*ax+(6.*B+30.*C)*ax*ax+(-12.*B-48.*C)*ax+(8.*B+24.*C))/6.;
  return 0.;
}
vec4 cubica(float x,vec4 c0,vec4 c1,vec4 c2,vec4 c3){
  return c0*mitchell(x+1.)+c1*mitchell(x)+c2*mitchell(1.-x)+c3*mitchell(2.-x);
}
vec4 T(vec2 t,float dx,float dy){return texture2D(uTex,(t+vec2(dx,dy))/uImg);}

vec4 ampliar(vec2 uv){
  vec2 t=uv*uImg-.5;
  vec2 f=fract(t);
  t=floor(t)+.5;
  vec4 a0=T(t,-1.,-1.),a1=T(t,0.,-1.),a2=T(t,1.,-1.),a3=T(t,2.,-1.);
  vec4 b0=T(t,-1.,0.),b1=T(t,0.,0.),b2=T(t,1.,0.),b3=T(t,2.,0.);
  vec4 c0=T(t,-1.,1.),c1=T(t,0.,1.),c2=T(t,1.,1.),c3=T(t,2.,1.);
  vec4 d0=T(t,-1.,2.),d1=T(t,0.,2.),d2=T(t,1.,2.),d3=T(t,2.,2.);
  vec4 cub=cubica(f.y,cubica(f.x,a0,a1,a2,a3),cubica(f.x,b0,b1,b2,b3),cubica(f.x,c0,c1,c2,c3),cubica(f.x,d0,d1,d2,d3));
  vec4 bil=mix(mix(b1,b2,f.x),mix(c1,c2,f.x),f.y);
  cub.rgb=clamp(cub.rgb+(cub.rgb-bil.rgb)*uNitidez*2.,0.,1.);
  return clamp(cub,0.,1.);
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  vec3 cor=uPapel;
  if(uv.x>=0.&&uv.y>=0.&&uv.x<=1.&&uv.y<=1.){
    vec4 c=px.x<uCorte?texture2D(uTex,uv):ampliar(uv);
    cor=mix(uPapel,c.rgb,c.a);
  }
  float linha=1.-smoothstep(uDpr*.5,uDpr*1.5,abs(px.x-uCorte));
  gl_FragColor=vec4(mix(cor,uLinha,linha),1.);
}
`;

/** Paradas padrão: papel e linha do comparador. Tudo token. */
const CORES_PADRAO = ["var(--background)", "var(--brand)"];

export interface ShaderUpscaleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a reduzir e ampliar de volta. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Lado maior da versão pequena, em px: quanto menor, mais a ampliação trabalha.
   * @min 16
   * @max 256
   * @step 1
   */
  resolution?: number;
  /**
   * Nitidez depois de ampliar.
   * @min 0
   * @max 100
   * @step 1
   */
  sharpening?: number;
  /** Mostra o antes (vizinho mais próximo) à esquerda de uma linha que segue o cursor. */
  compare?: boolean;
  /** Paradas: papel e linha do comparador. Qualquer cor CSS ou token. */
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

export function ShaderUpscale({
  src,
  alt = "Imagem pequena ampliada",
  resolution = 64,
  sharpening = 30,
  compare = true,
  colors,
  className,
  ...props
}: ShaderUpscaleProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ resolution, sharpening, compare });
  params.current = { resolution, sharpening, compare };
  const redesenhar = React.useRef<() => void>(() => {});
  const reduzir = React.useRef<() => void>(() => {});
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
      nitidez: u("uNitidez"),
      corte: u("uCorte"),
      dpr: u("uDpr"),
      papel: u("uPapel"),
      linha: u("uLinha"),
    };

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // 1×1 transparente até a imagem chegar: o primeiro quadro é só papel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.uniform1i(U.tex, 0);
    gl.uniform2f(U.img, 1, 1);

    let dpr = 1;
    let corte = 0.5; // fração da largura onde a linha está
    const pequena = document.createElement("canvas");
    const ctx = pequena.getContext("2d");

    const cores = () => {
      const [a, b] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.papel, a);
      gl.uniform3fv(U.linha, b ?? a);
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
      gl.uniform1f(U.nitidez, Math.max(0, Math.min(100, p.sharpening)) / 100);
      // Sem comparador, a linha sai do canvas e tudo é o lado ampliado.
      gl.uniform1f(U.corte, p.compare ? corte * canvas.width : -10 * dpr);
      gl.uniform1f(U.dpr, dpr);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    redesenhar.current = desenhar;

    let vivo = true;
    let pronta = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    reduzir.current = () => {
      if (!pronta || !ctx) return;
      const w = img.naturalWidth || 1;
      const h = img.naturalHeight || 1;
      const lado = Math.max(16, Math.min(256, Math.round(params.current.resolution)));
      const k = Math.min(1, lado / Math.max(w, h));
      pequena.width = Math.max(1, Math.round(w * k));
      pequena.height = Math.max(1, Math.round(h * k));
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, pequena.width, pequena.height);
      ctx.drawImage(img, 0, 0, pequena.width, pequena.height);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pequena);
      gl.uniform2f(U.img, pequena.width, pequena.height);
      desenhar();
    };

    img.onload = () => {
      if (!vivo) return;
      pronta = true;
      reduzir.current();
    };
    img.src = src;

    const mover = (e: PointerEvent) => {
      if (!params.current.compare) return;
      const r = wrap.getBoundingClientRect();
      corte = r.width ? Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) : 0.5;
      desenhar();
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

    return () => {
      vivo = false;
      img.onload = null;
      ro.disconnect();
      offTema();
      wrap.removeEventListener("pointermove", mover);
      redesenhar.current = () => {};
      reduzir.current = () => {};
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [src, coresChave]);

  React.useEffect(() => {
    reduzir.current();
  }, [resolution]);

  React.useEffect(() => {
    redesenhar.current();
  }, [sharpening, compare]);

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
