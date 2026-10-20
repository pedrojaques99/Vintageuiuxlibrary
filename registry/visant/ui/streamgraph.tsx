"use client";

/* Adaptado de Streamgraph — https://uiarc.dev/components/streamgraph — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui). */

import * as React from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Streamgraph — como a mistura de várias partes muda no tempo.
 *
 * Tíquete de suporte por assunto, receita por canal, hora por cliente. Quando o
 * que importa é a FORMA do conjunto (qual parte engordou, quando a mistura
 * virou) mais que o valor exato de cada semana, a pilha em fluxo conta isso de
 * uma olhada. Valor exato mora na dica e na tabela pro leitor de tela.
 *
 * ── O que não é óbvio ──────────────────────────────────────────────────────
 *
 * 1. **Cor é exceção.** A primeira camada (o centro do fluxo) veste a marca;
 *    as outras são degraus de neutro que alternam claro e escuro, então
 *    vizinhas nunca se confundem. A camada em foco ganha a cor cheia e as
 *    outras recuam. Texto nunca usa a cor da série.
 * 2. **Toda camada é reamostrada na mesma grade de 161 pontos**, com tangente
 *    monotônica: a curva nunca passa do dado nem desce de zero, e trocar de
 *    período com mais ou menos pontos é um morph, não um corte.
 * 3. **"wiggle" segue Byron e Wattenberg** (minimiza a inclinação das camadas)
 *    e tira a deriva linear depois, pra o fluxo não sair inclinado do quadro.
 * 4. **Um pintor só.** Morph de dado, camada ligando e desligando, o inchaço da
 *    primeira aparição e o redimensionamento passam todos pela mesma função,
 *    que escreve direto no `d` dos paths, sem render do React por quadro.
 * 5. **Ponteiro sob escala.** A vitrine escala o palco; a posição vertical do
 *    ponteiro é dividida pela escala antes de procurar a camada, senão a dica
 *    aponta a camada errada no ladrilho.
 * 6. **Teclado é cidadão.** No gráfico, ←/→ andam no tempo, PageUp/PageDown
 *    pulam um sexto, Home/End vão às pontas, ↑/↓ trocam de camada, Esc sai.
 *    A legenda liga e desliga camadas, e a camada desligada afina até sumir
 *    enquanto as outras fecham por cima.
 *
 * Vazio tem desenho (a frase no lugar do fluxo), e nenhuma camada ligada
 * também. Com `prefers-reduced-motion` tudo chega no estado final, sem viagem.
 */

export interface StreamgraphSeries {
  /** Identidade estável. A camada guarda lugar e cor entre trocas de dado. */
  key: string;
  /** Nome na legenda, no rótulo direto, na dica e na tabela. */
  label: string;
  /** Qualquer cor CSS. Sem ela: a primeira veste a marca, as outras são neutros. */
  color?: string;
}

export interface StreamgraphDatum {
  /** Identidade estável, como a semana ISO. */
  key: string;
  /** Rótulo completo, pra dica e leitor de tela ("Semana de 14 de set."). */
  label: string;
  /** Rótulo curto no eixo. Sem ele, o eixo fica quieto nesse ponto. */
  axisLabel?: string;
  /** Um valor por chave de série. Faltando conta zero; negativo vira zero. */
  values: Record<string, number | undefined>;
}

export interface StreamgraphProps {
  data: StreamgraphDatum[];
  /** Camadas do centro pra fora: a primeira corre no meio, as outras alternam acima e abaixo. */
  series: StreamgraphSeries[];
  /** O que se mede, como "Tíquetes por assunto". Nomeia o gráfico. */
  label: string;
  /** Unidade depois de cada valor, como "tíquetes". */
  unit?: string;
  /** Altura do gráfico em px. A largura segue o contêiner. */
  height?: number;
  /** "wiggle" flui, "silhouette" centra a pilha, "zero" empilha de uma base reta. */
  offset?: "wiggle" | "silhouette" | "zero";
  formatValue?: (value: number, series: StreamgraphSeries) => string;
  /** Camadas escondidas, controlado. */
  hiddenSeries?: string[];
  defaultHiddenSeries?: string[];
  onHiddenSeriesChange?: (hidden: string[]) => void;
  /** Mostra a legenda que liga e desliga camadas. */
  legend?: boolean;
  /** Escreve o nome de cada camada no trecho mais grosso dela, quando cabe. */
  directLabels?: boolean;
  /** Cabeçalho da primeira coluna da tabela do leitor de tela. */
  categoryLabel?: string;
  emptyLabel?: string;
  className?: string;
}

