"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Chromatic Aberration — os canais de cor de uma imagem saem do
 * registro, o vermelho para um lado e o azul para o outro, como lente barata
 * ou impressão desalinhada. Com o cursor por cima, a separação aponta para
 * ele e cresce quanto mais longe do centro ele vai.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `chromaticAberration` do ImageLab). Lá o deslocamento era um ângulo
 * fixo; aqui o ponteiro faz o papel da lente.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Deslocamento em px, não em fração da imagem.** O original andava 0,5%
 *    da textura, o que numa foto grande é um rasgo e numa miniatura não se
 *    vê. Aqui `offset` é em px de tela, e a separação lê igual em qualquer
 *    tamanho.
 * 2. **O verde fica parado.** Só vermelho e azul andam, em sentidos opostos.
 *    O verde carrega quase toda a luminância, então o contorno da foto não
 *    treme e o olho lê a separação como franja de cor, não como foto borrada.
 * 3. **O centro é a lente.** Com o cursor no meio da imagem a separação some;
 *    perto da borda ela chega a 2,5× o `offset`, apontada para o cursor.
 *    Quando ele sai, a separação volta devagar ao ângulo e ao `offset` dos
 *    knobs.
 * 4. **Sem laço à toa.** Desenha na carga, no tema, no tamanho e no knob. O
 *    laço só existe enquanto a separação corre atrás do ponteiro, e com
 *    movimento reduzido ela salta direto para o alvo.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uImg;
uniform sampler2D uTex;
uniform vec2 uDesvio;
uniform vec3 uPapel;

vec4 ler(vec2 px){
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return vec4(uPapel,1.);
  vec4 c=texture2D(uTex,uv);
  return vec4(mix(uPapel,c.rgb,c.a),1.);
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float r=ler(px+uDesvio).r;
  float g=ler(px).g;
  float b=ler(px-uDesvio).b;
  gl_FragColor=vec4(r,g,b,1.);
}
`;

export interface ShaderChromaticAberrationProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a separar. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Quanto os canais se afastam, em px.
   * @min 0
   * @max 40
   * @step 1
   */
  offset?: number;
  /**
   * Direção da separação em repouso, em graus.
   * @min 0
   * @max 360
   * @step 1
   */
  angle?: number;
  /** A separação aponta para o cursor e cresce longe do centro. */
  follow?: boolean;
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

export function ShaderChromaticAberration({
  src,
  alt = "Imagem com as cores fora do registro",
  offset = 6,
  angle = 0,
  follow = true,
  className,
  ...props
}: ShaderChromaticAberrationProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ offset, angle, follow });
  params.current = { offset, angle, follow };
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
      desvio: u("uDesvio"),
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
    // Desvio atual e alvo, em px CSS. Sem ponteiro, o alvo é o repouso dos knobs.
    const desvio = { x: 0, y: 0 };
    let ponteiro: { x: number; y: number } | null = null;

    const alvo = () => {
      const p = params.current;
      const o = Math.max(0, Math.min(40, p.offset));
      if (ponteiro && p.follow) {
        const w = wrap.offsetWidth || 1;
        const h = wrap.offsetHeight || 1;
        const dx = (ponteiro.x - w / 2) / (w / 2);
        const dy = (ponteiro.y - h / 2) / (h / 2);
        return { x: dx * o * 2.5, y: dy * o * 2.5 };
      }
      const a = (p.angle * Math.PI) / 180;
      return { x: Math.cos(a) * o, y: Math.sin(a) * o };
    };

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
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform2f(U.desvio, desvio.x * dpr, desvio.y * dpr);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // O laço só vive enquanto o desvio corre atrás do alvo.
    const quadro = () => {
      const a = alvo();
      desvio.x += (a.x - desvio.x) * 0.16;
      desvio.y += (a.y - desvio.y) * 0.16;
      const chegou = Math.hypot(a.x - desvio.x, a.y - desvio.y) < 0.05;
      if (chegou) {
        desvio.x = a.x;
        desvio.y = a.y;
      }
      desenhar();
      raf = chegou ? 0 : requestAnimationFrame(quadro);
    };
    const pedirQuadro = () => {
      if (mq.matches) {
        const a = alvo();
        desvio.x = a.x;
        desvio.y = a.y;
        desenhar();
      } else if (!raf) raf = requestAnimationFrame(quadro);
    };

    redesenhar.current = pedirQuadro;

    const mover = (e: PointerEvent) => {
      // Ponteiro em px locais: a vitrine escala o palco com transform.
      const r = wrap.getBoundingClientRect();
      const k = r.width ? wrap.offsetWidth / r.width : 1;
      ponteiro = { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
      if (params.current.follow) pedirQuadro();
    };
    const sair = () => {
      ponteiro = null;
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

    // Primeiro quadro já no repouso dos knobs, sem animar a entrada.
    const repouso = alvo();
    desvio.x = repouso.x;
    desvio.y = repouso.y;
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
  }, [offset, angle, follow]);

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
