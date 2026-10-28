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
  return nucleos >= 8 && memoria >= 8 ? "alto" : "medio";
}

let nivel: Nivel | null = null;
export const nivelDoAparelho = (): Nivel => (nivel ??= medirNivel());

/** Contextos WebGL de cada peça de GPU (1 se não medido). Ausente = não usa GPU. */
export const pesoGpu = (nome: string): number => (GPU as Record<string, number>)[nome] ?? 0;

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
const TETO_VIVAS: Record<Nivel, number> = { alto: Infinity, medio: 6, baixo: Infinity };
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
type Pedido = { id: number; gpu: number; viva: number };
const fila: Pedido[] = [];
const ouvintes = new Set<() => void>();
let concedidas = new Set<number>();

function redistribuir() {
  const nivel = nivelDoAparelho();
  const novas = new Set<number>();
  let gpu = 0;
  let vivas = 0;
  for (const p of fila) {
    const cabeGpu = !p.gpu || gpu + p.gpu <= TETO_GPU[nivel] || gpu === 0;
    const cabeViva = vivas + p.viva <= tetoVivas(nivel);
    if (!cabeGpu || !cabeViva) continue;
    novas.add(p.id);
    gpu += p.gpu;
    vivas += p.viva;
  }
  concedidas = novas;
  ouvintes.forEach((fn) => fn());
}

let proximoId = 0;

/**
 * `true` quando a peça pode montar. `quer` falso devolve a vaga. Peça que não
 * pesa em nenhum orçamento (sem GPU, num nível sem teto de vivas) recebe na
 * hora, sem entrar na fila.
 */
export function useVaga(nome: string, quer: boolean): boolean {
  const gpu = pesoGpu(nome);
  const viva = Number.isFinite(tetoVivas(nivelDoAparelho())) ? 1 : 0;
  const naFila = gpu > 0 || viva > 0;
  const id = React.useMemo(() => ++proximoId, []);
  React.useEffect(() => {
    if (!naFila || !quer) return;
    fila.push({ id, gpu, viva });
    redistribuir();
    return () => {
      const i = fila.findIndex((p) => p.id === id);
      if (i > -1) fila.splice(i, 1);
      redistribuir();
    };
  }, [id, gpu, viva, naFila, quer]);
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
