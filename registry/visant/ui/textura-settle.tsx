"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Settle — areia rastelada, como num jardim de pedras. O ponteiro
 * passa e desfaz o rastelo, espalhando o grão; depois a areia assenta de
 * volta devagar e os sulcos reaparecem. Fundo calmo para página de pausa,
 * meditação ou tela de espera.
 *
 * Original da Visant Labs, família texturas: superfície que reage ao ponteiro,
 * um gesto só.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **A memória é uma textura pequena.** O quanto cada lugar foi mexido mora
 *    numa grade de 48 linhas na CPU, enviada como textura de um canal com
 *    filtro linear. Pequena de propósito: a interpolação do GPU arredonda o
 *    rastro, e o custo por quadro é um `texSubImage2D` de poucos KB.
 * 2. **Mexer reembaralha o grão, não o borra.** Onde a areia foi mexida o
 *    grão sorteia de novo (outra semente de hash) e o sulco perde amplitude.
 *    Borrar daria mancha; reembaralhar dá areia revirada.
 * 3. **Assentar é decair.** A grade multiplica por um fator a cada segundo e
 *    zera abaixo de um limiar. Quando zera inteira, o laço desliga: areia
 *    parada não pede quadro.
 * 4. **O sulco ondula na horizontal.** Duas senoides baixas entortam as
 *    linhas do rastelo; reta perfeita leria como listra de interface.
 * 5. **Escala pela altura** (sulcos e grade contam linhas na altura), e
 *    com movimento reduzido o rastro aparece sob o ponteiro e some ao sair,
 *    sem animação de assentamento.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform sampler2D uMexe;
