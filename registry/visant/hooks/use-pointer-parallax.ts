"use client";

import * as React from "react";

/**
 * Paralaxe de ponteiro — em vinte e cinco linhas de trabalho útil.
 *
 * ── Por que isto existe, tendo prontas ─────────────────────────────────────
 *
 * Antes de escrever o original, as prontas foram olhadas: **Atropos** faz tilt
 * 3D de hover num card só; **Rellax** e **SimpleParallax** fazem parallax de
 * FUNDO no scroll. Nenhuma faz composição com profundidade POR OBJETO. Instalar
 * qualquer uma seria pagar peso pra ainda escrever este arquivo.
 *
 * ── A divisão de trabalho é a que o navegador prefere ──────────────────────
 *
 * O hook escreve DUAS custom properties no elemento — `--px` e `--py`, de -1 a
 * 1 — e **o CSS decide** o que cada objeto faz com elas, tipicamente através de
 * um `--d` de profundidade próprio:
 *
 * ```css
 * .objeto { transform: translate3d(calc(var(--px) * var(--d) * 1px),
 *                                  calc(var(--py) * var(--d) * 1px), 0); }
 * ```
 *
 * Assim o layout e a estética ficam inteiros na folha de estilo, e trocar a
 * composição não encosta em JavaScript. É também o que permite dar profundidade
 * diferente a cada peça sem uma linha a mais aqui.
 *
 * ── As quatro guardas ──────────────────────────────────────────────────────
 *
 * · **Uma escrita por quadro.** `pointermove` dispara dezenas de vezes por
 *   segundo, e escrever custom property a cada evento força recálculo de estilo
 *   fora do quadro. rAF é o teto útil.
 * · **Só onde há ponteiro fino.** No toque não existe hover, e a paralaxe
 *   ficaria presa no último ponto tocado — pior que não existir.
 * · **Nada a fazer com o alvo fora da tela.** Sai antes de medir.
 * · **Ponteiro saiu da janela: volta ao repouso**, em vez de congelar torto.
 *
 * Se o hook não rodar, `--px` e `--py` ficam em 0 e a composição é uma imagem
 * parada. É o estado de repouso correto, não um estado quebrado — e é por isso
 * que os defaults do CSS têm que ser `var(--px, 0)`.
 *
 * A deriva de SCROLL não pertence aqui: ela é `animation-timeline: view()`
 * nativo, que roda fora da main thread. Ouvir scroll em JS pra isso seria
 * reinventar, e pior.
 */
export function usePointerParallax<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  {
    /** Quanto do alvo precisa estar em vista pra valer a pena medir. */
    enabled = true,
  }: { enabled?: boolean } = {},
) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let fine = false;
    try {
      fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) fine = false;
    } catch {
      fine = false;
    }
    if (!fine) return;

    let pendente = false;
    let px = 0;
    let py = 0;
    let raf = 0;

    const pintar = () => {
      pendente = false;
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
    };
    const agendar = () => {
      if (pendente) return;
      pendente = true;
      raf = requestAnimationFrame(pintar);
    };

    const mover = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      px = ((e.clientX - r.left) / r.width) * 2 - 1;
      py = ((e.clientY - r.top) / r.height) * 2 - 1;
      agendar();
    };
    const repousar = () => {
      px = 0;
      py = 0;
      agendar();
    };

    document.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerleave", repousar, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerleave", repousar);
    };
  }, [ref, enabled]);
}
