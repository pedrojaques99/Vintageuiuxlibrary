"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Tiles — a imagem partida em ladrilhos, com uma junta fina de papel
 * entre eles. Perto do ponteiro os ladrilhos encolhem, se afastam dele e se
 * inclinam como azulejo solto que levanta a borda; longe dele a parede segue
 * inteira.
 *
 * Original da Visant Labs, da família texturas: superfície que reage ao
 * ponteiro, um gesto só por peça.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Cada ladrilho guarda o seu pedaço.** Encolher, empurrar e inclinar
 *    mexem só na moldura; dentro dela o ladrilho continua lendo a mesma
 *    fatia da foto. Por isso a imagem se parte em peças em vez de escorrer.
 * 2. **Nenhum ladrilho sai da sua célula.** O quanto ele encolhe paga o
 *    quanto ele anda e o quanto a borda levantada cresce. Assim cada pixel
 *    só precisa olhar o ladrilho da própria célula, uma leitura por pixel,
 *    sem procurar vizinho que tenha invadido.
 * 3. **Inclinação é perspectiva de pobre.** A borda virada para longe do
 *    cursor aumenta e a borda virada para ele diminui e escurece um pouco
 *    para a cor do texto. O olho lê inclinação sem nenhuma matriz 3D. A
    sombra pesa pelo alfa da foto, então ladrilho de papel vazio não ganha
    mancha.
 * 4. **A grade nasce no centro.** Como no pixelate, as sobras de célula
 *    ficam iguais nas duas bordas em vez de um ladrilho cortado de um lado.
 * 5. **Sem laço à toa.** Desenha na carga, no tema, no tamanho e no knob. O
 *    laço só existe enquanto os ladrilhos levantam, assentam ou seguem o
 *    cursor, e com movimento reduzido eles saltam direto para o lugar.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uImg;
uniform sampler2D uTex;
uniform vec3 uPonto;
uniform float uRaio;
uniform float uCel;
uniform float uJunta;
uniform vec3 uPapel;
uniform vec3 uTinta;

vec4 ler(vec2 px){
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return vec4(uPapel,0.);
  vec4 c=texture2D(uTex,uv);
  return vec4(mix(uPapel,c.rgb,c.a),c.a);
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 meio=uRes*.5;
  vec2 centro=(floor((px-meio)/uCel)+.5)*uCel+meio;
  vec2 v=centro-uPonto.xy;
  float dist=length(v);
  float f=(1.-smoothstep(0.,uRaio,dist))*uPonto.z;
  vec2 n=dist>.001?v/dist:vec2(0.);
  float escala=1.-uJunta/uCel-.3*f;
  vec2 l=(px-centro-n*f*uCel*.06)/(uCel*escala);
  float t=dot(l,n);
  l/=1.+f*.4*t;
  float borda=max(abs(l.x),abs(l.y));
  float aa=1./(uCel*escala);
  float cobre=1.-smoothstep(.5-aa,.5,borda);
  vec4 c=ler(centro+l*uCel);
  vec3 cor=mix(c.rgb,uTinta,f*.3*c.a*clamp(.5-dot(l,n),0.,1.));
  gl_FragColor=vec4(mix(uPapel,cor,cobre),1.);
}
`;

export interface TexturaTilesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a ladrilhar. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Lado de cada ladrilho, em px.
   * @min 12
   * @max 80
   * @step 1
   */
  size?: number;
  /**
   * Junta de papel entre ladrilhos, em px.
   * @min 0
   * @max 8
   * @step 0.5
   */
  gap?: number;
  /**
   * Quanto os ladrilhos levantam perto do cursor.
   * @min 0
   * @max 100
   * @step 1
   */
  strength?: number;
  /**
   * Alcance do cursor, em % do lado menor.
   * @min 10
   * @max 80
   * @step 1
   */
  radius?: number;
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

export function TexturaTiles({
  src,
  alt = "Imagem em ladrilhos",
  size = 32,
  gap = 1.5,
  strength = 85,
  radius = 34,
  className,
  ...props
}: TexturaTilesProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ size, gap, strength, radius });
  params.current = { size, gap, strength, radius };
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
      cel: u("uCel"),
      junta: u("uJunta"),
      papel: u("uPapel"),
      tinta: u("uTinta"),
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
    // x/y é onde o levante está; ax/ay é onde o cursor está.
    const ponto = { x: 0, y: 0, ax: 0, ay: 0, forca: 0, alvo: 0 };

    const cores = () => {
      gl.uniform3fv(U.papel, resolveCssColor("var(--background)", wrap));
      gl.uniform3fv(U.tinta, resolveCssColor("var(--foreground)", wrap));
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
      const k = Math.max(0, Math.min(100, p.strength)) / 100;
      const r = Math.max(10, Math.min(80, p.radius)) / 100;
      const cel = Math.max(12, Math.min(80, p.size));
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform3f(U.ponto, ponto.x * dpr, ponto.y * dpr, k * ponto.forca);
      gl.uniform1f(U.raio, Math.max(1, Math.min(canvas.width, canvas.height) * r));
      gl.uniform1f(U.cel, cel * dpr);
      gl.uniform1f(U.junta, Math.max(0, Math.min(8, p.gap)) * dpr);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const assentar = () => {
      ponto.x = ponto.ax;
      ponto.y = ponto.ay;
      ponto.forca = ponto.alvo;
    };

    // O laço só vive enquanto os ladrilhos levantam, assentam ou seguem.
    const quadro = () => {
      ponto.forca += (ponto.alvo - ponto.forca) * 0.12;
      ponto.x += (ponto.ax - ponto.x) * 0.16;
      ponto.y += (ponto.ay - ponto.y) * 0.16;
      const parado =
        Math.abs(ponto.alvo - ponto.forca) < 0.004 && Math.hypot(ponto.ax - ponto.x, ponto.ay - ponto.y) < 0.3;
      if (parado) assentar();
      desenhar();
      raf = parado ? 0 : requestAnimationFrame(quadro);
    };
    const pedirQuadro = () => {
      if (mq.matches) {
        assentar();
        desenhar();
      } else if (!raf) raf = requestAnimationFrame(quadro);
    };

    redesenhar.current = () => {
      if (!raf) desenhar();
    };

    const mover = (e: PointerEvent) => {
      // Ponteiro em px locais: a vitrine escala o palco com transform.
      const r = wrap.getBoundingClientRect();
      const k = r.width ? wrap.offsetWidth / r.width : 1;
      ponto.ax = (e.clientX - r.left) * k;
      ponto.ay = (e.clientY - r.top) * k;
      if (ponto.forca < 0.01) {
        ponto.x = ponto.ax;
        ponto.y = ponto.ay;
      }
      ponto.alvo = 1;
      pedirQuadro();
    };
    const sair = () => {
      ponto.alvo = 0;
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
  }, [size, gap, strength, radius]);

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
