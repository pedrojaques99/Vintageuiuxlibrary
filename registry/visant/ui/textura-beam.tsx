"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Beam — um facho de luz que desce do alto, com poeira boiando
 * dentro, e que mira o ponteiro como canhão de palco seguindo o ator. Fundo
 * de dobra de lançamento, de "em breve" ou de palco de evento.
 *
 * Original da Visant Labs, família texturas: superfície que reage ao ponteiro,
 * um gesto só.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **A fonte fica fora do quadro.** O canhão está acima da borda de cima, no
 *    meio; só o cone entra na cena. Fonte visível vira desenho de lâmpada, e
 *    a peça é a luz, não o equipamento.
 * 2. **A poeira só existe dentro da luz.** Os grãos estão no quadro inteiro,
 *    mas cada um é multiplicado pela intensidade do facho naquele ponto: como
 *    na vida, só se vê a poeira que a luz pega. Mover o facho "revela" poeira
 *    nova em vez de arrastar a mesma.
 * 3. **Duas camadas de poeira.** Uma fina e lenta, outra maior e mais rápida,
 *    com escalas diferentes: dá profundidade sem nenhum 3D.
 * 4. **O cone enfraquece com a distância** e ganha um foco no alvo, a mancha
 *    onde a luz "bate". Cone uniforme lê como triângulo chapado.
 * 5. **O laço dorme.** A poeira pede tempo, então há laço, mas ele para fora da
 *    tela. Com movimento reduzido: um quadro parado, que só refaz quando o
 *    ponteiro mexe (o facho pula, sem deriva). Sem ponteiro, aponta pra baixo.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform vec2 uAlvo;
uniform float uAbre;
uniform float uTime;
uniform float uPoeira;
uniform vec3 uFundo;
uniform vec3 uLuz;
uniform vec3 uGrao;

vec2 hash(vec2 p){
  p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));
  return fract(sin(p)*43758.5453);
}

float poeira(vec2 q,float escala,vec2 deriva,float raio){
  vec2 p=q*escala+deriva;
  vec2 id=floor(p);
  vec2 f=fract(p);
  vec2 h=hash(id);
  vec2 o=.2+.6*h+.12*vec2(sin(uTime*.7+h.x*6.3),cos(uTime*.5+h.y*6.3));
  float d=length(f-o)*uRes.y/escala;
  float pisca=.5+.5*sin(uTime*(1.+h.y*2.)+h.x*6.3);
  return (1.-smoothstep(raio*.4,raio,d))*step(.45,h.y)*(.5+.5*pisca);
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 fonte=vec2(uRes.x*.5,-uRes.y*.18);
  vec2 eixo=normalize(uAlvo-fonte);
  vec2 v=px-fonte;
  float ao=dot(v,eixo);
  float pe=dot(v,vec2(-eixo.y,eixo.x));
  float ang=atan(abs(pe),max(ao,1.));
  float cone=(1.-smoothstep(uAbre*.55,uAbre,ang))*step(0.,ao);
  float queda=1./(1.+ao/uRes.y*.9);
  vec2 dz=(px-uAlvo)/uRes.y;
  float foco=exp(-dot(dz,dz)*28.)*cone;
  float luz=cone*queda*.62+foco*.35;
  vec3 col=mix(uFundo,uLuz,luz);

  vec2 q=px/uRes.y;
  float s=uRes.y/600.;
  float g=poeira(q,22.,vec2(uTime*.05,-uTime*.12),2.2*s);
  g=max(g,poeira(q,11.,vec2(-uTime*.04,-uTime*.22),3.6*s)*.8);
  col=mix(col,uGrao,g*min(1.,luz*1.8)*uPoeira);
  gl_FragColor=vec4(col,1.);
}
`;

/** Paradas padrão: fundo, luz, poeira. Tudo token. */
const CORES_PADRAO = [
  "var(--background)",
  "color-mix(in oklab, var(--brand) 85%, var(--background))",
  "color-mix(in oklab, var(--brand) 40%, var(--foreground))",
];

export interface TexturaBeamProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Abertura do facho.
   * @min 0
   * @max 100
   * @step 1
   */
  width?: number;
  /**
   * Quanta poeira boia na luz.
   * @min 0
   * @max 100
   * @step 1
   */
  dust?: number;
  /**
   * Velocidade da poeira.
   * @min 0
   * @max 100
   * @step 1
   */
  speed?: number;
  /** Paradas: fundo, luz e poeira. Qualquer cor CSS ou token. */
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

export function TexturaBeam({
  width = 40,
  dust = 60,
  speed = 30,
  colors,
  className,
  ...props
}: TexturaBeamProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ width, dust, speed });
  params.current = { width, dust, speed };
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
      alvo: u("uAlvo"),
      abre: u("uAbre"),
      time: u("uTime"),
      poeira: u("uPoeira"),
      fundo: u("uFundo"),
      luz: u("uLuz"),
      grao: u("uGrao"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduzido = mq.matches;
    let visivel = false;
    let raf = 0;
    let ultimo = 0;
    let tempo = 3;
    let dpr = 1;
    let dentro = false;
    const alvo = { x: 0, y: 0 };
    const mira = { x: 0, y: 0 };

    const cores = () => {
      const [a, b, c] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.luz, b ?? a);
      gl.uniform3fv(U.grao, c ?? b ?? a);
    };

    // Sem ponteiro, o facho desce reto até o chão.
    const repousar = () => {
      alvo.x = canvas.width * 0.5;
      alvo.y = canvas.height * 0.85;
    };

    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(wrap.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (!dentro) {
        repousar();
        Object.assign(mira, alvo);
      }
    };

    const desenhar = () => {
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform2f(U.alvo, mira.x, mira.y);
      // 0 → 6° de meia-abertura, 100 → 32°
      gl.uniform1f(U.abre, ((6 + (p.width / 100) * 26) * Math.PI) / 180);
      gl.uniform1f(U.time, tempo);
      gl.uniform1f(U.poeira, p.dust / 100);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      tempo += dt * (0.1 + (params.current.speed / 100) * 2);
      const k = 1 - Math.pow(0.9, dt * 60);
      mira.x += (alvo.x - mira.x) * k;
      mira.y += (alvo.y - mira.y) * k;
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
      dentro = true;
      if (reduzido) {
        Object.assign(mira, alvo);
        desenhar();
      }
    };
    const sair = () => {
      dentro = false;
      repousar();
      if (reduzido) {
        Object.assign(mira, alvo);
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
  }, [width, dust, speed]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Facho de luz com poeira que mira o cursor"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden bg-background", className)}
      {...props}
    />
  );
}
