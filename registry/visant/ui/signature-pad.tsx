"use client";

/* Adaptado de Signature Pad — https://uiarc.dev/components/signature-pad — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui). */

import * as React from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { Eraser, Redo2, Undo2, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Signature Pad — o campo de assinatura com tinta de verdade.
 *
 * Fecho de contrato, aceite de proposta, recibo de entrega. Assinatura de
 * polilinha fina parece rabisco de teste; aqui a espessura acompanha a pressão
 * da caneta (ou, no mouse e no dedo, a velocidade: rápido afina, devagar
 * engrossa) e as pontas afinam como pena saindo do papel.
 *
 * ── O que não é óbvio ──────────────────────────────────────────────────────
 *
 * 1. **O traço é um contorno preenchido, não uma linha com `stroke-width`.**
 *    `getStrokeOutline` monta o polígono da tinta (no espírito do
 *    perfect-freehand): cada ponto anda só uma fração até o ponteiro, o que
 *    tira o tremido sem passada de suavização; curva fechada ganha junta
 *    redonda, e as duas pontas ganham tampa redonda.
 * 2. **As coordenadas moram num espaço de 600 por 260.** O campo guarda essa
 *    proporção, então a assinatura escala junto em qualquer largura. A conversão
 *    do ponteiro é uma RAZÃO do retângulo de tela, e por isso o palco escalado
 *    da vitrine não desloca a tinta.
 * 3. **Eventos coalescidos.** O navegador junta vários pontos num quadro; a
 *    peça lê todos (`getCoalescedEvents`), e a curva rápida não vira polígono.
 * 4. **Limpar é desfazível.** O rodo passa da esquerda pra direita levando a
 *    tinta, e "Desfazer" traz tudo de volta. Apagar sem volta não existe aqui.
 * 5. **A tinta é `currentColor`.** Veste o `text-foreground` do tema; quem
 *    exporta passa a cor concreta pra `signatureToSvg`, porque arquivo não lê
 *    token.
 *
 * Teclado no campo: Ctrl/Cmd+Z desfaz, com Shift refaz, Ctrl/Cmd+Y refaz,
 * Delete limpa. Os botões da barra fazem o mesmo, um Tab de cada vez.
 */

/** Um ponto: posição no espaço do campo, pressão de 0 a 1 (ou -1 sem caneta) e ms desde o começo do traço. */
export interface InkPoint {
  x: number;
  y: number;
  p: number;
  t: number;
}
export type InkWidth = "fine" | "medium" | "bold";
export interface InkStroke {
  id: string;
  points: InkPoint[];
  width: InkWidth;
}

export interface OutlineOptions {
  /** Diâmetro do traço a meia pressão, em unidades do campo. */
  size: number;
  /** Quanto a pressão muda a largura, de 0 a 1. */
  thinning?: number;
  /** Quanto cada ponto atrasa atrás do ponteiro, de 0 a 1. Mais é mais liso e mais lento. */
  streamline?: number;
  /** Deriva pressão da velocidade quando o aparelho não informa. */
  simulatePressure?: boolean;
  /** Comprimento do afinamento no começo e no fim, em unidades do campo. */
  taperStart?: number;
  taperEnd?: number;
  /** Falso enquanto o traço ainda está sendo feito: o fim não afina ainda. */
  last?: boolean;
}

/** Espaço de coordenadas do campo. Os traços são guardados nele. */
export const PAD_WIDTH = 600;
export const PAD_HEIGHT = 260;

const LARGURAS: Record<InkWidth, { label: string; size: number }> = {
  fine: { label: "Fina", size: 3.4 },
  medium: { label: "Média", size: 5.6 },
  bold: { label: "Grossa", size: 8.4 },
};
const OPCOES_LARGURA = Object.keys(LARGURAS) as InkWidth[];

type Vec = [number, number];
const soma = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Vec, n: number): Vec => [a[0] * n, a[1] * n];
const lerp = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dist = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const unit = (a: Vec): Vec => {
  const l = Math.hypot(a[0], a[1]);
  return l ? [a[0] / l, a[1] / l] : [0, 0];
};
const perp = (a: Vec): Vec => [a[1], -a[0]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
const girar = (p: Vec, c: Vec, r: number): Vec => {
  const s = Math.sin(r);
  const co = Math.cos(r);
  const px = p[0] - c[0];
  const py = p[1] - c[1];
  return [px * co - py * s + c[0], px * s + py * co + c[1]];
};
const easeOut = (t: number) => t * (2 - t);

/** Transforma os pontos amostrados no contorno de um traço de largura variável. Ver a nota 1. */
export function getStrokeOutline(input: InkPoint[], options: OutlineOptions): Vec[] {
  const {
    size,
    thinning = 0.62,
    streamline = 0.42,
    simulatePressure = true,
    taperStart = 0,
    taperEnd = 0,
    last = true,
  } = options;
  const [cabeca] = input;
  if (!cabeca) return [];
  const caneta = !simulatePressure && input.some((p) => p.p > 0);

  const pts: { at: Vec; pressure: number; length: number; vector: Vec }[] = [];
  let ant: Vec = [cabeca.x, cabeca.y];
  let comprimento = 0;
  const inicio = { at: ant, pressure: caneta ? cabeca.p : 0.5, length: 0, vector: [1, 0] as Vec };
  pts.push(inicio);
  for (let i = 1; i < input.length; i++) {
    const s = input[i]!;
    const cru: Vec = [s.x, s.y];
    const at = i === input.length - 1 && last ? cru : lerp(ant, cru, 1 - streamline);
    const d = dist(at, ant);
    if (d < 0.4) continue;
    comprimento += d;
    pts.push({ at, pressure: caneta ? s.p : 0.5, length: comprimento, vector: unit(sub(ant, at)) });
    ant = at;
  }
  const segundo = pts[1];
  if (segundo) inicio.vector = segundo.vector;
  const total = comprimento;

  // Um toque só: um ponto redondo do tamanho da primeira pressão.
  if (pts.length === 1) {
    const r = Math.max(0.6, size * (0.5 - thinning * (0.5 - inicio.pressure)) * 0.9);
    return Array.from({ length: 18 }, (_, i) =>
      soma(inicio.at, mul([Math.cos((i / 18) * Math.PI * 2), Math.sin((i / 18) * Math.PI * 2)], r)),
    );
  }

  const esq: Vec[] = [];
  const dir: Vec[] = [];
  let pressao = inicio.pressure;
  let vetorAnt = inicio.vector;
  for (let i = 0; i < pts.length; i++) {
    const ponto = pts[i]!;
    if (!caneta) {
      // Passo longo entre amostras é traço rápido, e traço rápido afina.
      const passo = i === 0 ? 0 : dist(ponto.at, pts[i - 1]!.at);
      const vel = Math.min(1, passo / size);
      const alvo = Math.min(1, 1 - vel);
      pressao = Math.min(1, pressao + (alvo - pressao) * vel * 0.3);
    } else {
      pressao = ponto.pressure;
    }
    let raio = Math.max(0.25, size * (0.5 - thinning * (0.5 - pressao)));
    const ti = taperStart ? easeOut(Math.min(1, ponto.length / taperStart)) : 1;
    const tf = taperEnd && last ? easeOut(Math.min(1, (total - ponto.length) / taperEnd)) : 1;
    raio = Math.max(0.12 * size, raio * Math.min(ti, tf));

    const prox = pts[i + 1]?.vector ?? ponto.vector;
    const desvio = mul(perp(lerp(prox, ponto.vector, 0.5)), raio);
    // Curva fechada: varre a quina em arco, senão o contorno estrangula.
    if (i > 0 && i < pts.length - 1 && dot(ponto.vector, prox) < -0.2) {
      const quina = mul(perp(vetorAnt), raio);
      for (let t = 0; t <= 1; t += 1 / 12) {
        esq.push(girar(sub(ponto.at, quina), ponto.at, Math.PI * t));
        dir.push(girar(soma(ponto.at, quina), ponto.at, -Math.PI * t));
      }
    } else {
      esq.push(sub(ponto.at, desvio));
      dir.push(soma(ponto.at, desvio));
    }
    vetorAnt = ponto.vector;
  }

  // Tampas redondas: meia-volta em torno da primeira e da última amostra, do lado de fora.
  const tampa = (centro: Vec, de: Vec, ate: Vec, fora: Vec) => {
    const out: Vec[] = [];
    const r = dist(centro, de);
    const a0 = Math.atan2(de[1] - centro[1], de[0] - centro[0]);
    const meio = a0 + Math.PI / 2;
    const sinal = dot([Math.cos(meio), Math.sin(meio)], fora) >= 0 ? 1 : -1;
    for (let k = 1; k < 12; k++) {
      const a = a0 + (sinal * Math.PI * k) / 12;
      out.push([centro[0] + Math.cos(a) * r, centro[1] + Math.sin(a) * r]);
    }
    out.push(ate);
    return out;
  };
  const fim = pts[pts.length - 1]!;
  const tampaFim = tampa(fim.at, esq[esq.length - 1]!, dir[dir.length - 1]!, mul(fim.vector, -1));
  const tampaIni = tampa(inicio.at, dir[0]!, esq[0]!, inicio.vector);
  return [...esq, ...tampaFim, ...dir.reverse(), ...tampaIni];
}

const arred = (v: number) => Math.round(v * 100) / 100;
/** Desenha o contorno como um caminho fechado e liso, com curvas quadráticas pelos pontos médios. */
export function outlineToPath(points: Vec[]) {
  if (points.length < 3) return "";
  let d = `M${arred(points[0]![0])} ${arred(points[0]![1])} Q`;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[(i + 1) % points.length]!;
    d += `${arred(x0)} ${arred(y0)} ${arred((x0 + x1) / 2)} ${arred((y0 + y1) / 2)} `;
  }
  return `${d}Z`;
}

