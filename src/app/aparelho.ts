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
 * Teto de contextos vivos. O Chrome derruba o mais antigo a partir de ≈16, e
 * celular bem antes disso. O teto fica longe do limite de propósito, porque a
 * ficha, o kit e o estúdio também abrem os seus.
 */
const TETO: Record<Nivel, number> = { alto: 6, medio: 3, baixo: 2 };

/* ── Vagas de GPU ───────────────────────────────────────────────────────────
 * Fila por ordem de pedido. Quem pede primeiro (quem entrou primeiro na tela)
 * leva a vaga. Quando alguém sai, a fila anda. Uma peça mais pesada que o teto
 * inteiro (a book-shelf no nível médio) só entra com a GPU livre, mas entra:
 * nunca fica foto para sempre.
 */
const fila: { id: number; peso: number }[] = [];
const ouvintes = new Set<() => void>();
let concedidas = new Set<number>();

function redistribuir() {
  const teto = TETO[nivelDoAparelho()];
  const novas = new Set<number>();
  let usado = 0;
  for (const p of fila) {
    if (usado + p.peso <= teto || usado === 0) {
      novas.add(p.id);
      usado += p.peso;
    } else break;
  }
  concedidas = novas;
  ouvintes.forEach((fn) => fn());
}

let proximoId = 0;

/**
 * `true` quando a peça pode montar. Peça sem GPU (peso 0) recebe na hora, sem
 * entrar na fila. `quer` falso devolve a vaga.
 */
export function useVagaGpu(nome: string, quer: boolean): boolean {
  const peso = pesoGpu(nome);
  const id = React.useMemo(() => ++proximoId, []);
  React.useEffect(() => {
    if (!peso || !quer) return;
    fila.push({ id, peso });
    redistribuir();
    return () => {
      const i = fila.findIndex((p) => p.id === id);
      if (i > -1) fila.splice(i, 1);
      redistribuir();
    };
  }, [id, peso, quer]);
  const temVaga = React.useSyncExternalStore(
    (fn) => {
      ouvintes.add(fn);
      return () => ouvintes.delete(fn);
    },
    () => concedidas.has(id),
    () => false,
  );
  return !peso ? quer : quer && temVaga;
}
