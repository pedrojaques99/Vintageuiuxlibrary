"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor } from "@/lib/css-color";

/**
 * Shader ASCII — uma imagem redesenhada em caracteres: cada célula vira um
 * glifo mais cheio ou mais vazio conforme a imagem escurece ali. Os glifos
 * mais densos ganham a cor da marca, e o resto fica na tinta do texto.
 *
 * Colhido do motor de efeitos de impressão do Visant Labs (`print-fx`, o
 * shader `ascii`). Os seis jogos de caractere de lá estão aqui, desenhados
 * à mão numa grade de 8×8 dentro do próprio shader.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Glifo desenhado, não fonte.** Cada caractere é uma função da posição
 *    dentro da célula (8×8), não um atlas de textura de uma fonte. Não carrega
 *    nada além da imagem e o desenho é igual em qualquer máquina.
 * 2. **Cobertura, não brilho.** O original enchia o glifo onde a imagem
 *    clareava, pensado para foto escura. Aqui o glifo enche onde a imagem
 *    ESCURECE (1 − luminância, vezes o alfa): fundo branco ou transparente
 *    vira célula vazia e a peça funciona sobre papel claro e escuro.
 * 3. **A marca só no topo da rampa.** Pintar todos os glifos de marca apaga a
 *    hierarquia; só as células mais cheias ganham `--brand`, o resto usa a
 *    tinta de texto. É o contorno do objeto que acende.
 * 4. **Corrigido do original:** o `+` tinha a barra horizontal num ramo que
 *    nunca era alcançado e saía como `|`.
 * 5. **Lupa na amostra, não na grade.** Debaixo do cursor a imagem se
 *    aproxima e o contraste sobe: as células dali leem um pedaço menor da
 *    imagem e o desenho ganha detalhe, mas a grade de glifos não pula.
 * 6. **Desenha sob demanda.** Imagem parada não pede quadro: desenha na carga,
 *    no tema, no tamanho e no knob. O laço só existe enquanto a lupa entra ou
 *    sai, e com movimento reduzido ela aparece sem transição.
 */

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uImg;
uniform sampler2D uTex;
uniform float uCell;
uniform float uSet;
uniform float uContrast;
uniform vec3 uLente;
uniform float uLenteR;
uniform vec3 uFundo;
uniform vec3 uTinta;
uniform vec3 uDestaque;

float cobertura(vec2 px,float ganho){
  float s=min(uRes.x/uImg.x,uRes.y/uImg.y);
  vec2 tam=uImg*s;
  vec2 uv=(px-(uRes-tam)*.5)/tam;
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return 0.;
  vec4 c=texture2D(uTex,uv);
  float lum=dot(c.rgb,vec3(.299,.587,.114));
  return clamp(((1.-lum)*c.a-.5)*uContrast*ganho+.5,0.,1.);
}

float blocos(float b,float x,float y){
  if(b>.8)return 1.;
  if(b>.6)return mod(x+y,2.)<1.?1.:0.;
  if(b>.4)return mod(x+y*2.,4.)<1.?1.:0.;
  if(b>.2)return mod(x*3.+y*2.,8.)<1.?1.:0.;
  return 0.;
}

float pontos(float b,float x,float y){
  float d=distance(vec2(x,y),vec2(3.5));
  if(b>.8)return d<3.5?1.:0.;
  if(b>.6)return d<2.5?1.:0.;
  if(b>.4)return d<1.8?1.:0.;
  if(b>.2)return (d>1.5&&d<2.5)?1.:0.;
  return 0.;
}

float linhas(float b,float x,float y){
  if(b>.8)return ((x>1.&&x<3.)||(x>4.&&x<6.))?1.:0.;
  if(b>.6)return (x>2.&&x<5.)?1.:0.;
  if(b>.4)return (x>2.5&&x<4.5)?1.:0.;
  if(b>.2)return (x>3.&&x<4.)?1.:0.;
  return 0.;
}

