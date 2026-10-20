"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Page Curl — a revista que se folheia pelo canto.
 *
 * Catálogo, cardápio e anuário em PDF são lidos com a barra de rolagem. Papel
 * é lido pela ponta do dedo. Quando o produto do cliente é editorial, virar a
 * página É a experiência, e um carrossel com setas apaga justamente isso.
 *
 * ── O que se vê, e o que reage a quê ───────────────────────────────────────
 *
 * - Em repouso: a página da vez, com o canto inferior direito levantado só um
 *   pouco quando o ponteiro chega perto (convite, não enfeite).
 * - Arrastando a metade direita: o canto segue o dedo. A parte dobrada mostra o
 *   verso do papel e, por baixo, já aparece a próxima página. A dobra projeta
 *   sombra na página de baixo.
 * - Soltou além do meio, ou com um peteleco para a esquerda: a página termina
 *   de virar. Antes do meio: volta para o lugar. As duas em mola de ~250ms.
 * - Setas do teclado, os botões e o peteleco fazem a mesma virada animada;
 *   voltar é a mesma curva tocada ao contrário.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **A dobra é uma reflexão 2D.** O canto puxado vai a P; a linha de dobra é
 *    a mediatriz entre o canto e P. A frente é a página recortada do lado de
 *    cá da linha; o verso é a mesma caixa recortada do lado de lá e refletida
 *    pela linha. Duas `clip-path` e uma `matrix()`, sem WebGL nem 3D.
 * 2. **O papel está preso na lombada.** P nunca se afasta da borda esquerda
 *    mais do que a página permite (distância à quina de baixo ≤ largura, à de
 *    cima ≤ diagonal). Sem essa trava a página "estica" e a ilusão quebra.
 * 3. **Medida sem escala**: `offsetWidth` para a geometria e o delta do
 *    ponteiro dividido pela escala do palco (a vitrine e muito layout de
 *    cliente escalam a peça).
 * 4. **Geometria escrita direto no DOM**, nunca por estado: o conteúdo das
 *    páginas não re-renderiza a cada quadro da mola.
 */

type Ponto = { x: number; y: number };

