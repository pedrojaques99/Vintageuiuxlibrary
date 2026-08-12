"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Spring Dots — malha parada que só existe em movimento onde a mão passa.
 *
 * Colhido da página de obrigado do `visantismo`, e a decisão de ONDE usar veio
 * junto porque ela é metade do valor: este é o efeito mais bonito da família e
 * o mais perigoso numa dobra que vende. Movimento contínuo atrás de um preço
 * disputa atenção com o preço. Ele pertence a confirmação, 404, login, onboarding
 * — superfícies sem conversão em risco, onde o orçamento de deleite pode ser
 * gasto inteiro.
 *
 * A mecânica: cada ponto é uma mola presa em casa. O ponteiro empurra dentro de
 * um raio, o atrito segura, a mola devolve. Quem saiu de casa **acende** — sem
 * isso o efeito é só geométrico e some no escuro; com isso o deslocamento vira
 * luz e o campo lê como reação, não como deformação. É também o que mantém a
 * cor de marca em ração curta: cor só onde a mão passou.
 *
 * `k` normaliza a física pelo tempo real do quadro. Sem ele a mola fica mais
 * dura em tela de 144Hz que em tela de 60Hz, e o "peso" do campo muda de
 * máquina pra máquina.
 *
 * O ponteiro é escutado no **documento**, não no canvas: o canvas é
 * `pointer-events: none` (senão engoliria o clique do que está por cima) e a
 * mão passa sobre o texto o tempo todo.
 *
 * Como no `erase-field`, a cor sai de uma sonda e não de um parser de hex — o
 * registry emite OKLCH, e parser de `#rrggbb` cairia num fallback em silêncio.
 * A sonda **não** termina em regex, e a razão é um bug de verdade: o navegador
 * moderno devolve `getComputedStyle().backgroundColor` ainda em `oklch(...)`
 * quando a var é OKLCH — só serializa em `rgb()` o que já é sRGB. Um regex de
 * números lia `oklch(0.708 0 0)` como `rgb(0.708, 0, 0)`, ou seja PRETO. Dentro
 * de uma sala com `.dark` isso era ponto preto sobre fundo preto: a malha
 * simplesmente sumia. Quem converte é o próprio canvas, que aceita CSS Color 4.
 *
 * Contratos: DPR com teto de 2, `ResizeObserver`, rAF parado fora da tela e
 * `prefers-reduced-motion` desenhando UM quadro — a malha fica, a mola não.
 */

/* Um canvas 1×1 é o conversor: `fillStyle` engole qualquer notação de CSS Color
   4 (oklch, color(), hsl…) e `getImageData` devolve os canais já em sRGB. O
   sentinela é o teste de recusa — `fillStyle` inválido é IGNORADO em silêncio
   pela spec, então se o valor continuar magenta é porque o navegador não
   entendeu, e aí o fallback é honesto em vez de pintar magenta na tela. */
// Hex cru de propósito: não é cor de UI, é o valor-marcador do teste de recusa
// do `fillStyle`. Nunca chega à tela.
const SENTINELA = "#ff00ff";
let pipeta: CanvasRenderingContext2D | null | undefined;

function paraRGB(valor: string, fallback: [number, number, number]): [number, number, number] {
  if (pipeta === undefined) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    pipeta = cv.getContext("2d", { willReadFrequently: true });
  }
  if (!pipeta || !valor) return fallback;
  pipeta.fillStyle = SENTINELA;
  pipeta.fillStyle = valor;
  if (pipeta.fillStyle === SENTINELA) return fallback;
  pipeta.fillRect(0, 0, 1, 1);
  const d = pipeta.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

/** Resolve a var a partir do HOST — o tema pode estar num container, não no `<html>`. */
function sonda(host: HTMLElement, custom: string, fallback: [number, number, number]) {
  const el = document.createElement("span");
  el.style.cssText = `position:absolute;width:0;height:0;background-color:var(${custom})`;
  host.appendChild(el);
  const lido = getComputedStyle(el).backgroundColor;
  host.removeChild(el);
  return paraRGB(lido, fallback);
}

export interface SpringDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Distância entre pontos, em px. Densidade da malha. */
  spacing?: number;
  /** Alcance do empurrão, em px. */
  reach?: number;
  /** Var de cor de quem acendeu. Default `--brand`. */
  activeVar?: string;
  /** Var de cor de quem está em casa. Default `--muted-foreground`. */
  restVar?: string;
  children?: React.ReactNode;
}

