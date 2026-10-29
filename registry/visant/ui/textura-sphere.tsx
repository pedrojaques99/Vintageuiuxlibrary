"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Textura Sphere — uma bolha de vidro passeia sob o ponteiro e amplia a
 * imagem como olho de peixe: o miolo cresce, a borda se espreme contra a
 * curva, e um reflexo pequeno no alto diz que aquilo é vidro. Quando o
 * cursor sai, a bolha murcha e some.
 *
 * Original da Visant Labs, da família texturas: superfície que reage ao
 * ponteiro, um gesto só por peça.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **A altura da esfera é a lente.** Cada pixel dentro da bolha lê a
 *    imagem mais perto do centro na proporção de `√(1 − r²)`, a altura de
 *    uma esfera naquele ponto. No miolo amplia muito; na borda a altura é
 *    zero e a amostra volta a coincidir com o pixel, então a foto emenda.
 * 2. **Sombra e reflexo saem do tema.** A borda escurece para a cor do texto
 *    e o reflexo clareia para o papel. Nada de branco ou preto fixos: no
 *    escuro a bolha continua vidro, não vira um buraco claro.
 * 3. **A borda é antisserrilhada à mão.** O canvas nasce sem `antialias`, e
 *    o corte da esfera mistura dentro e fora numa faixa de 1,5 px. Sem isso
 *    a bolha teria contorno de escada em tela de 1×.
 * 4. **A bolha cresce, não só aparece.** Na entrada o raio vai de 60% a
 *    100% junto com a força, e na saída faz o caminho de volta. A posição
 *    corre atrás do cursor, então ela desliza em vez de pular.
 * 5. **Sem laço à toa.** Desenha na carga, no tema, no tamanho e no knob. O
 *    laço só existe enquanto a bolha cresce, murcha ou anda, e com movimento
 *    reduzido ela salta direto para o cursor.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uImg;
uniform sampler2D uTex;
uniform vec3 uPonto;
uniform float uRaio;
uniform float uLente;
uniform vec3 uPapel;
uniform vec3 uTinta;

vec3 ler(vec2 px){
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return uPapel;
  vec4 c=texture2D(uTex,uv);
  return mix(uPapel,c.rgb,c.a);
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec3 fora=ler(px);
  float a=uPonto.z;
  if(a<=0.){gl_FragColor=vec4(fora,1.);return;}
  float R=uRaio*(.6+.4*a);
  vec2 d=(px-uPonto.xy)/R;
  float r=length(d);
  float sombra=(1.-smoothstep(1.,1.14,r))*step(1.,r);
  fora=mix(fora,uTinta,sombra*.14*a);
  if(r>1.){gl_FragColor=vec4(fora,1.);return;}
  float z=sqrt(max(0.,1.-r*r));
  vec3 dentro=ler(uPonto.xy+d*R*(1.-uLente*a*z));
  dentro=mix(dentro,uTinta,smoothstep(.78,1.,r)*.24*a);
  float brilho=1.-smoothstep(0.,.28,length(d-vec2(-.36,-.42)));
  dentro=mix(dentro,uPapel,brilho*brilho*.55*a);
  float corte=smoothstep(1.,1.-1.5/R,r);
  gl_FragColor=vec4(mix(fora,dentro,corte),1.);
}
`;

export interface TexturaSphereProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem debaixo da bolha. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Quanto a bolha amplia o miolo.
   * @min 0
   * @max 90
   * @step 1
   */
  strength?: number;
  /**
   * Raio da bolha, em % do lado menor.
   * @min 10
   * @max 50
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

export function TexturaSphere({
  src,
  alt = "Imagem sob uma bolha de vidro",
  strength = 55,
  radius = 26,
  className,
  ...props
}: TexturaSphereProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ strength, radius });
  params.current = { strength, radius };
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
      lente: u("uLente"),
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
    // x/y é onde a bolha está; ax/ay é onde o cursor está.
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
      const r = Math.max(10, Math.min(50, p.radius)) / 100;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform3f(U.ponto, ponto.x * dpr, ponto.y * dpr, ponto.forca);
      gl.uniform1f(U.raio, Math.max(1, Math.min(canvas.width, canvas.height) * r));
      gl.uniform1f(U.lente, Math.max(0, Math.min(90, p.strength)) / 100);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const assentar = () => {
      ponto.x = ponto.ax;
      ponto.y = ponto.ay;
      ponto.forca = ponto.alvo;
    };

    // O laço só vive enquanto a bolha cresce, murcha ou anda atrás do cursor.
    const quadro = () => {
      ponto.forca += (ponto.alvo - ponto.forca) * 0.14;
      ponto.x += (ponto.ax - ponto.x) * 0.2;
      ponto.y += (ponto.ay - ponto.y) * 0.2;
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
  }, [strength, radius]);

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
