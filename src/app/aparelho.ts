/**
 * Quanto o aparelho aguenta, e quem pode usar a GPU agora.
 *
 * Medido em produção (PLANO-PERFORMANCE.md): a mesma grade que roda lisa num
 * desktop perde 56% dos quadros num notebook fraco e 85% num celular. O custo
 * mora em 15 peças de GPU (`gpu.generated.json`). As outras ~120 juntas pesam
 * menos que duas delas. Por isso a regra não é "menos peças": é **foto onde o
 * aparelho não aguenta, e um teto de contextos WebGL vivos em todo aparelho**.
 *
 * Os sinais são todos de API padrão, lidos uma vez. Onde o navegador não
 * expõe (`deviceMemory` só existe no Chromium), cai no meio, nunca no topo.
 * `?nivel=alto|medio|baixo` força o nível, para QA e para `perf-catalogo.mjs`.
 */

import * as React from "react";
import GPU from "./gpu.generated.json";

export type Nivel = "alto" | "medio" | "baixo";

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

function medirNivel(): Nivel {
  if (typeof window === "undefined") return "alto";
  const forcado = new URLSearchParams(window.location.search).get("nivel");
  if (forcado === "alto" || forcado === "medio" || forcado === "baixo") return forcado;

  const nav = navigator as Nav;
  const mq = (q: string) => window.matchMedia?.(q).matches ?? false;
  // Reduced-motion NÃO entra aqui: as peças já respeitam a preferência por conta
  // própria, e trocar a peça por foto tirava da pessoa a peça parada, que é o que
  // ela pediu.
  if (nav.connection?.saveData || mq("(prefers-reduced-data: reduce)")) {
    return "baixo";
  }
  // Celular: toque e tela estreita. Tablet (toque, tela larga) fica no meio.
  if (mq("(pointer: coarse)")) return mq("(max-width: 767px)") ? "baixo" : "medio";

  const nucleos = nav.hardwareConcurrency ?? 4;
  const memoria = nav.deviceMemory ?? 4;
  if (nucleos < 8 || memoria < 8) return "medio";
  // Muito núcleo e nenhuma GPU de verdade (VM, driver bloqueado, desktop remoto):
  // cada cena WebGL vira renderização na CPU. Medido: é o caso que mais perde
  // quadro na rolagem.
  return gpuPorSoftware() ? "medio" : "alto";
}

/**
 * O WebGL está sendo desenhado na CPU? Lê o nome do renderer uma vez e devolve o
 * contexto na hora (`WEBGL_lose_context`), para o teste não ocupar vaga.
 */
function gpuPorSoftware(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return true;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const nome = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /swiftshader|llvmpipe|softpipe|basic render|software/i.test(nome);
  } catch {
    return false;
  }
}

let nivel: Nivel | null = null;
export const nivelDoAparelho = (): Nivel => (nivel ??= medirNivel());

type InfoGpu = { contextos: number; pesada: boolean };
const infoGpu = (nome: string): InfoGpu | undefined => (GPU as Record<string, InfoGpu>)[nome];

/** Contextos WebGL de cada peça de GPU (1 se não medido). 0 = não usa GPU. */
export const pesoGpu = (nome: string): number => infoGpu(nome)?.contextos ?? 0;

/** Cena que, sozinha, já perde 20% ou mais dos quadros na medição (`gpu-extract.mjs`). */
export const ehPesada = (nome: string): boolean => infoGpu(nome)?.pesada ?? false;

/*
 * Dois orçamentos, os dois medidos (PLANO-PERFORMANCE.md):
 *
 * - **GPU**: contextos WebGL vivos. O Chrome derruba o mais antigo a partir de
 *   ≈16, celular bem antes. O teto fica longe do limite de propósito, porque a
 *   ficha, o kit e o estúdio também abrem os seus.
 * - **Vivas**: peças montadas ao mesmo tempo, no nível médio. No notebook fraco
 *   (CPU 4x), a curva medida foi 0 vivas → 15% de quadros lentos, 2 → 55%,
 *   4 → 60%: uma ou duas peças em animação contínua já derrubam a CPU. Por isso,
 *   no médio, a peça acorda por intenção (`Gallery`) e o teto segura o pior
 *   caso de quem passa o cursor pela grade inteira.
 */
const TETO_GPU: Record<Nivel, number> = { alto: 6, medio: 3, baixo: 2 };
/*
 * Cenas pesadas vivas ao mesmo tempo. Parada, a primeira tela roda a 60 fps; na
 * rolagem, as tarefas longas que não vinham de montagem nenhuma coincidiam com
 * fog-hero, lathe-object, fog-tree e fog-garden vivas juntas (são vizinhas na
 * grade). Este teto vale mesmo para quem está na tela: a terceira cena pesada
 * fica na foto até uma das outras sair.
 */
const TETO_PESADAS: Record<Nivel, number> = { alto: 2, medio: 1, baixo: 1 };
/*
 * Alto: 12. A grade viva a uma tela de distância chegava a 27 peças (perdendo 25%
 * dos quadros num desktop rápido); com 10 caía para 12%. No alto o teto nunca
 * come a tela: o que está visível (`prioridade` 0) sempre entra, e a faixa de
 * pré-aquecimento usa só as vagas que sobram. Grade densa num monitor grande
 * pode passar de 12 na tela, e nenhuma delas vira foto.
 */
