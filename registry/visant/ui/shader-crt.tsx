"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader CRT — uma imagem num monitor de tubo: linhas de varredura, vinheta
 * nos cantos, a tela abaulada e uma faixa de luz que desce devagar, como o
 * quadro que a câmera pega de uma TV antiga.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `crtScanlines` do ImageLab). Lá era um quadro parado para exportar;
 * aqui ganhou a faixa de varredura que rola, e só ela pede laço.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **A linha tem espessura em px de tela.** O original contava as linhas
 *    pela altura da imagem, então foto grande dava linha fina demais para ver.
 *    Aqui `lineWidth` é em px CSS, e a trama lê igual em qualquer tamanho.
 * 2. **A curva é da tela, não da foto.** O abaulado deforma o quadro do canvas
 *    e só depois procura a imagem dentro dele, então foto retrato ou paisagem
 *    fica dentro do mesmo tubo. Fora do tubo é o fundo do tema, não preto.
 * 3. **Laço só se a faixa rola.** Com `roll` em zero a peça não tem
 *    movimento nenhum e desenha só na carga, no tema, no tamanho e no knob.
 * 4. **O laço dorme.** Fora da tela (IntersectionObserver) não há quadro. Com
 *    movimento reduzido a faixa fica parada no meio do caminho.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uImg;
uniform sampler2D uTex;
uniform float uDpr;
uniform float uLinha;
uniform float uIntensidade;
uniform float uVinheta;
uniform float uCurva;
uniform float uFaixa;
uniform float uFaixaForca;
uniform vec3 uPapel;

void main(){
  vec2 su=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uRes;
  vec2 cc=su-.5;
  su+=cc*dot(cc,cc)*uCurva;
  if(su.x<0.||su.y<0.||su.x>1.||su.y>1.){gl_FragColor=vec4(uPapel,1.);return;}
  vec2 px=su*uRes;
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  vec3 c=uPapel;
  if(uv.x>=0.&&uv.y>=0.&&uv.x<=1.&&uv.y<=1.){
    vec4 t=texture2D(uTex,uv);
    c=mix(uPapel,t.rgb,t.a);
  }
  float varre=sin(px.y/uDpr*3.14159/uLinha)*.5+.5;
  c*=1.-uIntensidade*(1.-varre);
  float y=fract(su.y-uFaixa);
  c*=1.+uFaixaForca*smoothstep(0.,.12,y)*(1.-smoothstep(.12,.24,y));
  vec2 vig=su*(1.-su);
  c*=mix(1.,pow(vig.x*vig.y*16.,.25),uVinheta);
  gl_FragColor=vec4(c,1.);
}
`;

export interface ShaderCrtProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a pôr no tubo. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Espessura de cada linha de varredura, em px.
   * @min 1
   * @max 8
   * @step 1
   */
  lineWidth?: number;
  /**
   * O quanto as linhas escurecem a imagem.
   * @min 0
   * @max 100
   * @step 1
   */
  intensity?: number;
  /**
   * Escurecimento dos cantos.
   * @min 0
   * @max 100
   * @step 1
   */
  vignette?: number;
  /**
   * O quanto a tela é abaulada.
   * @min 0
   * @max 100
   * @step 1
   */
  curvature?: number;
  /**
   * Velocidade da faixa de luz que desce. Zero deixa a tela parada.
   * @min 0
   * @max 100
   * @step 1
   */
  roll?: number;
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

export function ShaderCrt({
  src,
  alt = "Imagem num monitor de tubo",
  lineWidth = 2,
  intensity = 30,
  vignette = 30,
  curvature = 40,
  roll = 30,
  className,
  ...props
}: ShaderCrtProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  // Parâmetros vivos num ref: mexer no knob não recria o contexto.
  const params = React.useRef({ lineWidth, intensity, vignette, curvature, roll });
  params.current = { lineWidth, intensity, vignette, curvature, roll };
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
      linha: u("uLinha"),
      intensidade: u("uIntensidade"),
      vinheta: u("uVinheta"),
      curva: u("uCurva"),
      faixa: u("uFaixa"),
      faixaForca: u("uFaixaForca"),
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
    let faixa = 0.5; // começa no meio: com movimento reduzido, é onde ela fica

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

    const rola = () => params.current.roll > 0;

    const desenhar = () => {
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.dpr, dpr);
      gl.uniform1f(U.linha, Math.max(1, Math.min(8, p.lineWidth)));
      gl.uniform1f(U.intensidade, Math.max(0, Math.min(100, p.intensity)) / 100);
      gl.uniform1f(U.vinheta, Math.max(0, Math.min(100, p.vignette)) / 100);
      gl.uniform1f(U.curva, (Math.max(0, Math.min(100, p.curvature)) / 100) * 0.6);
      gl.uniform1f(U.faixa, faixa);
      gl.uniform1f(U.faixaForca, rola() ? 0.08 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      // Tempo acumulado: mudar `roll` muda a velocidade, não pula a faixa.
      faixa = (faixa + dt * (Math.max(0, Math.min(100, params.current.roll)) / 100) * 0.25) % 1;
      desenhar();
      raf = visivel && !reduzido && rola() ? requestAnimationFrame(quadro) : 0;
    };

    const ligar = () => {
      if (!raf && visivel && !reduzido && rola()) {
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
      ligar(); // `roll` pode ter saído do zero
    };

    const trocarMovimento = () => {
      reduzido = mq.matches;
      if (reduzido) {
        desligar();
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

    return () => {
      vivo = false;
      img.onload = null;
      desligar();
      ro.disconnect();
      io.disconnect();
      offTema();
      mq.removeEventListener("change", trocarMovimento);
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
  }, [lineWidth, intensity, vignette, curvature, roll]);

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