function cortar(poli: Ponto[], m: Ponto, n: Ponto, fora: boolean): Ponto[] {
  const lado = (p: Ponto) => ((p.x - m.x) * n.x + (p.y - m.y) * n.y) * (fora ? -1 : 1);
  const res: Ponto[] = [];
  for (let i = 0; i < poli.length; i++) {
    const a = poli[i];
    const b = poli[(i + 1) % poli.length];
    const la = lado(a);
    const lb = lado(b);
    if (la <= 0) res.push(a);
    if ((la < 0 && lb > 0) || (la > 0 && lb < 0)) {
      const t = la / (la - lb);
      res.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return res;
}

const poligono = (ps: Ponto[]) =>
  ps.length < 3 ? "polygon(0 0, 0 0, 0 0)" : `polygon(${ps.map((p) => `${p.x}px ${p.y}px`).join(",")})`;

const MOLA = { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.7 };

export interface PageCurlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** As páginas, na ordem. Cada uma preenche a folha inteira. */
  pages: React.ReactNode[];
  /** Página inicial (base 0). */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Quanto o canto levanta com o ponteiro perto, em px. */
  peek?: number;
  /** Rótulo da revista para leitor de tela. */
  label?: string;
}

export function PageCurl({
  pages,
  defaultIndex = 0,
  onIndexChange,
  peek = 22,
  label = "Revista",
  className,
  ...props
}: PageCurlProps) {
  const reduzir = useReducedMotion();
  const [indice, setIndice] = React.useState(defaultIndex);
  // A folha de cima (que curva) e a de baixo (que aparece). Na volta, a de cima
  // é a anterior e a de baixo é a atual.
  const [par, setPar] = React.useState<{ cima: number; baixo: number }>({
    cima: defaultIndex,
    baixo: defaultIndex + 1,
  });
  const indiceRef = React.useRef(defaultIndex);
  const ocupado = React.useRef(false);

  const folha = React.useRef<HTMLDivElement>(null);
  const frente = React.useRef<HTMLDivElement>(null);
  const verso = React.useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const dims = React.useRef({ w: 0, h: 0 });

  const desenhar = React.useCallback(() => {
    const f = frente.current;
    const v = verso.current;
    if (!f || !v) return;
    const { w, h } = dims.current;
    const c = { x: w, y: h };
    const p = { x: px.get(), y: py.get() };
    const dist = Math.hypot(c.x - p.x, c.y - p.y);
    if (dist < 0.5) {
      f.style.clipPath = "";
      v.style.visibility = "hidden";
      return;
    }
    const m = { x: (c.x + p.x) / 2, y: (c.y + p.y) / 2 };
    const n = { x: (c.x - p.x) / dist, y: (c.y - p.y) / dist };
    const caixa = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
    f.style.clipPath = poligono(cortar(caixa, m, n, false));
    v.style.clipPath = poligono(cortar(caixa, m, n, true));
    const k = m.x * n.x + m.y * n.y;
    v.style.transform = `matrix(${1 - 2 * n.x * n.x},${-2 * n.x * n.y},${-2 * n.x * n.y},${
      1 - 2 * n.y * n.y
    },${2 * k * n.x},${2 * k * n.y})`;
    v.style.visibility = "visible";
  }, [px, py]);

  const medir = React.useCallback(() => {
    const el = folha.current;
    if (!el) return;
    dims.current = { w: el.offsetWidth, h: el.offsetHeight };
  }, []);

  React.useLayoutEffect(() => {
    medir();
    px.set(dims.current.w);
    py.set(dims.current.h);
    const a = px.on("change", desenhar);
    const b = py.on("change", desenhar);
    const ro = new ResizeObserver(() => {
      medir();
      if (!ocupado.current) {
        px.set(dims.current.w);
        py.set(dims.current.h);
      }
      desenhar();
    });
    if (folha.current) ro.observe(folha.current);
    return () => {
      a();
      b();
      ro.disconnect();
    };
  }, [px, py, desenhar, medir]);

  /** Prende o canto à lombada, como papel de verdade. */
  const prender = (p: Ponto): Ponto => {
    const { w, h } = dims.current;
    let q = p;
    const d1 = Math.hypot(q.x, q.y - h);
    if (d1 > w) q = { x: (q.x / d1) * w, y: h + ((q.y - h) / d1) * w };
    const diag = Math.hypot(w, h);
    const d2 = Math.hypot(q.x, q.y);
    if (d2 > diag) q = { x: (q.x / d2) * diag, y: (q.y / d2) * diag };
    return q;
  };

  const ir = (alvo: Ponto, instantaneo = false) => {
    if (reduzir || instantaneo) {
      px.set(alvo.x);
      py.set(alvo.y);
      return Promise.resolve();
    }
    return Promise.all([animate(px, alvo.x, MOLA), animate(py, alvo.y, MOLA)]).then(() => {});
  };

  const fechado = () => ({ x: dims.current.w, y: dims.current.h });
  const virado = () => ({ x: -dims.current.w, y: dims.current.h });

  const assentar = (novo: number) => {
    indiceRef.current = novo;
    // A troca de folhas precisa estar no DOM ANTES de a dobra desfazer: senão
    // a página velha pisca inteira por um quadro.
    flushSync(() => {
      setIndice(novo);
      setPar({ cima: novo, baixo: novo + 1 });
    });
    px.set(dims.current.w);
    py.set(dims.current.h);
    onIndexChange?.(novo);
  };

  const proxima = async () => {
    const i = indiceRef.current;
    if (ocupado.current || i >= pages.length - 1) return;
    ocupado.current = true;
    await ir(virado());
    assentar(i + 1);
    ocupado.current = false;
  };

  const anterior = async () => {
    const i = indiceRef.current;
    if (ocupado.current || i <= 0) return;
    ocupado.current = true;
    // A anterior entra virada por cima e desvira até cobrir a atual.
    flushSync(() => setPar({ cima: i - 1, baixo: i }));
    px.set(-dims.current.w);
    py.set(dims.current.h);
    await ir(fechado());
    assentar(i - 1);
    ocupado.current = false;
  };

  const gesto = React.useRef<{
    x0: number;
    y0: number;
    p0: Ponto;
    escala: number;
    t: number;
    vx: number;
    ux: number;
  } | null>(null);

  const temProxima = indice < pages.length - 1;

  return (
    <div
      role="group"
      aria-roledescription="revista"
      aria-label={label}
      className={cn("flex flex-col items-center gap-3", className)}
      {...props}
    >
      <div
        ref={folha}
        tabIndex={0}
        aria-label={`Página ${indice + 1} de ${pages.length}. Use as setas para virar.`}
        className="relative aspect-[3/4] w-60 touch-none select-none rounded-[var(--r-surface)] bg-card outline-none [box-shadow:var(--e-raised)] focus-visible:[box-shadow:var(--focus)]"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            void proxima();
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            void anterior();
          }
        }}
        onPointerMove={(e) => {
          const g = gesto.current;
          if (g) {
            const agora = performance.now();
            const dx = (e.clientX - g.x0) / g.escala;
            const dy = (e.clientY - g.y0) / g.escala;
            const dt = Math.max(1, agora - g.t);
            g.vx = (dx - g.ux) / dt;
            g.ux = dx;
            g.t = agora;
            const q = prender({ x: g.p0.x + dx, y: g.p0.y + dy });
            px.set(q.x);
            py.set(q.y);
            return;
          }
          if (ocupado.current || e.pointerType !== "mouse" || !temProxima) return;
          // Convite: o canto só levanta com o ponteiro no quarto de baixo à direita.
          const el = folha.current!;
          const r = el.getBoundingClientRect();
          const escala = r.width / (el.offsetWidth || 1);
          const lx = (e.clientX - r.left) / escala;
          const ly = (e.clientY - r.top) / escala;
          const { w, h } = dims.current;
          const perto = lx > w * 0.6 && ly > h * 0.65;
          void ir(perto ? { x: w - peek, y: h - peek } : fechado());
        }}
        onPointerLeave={() => {
          if (!gesto.current && !ocupado.current) void ir(fechado());
        }}
        // Imagem dentro da peça dispara o arrasto nativo do navegador, que cancela
        // o ponteiro no meio do gesto.
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.button !== 0 || ocupado.current || !temProxima) return;
          const el = folha.current!;
          const r = el.getBoundingClientRect();
          const escala = r.width / (el.offsetWidth || 1);
          // Só a metade direita pega a página; a esquerda é a lombada.
          if ((e.clientX - r.left) / escala < dims.current.w / 2) return;
          el.setPointerCapture(e.pointerId);
          px.stop();
          py.stop();
          gesto.current = {
            x0: e.clientX,
            y0: e.clientY,
            p0: { x: px.get(), y: py.get() },
            escala,
            t: performance.now(),
            vx: 0,
            ux: 0,
          };
        }}
        onPointerUp={async () => {
          const g = gesto.current;
          if (!g) return;
          gesto.current = null;
          const passou = px.get() < dims.current.w / 2 || g.vx < -0.6;
          if (passou) {
            ocupado.current = true;
            await ir(virado());
            assentar(indiceRef.current + 1);
            ocupado.current = false;
          } else {
            void ir(fechado());
          }
        }}
        onPointerCancel={() => {
          gesto.current = null;
          void ir(fechado());
        }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
          {/* A de baixo: já está ali, só esperando a de cima sair. */}
          {par.baixo < pages.length && (
            <div aria-hidden className="absolute inset-0" {...({ inert: "" } as object)}>
              {pages[par.baixo]}
            </div>
          )}
          <div ref={frente} className="absolute inset-0 bg-card">
            {pages[par.cima]}
          </div>
          {/* A sombra da dobra cai sobre a página de baixo: drop-shadow no
              invólucro sem transformação segue a forma refletida do verso. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              filter:
                "drop-shadow(-6px 4px 10px color-mix(in oklab, var(--foreground) 28%, transparent))",
            }}
          >
            <div
              ref={verso}
              className="absolute inset-0 origin-top-left bg-muted"
              style={{
                visibility: "hidden",
                backgroundImage:
                  "linear-gradient(110deg, color-mix(in oklab, var(--foreground) 10%, transparent), transparent 45%, color-mix(in oklab, var(--background) 60%, transparent))",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void anterior()}
          disabled={indice === 0}
          aria-label="Página anterior"
          className="inline-flex size-8 items-center justify-center rounded-[var(--r-control)] text-foreground outline-none transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-muted focus-visible:[box-shadow:var(--focus)] disabled:text-muted-foreground disabled:hover:bg-transparent"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span aria-live="polite" className="min-w-24 text-center text-sm tabular-nums text-foreground">
          {indice + 1} <span className="text-muted-foreground">de {pages.length}</span>
        </span>
        <button
          type="button"
          onClick={() => void proxima()}
          disabled={!temProxima}
          aria-label="Próxima página"
          className="inline-flex size-8 items-center justify-center rounded-[var(--r-control)] text-foreground outline-none transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-muted focus-visible:[box-shadow:var(--focus)] disabled:text-muted-foreground disabled:hover:bg-transparent"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
