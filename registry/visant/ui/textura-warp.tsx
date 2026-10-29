"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Warp — a imagem escorre em ruído, como foto refletida em água
 * parada com óleo por cima. Parada, ela fica numa ondulação quieta; o
 * ponteiro rápido agita a superfície, mais forte perto dele, e a água volta
 * a assentar sozinha quando ele para.
 *
 * Original da Visant Labs, da família texturas: superfície que reage ao
 * ponteiro, um gesto só por peça.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Ruído deformando ruído.** O desvio de cada pixel é um fbm lido num
 *    ponto que outro fbm já deslocou (domain warp). Um ruído só daria
 *    ondinha regular; o ruído dobrado é que faz a foto escorrer em veios.
 * 2. **Velocidade, não posição.** O que agita é o quanto o cursor andou
 *    desde o último evento, dividido pelo tempo. Passar devagar quase não
 *    mexe; um gesto rápido sobe a agitação, que depois cai sozinha.
 * 3. **O tempo só anda agitado.** O relógio do ruído avança na proporção da
 *    agitação. Sem ponteiro a água congela num quadro, então a peça parada
 *    não gasta nada e o quadro seguinte emenda sem salto.
 * 4. **Desvio em px de tela.** `strength` é em px, multiplicado pelo
 *    devicePixelRatio, e a escala do ruído é em fração do lado menor: a
 *    ondulação lê igual numa miniatura e numa capa.
 * 5. **Movimento reduzido é água parada.** Com a preferência ligada o
 *    ponteiro não agita nada e fica só o quadro quieto, sem laço.
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
uniform vec3 uPonto;
uniform float uRaio;
uniform float uAmp;
uniform float uEscala;
uniform float uTempo;
uniform vec3 uPapel;

vec3 ler(vec2 px){
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return uPapel;
  vec4 c=texture2D(uTex,uv);
  return mix(uPapel,c.rgb,c.a);
}

float hash(vec2 p){
  p=fract(p*vec2(123.34,456.21));
  p+=dot(p,p+45.32);
  return fract(p.x*p.y);
}
float ruido(vec2 p){
  vec2 i=floor(p);
  vec2 f=fract(p);
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);
}
float fbm(vec2 p){
  float v=0.;
  float a=.5;
  for(int i=0;i<4;i++){v+=a*ruido(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}
  return v;
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 q=px/min(uRes.x,uRes.y)*uEscala;
  float t=uTempo;
  vec2 w=vec2(fbm(q+vec2(0.,t*.5)),fbm(q+vec2(5.2,1.3)-vec2(t*.4,0.)));
  vec2 w2=vec2(fbm(q+3.*w+vec2(1.7,9.2)+t*.3),fbm(q+3.*w+vec2(8.3,2.8)-t*.2));
  float perto=1.-smoothstep(0.,uRaio,distance(px,uPonto.xy));
  float amp=uAmp*(1.+uPonto.z*(.8+2.6*perto));
  gl_FragColor=vec4(ler(px+(w2-.5)*2.*amp),1.);
}
`;

export interface TexturaWarpProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a escorrer. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Quanto a imagem escorre em repouso, em px.
   * @min 0
   * @max 40
   * @step 1
   */
  strength?: number;
  /**
   * Tamanho dos veios: menor é onda larga, maior é veio fino.
   * @min 1
   * @max 10
   * @step 0.5
   */
  scale?: number;
  /**
   * Quanto o ponteiro rápido agita a superfície.
   * @min 0
   * @max 100
   * @step 1
   */
  stir?: number;
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

export function TexturaWarp({
  src,
  alt = "Imagem escorrendo em ruído",
  strength = 10,
  scale = 3,
  stir = 60,
  className,
  ...props
}: TexturaWarpProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ strength, scale, stir });
  params.current = { strength, scale, stir };
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
      ponto: u("uPonto"),
      raio: u("uRaio"),
      amp: u("uAmp"),
      escala: u("uEscala"),
      tempo: u("uTempo"),
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
    let tempo = 0;
    // agita sobe com a velocidade do cursor e cai sozinha a cada quadro.
    const ponto = { x: 0, y: 0, agita: 0, ultimo: 0 };

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
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform3f(U.ponto, ponto.x * dpr, ponto.y * dpr, ponto.agita);
      gl.uniform1f(U.raio, Math.min(canvas.width, canvas.height) * 0.4);
      gl.uniform1f(U.amp, Math.max(0, Math.min(40, p.strength)) * dpr);
      gl.uniform1f(U.escala, Math.max(1, Math.min(10, p.scale)));
      gl.uniform1f(U.tempo, tempo);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // O laço só vive enquanto a superfície está agitada.
    const quadro = () => {
      tempo += 0.035 * ponto.agita;
      ponto.agita *= 0.95;
      if (ponto.agita < 0.003) ponto.agita = 0;
      desenhar();
      raf = ponto.agita > 0 ? requestAnimationFrame(quadro) : 0;
    };

    redesenhar.current = () => {
      if (!raf) desenhar();
    };

    const mover = (e: PointerEvent) => {
      // Ponteiro em px locais: a vitrine escala o palco com transform.
      const r = wrap.getBoundingClientRect();
      const k = r.width ? wrap.offsetWidth / r.width : 1;
      const x = (e.clientX - r.left) * k;
      const y = (e.clientY - r.top) * k;
      const agora = e.timeStamp;
      const dt = Math.max(8, agora - ponto.ultimo);
      const rapido = ponto.ultimo > 0 && dt < 120 ? Math.hypot(x - ponto.x, y - ponto.y) / dt : 0;
      ponto.x = x;
      ponto.y = y;
      ponto.ultimo = agora;
      if (mq.matches) return;
      const ganho = (Math.max(0, Math.min(100, params.current.stir)) / 100) * 0.22;
      ponto.agita = Math.min(1, ponto.agita + Math.max(0, rapido - 0.25) * ganho);
      if (ponto.agita > 0 && !raf) raf = requestAnimationFrame(quadro);
    };
    const sair = () => {
      ponto.ultimo = 0;
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
  }, [src]);

  React.useEffect(() => {
    redesenhar.current();
  }, [strength, scale, stir]);

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