export function SpringDots({
  spacing = 34,
  reach = 140,
  activeVar = "--brand",
  restVar = "--muted-foreground",
  className,
  children,
  ...props
}: SpringDotsProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    type Ponto = { hx: number; hy: number; x: number; y: number; vx: number; vy: number };
    let pts: Ponto[] = [];
    let aceso: [number, number, number] = [82, 221, 235];
    let parado: [number, number, number] = [138, 138, 147];
    let w = 0;
    let h = 0;
    let rodando = false;
    let ultimo = 0;
    let raf = 0;
    const p = { x: -9999, y: -9999, dentro: false };

    function recolherCor() {
      aceso = sonda(host!, activeVar, aceso);
      parado = sonda(host!, restVar, parado);
      if (reduzido) quadro(0); // sem loop, o repinte tem que ser pedido
    }

    function medir() {
      const r = host!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      aceso = sonda(host!, activeVar, aceso);
      parado = sonda(host!, restVar, parado);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      for (let y = spacing / 2; y < h; y += spacing) {
        for (let x = spacing / 2; x < w; x += spacing) {
          pts.push({ hx: x, hy: y, x, y, vx: 0, vy: 0 });
        }
      }
      if (reduzido) quadro(0);
    }

    function quadro(now: number) {
      const dt = Math.min(50, now - (ultimo || now));
      ultimo = now;
      const k = Math.min(2, dt / 16);

      ctx!.clearRect(0, 0, w, h);
      for (const pt of pts) {
        if (p.dentro) {
          const dx = pt.x - p.x;
          const dy = pt.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < reach) {
            const f = (1 - d / reach) * 2.4 * k;
            pt.vx += (dx / d) * f;
            pt.vy += (dy / d) * f;
          }
        }
        pt.vx += (pt.hx - pt.x) * 0.045 * k; // mola: sempre puxando pra casa
        pt.vy += (pt.hy - pt.y) * 0.045 * k;
        pt.vx *= 0.9; // atrito, senão o campo vibra pra sempre
        pt.vy *= 0.9;
        pt.x += pt.vx * k;
        pt.y += pt.vy * k;

        const desl = Math.min(1, Math.hypot(pt.x - pt.hx, pt.y - pt.hy) / 26);
        ctx!.fillStyle =
          desl > 0.02
            ? `rgba(${aceso[0]},${aceso[1]},${aceso[2]},${0.1 + desl * 0.5})`
            : `rgba(${parado[0]},${parado[1]},${parado[2]},0.15)`;
        ctx!.beginPath();
        ctx!.arc(pt.x, pt.y, 1 + desl * 1.4, 0, 6.2832);
        ctx!.fill();
      }
      if (rodando) raf = requestAnimationFrame(quadro);
    }

    const mover = (e: PointerEvent) => {
      const r = canvas!.getBoundingClientRect();
      p.x = e.clientX - r.left;
      p.y = e.clientY - r.top;
      p.dentro = true;
    };
    const sair = () => {
      p.dentro = false;
    };
    document.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerleave", sair);

    const ro = new ResizeObserver(medir);
    ro.observe(host);
    medir();

    /* Trocar de tema não muda tamanho nenhum, então o ResizeObserver não acorda
       e a malha ficaria com a cor do tema anterior até alguém redimensionar a
       janela. Vigiar a classe do `<html>` (é lá que o botão de lua escreve)
       custa um observer e resolve. Só re-sonda cor — não remonta a malha. */
    const mo = new MutationObserver(recolherCor);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let io: IntersectionObserver | undefined;
    if (!reduzido) {
      io = new IntersectionObserver(
        (es) => {
          if (es[0].isIntersecting) {
            if (!rodando) {
              rodando = true;
              ultimo = 0;
              raf = requestAnimationFrame(quadro);
            }
          } else {
            rodando = false;
          }
        },
        { threshold: 0.02 },
      );
      io.observe(host);
    }

    return () => {
      rodando = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      io?.disconnect();
      document.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerleave", sair);
    };
  }, [spacing, reach, activeVar, restVar]);

  return (
    <div ref={hostRef} className={cn("relative isolate overflow-hidden", className)} {...props}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      />
      {children}
    </div>
  );
}
