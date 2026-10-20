/**
 * MotionLayer — a camada de movimento, ligável por atributo.
 *
 * Colhida de um concept de e-commerce. Duas coisas a tornam reaproveitável:
 *
 * ── 1. Ela não conhece o layout ──────────────────────────────────────────────
 * Tudo se liga por `data-*`. O designer compõe onde quiser; o código se pluga.
 * É o mesmo padrão que sites de estúdio usam para um `app.js` único servir uma
 * página inteira montada num builder visual — e é o que permite este arquivo
 * virar UM asset de tema Shopify em vez de código espalhado por seção.
 *
 *   data-reveal="lines"   máscara por linha: o texto sobe de dentro de um corte
 *   data-reveal="items"   cascata curta com teto nos filhos diretos
 *   data-parallax="8"     deslocamento em %, ligado à passagem da dobra
 *   data-magnetic="5"     o botão reconhece o cursor antes do clique
 *
 * ── 2. Ela sobrevive ao editor de tema ───────────────────────────────────────
 * **O gancho que quase todo mundo esquece:** o editor do Shopify DESTRÓI e
 * RECRIA a seção quando o lojista mexe num setting. Quem inicializa no
 * `DOMContentLoaded` vê a animação morrer no meio da edição, e o cliente conclui
 * que o tema quebrou. `mount()` é idempotente e o unload mata os triggers
 * daquela seção.
 *
 * Requer `gsap` e `gsap/ScrollTrigger` no projeto.
 *
 * Regras herdadas do sistema de motion da casa:
 *   · UI abaixo de 300ms; scroll pode ser mais longo e deliberado
 *   · `ease-in` nunca em UI
 *   · só `transform` e `opacity`
 *   · `prefers-reduced-motion` desliga o movimento SEM tirar o desfecho
 */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** No design mode do Shopify o editor rola a página sozinho — não brigue. */
export const isDesignMode = () =>
  typeof window !== "undefined" && Boolean((window as any).Shopify?.designMode);

function revealLines(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((el) => {
    if (el.dataset.mounted) return;
    el.dataset.mounted = "1";

    const lines = Array.from(el.children) as HTMLElement[];
    if (!lines.length) return;

    if (reduced) {
      gsap.set(lines, { yPercent: 0, opacity: 1 });
      return;
    }

    // A máscara é a caixa da linha, com folga embaixo: line-height abaixo de 1
    // corta descendente e curva do glifo, e um overflow no título inteiro
    // decepa o texto em vez de mascará-lo.
    gsap.set(el, { overflow: "hidden" });
    gsap.fromTo(
      lines,
      { yPercent: 108 },
      {
        yPercent: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.07,
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      },
    );
  });
}

function revealItems(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-reveal="items"]').forEach((el) => {
    const items = (Array.from(el.children) as HTMLElement[]).filter(
      (c) => !c.dataset.mounted,
    );
    if (!items.length) return;
    items.forEach((c) => (c.dataset.mounted = "1"));

    if (reduced) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }

    // Teto no atraso acumulado: passou de ~350ms vira desfile em vez de
    // resposta, e numa grade de 20 cards é o que separa "vivo" de "lento".
    gsap.fromTo(
      items,
      { opacity: 0, y: 22 },
      {
        opacity: 1,
        y: 0,
        duration: 0.62,
        ease: "power2.out",
        stagger: { each: 0.035, amount: Math.min(items.length * 0.035, 0.35) },
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      },
    );
  });
}

function parallax(root: ParentNode) {
  if (reduced) return;
  root.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    if (el.dataset.mounted) return;
    el.dataset.mounted = "1";

    // 8%, não 30%. Paralaxe forte denuncia o efeito; fraca só dá profundidade.
    // A imagem precisa nascer em scale > 1 ou abre buraco nas bordas.
    const amount = Number(el.dataset.parallax) || 8;
    gsap.fromTo(
      el,
      { yPercent: -amount / 2 },
      {
        yPercent: amount / 2,
        ease: "none",
        scrollTrigger: {
          trigger: el.parentElement as HTMLElement,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  });
}

function magnetic(root: ParentNode) {
  if (
    reduced ||
    !window.matchMedia("(hover: hover) and (pointer: fine)").matches
  )
    return;

  root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    if (el.dataset.mounted) return;
    el.dataset.mounted = "1";

    // Teto de 5px. O ponto não é o botão fugir do cursor — é ele reconhecer
    // que o cursor chegou, antes do clique. Só onde há ponteiro de verdade:
    // num telefone isto seria código morto disparando a cada toque.
    const strength = Number(el.dataset.magnetic) || 5;
    const x = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      x(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
      y(((e.clientY - r.top) / r.height - 0.5) * strength * 2);
    });
    el.addEventListener("pointerleave", () => {
      x(0);
      y(0);
    });
  });
}

/**
 * Entrada imediata, sem gancho de scroll.
 *
 * Para conteúdo RE-renderizado por ação do usuário (trocar um filtro e ver a
 * grade se refazer). Aqui um trigger de scroll seria errado: o usuário já está
 * olhando para o lugar, e a animação é a resposta ao clique dele.
 */
export function enterItems(items: Element[]) {
  if (!items.length) return;
  if (reduced) {
    gsap.set(items, { opacity: 1, y: 0 });
    return;
  }
  gsap.fromTo(
    items,
    { opacity: 0, y: 14 },
    {
      opacity: 1,
      y: 0,
      duration: 0.42,
      ease: "power2.out",
      stagger: { each: 0.022, amount: Math.min(items.length * 0.022, 0.28) },
    },
  );
}

/** Idempotente: pode ser chamado de novo quando a seção é recriada. */
export function mount(root: ParentNode = document) {
  revealLines(root);
  revealItems(root);
  parallax(root);
  magnetic(root);
  ScrollTrigger.refresh();
}

/** Liga o ciclo de vida do editor de tema. Fora do Shopify é inofensivo. */
export function bindShopifyLifecycle() {
  document.addEventListener("shopify:section:load", (e) =>
    mount((e as CustomEvent).target as ParentNode),
  );
  document.addEventListener("shopify:section:unload", (e) => {
    const target = (e as CustomEvent).target as HTMLElement;
    ScrollTrigger.getAll().forEach((t) => {
      if (t.trigger && target.contains(t.trigger)) t.kill();
    });
  });
}

export { gsap, ScrollTrigger };
