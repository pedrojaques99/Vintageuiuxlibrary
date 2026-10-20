"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Halftone — retícula de uma tinta só sobre uma imagem: pontos,
 * quadrados ou linhas que engrossam onde a imagem escurece. Debaixo do cursor
 * uma lupa amplia a imagem sem mexer na grade, como conta-fios em cima do
 * impresso.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `halftone` e o `HalftoneRenderer` do estúdio). Lá ele trata a foto
 * do cliente para exportar; aqui ele vira peça de interface que veste a marca.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Cobertura, não cor.** O shader lê o quanto cada ponto da imagem é
 *    escuro (1 − luminância, vezes o alfa) e decide só o tamanho do ponto. A
 *    cor sai de duas paradas do tema: papel e tinta. Fundo branco da foto vira
 *    papel nos dois temas, e a tinta é a marca do cliente.
 * 2. **Uma amostra por célula.** O ponto inteiro lê a cor do CENTRO da sua
 *    célula; amostrar por pixel faria o ponto ter borda serrilhada da imagem
 *    em vez de borda redonda.
 * 3. **A lupa mexe na amostra, não na grade.** Ampliar a grade faria os pontos
 *    crescerem e pularem sob o cursor. Ampliando só o lugar onde cada célula
 *    lê a imagem, a retícula fica parada e a imagem é que se aproxima.
 * 4. **A raiz do quadrado no raio.** Área do ponto, não raio, é que precisa
 *    acompanhar a cobertura; sem a raiz os meios-tons saem claros demais.
 * 5. **Sem laço à toa.** Imagem parada não pede quadro: desenha na carga, no
 *    tema, no tamanho e no knob. O laço só existe enquanto a lupa entra ou sai,
 *    e com movimento reduzido ela aparece sem transição.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uImg;
uniform sampler2D uTex;
uniform float uCell;
uniform float uAngle;
uniform float uShape;
uniform float uContrast;
uniform vec3 uLente;
uniform float uLenteR;
uniform vec3 uPapel;
uniform vec3 uTinta;

float cobertura(vec2 px){
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return 0.;
  vec4 c=texture2D(uTex,uv);
  float lum=dot(c.rgb,vec3(.2125,.7154,.0721));
  float v=(1.-lum)*c.a;
  return clamp((v-.5)*uContrast+.5,0.,1.);
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float ca=cos(uAngle);
  float sa=sin(uAngle);
  mat2 gira=mat2(ca,sa,-sa,ca);
  mat2 volta=mat2(ca,-sa,sa,ca);
  vec2 q=gira*px/uCell;
  vec2 cel=floor(q)+.5;
  vec2 f=q-cel;
  vec2 centro=volta*(cel*uCell);

  float dl=distance(centro,uLente.xy);
  float queda=(1.-smoothstep(uLenteR*.55,uLenteR,dl))*uLente.z;
  vec2 amostra=uLente.xy+(centro-uLente.xy)*mix(1.,.45,queda);
  float v=cobertura(amostra);

  float aa=1.2/uCell;
  float tinta=0.;
  if(uShape<.5){
    float r=sqrt(v)*.56;
    tinta=1.-smoothstep(r-aa,r+aa,length(f));
  }else if(uShape<1.5){
    float r=sqrt(v)*.5;
    tinta=1.-smoothstep(r-aa,r+aa,max(abs(f.x),abs(f.y)));
  }else{
    float r=v*.5;
    tinta=1.-smoothstep(r-aa,r+aa,abs(f.y));
  }
  tinta*=step(.02,v);
  gl_FragColor=vec4(mix(uPapel,uTinta,tinta),1.);
}
`;

/** Paradas padrão: papel e tinta. Tudo token. */
const CORES_PADRAO = ["var(--background)", "var(--brand)"];

export interface ShaderHalftoneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a reticular. Fundo branco ou transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /** 4–32. Tamanho da célula da retícula, em px. */
  cell?: number;
  /** 0–90. Ângulo da retícula, em graus. */
  angle?: number;
  /** Forma do ponto da retícula. */
  shape?: "dots" | "squares" | "lines";
  /** 0–100. Contraste antes de reticular. */
  contrast?: number;
  /** Lupa que amplia a imagem debaixo do cursor. */
  lens?: boolean;
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

const FORMAS = { dots: 0, squares: 1, lines: 2 } as const;

export function ShaderHalftone({
  src,
  alt = "Imagem em retícula",
  cell = 9,
  angle = 45,
  shape = "dots",
  contrast = 55,
  lens = true,
  colors,
  className,
  ...props
}: ShaderHalftoneProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ cell, angle, shape, contrast, lens });
  params.current = { cell, angle, shape, contrast, lens };
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
      angle: u("uAngle"),
      shape: u("uShape"),
      contrast: u("uContrast"),
      lente: u("uLente"),
      lenteR: u("uLenteR"),
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

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dpr = 1;
    let raf = 0;
    const lente = { x: 0, y: 0, forca: 0, alvo: 0 };

    const cores = () => {
      const [a, b] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.papel, a);
      gl.uniform3fv(U.tinta, b ?? a);
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
      gl.uniform1f(U.cell, Math.max(4, Math.min(32, p.cell)) * dpr);
      gl.uniform1f(U.angle, (p.angle * Math.PI) / 180);
      gl.uniform1f(U.shape, FORMAS[p.shape] ?? 0);
      gl.uniform1f(U.contrast, 0.5 + (p.contrast / 100) * 2);
      gl.uniform3f(U.lente, lente.x, lente.y, p.lens ? lente.forca : 0);
      gl.uniform1f(U.lenteR, Math.min(canvas.width, canvas.height) * 0.28);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // O laço só vive enquanto a lupa está entrando ou saindo.
    const quadro = () => {
      lente.forca += (lente.alvo - lente.forca) * 0.18;
      if (Math.abs(lente.alvo - lente.forca) < 0.005) lente.forca = lente.alvo;
      desenhar();
      raf = lente.forca !== lente.alvo ? requestAnimationFrame(quadro) : 0;
    };
    const pedirQuadro = () => {
      if (mq.matches) {
        lente.forca = lente.alvo;
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
      lente.x = (e.clientX - r.left) * k * dpr;
      lente.y = (e.clientY - r.top) * k * dpr;
      lente.alvo = 1;
      if (raf) return;
      if (lente.forca === lente.alvo) desenhar();
      else pedirQuadro();
    };
    const sair = () => {
      lente.alvo = 0;
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
  }, [src, coresChave]);

  React.useEffect(() => {
    redesenhar.current();
  }, [cell, angle, shape, contrast, lens]);

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