uniform float uGrao;
uniform float uSulcos;
uniform vec3 uLuz;
uniform vec3 uAreia;
uniform vec3 uSombra;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 uv=px/uRes;
  float m=texture2D(uMexe,uv).r;
  vec2 q=px/uRes.y;
  vec2 g=floor(px/uGrao);
  float n=hash(g);
  float n2=hash(g+floor(m*5.)*17.31);
  float onda=q.y*uSulcos+.6*sin(q.x*1.7+.7)+.25*sin(q.x*4.3+q.y*2.1);
  float sulco=.5+.5*sin(onda*6.2832);
  float mexido=smoothstep(.02,.6,m);
  float grao=mix(n,n2,mexido);
  float tom=.5+(sulco-.5)*.6*(1.-mexido)+(grao-.5)*(.3+.55*mexido);
  vec3 col=mix(uSombra,uAreia,smoothstep(.05,.55,tom));
  col=mix(col,uLuz,smoothstep(.55,1.,tom));
  gl_FragColor=vec4(col,1.);
}
`;

/** Paradas padrão: crista, areia, fundo do sulco. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "color-mix(in oklab, var(--brand) 22%, var(--background))",
  "color-mix(in oklab, var(--brand) 60%, var(--background))",
];

const LINHAS = 48;

export interface TexturaSettleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Quantos sulcos de rastelo na altura.
   * @min 4
   * @max 40
   * @step 1
   */
  ridges?: number;
  /**
   * Tamanho do grão, em px.
   * @min 1
   * @max 6
   * @step 1
   */
  grain?: number;
  /**
   * Raio do rastro do ponteiro.
   * @min 0
   * @max 100
   * @step 1
   */
  radius?: number;
  /**
   * Velocidade com que a areia assenta.
   * @min 0
   * @max 100
   * @step 1
   */
  settle?: number;
  /** Paradas: crista, areia e fundo do sulco. Qualquer cor CSS ou token. */
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

export function TexturaSettle({
  ridges = 16,
  grain = 2,
  radius = 45,
  settle = 35,
  colors,
  className,
  ...props
}: TexturaSettleProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ ridges, grain, radius, settle });
  params.current = { ridges, grain, radius, settle };
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
      mexe: u("uMexe"),
      grao: u("uGrao"),
      sulcos: u("uSulcos"),
      luz: u("uLuz"),
      areia: u("uAreia"),
      sombra: u("uSombra"),
    };

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(U.mexe, 0);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dpr = 1;
    let raf = 0;
    let ultimo = 0;
    let lx = -1;
    let ly = -1;
    // A memória do rastro: 48 linhas, colunas pela proporção.
    let gw = 1;
    let campo = new Float32Array(LINHAS);
    let bytes = new Uint8Array(LINHAS);

    const enviar = () => {
      for (let i = 0; i < campo.length; i++) bytes[i] = Math.round(campo[i] * 255);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gw, LINHAS, gl.LUMINANCE, gl.UNSIGNED_BYTE, bytes);
    };

    const cores = () => {
      const [a, b, c] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.luz, a);
      gl.uniform3fv(U.areia, b ?? a);
      gl.uniform3fv(U.sombra, c ?? b ?? a);
    };

    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(wrap.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      const novo = Math.max(1, Math.min(256, Math.round((LINHAS * canvas.width) / canvas.height)));
      if (novo !== gw || campo.length !== novo * LINHAS) {
        gw = novo;
        campo = new Float32Array(gw * LINHAS);
        bytes = new Uint8Array(gw * LINHAS);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gw, LINHAS, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, bytes);
      }
    };

    const desenhar = () => {
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.grao, Math.max(1, Math.min(6, p.grain)) * dpr);
      gl.uniform1f(U.sulcos, Math.max(4, Math.min(40, p.ridges)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // O laço só vive enquanto ainda há areia por assentar.
    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 1 / 60;
      ultimo = agora;
      const fator = Math.pow(0.5 - (params.current.settle / 100) * 0.45, dt);
      let resta = false;
      for (let i = 0; i < campo.length; i++) {
        const v = campo[i] * fator;
        campo[i] = v < 0.004 ? 0 : v;
        if (campo[i]) resta = true;
      }
      enviar();
      desenhar();
      raf = resta ? requestAnimationFrame(quadro) : 0;
    };
    const pedirQuadro = () => {
      if (!raf) {
        ultimo = 0;
        raf = requestAnimationFrame(quadro);
      }
    };

    redesenhar.current = () => {
      if (!raf) desenhar();
    };

    const carimbar = (x: number, y: number) => {
      const cel = canvas.height / LINHAS;
      const r = (canvas.height * (0.04 + (params.current.radius / 100) * 0.14)) / cel;
      const cx = x / cel;
      const cy = y / cel;
      const x0 = Math.max(0, Math.floor(cx - r));
      const x1 = Math.min(gw - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r));
      const y1 = Math.min(LINHAS - 1, Math.ceil(cy + r));
      for (let j = y0; j <= y1; j++)
        for (let i = x0; i <= x1; i++) {
          const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy) / r;
          if (d < 1) campo[j * gw + i] = Math.max(campo[j * gw + i], 1 - d * d);
        }
    };

    const mover = (e: PointerEvent) => {
      // Ponteiro em px locais: a vitrine escala o palco com transform.
      const r = wrap.getBoundingClientRect();
      const k = r.width ? wrap.offsetWidth / r.width : 1;
      const x = (e.clientX - r.left) * k * dpr;
      const y = (e.clientY - r.top) * k * dpr;
      if (mq.matches) campo.fill(0);
      // Movimento rápido pula pixels entre eventos: carimba ao longo do trajeto.
      const passo = canvas.height / LINHAS;
      const sem = lx < 0 || mq.matches;
      const n = sem ? 1 : Math.min(24, Math.ceil(Math.hypot(x - lx, y - ly) / passo));
      for (let i = 1; i <= n; i++) {
        const t = sem ? 1 : i / n;
        carimbar(sem ? x : lx + (x - lx) * t, sem ? y : ly + (y - ly) * t);
      }
      lx = x;
      ly = y;
      if (mq.matches) {
        enviar();
        desenhar();
      } else pedirQuadro();
    };
    const sair = () => {
      lx = ly = -1;
      if (!mq.matches) return;
      campo.fill(0);
      enviar();
      desenhar();
    };

    cores();
    medir();
    enviar();
    desenhar();

    const ro = new ResizeObserver(() => {
      medir();
      enviar();
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
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [coresChave]);

  React.useEffect(() => {
    redesenhar.current();
  }, [ridges, grain, radius, settle]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Areia rastelada que o cursor espalha e que assenta de volta"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