function opcoesDoTraco(s: Pick<InkStroke, "width" | "points">, last: boolean): OutlineOptions {
  const size = LARGURAS[s.width].size;
  const caneta = s.points.some((p) => p.p > 0);
  return { size, simulatePressure: !caneta, taperStart: size * 1.5, taperEnd: caneta ? 0 : size * 5, last };
}

/** O caminho SVG de um traço. */
export function strokePath(s: Pick<InkStroke, "width" | "points">) {
  return outlineToPath(getStrokeOutline(s.points, opcoesDoTraco(s, true)));
}

/**
 * Um SVG solto da assinatura, recortado na tinta. `color` é a cor concreta
 * (`getComputedStyle(el).color`, por exemplo): arquivo exportado não lê token.
 */
export function signatureToSvg(strokes: InkStroke[], color: string) {
  if (!strokes.length) return "";
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const s of strokes)
    for (const p of s.points) {
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
  const m = 16;
  const box = { x: Math.floor(x0 - m), y: Math.floor(y0 - m), w: Math.ceil(x1 - x0 + m * 2), h: Math.ceil(y1 - y0 + m * 2) };
  const caminhos = strokes.map((s) => `<path d="${strokePath(s)}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}" fill="${color}">${caminhos}</svg>`;
}

export interface SignaturePadProps {
  /** Impresso embaixo da linha, como o nome de quem assina. */
  signer?: string;
  /** Dica sobre a linha antes do primeiro traço. */
  hint?: string;
  defaultWidth?: InkWidth;
  /** Recebe os traços depois de cada mudança. */
  onChange?: (strokes: InkStroke[]) => void;
  /** Nome do campo pro leitor de tela. */
  label?: string;
  className?: string;
}

interface Historico {
  past: InkStroke[][];
  present: InkStroke[];
  future: InkStroke[][];
  /** O traço recém-feito já está na tela pelo caminho ao vivo: entra sem fade. */
  fresh: string | null;
}

// Rodo e trocas respondem a clique: dentro dos 300 ms da casa.
const RODO = 0.3;
const EM_MEIO = [0.65, 0, 0.35, 1] as const;
const SAIDA = [0.16, 1, 0.3, 1] as const;
const MOLA_FORMA = { type: "spring", visualDuration: 0.3, bounce: 0.14 } as const;

const nada = () => () => {};
function useReduzir() {
  const hidratado = React.useSyncExternalStore(nada, () => true, () => false);
  return !!useReducedMotion() && hidratado;
}

const foco = "focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]";
const botaoIcone = cn(
  "grid size-9 cursor-pointer place-items-center rounded-[var(--r-pill)] border-0 bg-transparent p-0 text-muted-foreground [-webkit-tap-highlight-color:transparent] [transition:background-color_var(--dur-fast)_var(--ease-out),color_var(--dur-fast)_var(--ease-out)] hover:enabled:bg-muted hover:enabled:text-foreground disabled:cursor-default disabled:opacity-45",
  foco,
);

export function SignaturePad({
  signer,
  hint = "Assine aqui",
  defaultWidth = "medium",
  onChange,
  label = "Campo de assinatura",
  className,
}: SignaturePadProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9-]/g, "");
  const reduzir = useReduzir();
  const [hist, setHist] = React.useState<Historico>({ past: [], present: [], future: [], fresh: null });
  const [largura, setLargura] = React.useState<InkWidth>(defaultWidth);
  const [desenhando, setDesenhando] = React.useState(false);
  const [rodando, setRodando] = React.useState(false);
  const [status, setStatus] = React.useState("");

  const campo = React.useRef<HTMLDivElement>(null);
  const tinta = React.useRef<HTMLDivElement>(null);
  const aoVivo = React.useRef<SVGPathElement>(null);
  const atual = React.useRef<{ id: number; stroke: InkStroke; stamp: number } | null>(null);
  const rodo = React.useRef<{ complete: () => void } | null>(null);
  const contador = React.useRef(0);
  const aoMudar = React.useRef(onChange);
  React.useEffect(() => {
    aoMudar.current = onChange;
  });

  const tracos = hist.present;
  const vazio = tracos.length === 0;

  React.useEffect(() => {
    aoMudar.current?.(tracos);
  }, [tracos]);

  const gravar = React.useCallback((prox: InkStroke[], fresh: string | null = null) => {
    setHist((h) => ({ past: [...h.past, h.present].slice(-60), present: prox, future: [], fresh }));
  }, []);
  /** Rodo em voo termina na hora: o que vier depois começa de campo limpo. */
  const assentarRodo = () => rodo.current?.complete();

  function paraCampo(e: { clientX: number; clientY: number }) {
    // Razão do retângulo de tela: a escala do palco entra em cima e embaixo e se anula.
    const r = campo.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * PAD_WIDTH, y: ((e.clientY - r.top) / r.height) * PAD_HEIGHT };
  }

  function pintarAoVivo() {
    const a = atual.current;
    if (!a || !aoVivo.current) return;
    aoVivo.current.setAttribute("d", outlineToPath(getStrokeOutline(a.stroke.points, opcoesDoTraco(a.stroke, false))));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (atual.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    assentarRodo();
    campo.current?.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = paraCampo(e);
    contador.current += 1;
    const caneta = e.pointerType === "pen" && e.pressure > 0;
    atual.current = {
      id: e.pointerId,
      stamp: e.nativeEvent.timeStamp,
      stroke: { id: `${uid}-${contador.current}`, width: largura, points: [{ x, y, p: caneta ? e.pressure : -1, t: 0 }] },
    };
    setDesenhando(true);
    pintarAoVivo();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const a = atual.current;
    if (!a || a.id !== e.pointerId) return;
    const juntos = typeof e.nativeEvent.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [];
    for (const s of juntos.length ? juntos : [e.nativeEvent]) {
      const { x, y } = paraCampo(s);
      const caneta = s.pointerType === "pen" && s.pressure > 0;
      const ult = a.stroke.points[a.stroke.points.length - 1]!.t;
      a.stroke.points.push({ x, y, p: caneta ? s.pressure : -1, t: Math.max(ult, s.timeStamp - a.stamp) });
    }
    pintarAoVivo();
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const a = atual.current;
    if (!a || a.id !== e.pointerId) return;
    atual.current = null;
    gravar([...tracos, a.stroke], a.stroke.id);
    aoVivo.current?.setAttribute("d", "");
    setDesenhando(false);
    setStatus(`Traço feito. ${tracos.length + 1} na assinatura.`);
  }

  function desfazer() {
    if (!hist.past.length || atual.current) return;
    assentarRodo();
    setHist((h) =>
      h.past.length
        ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1]!, future: [h.present, ...h.future], fresh: null }
        : h,
    );
    setStatus("Desfeito");
  }

  function refazer() {
    if (!hist.future.length || atual.current) return;
    assentarRodo();
    setHist((h) =>
      h.future.length ? { past: [...h.past, h.present], present: h.future[0]!, future: h.future.slice(1), fresh: null } : h,
    );
    setStatus("Refeito");
  }

  function limpar() {
    if (vazio || rodando || atual.current) return;
    const no = tinta.current;
    const terminar = () => {
      rodo.current = null;
      gravar([]);
      setRodando(false);
      setStatus("Assinatura apagada. Desfazer traz de volta.");
      // Só tira o recorte quando a tinta apagada já saiu, senão ela pisca um quadro.
      if (no) requestAnimationFrame(() => requestAnimationFrame(() => (no.style.clipPath = "")));
    };
    if (!no || reduzir) {
      terminar();
      return;
    }
    setRodando(true);
    // A tinta é cortada atrás da borda do rodo, que atravessa o campo.
    const c = animate(no, { clipPath: ["inset(0% 0% 0% 0%)", "inset(0% 0% 0% 100%)"] }, { duration: RODO, ease: EM_MEIO });
    rodo.current = { complete: () => c.complete() };
    c.then(terminar);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && k === "z") {
      e.preventDefault();
      if (e.shiftKey) refazer();
      else desfazer();
    } else if (mod && k === "y") {
      e.preventDefault();
      refazer();
    } else if (!mod && (e.key === "Delete" || e.key === "Backspace") && e.currentTarget === e.target) {
      e.preventDefault();
      limpar();
    }
  }

  const mostraDica = vazio && !desenhando && !rodando;
  const dicaSome = reduzir ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.97, filter: "blur(4px)" };

  return (
    <div className={cn("grid w-full min-w-0 gap-2.5 text-foreground", className)}>
      <div
        ref={campo}
        tabIndex={0}
        role="img"
        aria-roledescription="campo de assinatura"
        aria-label={`${label}. ${vazio ? "Vazio." : `${tracos.length} ${tracos.length === 1 ? "traço" : "traços"}.`} Assine com mouse, caneta ou dedo.`}
        aria-describedby={`${uid}-teclas`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          "relative isolate aspect-[600/260] cursor-crosshair touch-none select-none overflow-hidden rounded-[var(--r-surface)] border bg-card [transition:border-color_var(--dur-fast)_var(--ease-out)]",
          desenhando ? "border-foreground/40" : "border-border",
          foco,
        )}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <X className="absolute left-[7%] top-[72%] size-3.5 -translate-y-[calc(100%+6px)] text-muted-foreground" strokeWidth={1.75} />
          <span className="absolute inset-x-[7%] top-[72%] border-t-[1.5px] border-dashed border-foreground/25" />
          {signer && <span className="absolute left-[7%] top-[calc(72%+8px)] text-apoio text-muted-foreground">{signer}</span>}
          <AnimatePresence initial={false}>
            {mostraDica && (
              <motion.span
                key="dica"
                className="absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap text-destaque text-muted-foreground"
                initial={dicaSome}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ ...dicaSome, transition: { duration: 0.16, ease: SAIDA } }}
                transition={{ duration: reduzir ? 0.12 : 0.24, ease: SAIDA }}
              >
                {hint}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div ref={tinta} className="pointer-events-none absolute inset-0">
          <svg
            viewBox={`0 0 ${PAD_WIDTH} ${PAD_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            className="block size-full overflow-visible fill-current"
          >
            <AnimatePresence initial={false}>
              {tracos.map((s) => (
                <motion.path
                  key={s.id}
                  d={strokePath(s)}
                  initial={hist.fresh === s.id ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: rodando ? 0 : 0.2, ease: SAIDA } }}
                  transition={{ duration: 0.2, ease: SAIDA }}
                />
              ))}
            </AnimatePresence>
            <path ref={aoVivo} />
          </svg>
        </div>

        {rodando && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            initial={{ x: "0%", opacity: 0 }}
            animate={{ x: "100%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: RODO, ease: EM_MEIO, opacity: { duration: RODO, times: [0, 0.12, 0.85, 1] } }}
          >
            {/* A borda do rodo e o rastro claro que ele deixa. */}
            <span className="absolute -left-px bottom-[8%] top-[8%] w-0.5 rounded-sm bg-foreground/50" />
            <span className="absolute -left-7 inset-y-0 w-7 bg-gradient-to-r from-transparent to-foreground/5" />
          </motion.span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Espessura value={largura} onChange={(v) => { setLargura(v); setStatus(`Ponta ${LARGURAS[v].label.toLowerCase()}`); }} grupo={`${uid}-larg`} reduzir={reduzir} />
        <div className="flex items-center gap-0.5">
          <button type="button" className={botaoIcone} aria-label="Desfazer" title="Desfazer" onClick={desfazer} disabled={!hist.past.length || rodando}>
            <Undo2 size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button type="button" className={botaoIcone} aria-label="Refazer" title="Refazer" onClick={refazer} disabled={!hist.future.length || rodando}>
            <Redo2 size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button type="button" className={botaoIcone} aria-label="Limpar assinatura" title="Limpar" onClick={limpar} disabled={vazio || rodando}>
            <Eraser size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      <p id={`${uid}-teclas`} className="sr-only">
        Control ou Command mais Z desfaz, com Shift refaz, e Delete limpa.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

/** Grupo de rádio compacto: o realce desliza até a ponta escolhida, setas trocam. */
function Espessura({
  value,
  onChange,
  grupo,
  reduzir,
}: {
  value: InkWidth;
  onChange: (v: InkWidth) => void;
  grupo: string;
  reduzir: boolean;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const passo =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const n = OPCOES_LARGURA.length;
    const i = (OPCOES_LARGURA.indexOf(value) + passo + n) % n;
    onChange(OPCOES_LARGURA[i]!);
    refs.current[i]?.focus();
  }
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Espessura da ponta" onKeyDown={onKeyDown}>
      {OPCOES_LARGURA.map((o, i) => (
        <button
          key={o}
          ref={(n) => {
            refs.current[i] = n;
          }}
          type="button"
          role="radio"
          aria-checked={o === value}
          aria-label={LARGURAS[o].label}
          title={LARGURAS[o].label}
          tabIndex={o === value ? 0 : -1}
          onClick={() => onChange(o)}
          className={cn(
            "relative grid size-9 cursor-pointer place-items-center rounded-[var(--r-pill)] border-0 bg-transparent p-0 [-webkit-tap-highlight-color:transparent]",
            foco,
          )}
        >
          {o === value && (
            <motion.span
              layoutId={grupo}
              className="absolute inset-0 rounded-[inherit] border border-border bg-muted"
              transition={reduzir ? { duration: 0 } : MOLA_FORMA}
            />
          )}
          <span
            className="relative rounded-full bg-foreground"
            style={{ width: LARGURAS[o].size + 2, height: LARGURAS[o].size + 2 }}
          />
        </button>
      ))}
    </div>
  );
}