float classico(float b,float x,float y){
  if(b>.9){
    if(y==0.||y==7.||x==0.||x==7.)return 0.;
    if(y==1.)return (x>1.&&x<6.)?1.:0.;
    if(y==2.||y==5.)return (x==1.||x==6.||(x>3.&&x<6.&&y==2.))?1.:0.;
    if(y==3.)return (x==1.||x==6.||x==3.||x==5.)?1.:0.;
    if(y==4.)return (x==1.||x==6.||(x>2.&&x<6.))?1.:0.;
    if(y==6.)return (x>1.&&x<5.)?1.:0.;
    return 0.;
  }
  if(b>.8){
    if(y==0.||y==7.)return 0.;
    if(y==2.||y==5.)return (x>0.&&x<7.)?1.:0.;
    return (x==2.||x==5.)?1.:0.;
  }
  if(b>.7){
    if(y==1.)return (x==1.||x==2.||x==6.)?1.:0.;
    if(y==2.)return (x==1.||x==2.||x==5.)?1.:0.;
    if(y==3.)return x==4.?1.:0.;
    if(y==4.)return x==3.?1.:0.;
    if(y==5.)return (x==2.||x==5.||x==6.)?1.:0.;
    if(y==6.)return (x==1.||x==5.||x==6.)?1.:0.;
    return 0.;
  }
  if(b>.55){
    if(y==2.)return x==3.?1.:0.;
    if(y==3.)return (x==1.||x==3.||x==5.)?1.:0.;
    if(y==4.)return (x==2.||x==3.||x==4.)?1.:0.;
    if(y==5.)return (x==1.||x==3.||x==5.)?1.:0.;
    return 0.;
  }
  if(b>.4){
    if(y==3.||y==4.)return (x>1.&&x<6.)?1.:0.;
    if(y==2.||y==5.)return (x==3.||x==4.)?1.:0.;
    return 0.;
  }
  if(b>.3)return ((y==3.||y==5.)&&x>1.&&x<6.)?1.:0.;
  if(b>.2)return (y==4.&&x>1.&&x<6.)?1.:0.;
  if(b>.1)return ((y==2.||y==5.)&&(x==3.||x==4.))?1.:0.;
  if(b>.05)return (y==6.&&(x==3.||x==4.))?1.:0.;
  return 0.;
}

float binario(float b,float x,float y,vec2 cel){
  if(b<.15)return 0.;
  if(b<=.5)return ((y==3.||y==4.)&&(x==3.||x==4.))?1.:0.;
  bool um=fract(sin(dot(cel,vec2(12.9898,78.233)))*43758.5453)>.5;
  if(um){
    if(y==1.)return (x==3.||x==4.)?1.:0.;
    if(y==2.)return (x>=2.&&x<=4.)?1.:0.;
    if(y>=3.&&y<=5.)return (x==3.||x==4.)?1.:0.;
    if(y==6.)return (x>=2.&&x<=5.)?1.:0.;
    return 0.;
  }
  if(y==1.||y==6.)return (x>=2.&&x<=5.)?1.:0.;
  if(y>=2.&&y<=5.)return (x==2.||x==5.)?1.:0.;
  return 0.;
}

