"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Neon — fios de luz que ondulam num campo liso, desenhados por um
 * fragment shader. Serve de fundo vivo para uma dobra, um card de destaque ou
 * a tela de espera de um app.
 *
 * Veio do visualizador de áudio do 7Panel Studio (`SHADER_NEON`), onde cada
 * fio respondia a uma banda do som. Aqui não tem microfone: quem faz o papel
 * do grave é o ponteiro. Passar o mouse rápido injeta energia, os fios
 * engrossam e abrem a onda, e a energia escoa sozinha em ~1s.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **A cor sai da rampa, não do matiz.** O original girava o matiz por fio,
 *    o que dá arco-íris em qualquer marca. Aqui o shader soma só a INTENSIDADE
 *    dos fios e pinta numa rampa de três paradas: fundo, linha e núcleo. No
 *    escuro o núcleo puxa para `--foreground` e acende; no claro ele escurece e
 *    a linha lê como tinta. A mesma peça serve aos dois temas sem ramo.
 * 2. **O tempo é acumulado, não lido do relógio.** Mexer em `speed` muda a
 *    taxa de avanço do tempo, não o tempo em si. Ler `performance.now() *
 *    speed` faria a onda saltar de fase a cada ajuste no knob.
 * 3. **O canvas nasce dentro do efeito.** Perder o contexto no unmount devolve
 *    a vaga ao navegador (teto de ~16 contextos vivos), mas um canvas com
 *    contexto perdido não volta. Criando um canvas novo a cada montagem, o
 *    StrictMode e a navegação de cliente sempre pegam um contexto vivo.
 * 4. **O laço dorme.** Fora da tela (IntersectionObserver) não há quadro
 *    nenhum. Com movimento reduzido desenha um quadro parado e só redesenha
 *    em troca de tema, tamanho ou knob.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uLines;
uniform float uAmp;
uniform float uGlow;
uniform float uPulse;
uniform vec3 uFundo;
uniform vec3 uLinha;
uniform vec3 uNucleo;

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float d=length(uv);
  float g=0.;
  for(float i=0.;i<8.;i++){
    if(i>=uLines)break;
    float f=(1.+i*.8)*.45;
    float amp=(.15+uPulse*.2-i*.02)*uAmp;
    float phase=uTime*(1.5+i*.3)+i*1.2;
    float wave=sin(uv.x*f*12.+phase)*amp;
    wave+=cos(uv.x*f*6.-phase*.7)*amp*.5*(.4+uPulse);
    float dist=abs(uv.y-wave);
    float espessura=.006+uPulse*.004;
    g+=espessura/(dist+.003)*uGlow*exp(-d*.5)*(.3+uPulse*.7);
  }
  vec3 c=mix(uFundo,uLinha,clamp(g,0.,1.));
  c=mix(c,uNucleo,smoothstep(1.2,4.,g));
  gl_FragColor=vec4(c,1.);
}
`;

/** Rampa padrão: fundo, linha, núcleo. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "var(--brand)",
  "color-mix(in oklab, var(--brand) 40%, var(--foreground))",
];

export interface ShaderNeonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** 1–8. Quantos fios de luz. */
  lines?: number;
  /** 0–100. Velocidade da onda. */
  speed?: number;
  /** 0–100. Altura da onda. */
  amplitude?: number;
  /** 0–100. Brilho de cada fio. */
  glow?: number;
  /** Paradas da rampa: fundo, linha e núcleo. Qualquer cor CSS ou token. */
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

export function ShaderNeon({
  lines = 5,
  speed = 40,
  amplitude = 50,
  glow = 50,
  colors,
  className,
  ...props
}: ShaderNeonProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  // Parâmetros vivos num ref: mexer no knob não recria o contexto.
  const params = React.useRef({ lines, speed, amplitude, glow });
  params.current = { lines, speed, amplitude, glow };
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
      time: u("uTime"),
      lines: u("uLines"),
      amp: u("uAmp"),
      glow: u("uGlow"),
      pulse: u("uPulse"),
      fundo: u("uFundo"),
      linha: u("uLinha"),
      nucleo: u("uNucleo"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduzido = mq.matches;
    let visivel = false;
    let raf = 0;
    let ultimo = 0;
    let tempo = 3; // começa com a onda já aberta, não num ponto de fase nula
    let energia = 0;
    let px = -1;
    let py = -1;

    const cores = () => {
      const [a, b, c] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.linha, b ?? a);
      gl.uniform3fv(U.nucleo, c ?? b ?? a);
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
      const pulso = reduzido ? 0.35 : 0.3 + 0.12 * Math.sin(tempo * 0.8) + energia;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.time, tempo);
      gl.uniform1f(U.lines, Math.max(1, Math.min(8, Math.round(p.lines))));
      gl.uniform1f(U.amp, 0.2 + (p.amplitude / 100) * 1.6);
      gl.uniform1f(U.glow, 0.2 + (p.glow / 100) * 1.6);
      gl.uniform1f(U.pulse, Math.min(1.2, pulso));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      tempo += dt * (0.1 + (params.current.speed / 100) * 1.8);
      energia *= Math.pow(0.04, dt); // escoa em ~1s
      desenhar();
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

    redesenhar.current = () => {
      if (!raf) desenhar();
    };

    const mover = (e: PointerEvent) => {
      if (px >= 0) {
        const passo = Math.hypot(e.clientX - px, e.clientY - py);
        energia = Math.min(0.9, energia + passo * 0.004);
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
        desenhar();
      } else ligar();
    };

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
      desligar();
      ro.disconnect();
      io.disconnect();
      offTema();
      mq.removeEventListener("change", trocarMovimento);
      wrap.removeEventListener("pointermove", mover);
      wrap.removeEventListener("pointerleave", sair);
      redesenhar.current = () => {};
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [coresChave]);

  React.useEffect(() => {
    redesenhar.current();
  }, [lines, speed, amplitude, glow]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Fios de luz ondulando"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
