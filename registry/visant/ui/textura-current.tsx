"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Current — linhas de fluxo como correnteza de rio, com traços que
 * descem pela água, e que abrem caminho em volta do ponteiro como em volta de
 * uma pedra. Fundo de dobra de produto que "flui", de dado em movimento, de
 * logística.
 *
 * Original da Visant Labs, família texturas: superfície que reage ao ponteiro,
 * um gesto só.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Física de livro, não ruído.** As linhas são curvas de nível da função
 *    de corrente do escoamento potencial em volta de um cilindro (ψ = y −
 *    R²·y/r²). Por isso elas contornam o ponteiro sem nunca se cruzar e se
 *    apertam nas laterais da pedra, onde a água corre mais rápido.
 * 2. **ψ absoluto, não relativo.** O termo da pedra é relativo ao ponteiro,
 *    mas o `y` é o da tela: longe da pedra cada linha fica no seu lugar. Com
 *    `y` relativo, todas as linhas subiriam e desceriam junto com o cursor.
 * 3. **Espessura constante pelo gradiente.** A distância até a linha mais
 *    próxima é |ψ − linha| dividida por |∇ψ|, calculado à mão. Sem isso a
 *    linha engordaria nos remansos e afinaria nas corredeiras.
 * 4. **Os traços correm pelo potencial.** O desenho que desce é um tracejado
 *    sobre φ = x + R²·x/r², que acompanha a velocidade: perto da pedra ele
 *    acelera nas laterais e quase para na frente dela, sem simulação.
 * 5. **O laço dorme.** O tracejado pede tempo, então há laço, mas ele para
 *    fora da tela. Com movimento reduzido: um quadro parado, que só refaz
 *    quando o ponteiro mexe. Sem ponteiro, a pedra encolhe e o rio fica reto.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform vec2 uPedra;
uniform float uR;
uniform float uLinhas;
uniform float uTime;
uniform float uPeso;
uniform vec3 uFundo;
uniform vec3 uLinha;
uniform vec3 uTraco;

float hash(float n){return fract(sin(n*127.1)*43758.5453);}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 p=px/uRes.y;
  vec2 r=p-uPedra/uRes.y;
  float r2=max(dot(r,r),1e-5);
  float k=uR*uR;
  float onda=.03*sin(p.x*2.3+uTime*.25)+.012*sin(p.x*6.1-uTime*.4+p.y*3.);
  float psi=p.y+onda-k*r.y/r2;
  float phi=p.x+k*r.x/r2;
  float gx=2.*k*r.x*r.y/(r2*r2);
  float gy=1.-k*(r2-2.*r.y*r.y)/(r2*r2);
  float g=max(length(vec2(gx,gy)),.25);

  float s=psi*uLinhas;
  float idx=floor(s+.5);
  float dist=abs(s-idx)/uLinhas/g*uRes.y;
  float aa=1.2;
  float linha=1.-smoothstep(uPeso-aa,uPeso+aa,dist);
  float largo=1.-smoothstep(uPeso*2.2-aa,uPeso*2.2+aa,dist);

  float h=hash(idx);
  float t=fract(phi*(2.5+h*1.5)-uTime*(.35+h*.25)+h);
  float traco=smoothstep(0.,.08,t)*(1.-smoothstep(.22,.32,t));

  float fora=smoothstep(k*.85,k*1.25,r2);
  vec3 col=mix(uFundo,uLinha,linha*fora*.8);
  col=mix(col,uTraco,largo*traco*fora);
  gl_FragColor=vec4(col,1.);
}
`;

/** Paradas padrão: água, linha, traço. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "color-mix(in oklab, var(--brand) 32%, var(--background))",
  "var(--brand)",
];

export interface TexturaCurrentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Quantas linhas de corrente na altura.
   * @min 6
   * @max 40
   * @step 1
   */
  lines?: number;
  /**
   * Tamanho da pedra que o ponteiro põe na água.
   * @min 0
   * @max 100
   * @step 1
   */
  wake?: number;
  /**
   * Velocidade da correnteza.
   * @min 0
   * @max 100
   * @step 1
   */
  speed?: number;
  /** Paradas: água, linha e traço. Qualquer cor CSS ou token. */
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

export function TexturaCurrent({
  lines = 16,
  wake = 45,
  speed = 35,
  colors,
  className,
  ...props
}: TexturaCurrentProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ lines, wake, speed });
  params.current = { lines, wake, speed };
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
      pedra: u("uPedra"),
      r: u("uR"),
      linhas: u("uLinhas"),
      time: u("uTime"),
      peso: u("uPeso"),
      fundo: u("uFundo"),
      linha: u("uLinha"),
      traco: u("uTraco"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduzido = mq.matches;
    let visivel = false;
    let raf = 0;
    let ultimo = 0;
    let tempo = 4;
    let dpr = 1;
    const alvo = { x: 0, y: 0, f: 0 };
    const pedra = { x: 0, y: 0, f: 0 };

    const cores = () => {
      const [a, b, c] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.linha, b ?? a);
      gl.uniform3fv(U.traco, c ?? b ?? a);
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
      gl.uniform2f(U.pedra, pedra.x, pedra.y);
      // Raio da pedra em alturas: 0 → 0,06, 100 → 0,3
      gl.uniform1f(U.r, (0.06 + (p.wake / 100) * 0.24) * pedra.f);
      gl.uniform1f(U.linhas, Math.max(6, Math.min(40, p.lines)));
      gl.uniform1f(U.time, tempo);
      gl.uniform1f(U.peso, Math.max(0.6, 0.7 * dpr));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      tempo += dt * (0.1 + (params.current.speed / 100) * 2.2);
      const k = 1 - Math.pow(0.88, dt * 60);
      pedra.x += (alvo.x - pedra.x) * k;
      pedra.y += (alvo.y - pedra.y) * k;
      pedra.f += (alvo.f - pedra.f) * k * 0.7;
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
      // Ponteiro em px locais: a vitrine escala o palco com transform.
      const r = wrap.getBoundingClientRect();
      const k = r.width ? wrap.offsetWidth / r.width : 1;
      alvo.x = (e.clientX - r.left) * k * dpr;
      alvo.y = (e.clientY - r.top) * k * dpr;
      alvo.f = 1;
      // A pedra nasce onde o ponteiro entrou, não desliza do canto.
      if (pedra.f < 0.02) {
        pedra.x = alvo.x;
        pedra.y = alvo.y;
      }
      if (reduzido) {
        Object.assign(pedra, alvo);
        desenhar();
      }
    };
    const sair = () => {
      alvo.f = 0;
      if (reduzido) {
        pedra.f = 0;
        desenhar();
      }
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
  }, [lines, wake, speed]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Linhas de correnteza que desviam do cursor"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