type Hover = { index: number; key: string | null; y: number | null };
type Quadro = { lower: number[][]; upper: number[][]; toY: (v: number) => number };

/** Mola de período fixo convertida em rigidez e amortecimento, pra animar números soltos. */
const fisica = (visualDuration: number, bounce: number, restDelta = 0.0005) => {
  const raiz = (2 * Math.PI) / (visualDuration * 1.2);
  return { type: "spring" as const, stiffness: raiz * raiz, damping: 2 * (1 - bounce) * raiz, restDelta, restSpeed: restDelta * 2 };
};
// Assentar responde a clique na legenda: 300 ms. O inchaço é de entrada de dobra, pode mais.
const ASSENTA = fisica(0.3, 0);
const INCHA = fisica(0.9, 0);
const DESLIZA = fisica(0.26, 0.12, 0.01);
const SEGUE = { stiffness: DESLIZA.stiffness, damping: DESLIZA.damping, restDelta: 0.01 };

const N = 161;
const MARGEM = 10;
const VAO = 14;
// Degraus de neutro pras camadas sem cor própria, alternando claro e escuro.
const DEGRAUS = [34, 18, 27, 12, 40, 22];
const corDe = (s: StreamgraphSeries, i: number) =>
  s.color ??
  (i === 0
    ? "var(--brand)"
    : `color-mix(in oklab, var(--foreground) ${DEGRAUS[(i - 1) % DEGRAUS.length]}%, var(--card))`);