const TETO_VIVAS: Record<Nivel, number> = { alto: 12, medio: 6, baixo: Infinity };
// `?vivas=N` força o teto de vivas em qualquer nível, para medir a curva.
const vivasForcado = typeof window === "undefined" ? NaN : Number(new URLSearchParams(window.location.search).get("vivas") ?? NaN);
const tetoVivas = (n: Nivel) => (Number.isFinite(vivasForcado) ? vivasForcado : TETO_VIVAS[n]);

/* ── Vagas ──────────────────────────────────────────────────────────────────
 * Uma fila por ordem de pedido: quem entrou primeiro na tela leva a vaga, e a
 * fila anda quando alguém sai. Quem não cabe é pulado, e quem vem atrás e cabe
 * passa. Como a cabeça da fila é sempre a primeira a ser avaliada, uma peça
 * pesada (a book-shelf ocupa 4 contextos) entra assim que a GPU esvazia: nunca
 * fica foto para sempre. Uma peça mais pesada que o teto inteiro entra com a
 * GPU livre.
 */
/** `prioridade` 0 = na tela, 1 = pré-aquecimento. Empate fica na ordem de chegada. */
type Pedido = { id: number; gpu: number; viva: number; pesada: number; prioridade: number };
const fila: Pedido[] = [];
const ouvintes = new Set<() => void>();
let concedidas = new Set<number>();

/*
 * Idle until urgent. Parada, a primeira tela roda a 60 fps; o que perdia quadro
 * no desktop era MONTAR peça durante a rolagem, porque cada montagem é uma
 * tarefa longa (chunk, primeiro render, canvas), visível ou não. Então:
 *
 * - quem está na tela (prioridade 0) recebe a vaga na hora;
 * - quem só está na faixa de pré-aquecimento recebe uma vaga por janela ociosa
 *   do navegador (`requestIdleCallback`), fora dos quadros da rolagem.
 *
 * Perder a vaga é sempre imediato: devolver não custa nada.
 */
const ocioso: (fn: () => void) => void =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (fn) => window.requestIdleCallback(fn, { timeout: 500 })
    : (fn) => window.setTimeout(fn, 50);
let aguardandoOcioso = false;
/** Só a chamada que vem do ocioso pode aquecer uma peça nova. */
let podeAquecer = false;

function redistribuir() {
  const nivel = nivelDoAparelho();
  const novas = new Set<number>();
  let gpu = 0;
  let vivas = 0;
  let pesadas = 0;
  let aquecidaAgora = false;
  let restaAquecer = false;
  const ordem = [...fila].sort((a, b) => a.prioridade - b.prioridade || a.id - b.id);
  for (const p of ordem) {
    const cabeGpu = !p.gpu || gpu + p.gpu <= TETO_GPU[nivel] || gpu === 0;
    const naTelaDoAlto = nivel === "alto" && p.prioridade === 0;
    const cabeViva = naTelaDoAlto || vivas + p.viva <= tetoVivas(nivel);
    const cabePesada = pesadas + p.pesada <= TETO_PESADAS[nivel];
    if (!cabeGpu || !cabeViva || !cabePesada) continue;
    // Pré-aquecimento novo: um por janela ociosa. Quem já tinha a vaga mantém.
    if (p.prioridade > 0 && !concedidas.has(p.id)) {
      if (aquecidaAgora || !podeAquecer) {
        restaAquecer = true;
        continue;
      }
      aquecidaAgora = true;
    }
    novas.add(p.id);
    gpu += p.gpu;
    pesadas += p.pesada;
    vivas += p.viva;
  }
  concedidas = novas;
  podeAquecer = false;
  ouvintes.forEach((fn) => fn());
  if (restaAquecer && !aguardandoOcioso) {
    aguardandoOcioso = true;
    ocioso(() => {
      aguardandoOcioso = false;
      podeAquecer = true;
      redistribuir();
    });
  }
}

let proximoId = 0;

/**
 * `true` quando a peça pode montar. `quer` falso devolve a vaga. Peça que não
 * pesa em nenhum orçamento (sem GPU, num nível sem teto de vivas) recebe na
 * hora, sem entrar na fila.
 */
export function useVaga(nome: string, quer: boolean, naTela = true): boolean {
  const gpu = pesoGpu(nome);
  const pesada = ehPesada(nome) ? 1 : 0;
  const viva = Number.isFinite(tetoVivas(nivelDoAparelho())) ? 1 : 0;
  const naFila = gpu > 0 || viva > 0;
  const id = React.useMemo(() => ++proximoId, []);
  const prioridade = naTela ? 0 : 1;
  const prioridadeRef = React.useRef(prioridade);
  prioridadeRef.current = prioridade;
  React.useEffect(() => {
    if (!naFila || !quer) return;
    fila.push({ id, gpu, viva, pesada, prioridade: prioridadeRef.current });
    redistribuir();
    return () => {
      const i = fila.findIndex((p) => p.id === id);
      if (i > -1) fila.splice(i, 1);
      redistribuir();
    };
  }, [id, gpu, viva, pesada, naFila, quer]);
  // Entrar ou sair da tela muda a prioridade no lugar, sem devolver a vaga: tirar
  // e repor o pedido faria a peça perder a vez para quem chegou depois.
  React.useEffect(() => {
    const p = fila.find((x) => x.id === id);
    if (p && p.prioridade !== prioridade) {
      p.prioridade = prioridade;
      redistribuir();
    }
  }, [id, prioridade]);
  const temVaga = React.useSyncExternalStore(
    (fn) => {
      ouvintes.add(fn);
      return () => ouvintes.delete(fn);
    },
    () => concedidas.has(id),
    () => false,
  );
  return naFila ? quer && temVaga : quer;
}
