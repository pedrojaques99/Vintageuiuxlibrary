"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Duotone — uma imagem refeita em duas cores: as sombras numa, as luzes
 * na outra, e o meio-tom é a mistura das duas. É o duotone de capa de disco e
 * de campanha, que deixa qualquer foto do banco com a cara da marca.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `duotone` do ImageLab). Lá as duas cores eram um roxo e um ciano
 * fixos; aqui elas saem do tema.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **A sombra é sempre a mais escura das duas.** As cores chegam em
 *    qualquer ordem e a peça mede a luminância de cada uma: a mais escura vai
 *    para as sombras. O padrão é a marca puxada para o texto e o fundo: no
 *    tema claro a marca funda pinta as sombras e o papel as luzes; no escuro o
 *    fundo vira sombra e a marca clara acende nas luzes. A foto nunca sai em
 *    negativo por causa do tema, e marca de cor clara não desbota a foto.
 * 2. **Luminância perceptual.** O peso de cada canal é o do olho (0,299 /
 *    0,587 / 0,114), não a média. Na média um céu azul escurece e uma pele
 *    clareia, e o duotone perde o volume.
 * 3. **`intensity` mistura com a foto.** Abaixo de 100 a cor original volta
 *    por baixo, o que dá a foto "tingida" sem trocar de peça.
 * 4. **Sem laço.** Imagem parada não pede quadro: desenha na carga, no tema,
 *    no tamanho e no knob.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uImg;
uniform sampler2D uTex;
uniform float uIntensidade;
uniform float uContraste;
uniform float uBrilho;
uniform vec3 uPapel;
uniform vec3 uSombra;
uniform vec3 uLuz;

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.){gl_FragColor=vec4(uPapel,1.);return;}
  vec4 c=texture2D(uTex,uv);
  float lum=dot(c.rgb,vec3(.299,.587,.114));
  lum=clamp((lum-.5)*uContraste+.5+uBrilho,0.,1.);
  vec3 duo=mix(uSombra,uLuz,lum);
  vec3 cor=mix(c.rgb,duo,uIntensidade);
  gl_FragColor=vec4(mix(uPapel,cor,c.a),1.);
}
`;

/** Paradas padrão: marca puxada para o texto e fundo. A mais escura pinta as sombras. */
const CORES_PADRAO = ["color-mix(in oklab, var(--brand) 60%, var(--foreground))", "var(--background)"];

export interface ShaderDuotoneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a refazer em duas cores. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Quanto do duotone cobre a foto original.
   * @min 0
   * @max 100
   * @step 1
   */
  intensity?: number;
  /**
   * Contraste antes de mapear nas duas cores.
   * @min 0
   * @max 100
   * @step 1
   */
  contrast?: number;
  /**
   * Brilho antes de mapear: puxa a foto para a sombra ou para a luz.
   * @min -50
   * @max 50
   * @step 1
   */
  brightness?: number;
  /** As duas cores, em qualquer ordem: a mais escura vira sombra. Qualquer cor CSS ou token. */
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

const luminancia = ([r, g, b]: number[]) => 0.299 * r + 0.587 * g + 0.114 * b;

export function ShaderDuotone({
  src,
  alt = "Imagem em duotone",
  intensity = 100,
  contrast = 50,
  brightness = 0,
  colors,
  className,
  ...props
}: ShaderDuotoneProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ intensity, contrast, brightness });
  params.current = { intensity, contrast, brightness };
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
      intensidade: u("uIntensidade"),
      contraste: u("uContraste"),
      brilho: u("uBrilho"),
      papel: u("uPapel"),
      sombra: u("uSombra"),
      luz: u("uLuz"),
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

    const cores = () => {
      const [a, b] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      const outra = b ?? a;
      const [sombra, luz] = luminancia(a) <= luminancia(outra) ? [a, outra] : [outra, a];
      gl.uniform3fv(U.papel, resolveCssColor("var(--background)", wrap));
      gl.uniform3fv(U.sombra, sombra);
      gl.uniform3fv(U.luz, luz);
    };

    const medir = () => {
      // offsetWidth é a medida local: a vitrine escala o palco com transform.
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(wrap.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const desenhar = () => {
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.intensidade, Math.max(0, Math.min(100, p.intensity)) / 100);
      gl.uniform1f(U.contraste, 0.25 + (Math.max(0, Math.min(100, p.contrast)) / 100) * 1.5);
      gl.uniform1f(U.brilho, Math.max(-50, Math.min(50, p.brightness)) / 100);
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
  }, [intensity, contrast, brightness]);

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
