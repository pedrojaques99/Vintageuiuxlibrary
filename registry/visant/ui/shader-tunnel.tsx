"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader Tunnel — um túnel de anéis torcidos que corre para o centro, pintado
 * com a cor da marca. Fundo de impacto para abertura, tela de carregamento ou
 * a dobra de um lançamento.
 *
 * Veio do visualizador de áudio do 7Panel Studio (`SHADER_WARP`), onde o grave
 * acelerava a corrida e o agudo apertava os anéis. Aqui o ponteiro faz o
 * papel do grave: passar o mouse rápido acelera o túnel, e ele volta ao
 * passo de cruzeiro em ~1s.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Braços inteiros.** O original torcia o ângulo por um fator livre, e o
 *    `atan` tem um salto em 180 graus: sobrava uma costura reta no lado
 *    esquerdo. Com um número inteiro de braços o padrão fecha a volta.
 * 2. **Intensidade numa rampa, não três cores somadas.** O original somava
 *    três tons fixos de azul e roxo. Aqui o shader produz só um escalar de
 *    luz e pinta na rampa fundo → marca → núcleo, então o túnel veste
 *    qualquer marca e os dois temas.
 * 3. **O centro é um poço.** `1/d` explode no centro e o padrão vira ruído de
 *    aliasing. Em vez de esconder com brilho, a luz cai a zero perto do centro:
 *    lê como profundidade e some o serrilhado.
 * 4. **A aceleração mexe na taxa do tempo.** A energia do ponteiro soma na
 *    velocidade com que o tempo acumula, não no tempo: o túnel acelera sem
 *    pular de fase.
 * 5. Mesmo contrato do `shader-neon`: canvas criado no efeito, contexto
 *    devolvido no unmount, laço parado fora da tela e com movimento reduzido.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uTwist;
uniform float uDensity;
uniform float uPulse;
uniform vec3 uFundo;
uniform vec3 uMeio;
uniform vec3 uNucleo;

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float t=uTime;
  float a=atan(uv.y,uv.x);
  float d=length(uv);

  float tunel=.5/max(d,.001);
  // Braços em número INTEIRO: o ângulo dá a volta sem costura em 180 graus.
  float bracos=floor(2.+uDensity*4.);
  float espiral=a*bracos+tunel*uTwist*2.+t*.4;

  float padrao=sin(tunel*20.*uDensity-t*2.)*.5+.5;
  padrao*=sin(espiral)*.5+.5;
  padrao+=sin(tunel*10.*uDensity+a*2.+tunel*uTwist-t)*.3;

  float aneis=sin(tunel*30.*uDensity-t*3.)*.5+.5;
  aneis*=exp(-d*1.5);

  float luz=padrao*(1.-d)*.9+aneis*.35*(.5+uPulse);
  luz+=exp(-d*2.)*.25*(1.+uPulse);
  luz*=smoothstep(.02,.22,d);

  vec3 c=mix(uFundo,uMeio,clamp(luz,0.,1.));
  c=mix(c,uNucleo,smoothstep(.9,1.6,luz));
  gl_FragColor=vec4(c,1.);
}
`;

/** Rampa padrão: fundo, marca, núcleo. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "var(--brand)",
  "color-mix(in oklab, var(--brand) 40%, var(--foreground))",
];

export interface ShaderTunnelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Velocidade de cruzeiro do túnel.
   * @min 0
   * @max 100
   * @step 1
   */
  speed?: number;
  /**
   * Quanto os anéis torcem em espiral.
   * @min 0
   * @max 100
   * @step 1
   */
  twist?: number;
  /**
   * Densidade dos anéis.
   * @min 0
   * @max 100
   * @step 1
   */
  density?: number;
  /** Paradas da rampa: fundo, meio e núcleo. Qualquer cor CSS ou token. */
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

export function ShaderTunnel({
  speed = 40,
  twist = 50,
  density = 40,
  colors,
  className,
  ...props
}: ShaderTunnelProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ speed, twist, density });
  params.current = { speed, twist, density };
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
      twist: u("uTwist"),
      density: u("uDensity"),
      pulse: u("uPulse"),
      fundo: u("uFundo"),
      meio: u("uMeio"),
      nucleo: u("uNucleo"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduzido = mq.matches;
    let visivel = false;
    let raf = 0;
    let ultimo = 0;
    let tempo = 4;
    let energia = 0;
    let px = -1;
    let py = -1;

    const cores = () => {
      const [a, b, c] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.meio, b ?? a);
      gl.uniform3fv(U.nucleo, c ?? b ?? a);
    };

    const medir = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(wrap.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const desenhar = () => {
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.time, tempo);
      gl.uniform1f(U.twist, 0.1 + (p.twist / 100) * 1.8);
      gl.uniform1f(U.density, 0.25 + (p.density / 100) * 1.25);
      gl.uniform1f(U.pulse, energia);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      tempo += dt * (0.1 + (params.current.speed / 100) * 1.6) * (1 + energia * 3);
      energia *= Math.pow(0.04, dt);
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
        energia = Math.min(1, energia + passo * 0.004);
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
  }, [speed, twist, density]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Túnel de anéis em movimento"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
