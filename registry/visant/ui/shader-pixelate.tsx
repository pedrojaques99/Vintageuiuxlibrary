"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Pixelate — uma imagem em blocos grandes de cor chapada, e debaixo do
 * cursor uma janela redonda que mostra a foto nítida. Serve para capa de
 * lançamento "a revelar", spoiler de produto ou teaser de campanha.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `pixelate` do ImageLab). Lá ele só pixelava a foto para exportar;
 * aqui o ponteiro abre uma janela de nitidez nela.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **A grade nasce no centro.** O original contava os blocos a partir do
 *    canto, o que deixa um bloco cortado pela metade de um lado só. Aqui a
 *    grade parte do centro do canvas, e as sobras ficam iguais nas duas
 *    bordas.
 * 2. **Uma amostra por bloco.** O bloco inteiro lê a cor do CENTRO dele, como
 *    no original. Média de bloco daria cor mais fiel, mas custaria dezenas de
 *    leituras por pixel para uma diferença que o olho não separa.
 * 3. **A janela é o mesmo quadro.** A foto nítida e a pixelada saem da mesma
 *    textura no mesmo passe; a borda da janela é um `smoothstep` sobre a
 *    distância ao ponteiro, sem segundo canvas nem máscara em CSS.
 * 4. **Sem laço à toa.** Imagem parada não pede quadro: desenha na carga, no
 *    tema, no tamanho e no knob. O laço só existe enquanto a janela abre ou
 *    fecha, e com movimento reduzido ela aparece sem transição.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uImg;
uniform sampler2D uTex;
uniform float uBloco;
uniform vec3 uJanela;
uniform float uJanelaR;
uniform vec3 uPapel;

vec3 ler(vec2 px){
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return uPapel;
  vec4 c=texture2D(uTex,uv);
  return mix(uPapel,c.rgb,c.a);
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 meio=uRes*.5;
  vec2 centro=(floor((px-meio)/uBloco)+.5)*uBloco+meio;
  vec3 bloco=ler(centro);
  float d=distance(px,uJanela.xy);
  float abre=(1.-smoothstep(uJanelaR*.8,uJanelaR,d))*uJanela.z;
  gl_FragColor=vec4(abre>0.?mix(bloco,ler(px),abre):bloco,1.);
}
`;

export interface ShaderPixelateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a pixelar. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Tamanho de cada bloco, em px.
   * @min 2
   * @max 64
   * @step 1
   */
  size?: number;
  /** Janela de nitidez que segue o cursor. */
  reveal?: boolean;
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

export function ShaderPixelate({
  src,
  alt = "Imagem pixelada",
  size = 16,
  reveal = true,
  className,
  ...props
}: ShaderPixelateProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ size, reveal });
  params.current = { size, reveal };
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
      bloco: u("uBloco"),
      janela: u("uJanela"),
      janelaR: u("uJanelaR"),
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
    let dpr = 1;
    let raf = 0;
    const janela = { x: 0, y: 0, forca: 0, alvo: 0 };

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
      gl.uniform1f(U.bloco, Math.max(2, Math.min(64, p.size)) * dpr);
      gl.uniform3f(U.janela, janela.x, janela.y, p.reveal ? janela.forca : 0);
      gl.uniform1f(U.janelaR, Math.min(canvas.width, canvas.height) * 0.22);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // O laço só vive enquanto a janela está abrindo ou fechando.
    const quadro = () => {
      janela.forca += (janela.alvo - janela.forca) * 0.18;
      if (Math.abs(janela.alvo - janela.forca) < 0.005) janela.forca = janela.alvo;
      desenhar();
      raf = janela.forca !== janela.alvo ? requestAnimationFrame(quadro) : 0;
    };
    const pedirQuadro = () => {
      if (mq.matches) {
        janela.forca = janela.alvo;
        desenhar();
      } else if (!raf) raf = requestAnimationFrame(quadro);
    };

    redesenhar.current = () => {
      if (!raf) desenhar();
    };

    const mover = (e: PointerEvent) => {
      // Ponteiro em px locais: a vitrine escala o palco com transform.
      const r = wrap.getBoundingClientRect();
      const k = r.width ? wrap.offsetWidth / r.width : 1;
      janela.x = (e.clientX - r.left) * k * dpr;
      janela.y = (e.clientY - r.top) * k * dpr;
      janela.alvo = 1;
      if (raf) return;
      if (janela.forca === janela.alvo) desenhar();
      else pedirQuadro();
    };
    const sair = () => {
      janela.alvo = 0;
      pedirQuadro();
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
    const offTema = onThemeChange(() => {
      cores();
      desenhar();
    });
    wrap.addEventListener("pointermove", mover);
    wrap.addEventListener("pointerleave", sair);

    return () => {
      vivo = false;
      img.onload = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      offTema();
      wrap.removeEventListener("pointermove", mover);
      wrap.removeEventListener("pointerleave", sair);
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
  }, [size, reveal]);

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
