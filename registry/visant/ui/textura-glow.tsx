"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Glow — um brilho macio na cor da marca que segue o ponteiro sobre
 * um grão fino, como luz de lanterna em papel. Fundo discreto para dobra de
 * produto, card de preço ou tela de login: a superfície acorda onde a pessoa
 * está olhando.
 *
 * Original da Visant Labs, família texturas: superfície que reage ao ponteiro,
 * um gesto só.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **O grão é o que mata a faixa.** Degradê largo em 8 bits faz degraus
 *    visíveis (banding), principalmente no escuro. O grão fino soma um ruído
 *    de ±meio tom por pixel, que espalha o degrau e some no olho; ele cresce
 *    um pouco dentro do brilho, onde a faixa seria pior.
 * 2. **O brilho estica no rumo do movimento.** A velocidade do ponteiro,
 *    amaciada, alonga a elipse na direção em que ele anda: o brilho parece
 *    ter inércia sem simulação nenhuma. Parado, volta a ser redondo.
 * 3. **Duas gaussianas.** Um halo largo na cor da marca e um núcleo pequeno
 *    na terceira parada. Um raio só lê como "spotlight de template".
 * 4. **Grão em px de CSS.** O ruído é amostrado em células de 1px de CSS, não
 *    de dispositivo, para o grão ter o mesmo tamanho na tela retina.
 * 5. **Sem laço à toa.** Sem ponteiro nada se mexe: o laço só vive enquanto o
 *    brilho ainda está chegando ou esticado. Ao sair, ele volta ao meio e
 *    baixa a força; com movimento reduzido, pula direto.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform vec2 uLuz;
uniform vec2 uVel;
uniform float uRaio;
uniform float uForca;
uniform float uGrao;
uniform float uDpr;
uniform vec3 uFundo;
uniform vec3 uBrilho;
uniform vec3 uNucleo;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 d=px-uLuz;
  float v=length(uVel);
  vec2 dir=v>.001?uVel/v:vec2(1.,0.);
  float estica=1.+min(v/uRaio,1.)*.9;
  float ao=dot(d,dir)/estica;
  float pe=dot(d,vec2(-dir.y,dir.x));
  float r2=(ao*ao+pe*pe)/(uRaio*uRaio);
  float halo=exp(-r2*2.2)*uForca;
  float nucleo=exp(-r2*14.)*uForca;
  vec3 col=mix(uFundo,uBrilho,halo*.85);
  col=mix(col,uNucleo,nucleo*.6);
  float n=hash(floor(px/uDpr))-.5;
  col+=n*uGrao*(.05+.07*halo);
  gl_FragColor=vec4(col,1.);
}
`;

/** Paradas padrão: fundo, brilho, núcleo. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "var(--brand)",
  "color-mix(in oklab, var(--brand) 45%, var(--foreground))",
];

export interface TexturaGlowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Raio do brilho.
   * @min 0
   * @max 100
   * @step 1
   */
  radius?: number;
  /**
   * Força do brilho.
   * @min 0
   * @max 100
   * @step 1
   */
  intensity?: number;
  /**
   * Quanto grão sobre a superfície.
   * @min 0
   * @max 100
   * @step 1
   */
  grain?: number;
  /** Paradas: fundo, brilho e núcleo. Qualquer cor CSS ou token. */
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

export function TexturaGlow({
  radius = 45,
  intensity = 70,
  grain = 45,
  colors,
  className,
  ...props
}: TexturaGlowProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ radius, intensity, grain });
  params.current = { radius, intensity, grain };
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
      luz: u("uLuz"),
      vel: u("uVel"),
      raio: u("uRaio"),
      forca: u("uForca"),
      grao: u("uGrao"),
      dpr: u("uDpr"),
      fundo: u("uFundo"),
      brilho: u("uBrilho"),
      nucleo: u("uNucleo"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dpr = 1;
    let raf = 0;
    let ultimo = 0;
    let dentro = false;
    const alvo = { x: 0, y: 0, forca: 0.65 };
    const luz = { x: 0, y: 0, forca: 0.65, vx: 0, vy: 0 };

    const cores = () => {
      const [a, b, c] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.brilho, b ?? a);
      gl.uniform3fv(U.nucleo, c ?? b ?? a);
    };

    // Em repouso o brilho fica um pouco abaixo do meio, mais fraco.
    const repousar = () => {
      alvo.x = canvas.width * 0.5;
      alvo.y = canvas.height * 0.58;
      alvo.forca = 0.65;
    };

    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(wrap.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (!dentro) {
        repousar();
        Object.assign(luz, alvo, { vx: 0, vy: 0 });
      }
    };

    const desenhar = () => {
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform2f(U.luz, luz.x, luz.y);
      gl.uniform2f(U.vel, luz.vx, luz.vy);
      gl.uniform1f(U.raio, canvas.height * (0.2 + (p.radius / 100) * 0.6));
      gl.uniform1f(U.forca, luz.forca * (0.2 + (p.intensity / 100) * 0.8));
      gl.uniform1f(U.grao, p.grain / 100);
      gl.uniform1f(U.dpr, dpr);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // O laço só vive enquanto o brilho ainda está chegando.
    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 1 / 60;
      ultimo = agora;
      const k = 1 - Math.pow(0.88, dt * 60);
      const dx = (alvo.x - luz.x) * k;
      const dy = (alvo.y - luz.y) * k;
      luz.x += dx;
      luz.y += dy;
      luz.forca += (alvo.forca - luz.forca) * k;
      // Velocidade em px por quadro de 60Hz, amaciada: é ela que estica a elipse.
      const kv = 1 - Math.pow(0.8, dt * 60);
      luz.vx += ((dx / (dt * 60)) * 6 - luz.vx) * kv;
      luz.vy += ((dy / (dt * 60)) * 6 - luz.vy) * kv;
      const parado =
        Math.hypot(alvo.x - luz.x, alvo.y - luz.y) < 0.5 &&
        Math.abs(alvo.forca - luz.forca) < 0.003 &&
        Math.hypot(luz.vx, luz.vy) < 0.5;
      if (parado) Object.assign(luz, alvo, { vx: 0, vy: 0 });
      desenhar();
      raf = parado ? 0 : requestAnimationFrame(quadro);
    };
    const pedirQuadro = () => {
      if (mq.matches) {
        Object.assign(luz, alvo, { vx: 0, vy: 0 });
        desenhar();
      } else if (!raf) {
        ultimo = 0;
        raf = requestAnimationFrame(quadro);
      }
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
      alvo.forca = 1;
      dentro = true;
      pedirQuadro();
    };
    const sair = () => {
      dentro = false;
      repousar();
      pedirQuadro();
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
    wrap.addEventListener("pointerleave", sair);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      offTema();
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
  }, [radius, intensity, grain]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Brilho macio que segue o cursor sobre grão fino"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
