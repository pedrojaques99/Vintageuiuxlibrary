"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { onThemeChange, resolveCssColor, type RGB } from "@/lib/css-color";

/**
 * Heat Word — uma forma (pontos ou palavra) que derrete num mapa de calor
 * debaixo do cursor e esfria sozinha quando ele sai.
 *
 * É peça de vitrine, não de controle: o gesto é passear o mouse, e o retorno
 * é a forma "lembrando" por onde ele passou. Por isso o calor acumula, espalha
 * e decai — um rastro que some em ~2s, e não um holofote preso ao ponteiro.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Canvas 2D numa grade grossa, não WebGL.** A simulação roda em células de
 *    3px e o quadro sobe para o tamanho real pelo próprio `drawImage`, com
 *    suavização bilinear. A interpolação é que derrete a borda; um shader daria
 *    o mesmo desenho custando um contexto WebGL por peça, e a vitrine tem dezenas.
 * 2. **A forma é um campo, não um contorno.** A máscara é desenhada borrada e
 *    cortada num limiar (o truque das "metaballs"): pontos vizinhos se fundem
 *    conforme `softness`. O calor BAIXA esse limiar, então onde está quente a
 *    forma incha e as gotas se juntam. É isso que lê como derreter.
 * 3. **A paleta vem do tema, nunca de prop hex.** As paradas da rampa são cores
 *    CSS (`var(--brand)`, `color-mix(...)`), resolvidas pelo `resolveCssColor`
 *    numa tabela de 256 tons por troca de tema, não por quadro. No escuro o
 *    núcleo quente puxa para `--foreground` e clareia sozinho.
 * 4. **O laço dorme.** Sem ponteiro e com a grade fria, o `requestAnimationFrame`
 *    para. Uma página com a peça parada não gasta nada.
 * 5. **Movimento reduzido:** sem difusão e com decaimento curto. O calor ainda
 *    responde ao ponteiro (é a função da peça), mas não deixa rastro viajando.
 */

/** Tamanho da célula da simulação, em px CSS. */
const CELULA = 3;

/** Rampa padrão: repouso → marca → núcleo. Tudo token. */
const RAMPA_PADRAO = [
  "var(--muted-foreground)",
  "color-mix(in oklab, var(--brand) 45%, var(--muted-foreground))",
  "var(--brand)",
  "color-mix(in oklab, var(--brand) 55%, var(--foreground))",
];

export interface HeatWordProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** A forma em repouso: grade de gotas ou uma palavra. */
  shape?: "dots" | "word";
  /** O texto quando `shape="word"`. Curto: cabe numa linha e é desenhado grande. */
  word?: string;
  /** 0–100. Quanto calor o ponteiro deposita por quadro. */
  heat?: number;
  /** 0–100. O raio do pincel de calor. */
  area?: number;
  /** 0–100. O quanto a forma é borrada antes do limiar: funde as gotas. */
  softness?: number;
  /** Paradas da rampa, do frio ao quente. Qualquer cor CSS ou token. */
  colors?: string[];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Pseudoaleatório estável por índice: o tamanho das gotas não muda a cada render. */
const ruido = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function montarRampa(cores: RGB[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3);
  const n = cores.length - 1;
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * n;
    const k = Math.min(n - 1, Math.floor(t));
    const f = t - k;
    const a = cores[k];
    const b = cores[k + 1] ?? a;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = (a[c] + (b[c] - a[c]) * f) * 255;
  }
  return lut;
}