float braile(float b,float x,float y){
  float i=floor(y/2.)*2.+floor(x/4.);
  if(b>(i+1.)/8.){
    float lx=mod(x,4.);
    float ly=mod(y,2.);
    return (lx>.5&&lx<2.5&&ly<1.5)?1.:0.;
  }
  return 0.;
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 cel=floor(px/uCell);
  float x=floor(mod(px.x,uCell)/uCell*8.);
  float y=floor(mod(px.y,uCell)/uCell*8.);
  vec2 centro=(cel+.5)*uCell;
  float queda=(1.-smoothstep(uLenteR*.55,uLenteR,distance(centro,uLente.xy)))*uLente.z;
  vec2 amostra=uLente.xy+(centro-uLente.xy)*mix(1.,.5,queda);
  float b=cobertura(amostra,1.+queda*.6);
  float on;
  if(uSet<.5)on=blocos(b,x,y);
  else if(uSet<1.5)on=pontos(b,x,y);
  else if(uSet<2.5)on=linhas(b,x,y);
  else if(uSet<3.5)on=classico(b,x,y);
  else if(uSet<4.5)on=binario(b,x,y,cel);
  else on=braile(b,x,y);
  vec3 tinta=mix(uTinta,uDestaque,smoothstep(.55,.72,b));
  gl_FragColor=vec4(mix(uFundo,tinta,on),1.);
}
`;

/** Paradas padrão: fundo, tinta e destaque. Tudo token. */
const CORES_PADRAO = ["var(--background)", "var(--muted-foreground)", "var(--brand)"];

const JOGOS = { blocks: 0, dots: 1, lines: 2, classic: 3, binary: 4, braille: 5 } as const;

export interface ShaderAsciiProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A imagem a redesenhar. Fundo branco ou transparente vira célula vazia. */
  src: string;
  /** Texto alternativo da imagem. */
  alt?: string;
  /** Jogo de caracteres. */
  charset?: "blocks" | "dots" | "lines" | "classic" | "binary" | "braille";
  /**
   * Tamanho da célula de cada caractere, em px.
   * @min 6
   * @max 24
   * @step 1
   */
  cell?: number;
  /**
   * Contraste antes de escolher o glifo.
   * @min 0
   * @max 100
   * @step 1
   */
  contrast?: number;
  /** Lupa que aproxima a imagem debaixo do cursor. */
  lens?: boolean;
  /** Paradas: fundo, tinta e destaque. Qualquer cor CSS ou token. */
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

export function ShaderAscii({
  src,
  alt = "Imagem em caracteres",
  charset = "classic",
  cell = 12,
  contrast = 55,
  lens = true,
  colors,
  className,
  ...props
}: ShaderAsciiProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const params = React.useRef({ charset, cell, contrast, lens });
  params.current = { charset, cell, contrast, lens };
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
      img: u("uImg"),
      tex: u("uTex"),
      cell: u("uCell"),
      set: u("uSet"),
      contrast: u("uContrast"),
      lente: u("uLente"),
      lenteR: u("uLenteR"),
      fundo: u("uFundo"),
      tinta: u("uTinta"),
      destaque: u("uDestaque"),
    };

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // 1×1 transparente até a imagem chegar: o primeiro quadro é só fundo.
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
    const lente = { x: 0, y: 0, forca: 0, alvo: 0 };

    const cores = () => {
      const [a, b, c] = coresChave.split("|").map((cor) => resolveCssColor(cor, wrap));
      gl.uniform3fv(U.fundo, a);
      gl.uniform3fv(U.tinta, b ?? a);
      gl.uniform3fv(U.destaque, c ?? b ?? a);
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
      // célula em px inteiros de tela: a grade 8×8 do glifo cai sem resto
      gl.uniform1f(U.cell, Math.round(Math.max(6, Math.min(24, p.cell)) * dpr));
      gl.uniform1f(U.set, JOGOS[p.charset] ?? 3);
      gl.uniform1f(U.contrast, 0.5 + (p.contrast / 100) * 2);
      gl.uniform3f(U.lente, lente.x, lente.y, p.lens ? lente.forca : 0);
      gl.uniform1f(U.lenteR, Math.min(canvas.width, canvas.height) * 0.3);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // O laço só vive enquanto a lupa está entrando ou saindo.
    const quadro = () => {
      lente.forca += (lente.alvo - lente.forca) * 0.18;
      if (Math.abs(lente.alvo - lente.forca) < 0.005) lente.forca = lente.alvo;
      desenhar();
      raf = lente.forca !== lente.alvo ? requestAnimationFrame(quadro) : 0;
    };
    const pedirQuadro = () => {
      if (mq.matches) {
        lente.forca = lente.alvo;
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
      lente.x = (e.clientX - r.left) * k * dpr;
      lente.y = (e.clientY - r.top) * k * dpr;
      lente.alvo = 1;
      if (raf) return;
      if (lente.forca === lente.alvo) desenhar();
      else pedirQuadro();
    };
    const sair = () => {
      lente.alvo = 0;
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
      ro.disconnect();
      offTema();
      cancelAnimationFrame(raf);
      wrap.removeEventListener("pointermove", mover);
      wrap.removeEventListener("pointerleave", sair);
      redesenhar.current = () => {};
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [src, coresChave]);

  React.useEffect(() => {
    redesenhar.current();
  }, [charset, cell, contrast, lens]);

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
