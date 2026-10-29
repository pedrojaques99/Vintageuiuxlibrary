"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Film Grain — grão de película correndo por cima de uma imagem, em
 * cinza ou com um grão por canal de cor. Dá textura de filme a uma foto limpa
 * de banco, sem esconder a foto.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `filmGrain` do ImageLab, que por sua vez veio do "Film Grain" do
 * Shadertoy). Lá o grão saía congelado na exportação; aqui ele corre.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **24 quadros, não 60.** Grão que troca a cada quadro de tela vira chiado
 *    de TV. O grão sorteia de novo 24 vezes por segundo, a cadência do
 *    cinema, e entre um sorteio e outro o laço não chama o shader.
 * 2. **Hash no lugar do `mod` encadeado.** O original multiplicava a
 *    coordenada pelo tempo e tirava `mod` duas vezes; com o número crescendo,
 *    a precisão do float acaba e o grão vira listra. Aqui é um hash de seno
 *    com a semente presa num intervalo curto, com a mesma amplitude (±0,005 ×
 *    força) do original.
 * 3. **O grão tem tamanho.** `size` define quantos px de tela tem cada grão,
 *    então num retina o grão não some de tão fino.
 * 4. **O laço dorme.** Fora da tela (IntersectionObserver) não há quadro. Com
 *    movimento reduzido o grão fica parado num sorteio só e redesenha em troca
 *    de tema, tamanho ou knob.
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
uniform float uForca;
uniform float uGrao;
uniform float uSemente;
uniform float uCor;
uniform vec3 uPapel;

float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  vec3 cor=uPapel;
  if(uv.x>=0.&&uv.y>=0.&&uv.x<=1.&&uv.y<=1.){
    vec4 c=texture2D(uTex,uv);
    cor=mix(uPapel,c.rgb,c.a);
  }
  vec2 g=mod(floor(px/uGrao),1024.)+uSemente;
  float a=hash(g)*.01-.005;
  vec3 grao=vec3(a);
  if(uCor>.5)grao=vec3(a,hash(g+vec2(7.,11.))*.01-.005,hash(g+vec2(13.,5.))*.01-.005);
  gl_FragColor=vec4(cor+grao*uForca,1.);
}
`;

export interface ShaderFilmGrainProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a granular. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Força do grão.
   * @min 0
   * @max 100
   * @step 1
   */
  strength?: number;
  /**
   * Tamanho de cada grão, em px.
   * @min 1
   * @max 8
   * @step 1
   */
  size?: number;
  /** Um grão por canal de cor, em vez de grão cinza. */
  colored?: boolean;
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

const QUADROS_POR_SEGUNDO = 24;

export function ShaderFilmGrain({
  src,
  alt = "Imagem com grão de filme",
  strength = 50,
  size = 1,
  colored = false,
  className,
  ...props
}: ShaderFilmGrainProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  // Parâmetros vivos num ref: mexer no knob não recria o contexto.
  const params = React.useRef({ strength, size, colored });
  params.current = { strength, size, colored };
  const redesenhar = React.useRef<() => void>(() => {});

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
      forca: u("uForca"),
      grao: u("uGrao"),
      semente: u("uSemente"),
      cor: u("uCor"),
      papel: u("uPapel"),
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

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduzido = mq.matches;
    let visivel = false;
    let dpr = 1;
    let raf = 0;
    let sorteio = 0;
    let ultimoSorteio = 0;

    const cores = () => {
      gl.uniform3fv(U.papel, resolveCssColor("var(--background)", wrap));
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
      gl.uniform1f(U.forca, (Math.max(0, Math.min(100, p.strength)) / 100) * 32);
      gl.uniform1f(U.grao, Math.max(1, Math.round(Math.max(1, Math.min(8, p.size)) * dpr)));
      // Semente num intervalo curto: o hash de seno perde precisão com número grande.
      gl.uniform1f(U.semente, (sorteio % 97) * 1.37);
      gl.uniform1f(U.cor, p.colored ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const quadro = (agora: number) => {
      if (agora - ultimoSorteio >= 1000 / QUADROS_POR_SEGUNDO) {
        ultimoSorteio = agora;
        sorteio++;
        desenhar();
      }
      raf = visivel && !reduzido ? requestAnimationFrame(quadro) : 0;
    };

    const ligar = () => {
      if (!raf && visivel && !reduzido) raf = requestAnimationFrame(quadro);
    };
    const desligar = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    redesenhar.current = desenhar;

    const trocarMovimento = () => {
      reduzido = mq.matches;
      if (reduzido) {
        desligar();
        desenhar();
      } else ligar();
    };

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

    return () => {
      vivo = false;
      img.onload = null;
      desligar();
      ro.disconnect();
      io.disconnect();
      offTema();
      mq.removeEventListener("change", trocarMovimento);
      redesenhar.current = () => {};
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [src]);

  React.useEffect(() => {
    redesenhar.current();
  }, [strength, size, colored]);

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