/** A primeira camada no meio, as outras alternando acima e abaixo; base reta empilha em ordem. */
function ordemDaPilha(n: number, modo: StreamgraphProps["offset"]) {
  const ordem = Array.from({ length: n }, (_, i) => i);
  if (modo === "zero") return ordem;
  return ordem.reduce<number[]>((l, i) => (i === 0 ? [0] : i % 2 ? [...l, i] : [i, ...l]), []);
}
const agrupado = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const limitar = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Reamostra na grade comum com tangente monotônica (nota 2). */
function reamostrar(cru: number[]): number[] {
  const v = cru.map((x) => Math.max(0, x || 0));
  const out = new Array<number>(N);
  if (!v.length) return out.fill(0);
  if (v.length === 1) return out.fill(v[0]!);
  const ult = v.length - 1;
  const inc = v.slice(1).map((x, i) => x - v[i]!);
  const tg = v.map((_, i) =>
    i === 0 || i === ult
      ? 0
      : (Math.sign(inc[i - 1]!) + Math.sign(inc[i]!)) *
          Math.min(Math.abs(inc[i - 1]!), Math.abs(inc[i]!), Math.abs(inc[i - 1]! + inc[i]!) / 4) || 0,
  );
  if (ult > 1) {
    tg[0] = (3 * inc[0]! - tg[1]!) / 2;
    tg[ult] = (3 * inc[ult - 1]! - tg[ult - 1]!) / 2;
  } else {
    tg[0] = tg[1] = inc[0]!;
  }
  for (let k = 0; k < N; k++) {
    const at = (k / (N - 1)) * ult;
    const seg = Math.min(ult - 1, Math.floor(at));
    const t = at - seg;
    const t2 = t * t;
    const t3 = t2 * t;
    const a = v[seg]!;
    const b = v[seg + 1]!;
    const x = (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * tg[seg]! + (3 * t2 - 2 * t3) * b + (t3 - t2) * tg[seg + 1]!;
    out[k] = limitar(x, Math.min(a, b), Math.max(a, b));
  }
  return out;
}

/** A base embaixo da pilha (nota 3). */
function base(camadas: number[][], modo: StreamgraphProps["offset"]): number[] {
  const g = new Array<number>(N).fill(0);
  const totais = g.map((_, j) => camadas.reduce((s, c) => s + c[j]!, 0));
  if (modo === "zero" || !camadas.length) return g;
  if (modo === "silhouette") return totais.map((t) => -t / 2);
  for (let j = 1; j < N; j++) {
    let s1 = 0;
    let s2 = 0;
    let abaixo = 0;
    for (const c of camadas) {
      const d = c[j]! - c[j - 1]!;
      s1 += c[j]!;
      s2 += (abaixo + d / 2) * c[j]!;
      abaixo += d;
    }
    g[j] = g[j - 1]! - (s1 ? s2 / s1 : 0);
  }
  // Reta de mínimos quadrados pelo centro do fluxo, subtraída pra ele não tombar.
  const centros = g.map((x, j) => x + totais[j]! / 2);
  const mx = (N - 1) / 2;
  const my = centros.reduce((s, x) => s + x, 0) / N;
  let num = 0;
  let den = 0;
  centros.forEach((x, j) => {
    num += (j - mx) * (x - my);
    den += (j - mx) ** 2;
  });
  const incl = den ? num / den : 0;
  return g.map((x, j) => x - (my + incl * (j - mx)));
}

const nada = () => () => {};
function useReduzir() {
  const hidratado = React.useSyncExternalStore(nada, () => true, () => false);
  return !!useReducedMotion() && hidratado;
}

/** Rótulos de eixo que cabem: no máximo um a cada 72 px, contados do mais recente. */
function rotulosDoEixo(data: StreamgraphDatum[], largura: number) {
  const com = data.flatMap((d, i) => (d.axisLabel ? [i] : []));
  if (!largura || !com.length) return [];
  const passo = Math.ceil(com.length / Math.max(2, Math.floor(largura / 72)));
  return com.reverse().filter((_, r) => r % passo === 0).reverse();
}

const transicaoRapida = "[transition:opacity_var(--dur-fast)_var(--ease-out)]";

export function Streamgraph({
  data,
  series,
  label,
  unit = "",
  height = 260,
  offset = "wiggle",
  formatValue,
  hiddenSeries,
  defaultHiddenSeries,
  onHiddenSeriesChange,
  legend = true,
  directLabels = true,
  categoryLabel = "Data",
  emptyLabel = "Sem dados neste período",
  className,
}: StreamgraphProps) {
  const reduzir = useReduzir();
  const figura = React.useRef<HTMLElement>(null);
  const plot = React.useRef<HTMLDivElement>(null);
  const dica = React.useRef<HTMLDivElement>(null);
  const caminhos = React.useRef(new Map<string, SVGPathElement>());
  const rotulos = React.useRef(new Map<string, SVGTextElement>());
  const naTela = useInView(figura, { once: true, amount: 0.3 });
  const ult = data.length - 1;
  const vazio = data.length === 0;

  const [escondidasProprias, setEscondidasProprias] = React.useState<string[]>(defaultHiddenSeries ?? []);
  const escondidas = hiddenSeries ?? escondidasProprias;
  const alternar = (key: string) => {
    const prox = escondidas.includes(key) ? escondidas.filter((k) => k !== key) : [...escondidas, key];
    if (hiddenSeries === undefined) setEscondidasProprias(prox);
    onHiddenSeriesChange?.(prox);
  };
  const visiveis = series.filter((s) => !escondidas.includes(s.key));

  // Cada camada vira curva densa na grade; o pintor mistura do que está na tela até ela.
  const assinatura = `${series.map((s) => s.key).join(",")}|${data
    .map((d) => series.map((s) => d.values[s.key] ?? 0).join(","))
    .join(";")}`;
  const alvos = React.useMemo(
    () => new Map(series.map((s) => [s.key, reamostrar(data.map((d) => d.values[s.key] ?? 0))])),
    // A assinatura é o conteúdo: arrays novos com o mesmo dado não refazem a curva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assinatura],
  );

  const [hover, setHover] = React.useState<Hover | null>(null);
  const [assinaturaVista, setAssinaturaVista] = React.useState(assinatura);
  if (assinaturaVista !== assinatura) {
    setAssinaturaVista(assinatura);
    setHover(null);
  }
  const indice = hover && !vazio ? Math.min(hover.index, ult) : null;
  const [chaveLegenda, setChaveLegenda] = React.useState<string | null>(null);
  const querida = hover?.key ?? chaveLegenda;
  const ativa = querida && visiveis.some((s) => s.key === querida) ? querida : null;

  const largura = React.useRef(0);
  const [larguraPlot, setLarguraPlot] = React.useState(0);
  const formas = React.useRef(new Map<string, number[]>());
  const presenca = React.useRef(new Map<string, { value: number; stop: (() => void) | null }>());
  const quadro = React.useRef<Quadro | null>(null);
  const lugares = React.useRef(new Map<string, number>());
  const cresce = useMotionValue(0);
  const vivo = React.useRef({ series, offset });
  React.useLayoutEffect(() => {
    vivo.current = { series, offset };
  });

  // O pintor (nota 4).
  const pintar = React.useCallback(() => {
    const w = largura.current;
    if (!w) return;
    const { series: ordem, offset: modo } = vivo.current;
    const camadas = ordem.map((s) => {
      const f = formas.current.get(s.key);
      const p = presenca.current.get(s.key)?.value ?? 1;
      return f ? f.map((v) => v * p) : new Array<number>(N).fill(0);
    });
    const pilha = ordemDaPilha(ordem.length, modo);
    const g = base(pilha.map((i) => camadas[i]!), modo);
    const lower: number[][] = new Array(ordem.length);
    const upper: number[][] = new Array(ordem.length);
    let corre = g.slice();
    for (const i of pilha) {
      const c = camadas[i]!;
      lower[i] = corre;
      corre = corre.map((v, j) => v + c[j]!);
      upper[i] = corre;
    }
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = 0; j < N; j++) {
      lo = Math.min(lo, g[j]!);
      hi = Math.max(hi, corre[j]!);
    }
    if (!Number.isFinite(lo) || hi - lo < 1e-9) {
      lo = -1;
      hi = 1;
    }
    const vao = hi - lo;
    const s = cresce.get();
    const centro = g.map((v, j) => (v + corre[j]!) / 2);
    const toY = (v: number) => MARGEM + (1 - (v - lo) / vao) * (height - MARGEM * 2);
    // O inchaço parte de um fio no centro do fluxo.
    const yEm = (v: number, j: number) => toY(centro[j]! + (v - centro[j]!) * s);
    quadro.current = { lower, upper, toY };
    const xs = Array.from({ length: N }, (_, j) => (j / (N - 1)) * w);

    ordem.forEach((serie, i) => {
      const topo = upper[i]!;
      const fundo = lower[i]!;
      const no = caminhos.current.get(serie.key);
      if (no) {
        let d = "";
        for (let j = 0; j < N; j++) d += `${j ? "L" : "M"}${xs[j]!.toFixed(1)},${yEm(topo[j]!, j).toFixed(1)}`;
        for (let j = N - 1; j >= 0; j--) d += `L${xs[j]!.toFixed(1)},${yEm(fundo[j]!, j).toFixed(1)}`;
        no.setAttribute("d", `${d}Z`);
      }
      // O rótulo senta onde a camada é mais grossa, e segura o lugar até outro
      // trecho ficar CLARAMENTE mais grosso: nada de rótulo pulando no morph.
      const texto = rotulos.current.get(serie.key);
      if (!texto) return;
      let melhor = 4;
      for (let j = 4; j < N - 4; j++) if (topo[j]! - fundo[j]! > topo[melhor]! - fundo[melhor]!) melhor = j;
      const preso = lugares.current.get(serie.key);
      const j =
        preso !== undefined && topo[preso]! - fundo[preso]! >= (topo[melhor]! - fundo[melhor]!) * 0.8 ? preso : melhor;
      lugares.current.set(serie.key, j);
      const grossura = ((topo[j]! - fundo[j]!) / vao) * (height - MARGEM * 2) * s;
      const espaco = texto.getComputedTextLength?.() ?? 60;
      const x = limitar(xs[j]!, espaco / 2 + 6, w - espaco / 2 - 6);
      texto.setAttribute("x", x.toFixed(1));
      texto.setAttribute("y", yEm((topo[j]! + fundo[j]!) / 2, j).toFixed(1));
      texto.style.opacity = grossura >= 19 && espaco + 16 < w ? "" : "0";
    });
  }, [cresce, height]);

  React.useLayoutEffect(() => {
    const no = plot.current;
    if (!no) return;
    // clientWidth é medida local: o palco escalado não encolhe o desenho.
    const ler = () => {
      largura.current = no.clientWidth;
      setLarguraPlot(no.clientWidth);
      pintar();
    };
    ler();
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(ler);
    obs.observe(no);
    return () => obs.disconnect();
  }, [pintar]);

  // Dado novo mistura cada camada a partir da forma que está na tela.
  const morph = React.useRef<{ stop: () => void } | null>(null);
  React.useEffect(() => {
    const movs: { key: string; de: number[]; para: number[] }[] = [];
    for (const [key, para] of alvos) {
      const de = formas.current.get(key);
      if (!de || reduzir) {
        formas.current.set(key, para);
        continue;
      }
      movs.push({ key, de, para });
    }
    for (const key of [...formas.current.keys()]) if (!alvos.has(key)) formas.current.delete(key);
    morph.current?.stop();
    if (!movs.length) {
      pintar();
      return;
    }
    morph.current = animate(0, 1, {
      ...ASSENTA,
      onUpdate: (t) => {
        for (const m of movs) formas.current.set(m.key, m.de.map((v, j) => v + (m.para[j]! - v) * t));
        pintar();
      },
      onComplete: () => {
        for (const m of movs) formas.current.set(m.key, m.para);
        pintar();
      },
    });
    return () => morph.current?.stop();
  }, [pintar, reduzir, alvos]);

  // Camada escondida afina até nada enquanto as outras fecham por cima.
  const chaveEscondidas = escondidas.join("|");
  React.useEffect(() => {
    for (const s of series) {
      const para = escondidas.includes(s.key) ? 0 : 1;
      const trilha = presenca.current.get(s.key);
      if (!trilha) {
        presenca.current.set(s.key, { value: para, stop: null });
        continue;
      }
      if (trilha.value === para) continue;
      trilha.stop?.();
      if (reduzir) {
        trilha.value = para;
        trilha.stop = null;
        continue;
      }
      const c = animate(trilha.value, para, {
        ...ASSENTA,
        onUpdate: (v) => {
          trilha.value = v;
          pintar();
        },
      });
      trilha.stop = () => c.stop();
    }
    pintar();
    // A chave junta o conteúdo de `escondidas`; o array em si muda a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveEscondidas, pintar, reduzir, series.length]);

  // Na primeira vez que aparece, o fluxo incha a partir de um fio no centro.
  React.useEffect(() => {
    if (vazio) return;
    if (reduzir) {
      cresce.jump(1);
      pintar();
      return;
    }
    if (!naTela || cresce.get() >= 1) return;
    const c = animate(cresce, 1, { ...INCHA, onUpdate: pintar });
    return () => c.stop();
  }, [vazio, cresce, naTela, pintar, reduzir]);

  // A mira desliza entre pontos; a dica segue numa mola própria e nunca sai do gráfico.
  const mira = useMotionValue(0);
  const miraMola = useSpring(mira, SEGUE);
  const dicaX = useMotionValue(0);
  const dicaY = useMotionValue(0);
  const dicaMolaX = useSpring(dicaX, SEGUE);
  const dicaMolaY = useSpring(dicaY, SEGUE);
  const estavaAtiva = React.useRef(false);
  React.useLayoutEffect(() => {
    const balao = dica.current;
    const w = largura.current;
    if (indice === null || !balao || !w) {
      estavaAtiva.current = false;
      return;
    }
    const x = ult > 0 ? (indice / ult) * w : w / 2;
    let y = hover?.y ?? null;
    const q = quadro.current;
    if (y === null && q && ativa) {
      const i = series.findIndex((s) => s.key === ativa);
      const j = Math.round((x / w) * (N - 1));
      if (i >= 0) y = q.toY((q.upper[i]![j]! + q.lower[i]![j]!) / 2);
    }
    const tw = balao.offsetWidth;
    const th = balao.offsetHeight;
    let esq = x + VAO;
    if (esq + tw > w) esq = x - VAO - tw;
    const topo = limitar((y ?? height / 2) - th / 2, 0, Math.max(0, height - th));
    const seco = !estavaAtiva.current || reduzir;
    mira.set(x);
    dicaX.set(limitar(esq, 0, Math.max(0, w - tw)));
    dicaY.set(topo);
    if (seco) {
      miraMola.jump(x);
      dicaMolaX.jump(dicaX.get());
      dicaMolaY.jump(topo);
    }
    estavaAtiva.current = true;
  });

  // A camada sob o ponteiro, procurada no quadro que está na tela (nota 5).
  const ler = (clientX: number, clientY: number): Hover | null => {
    const no = plot.current;
    const r = no?.getBoundingClientRect();
    const q = quadro.current;
    if (!no || !r?.width || vazio) return null;
    const fracao = limitar((clientX - r.left) / r.width, 0, 1);
    const escala = r.height / (no.offsetHeight || r.height);
    const y = (clientY - r.top) / escala;
    const at = ult > 0 ? Math.round(fracao * ult) : 0;
    const j = Math.round(fracao * (N - 1));
    let key: string | null = null;
    if (q)
      series.forEach((s, i) => {
        if (escondidas.includes(s.key)) return;
        const topo = q.toY(q.upper[i]![j]!);
        const fundo = q.toY(q.lower[i]![j]!);
        if (y >= topo - 1 && y <= fundo + 1) key = s.key;
      });
    return { index: at, key, y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || e.buttons) setHover(ler(e.clientX, e.clientY));
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") e.currentTarget.setPointerCapture?.(e.pointerId);
    setHover(ler(e.clientX, e.clientY));
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (vazio) return;
    if (e.key === "Escape" && hover) {
      e.preventDefault();
      setHover(null);
      return;
    }
    const de = indice ?? ult;
    const chaves = visiveis.map((s) => s.key);
    const at = ativa ? chaves.indexOf(ativa) : -1;
    const pagina = Math.max(1, Math.round(data.length / 6));
    const movs: Record<string, () => Hover> = {
      ArrowLeft: () => ({ index: limitar(de - 1, 0, ult), key: ativa, y: null }),
      ArrowRight: () => ({ index: limitar(indice === null ? ult : de + 1, 0, ult), key: ativa, y: null }),
      PageDown: () => ({ index: limitar(de - pagina, 0, ult), key: ativa, y: null }),
      PageUp: () => ({ index: limitar(de + pagina, 0, ult), key: ativa, y: null }),
      Home: () => ({ index: 0, key: ativa, y: null }),
      End: () => ({ index: ult, key: ativa, y: null }),
      ArrowUp: () => ({
        index: de,
        key: chaves[at < 0 ? chaves.length - 1 : Math.min(chaves.length - 1, at + 1)] ?? null,
        y: null,
      }),
      ArrowDown: () => ({ index: de, key: chaves[at < 0 ? 0 : Math.max(0, at - 1)] ?? null, y: null }),
    };
    const mov = movs[e.key];
    if (!mov) return;
    e.preventDefault();
    setHover(mov());
  };

  const formatar = (v: number, s: StreamgraphSeries) =>
    `${formatValue ? formatValue(v, s) : agrupado.format(v)}${unit ? ` ${unit}` : ""}`;
  const leitura = indice === null ? null : data[indice];
  const total = (d: StreamgraphDatum) => visiveis.reduce((s, l) => s + Math.max(0, d.values[l.key] ?? 0), 0);
  const serieAtiva = ativa ? series.find((s) => s.key === ativa) : undefined;
  const anuncio = leitura
    ? `${leitura.label}. ${serieAtiva ? `${serieAtiva.label} ${formatar(leitura.values[serieAtiva.key] ?? 0, serieAtiva)}, ` : ""}${visiveis.length} camadas, ${agrupado.format(total(leitura))}${unit ? ` ${unit}` : ""} no total`
    : "";
  const resumo = vazio
    ? `${label}. ${emptyLabel}.`
    : `${label}, de ${data[0]!.label} a ${data[ult]!.label}. ${visiveis
        .map((s) => `${s.label}, último ${formatar(data[ult]!.values[s.key] ?? 0, s)}`)
        .join(". ")}.`;
  const marcas = rotulosDoEixo(data, larguraPlot);
  const ligado = indice !== null;

  return (
    <figure ref={figura} aria-label={label} className={cn("m-0 grid min-w-0 gap-4 text-foreground", className)}>
      {legend && series.length > 1 && (
        <div
          className="-mx-2 flex min-w-0 flex-wrap gap-x-1 gap-y-0.5"
          role="group"
          aria-label={`Camadas de ${label}`}
          onPointerLeave={() => setChaveLegenda(null)}
        >
          {series.map((s, i) => {
            const ligada = !escondidas.includes(s.key);
            const emFoco = ativa === s.key;
            const apagada = ativa !== null && !emFoco;
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={ligada}
                onClick={() => alternar(s.key)}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setChaveLegenda(s.key);
                }}
                onFocus={(e) => {
                  if (e.currentTarget.matches(":focus-visible")) setChaveLegenda(s.key);
                }}
                onBlur={() => setChaveLegenda(null)}
                className={cn(
                  "inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-[var(--r-pill)] border-0 py-0 pl-2 pr-2.5 text-corpo [-webkit-tap-highlight-color:transparent] [transition:color_var(--dur-fast)_var(--ease-out),background-color_var(--dur-fast)_var(--ease-out),opacity_var(--dur-fast)_var(--ease-out)] hover:text-foreground focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
                  emFoco ? "bg-foreground/5 text-foreground" : "bg-transparent text-muted-foreground",
                  apagada && "opacity-55",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2.5 flex-none rounded-[3px] [transition:scale_var(--dur-base)_var(--ease-out),opacity_var(--dur-fast)_var(--ease-out)]",
                    !ligada && "scale-60 opacity-35",
                  )}
                  style={{ background: corDe(s, i) }}
                />
                <span className={cn("whitespace-nowrap", !ligada && "line-through opacity-70")}>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="relative grid min-w-0 grid-rows-[auto_26px]">
        <div
          ref={plot}
          role="group"
          tabIndex={vazio ? -1 : 0}
          aria-roledescription="gráfico de fluxo"
          aria-label={`${label}. Setas pros lados andam no tempo; pra cima e pra baixo trocam de camada.`}
          style={{ height }}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerUp={(e) => {
            if (e.pointerType !== "mouse") setHover(null);
          }}
          onPointerCancel={() => setHover(null)}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setHover(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setHover(null)}
          onFocus={(e) => {
            if (e.currentTarget.matches(":focus-visible") && !vazio)
              setHover((h) => h ?? { index: ult, key: null, y: null });
          }}
          className="relative min-w-0 cursor-crosshair touch-pan-y select-none rounded-[var(--r-control)] [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]"
        >
          <svg className="block overflow-visible" width="100%" height={height} aria-hidden="true" focusable="false">
            {series.map((s, i) => {
              const emFoco = ativa === s.key;
              return (
                <path
                  key={s.key}
                  ref={(no) => {
                    if (no) caminhos.current.set(s.key, no);
                    else caminhos.current.delete(s.key);
                  }}
                  // O traço da cor do card é o vão entre camadas vizinhas.
                  className={cn(
                    "[stroke-linejoin:round] [stroke-width:2] [stroke:var(--card)] [transition:opacity_var(--dur-fast)_var(--ease-out),fill_var(--dur-base)_var(--ease-out)]",
                    ativa !== null && !emFoco && "opacity-35",
                  )}
                  style={{
                    fill: emFoco ? corDe(s, i) : `color-mix(in oklab, ${corDe(s, i)} 82%, var(--card))`,
                  }}
                />
              );
            })}
            <motion.line
              x1={0}
              x2={0}
              y1={0}
              y2={height}
              className={cn(
                "pointer-events-none [shape-rendering:crispEdges] [stroke-opacity:0.5] [stroke-width:1] [stroke:var(--foreground)] [transition:opacity_var(--dur-press)_var(--ease-out)]",
                ligado ? "opacity-100" : "opacity-0",
              )}
              style={{ x: reduzir ? mira : miraMola }}
            />
            {directLabels &&
              series.map((s) => (
                <text
                  key={s.key}
                  ref={(no) => {
                    if (no) rotulos.current.set(s.key, no);
                    else rotulos.current.delete(s.key);
                  }}
                  textAnchor="middle"
                  dominantBaseline="central"
                  // Halo da cor do card: o nome lê em cima de qualquer camada.
                  className={cn(
                    "pointer-events-none text-apoio font-medium [fill:var(--foreground)] [paint-order:stroke] [stroke-linejoin:round] [stroke-opacity:0.85] [stroke-width:3px] [stroke:var(--card)] [transition:opacity_var(--dur-slow)_var(--ease-out)]",
                    (escondidas.includes(s.key) || (ativa !== null && ativa !== s.key)) && "!opacity-0",
                  )}
                >
                  {s.label}
                </text>
              ))}
          </svg>

          <motion.div
            ref={dica}
            aria-hidden="true"
            style={{ x: reduzir ? dicaX : dicaMolaX, y: reduzir ? dicaY : dicaMolaY }}
            className={cn(
              "pointer-events-none absolute left-0 top-0 z-10 grid min-w-[156px] max-w-[min(256px,100%)] gap-1 rounded-[var(--r-surface)] border border-border bg-card px-3 py-2.5 [box-shadow:var(--e-raised)] [transition:opacity_var(--dur-fast)_var(--ease-out),scale_var(--dur-fast)_var(--ease-out)]",
              ligado ? "scale-100 opacity-100" : "scale-96 opacity-0",
            )}
          >
            <p className="m-0 mb-0.5 whitespace-nowrap text-apoio tabular-nums text-muted-foreground">{leitura?.label ?? ""}</p>
            {ordemDaPilha(series.length, offset)
              .reverse()
              .map((at) => series[at]!)
              .filter((s) => !escondidas.includes(s.key))
              .map((s) => {
                const emFoco = ativa === s.key;
                return (
                  <p
                    key={s.key}
                    className={cn(
                      "m-0 flex min-w-0 items-center gap-2 text-corpo",
                      transicaoRapida,
                      ativa !== null && !emFoco && "opacity-50",
                    )}
                  >
                    <span className="h-[2.5px] w-2.5 flex-none rounded-sm" style={{ background: corDe(s, series.indexOf(s)) }} />
                    <span className={cn("min-w-0 flex-1 truncate", emFoco ? "text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                    <span className="ml-2 flex-none whitespace-nowrap font-medium tabular-nums text-foreground">
                      {leitura ? formatar(leitura.values[s.key] ?? 0, s) : ""}
                    </span>
                  </p>
                );
              })}
          </motion.div>

          {(vazio || visiveis.length === 0) && (
            <p className="pointer-events-none absolute inset-0 m-0 grid place-items-center text-corpo text-muted-foreground">
              {vazio ? emptyLabel : "Ligue uma camada pra ver o fluxo"}
            </p>
          )}
        </div>

        <div className="relative min-w-0" aria-hidden="true">
          {marcas.map((at) => {
            const fracao = ult > 0 ? at / ult : 0.5;
            const d = data[at]!;
            return (
              <span
                key={d.key}
                className="absolute top-2 whitespace-nowrap text-apoio leading-none tabular-nums text-muted-foreground [transition:opacity_var(--dur-slow)_var(--ease-out)] starting:opacity-0"
                style={{ left: `${fracao * 100}%`, translate: `${-fracao * 100}% 0` }}
              >
                {d.axisLabel}
              </span>
            );
          })}
        </div>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {anuncio}
      </p>
      <p className="sr-only">{resumo}</p>
      {!vazio && (
        <div className="sr-only">
          <table>
            <caption>{label}</caption>
            <thead>
              <tr>
                <th scope="col">{categoryLabel}</th>
                {series.map((s) => (
                  <th key={s.key} scope="col">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key}>
                  <th scope="row">{d.label}</th>
                  {series.map((s) => (
                    <td key={s.key}>{formatar(d.values[s.key] ?? 0, s)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