function montarMascara(
  gw: number,
  gh: number,
  shape: "dots" | "word",
  word: string,
  borrao: number,
  fonte: string,
): Float32Array {
  const c = document.createElement("canvas");
  c.width = gw;
  c.height = gh;
  const x = c.getContext("2d", { willReadFrequently: true });
  const out = new Float32Array(gw * gh);
  if (!x) return out;
  x.filter = borrao > 0 ? `blur(${borrao}px)` : "none";
  // A máscara só usa o canal alfa: o preenchimento padrão do canvas basta.

  if (shape === "word") {
    let tam = gh * 0.62;
    x.font = `800 ${tam}px ${fonte}`;
    const larg = x.measureText(word).width || 1;
    tam = Math.min(tam, (tam * gw * 0.84) / larg);
    x.font = `800 ${tam}px ${fonte}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(word, gw / 2, gh / 2 + tam * 0.04);
  } else {
    const cols = 8;
    const rows = 3;
    const passo = Math.min((gw * 0.8) / cols, (gh * 0.72) / rows);
    const x0 = gw / 2 - (passo * (cols - 1)) / 2;
    const y0 = gh / 2 - (passo * (rows - 1)) / 2;
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        const i = r * cols + k;
        const raio = passo * (0.3 + ruido(i) * 0.22);
        x.beginPath();
        x.arc(x0 + k * passo, y0 + r * passo, raio, 0, Math.PI * 2);
        x.fill();
      }
    }
  }

  const px = x.getImageData(0, 0, gw, gh).data;
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4 + 3] / 255;
  return out;
}

export function HeatWord({
  shape = "dots",
  word = "Calor",
  heat = 60,
  area = 50,
  softness = 50,
  colors,
  className,
  ...props
}: HeatWordProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Parâmetros vivos num ref: mexer no knob não reinicia a simulação.
  const params = React.useRef({ heat, area, softness });
  params.current = { heat, area, softness };

  const coresChave = (colors ?? RAMPA_PADRAO).join("|");

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d");
    if (!bctx) return;

    let gw = 0;
    let gh = 0;
    let mascara: Float32Array = new Float32Array(0);
    let calor: Float32Array = new Float32Array(0);
    let tmp: Float32Array = new Float32Array(0);
    let img: ImageData | null = null;
    let lut: Uint8ClampedArray = new Uint8ClampedArray(256 * 3);
    const ponteiro = { x: 0, y: 0, dentro: false, rajada: false };
    let raf = 0;
    let ultimo = 0;
    let escala = 1;

    const fonte = () => {
      const cs = getComputedStyle(wrap);
      return cs.getPropertyValue("--font-display").trim() || cs.fontFamily || "sans-serif";
    };

    const relerCores = () => {
      lut = montarRampa(coresChave.split("|").map((c) => resolveCssColor(c, wrap)));
    };

    const remontar = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      escala = dpr;
      const nw = Math.max(1, Math.ceil(r.width / CELULA));
      const nh = Math.max(1, Math.ceil(r.height / CELULA));
      if (nw !== gw || nh !== gh) {
        gw = nw;
        gh = nh;
        calor = new Float32Array(gw * gh);
        tmp = new Float32Array(gw * gh);
        buf.width = gw;
        buf.height = gh;
        img = bctx.createImageData(gw, gh);
      }
      const borrao = 0.4 + (params.current.softness / 100) * 4.5;
      mascara = montarMascara(gw, gh, shape, word, borrao, fonte());
    };

    const depositar = (ganho: number) => {
      const raioPx = 18 + (params.current.area / 100) * 90;
      const rc = raioPx / CELULA;
      const s2 = 2 * (rc / 2) * (rc / 2);
      const cx = ponteiro.x / CELULA;
      const cy = ponteiro.y / CELULA;
      const x0 = Math.max(0, Math.floor(cx - rc));
      const x1 = Math.min(gw - 1, Math.ceil(cx + rc));
      const y0 = Math.max(0, Math.floor(cy - rc));
      const y1 = Math.min(gh - 1, Math.ceil(cy + rc));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d2 = (x - cx) ** 2 + (y - cy) ** 2;
          const i = y * gw + x;
          calor[i] = Math.min(1, calor[i] + ganho * Math.exp(-d2 / s2));
        }
      }
    };

    const passo = (k: number) => {
      if (ponteiro.dentro) depositar((0.015 + (params.current.heat / 100) * 0.1) * k);
      if (ponteiro.rajada) {
        depositar(0.5);
        ponteiro.rajada = false;
      }
      // Difusão de 4 vizinhos: o calor escorre para as bordas do rastro.
      const D = reduzido ? 0 : 0.22;
      const decai = Math.pow(reduzido ? 0.82 : 0.968, k);
      let max = 0;
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const i = y * gw + x;
          const v = calor[i];
          const viz =
            (x > 0 ? calor[i - 1] : v) +
            (x < gw - 1 ? calor[i + 1] : v) +
            (y > 0 ? calor[i - gw] : v) +
            (y < gh - 1 ? calor[i + gw] : v);
          const n = (v * (1 - D) + viz * 0.25 * D) * decai;
          tmp[i] = n < 0.001 ? 0 : n;
          if (n > max) max = n;
        }
      }
      const t = calor;
      calor = tmp;
      tmp = t;
      return max;
    };

    const pintar = () => {
      if (!img) return;
      const d = img.data;
      const borda = 0.06 + (params.current.softness / 100) * 0.1;
      // Letra borrada e cortada no meio afina o traço; a palavra corta mais baixo
      // para manter o peso de display mesmo quando a fonte da marca é leve.
      const base = shape === "word" ? 0.4 : 0.5;
      for (let i = 0; i < mascara.length; i++) {
        const h = calor[i];
        const limiar = base - h * 0.28; // quente = forma incha e as gotas se fundem
        const a = smooth(limiar - borda, limiar + borda, mascara[i]);
        const c = Math.min(255, Math.round(h * 255)) * 3;
        const o = i * 4;
        d[o] = lut[c];
        d[o + 1] = lut[c + 1];
        d[o + 2] = lut[c + 2];
        d[o + 3] = a * 255;
      }
      bctx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(buf, 0, 0, gw * CELULA * escala, gh * CELULA * escala);
    };

    const quadro = (agora: number) => {
      const k = ultimo ? Math.min(3, (agora - ultimo) / 16.67) : 1;
      ultimo = agora;
      const max = passo(k);
      pintar();
      if (ponteiro.dentro || max > 0.002) {
        raf = requestAnimationFrame(quadro);
      } else {
        raf = 0;
        ultimo = 0;
      }
    };

    const acordar = () => {
      if (!raf) raf = requestAnimationFrame(quadro);
    };

    const mover = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ponteiro.x = e.clientX - r.left;
      ponteiro.y = e.clientY - r.top;
      ponteiro.dentro = true;
      acordar();
    };
    const sair = () => {
      ponteiro.dentro = false;
    };
    const apertar = (e: PointerEvent) => {
      mover(e);
      ponteiro.rajada = true;
    };

    relerCores();
    remontar();
    pintar();

    const ro = new ResizeObserver(() => {
      remontar();
      pintar();
    });
    ro.observe(wrap);
    const offTema = onThemeChange(() => {
      relerCores();
      remontar();
      pintar();
    });
    // A fonte da marca pode chegar depois do primeiro desenho da palavra.
    let vivo = true;
    document.fonts?.ready.then(() => {
      if (!vivo) return;
      remontar();
      pintar();
    });

    canvas.addEventListener("pointermove", mover);
    canvas.addEventListener("pointerdown", apertar);
    canvas.addEventListener("pointerleave", sair);
    canvas.addEventListener("pointercancel", sair);

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      offTema();
      canvas.removeEventListener("pointermove", mover);
      canvas.removeEventListener("pointerdown", apertar);
      canvas.removeEventListener("pointerleave", sair);
      canvas.removeEventListener("pointercancel", sair);
    };
    // softness entra no remontar; heat e area são lidos ao vivo pelo ref.
  }, [shape, word, softness, coresChave]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={shape === "word" ? word : "Grade de pontos que esquenta sob o cursor"}
      className={cn("relative block aspect-[2/1] w-full touch-pan-y select-none", className)}
      {...props}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
