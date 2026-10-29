"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader VHS — uma imagem tocada de fita: a linha ondula com a fita, um vinco
 * passa rasgando de tempos em tempos, o pé do quadro treme com o ruído de
 * troca de cabeça e a cor sangra para o lado. É o quadro de fita gasta de
 * clipe dos anos 90.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `vhs` do ImageLab). Lá ele congelava um quadro para exportar; aqui
 * a fita corre.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Cinco defeitos, cinco knobs.** Onda da fita, vinco, ruído de troca de
 *    cabeça, sangria da cor e o batimento da rede elétrica são somas
 *    separadas no shader, como no original, e cada uma tem o seu knob. 50 é a
 *    força do original; 100 é o dobro.
 * 2. **O ruído de troca mora no pé do quadro.** Numa fita de verdade a cabeça
 *    troca embaixo da imagem, e é ali que o quadro rasga. O original pintava
 *    a faixa no topo por causa da textura de cabeça para baixo do servidor.
 * 3. **Fora da fita é papel.** O que a onda empurra para fora da imagem vira
 *    `--background`, não o cinza fixo do original, então a borda que treme
 *    assenta no tema claro e no escuro.
 * 4. **O tempo é acumulado, não lido do relógio.** Mexer em `speed` muda a
 *    taxa de avanço da fita, não a posição dela, então o knob não faz o vinco
 *    saltar.
 * 5. **O laço dorme.** Fora da tela (IntersectionObserver) não há quadro. Com
 *    movimento reduzido desenha um quadro parado da fita e só redesenha em
 *    troca de tema, tamanho ou knob.
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
uniform float uTime;
uniform float uOnda;
uniform float uVinco;
uniform float uTroca;
uniform float uSangria;
uniform float uBatida;
uniform vec3 uPapel;

#define PI 3.14159265

vec3 ler(vec2 uv){
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return uPapel;
  vec4 c=texture2D(uTex,uv);
  return mix(uPapel,c.rgb,c.a);
}

float hash(vec2 v){return fract(sin(dot(v,vec2(89.44,19.36)))*22189.22);}
float iHash(vec2 v,vec2 r){
  float h00=hash(floor(v*r)/r);
  float h10=hash(floor(v*r+vec2(1.,0.))/r);
  float h01=hash(floor(v*r+vec2(0.,1.))/r);
  float h11=hash(floor(v*r+vec2(1.,1.))/r);
  vec2 ip=smoothstep(vec2(0.),vec2(1.),mod(v*r,1.));
  return(h00*(1.-ip.x)+h10*ip.x)*(1.-ip.y)+(h01*(1.-ip.x)+h11*ip.x)*ip.y;
}
float noise(vec2 v){
  float soma=0.;
  for(int i=1;i<9;i++){
    float k=pow(2.,float(i));
    soma+=iHash(v+vec2(float(i)),vec2(2.*k))/k;
  }
  return soma;
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  vec2 uvn=uv;
  float t=uTime;

  // onda da fita
  uvn.x+=(noise(vec2(uvn.y,t))-.5)*.005*uOnda;
  uvn.x+=(noise(vec2(uvn.y*100.,t*10.))-.5)*.01*uOnda;

  // vinco
  float vinco=clamp((sin(uvn.y*8.-t*PI*1.2)-.92)*noise(vec2(t)),0.,.01)*10.*uVinco;
  float vincoRuido=max(noise(vec2(uvn.y*100.,t*10.))-.5,0.);
  uvn.x-=vincoRuido*vinco;

  // ruído de troca de cabeça, no pé do quadro
  float troca=smoothstep(.97,1.,uvn.y);
  uvn.y-=troca*.3*uTroca;
  uvn.x+=troca*((noise(vec2(uv.y*100.,t*10.))-.5)*.2*uTroca);

  vec3 col=ler(uvn);
  col*=1.-vinco;
  col=mix(col,col.yzx,troca*min(1.,uTroca));

  // sangria da cor
  for(float x=-4.;x<2.5;x+=1.){
    col+=vec3(
      ler(uvn+vec2(x,0.)*7e-3).x,
      ler(uvn+vec2(x-2.,0.)*7e-3).y,
      ler(uvn+vec2(x-4.,0.)*7e-3).z
    )*.1*uSangria;
  }
  col*=mix(.6,1.,1.-uSangria*.4);

  // batimento da rede elétrica
  col*=1.+clamp(noise(vec2(0.,uv.y+t*.2))*.6*uBatida-.25,0.,.1*uBatida);

  gl_FragColor=vec4(col,1.);
}
`;

export interface ShaderVhsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a tocar na fita. Fundo transparente vira papel. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /**
   * Velocidade da fita.
   * @min 0
   * @max 100
   * @step 1
   */
  speed?: number;
  /**
   * Ondulação da linha com a fita.
   * @min 0
   * @max 100
   * @step 1
   */
  tapeWave?: number;
  /**
   * Vinco que passa rasgando a imagem.
   * @min 0
   * @max 100
   * @step 1
   */
  tapeCrease?: number;
  /**
   * Ruído de troca de cabeça no pé do quadro.
   * @min 0
   * @max 100
   * @step 1
   */
  switchingNoise?: number;
  /**
   * Sangria da cor para o lado.
   * @min 0
   * @max 100
   * @step 1
   */
  bloom?: number;
  /**
   * Batimento de brilho da rede elétrica.
   * @min 0
   * @max 100
   * @step 1
   */
  acBeat?: number;
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

/** 0–100 do knob para a força do shader: 50 é o original, 100 o dobro. */
const forca = (v: number) => Math.max(0, Math.min(100, v)) / 50;

export function ShaderVhs({
  src,
  alt = "Imagem tocada de fita VHS",
  speed = 50,
  tapeWave = 50,
  tapeCrease = 50,
  switchingNoise = 50,
  bloom = 25,
  acBeat = 50,
  className,
  ...props
}: ShaderVhsProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  // Parâmetros vivos num ref: mexer no knob não recria o contexto.
  const params = React.useRef({ speed, tapeWave, tapeCrease, switchingNoise, bloom, acBeat });
  params.current = { speed, tapeWave, tapeCrease, switchingNoise, bloom, acBeat };
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
      time: u("uTime"),
      onda: u("uOnda"),
      vinco: u("uVinco"),
      troca: u("uTroca"),
      sangria: u("uSangria"),
      batida: u("uBatida"),
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
    let raf = 0;
    let ultimo = 0;
    let tempo = 2; // começa com a fita já andando, não num vinco de fase nula

    const cores = () => {
      gl.uniform3fv(U.papel, resolveCssColor("var(--background)", wrap));
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
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.time, tempo);
      gl.uniform1f(U.onda, forca(p.tapeWave));
      gl.uniform1f(U.vinco, forca(p.tapeCrease));
      gl.uniform1f(U.troca, forca(p.switchingNoise));
      gl.uniform1f(U.sangria, forca(p.bloom));
      gl.uniform1f(U.batida, forca(p.acBeat));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const quadro = (agora: number) => {
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      tempo += dt * (Math.max(0, Math.min(100, params.current.speed)) / 50);
      // A fita volta ao começo de vez em quando: o ruído perde precisão com tempo grande.
      if (tempo > 600) tempo -= 600;
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
  }, [speed, tapeWave, tapeCrease, switchingNoise, bloom, acBeat]);

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
