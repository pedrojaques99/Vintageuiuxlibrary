"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Glitch — uma imagem que falha em faixas: blocos horizontais saem do
 * lugar com os canais de cor separados, e de vez em quando uma linha inteira
 * pula. Passar o mouse rápido por cima piora a falha, que volta ao normal
 * sozinha em menos de um segundo.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `glitch` do ImageLab). Lá ele congelava um quadro da falha para
 * exportar; aqui ela corre, e o ponteiro faz o papel do sinal ruim.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Quadro só quando o degrau muda.** A falha anda em degraus
 *    (`floor(tempo × speed)`), então entre um degrau e outro o quadro é
 *    idêntico. O laço roda, mas só chama o shader quando o degrau vira ou
 *    quando há energia do ponteiro escoando: a 3 degraus por segundo, são 3
 *    quadros por segundo, não 60.
 * 2. **O ponteiro injeta energia, não posição.** A distância percorrida entre
 *    dois eventos soma na falha e escoa em ~0,7s, como no `shader-neon`. Mouse
 *    parado em cima não faz nada; o gesto rápido é que estraga o sinal.
 * 3. **O tempo é acumulado, não lido do relógio.** Mexer em `speed` muda a
 *    taxa de avanço do tempo, não o tempo em si, então o knob não faz a falha
 *    saltar para outro ponto.
 * 4. **O laço dorme.** Fora da tela (IntersectionObserver) não há quadro. Com
 *    movimento reduzido desenha um quadro parado da falha e só redesenha em
 *    troca de tema, tamanho ou knob.
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
uniform float uDpr;
uniform float uQuanto;
uniform float uFaixas;
uniform float uDegrau;
uniform vec3 uPapel;

float rand(float s){return fract(sin(s*12.9898)*43758.5453);}

vec3 ler(vec2 uv){
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return uPapel;
  vec4 c=texture2D(uTex,uv);
  return mix(uPapel,c.rgb,c.a);
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  float t=mod(uDegrau,997.);
  float faixa=floor(uv.y*uFaixas+t);
  float desvio=(rand(faixa)-.5)*uQuanto*step(.75,rand(faixa+7.));

  float r=ler(vec2(uv.x+desvio,uv.y)).r;
  float g=ler(uv).g;
  float b=ler(vec2(uv.x-desvio,uv.y)).b;

  float pulo=step(.98,rand(floor(px.y/(2.*uDpr)+t)))*uQuanto*2.;
  vec3 cor=pulo>0.?ler(vec2(uv.x+pulo,uv.y)):vec3(r,g,b);
  gl_FragColor=vec4(cor,1.);
}
`;

export interface ShaderGlitchProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a estragar. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * O quanto as faixas saem do lugar.
   * @min 0
   * @max 100
   * @step 1
   */
  amount?: number;
  /**
   * Quantas vezes por segundo a falha muda.
   * @min 0
   * @max 100
   * @step 1
   */
  speed?: number;
  /**
   * Em quantas faixas a imagem se divide.
   * @min 2
   * @max 60
   * @step 1
   */
  blocks?: number;
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

export function ShaderGlitch({
  src,
  alt = "Imagem com falha de sinal",
  amount = 30,
  speed = 30,
  blocks = 20,
  className,
  ...props
}: ShaderGlitchProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  // Parâmetros vivos num ref: mexer no knob não recria o contexto.
  const params = React.useRef({ amount, speed, blocks });
  params.current = { amount, speed, blocks };
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
      dpr: u("uDpr"),
      quanto: u("uQuanto"),
      faixas: u("uFaixas"),
      degrau: u("uDegrau"),
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
    let ultimo = 0;
    let tempo = 1;
    let degrauDesenhado = -1;
    let energia = 0;
    let px = -1;
    let py = -1;

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

    const degrau = () => Math.floor(tempo);

    const desenhar = () => {
      const p = params.current;
      const quanto = (Math.max(0, Math.min(100, p.amount)) / 1000) * (1 + energia * 4) + energia * 0.04;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.dpr, dpr);
      gl.uniform1f(U.quanto, quanto);
      gl.uniform1f(U.faixas, Math.max(2, Math.min(60, Math.round(p.blocks))));
      gl.uniform1f(U.degrau, degrau());
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      degrauDesenhado = degrau();
    };

    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      // Energia acelera a falha também: o sinal ruim muda mais rápido.
      tempo += dt * ((Math.max(0, Math.min(100, params.current.speed)) / 10) * (1 + energia * 3));
      const tinhaEnergia = energia > 0.001;
      energia = tinhaEnergia ? energia * Math.pow(0.01, dt / 0.7) : 0;
      if (degrau() !== degrauDesenhado || tinhaEnergia) desenhar();
      raf = visivel && !reduzido ? requestAnimationFrame(quadro) : 0;
    };

    const ligar = () => {
      if (!raf && visivel && !reduzido) {
        ultimo = 0;
        raf = requestAnimationFrame(quadro);
      }
    };
    const desligar = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // O laço só desenha quando o degrau vira, então o knob desenha sempre.
    redesenhar.current = desenhar;

    const mover = (e: PointerEvent) => {
      if (reduzido) return;
      if (px >= 0) {
        const passo = Math.hypot(e.clientX - px, e.clientY - py);
        energia = Math.min(1, energia + passo * 0.006);
      }
      px = e.clientX;
      py = e.clientY;
    };
    const sair = () => {
      px = py = -1;
    };
    const trocarMovimento = () => {
      reduzido = mq.matches;
      if (reduzido) {
        desligar();
        energia = 0;
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
    wrap.addEventListener("pointermove", mover);
    wrap.addEventListener("pointerleave", sair);

    return () => {
      vivo = false;
      img.onload = null;
      desligar();
      ro.disconnect();
      io.disconnect();
      offTema();
      mq.removeEventListener("change", trocarMovimento);
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
  }, [amount, speed, blocks]);

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
