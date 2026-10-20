"use client";

import * as React from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Sticker Peel — o adesivo que descola de verdade.
 *
 * Um adesivo parado é só um selo. O que faz a mão querer pegar é o canto
 * levantando quando o ponteiro chega perto: a dobra mostra o verso de papel e
 * promete que aquilo sai da página. Pegou, ele descola inteiro (sombra cresce,
 * a dobra abre mais); soltou, ele cola onde caiu.
 *
 * ── O que se vê, e o que reage a quê ───────────────────────────────────────
 *
 * - Ponteiro em cima: o canto inferior direito dobra uns 14px, e a dobra se
 *   abre na direção do ponteiro. Quanto mais perto do canto, maior a dobra.
 * - Arrastando: a dobra vai a ~25% do lado menor e a sombra sobe de
 *   `--e-raised` para uma sombra longa. Soltou, a dobra fecha em mola.
 * - Teclado: setas movem 8px (Shift, 32px). É o mesmo `onPositionChange`.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **A dobra é reflexão, não rotação 3D.** O pedaço dobrado é exatamente o
 *    triângulo do canto refletido pela linha de dobra (a mediatriz entre o
 *    canto e o ponto para onde ele foi puxado). Uma matriz 2D e dois
 *    `clip-path` resolvem, em qualquer forma: círculo, pílula, quadrado. Com
 *    `rotate3d` a dobra só fica certa a 45°.
 * 2. **O verso tem a mesma forma do adesivo** porque é uma cópia da caixa com
 *    o mesmo `radius`. Por isso o raio é prop e não classe: a frente e o verso
 *    precisam concordar.
 * 3. **Medida sem escala.** A vitrine (e muito layout de cliente) escala o
 *    palco. A geometria usa `offsetWidth`, e o ponteiro é trazido para o
 *    espaço local dividindo pela escala e desfazendo a rotação do adesivo.
 * 4. **O arrasto é nosso, não o `drag` do motion**, pelo mesmo motivo: sob
 *    `scale(0.5)` o `drag` andaria o dobro do dedo.
 * 5. **A geometria é escrita direto no DOM** a cada quadro da mola. Passar por
 *    estado do React re-renderizaria o conteúdo do adesivo 60 vezes por
 *    segundo sem mudar nada nele.
 */

type Ponto = { x: number; y: number };

/** Corta um polígono convexo pelo semiplano (p − m)·n ≤ 0 (lado > 0 se `fora`). */
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

// Mola de gesto: chega em ~250ms, sem quicar a ponto de o papel parecer borracha.
const MOLA = { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.6 };

/** Ordem de empilhamento compartilhada: o último adesivo tocado fica por cima. */
let topo = 1;

export interface StickerPeelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Nome falado do adesivo, para leitor de tela. */
  label: string;
  /** Posição inicial em px, relativa ao pai posicionado. */
  defaultPosition?: { x: number; y: number };
  /** Inclinação em graus. Adesivo colado à mão nunca fica reto. */
  rotate?: number;
  /** Raio CSS da forma, compartilhado pela frente e pelo verso. */
  radius?: string;
  /** Dobra em repouso com o ponteiro em cima, em px. */
  peel?: number;
  /** Chamado ao soltar e a cada passo de teclado. */
  onPositionChange?: (pos: { x: number; y: number }) => void;
}

export function StickerPeel({
  label,
  defaultPosition = { x: 0, y: 0 },
  rotate = 0,
  radius = "var(--r-surface)",
  peel = 14,
  onPositionChange,
  className,
  style,
  children,
  ...props
}: StickerPeelProps) {
  const reduzir = useReducedMotion();
  const raiz = React.useRef<HTMLDivElement>(null);
  const frente = React.useRef<HTMLDivElement>(null);
  const verso = React.useRef<HTMLDivElement>(null);
  const pos = React.useRef({ ...defaultPosition });
  const [z, setZ] = React.useState(0);
  const [pego, setPego] = React.useState(false);

  // Dobra = distância (px) que o canto percorre; ângulo = para onde ele vai.
  const dobra = useMotionValue(0);
  const angulo = useMotionValue(Math.PI * 1.25); // diagonal, para cima e à esquerda

  const desenhar = React.useCallback(() => {
    const el = raiz.current;
    const f = frente.current;
    const v = verso.current;
    if (!el || !f || !v) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const d = dobra.get();
    if (d < 0.5) {
      f.style.clipPath = "";
      v.style.visibility = "hidden";
      return;
    }
    // Num círculo ou pílula a quina da caixa é vazia: a dobra precisa passar
    // desse vão (0,41 do raio na diagonal, ida e volta) antes de pegar papel.
    const raio = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, Math.min(w, h) / 2);
    const alcance = d + raio * (Math.SQRT2 - 1) * 2;
    const a = angulo.get();
    const c = { x: w, y: h };
    const p = { x: c.x + Math.cos(a) * alcance, y: c.y + Math.sin(a) * alcance };
    const m = { x: (c.x + p.x) / 2, y: (c.y + p.y) / 2 };
    const n = { x: -Math.cos(a), y: -Math.sin(a) }; // aponta para o canto
    // Caixa folgada: o recorte não pode comer a borda branca nem a sombra.
    const f0 = 24;
    const caixa = [
      { x: -f0, y: -f0 },
      { x: w + f0, y: -f0 },
      { x: w + f0, y: h + f0 },
      { x: -f0, y: h + f0 },
    ];
    f.style.clipPath = poligono(cortar(caixa, m, n, false));
    v.style.clipPath = poligono(cortar(caixa, m, n, true));
    const k = m.x * n.x + m.y * n.y;
    v.style.transform = `matrix(${1 - 2 * n.x * n.x},${-2 * n.x * n.y},${-2 * n.x * n.y},${
      1 - 2 * n.y * n.y
    },${2 * k * n.x},${2 * k * n.y})`;
    v.style.visibility = "visible";
  }, [dobra, angulo]);

  React.useEffect(() => {
    const a = dobra.on("change", desenhar);
    const b = angulo.on("change", desenhar);
    return () => {
      a();
      b();
    };
  }, [dobra, angulo, desenhar]);

  const levar = (alvo: number) => {
    if (reduzir) dobra.set(alvo);
    else animate(dobra, alvo, MOLA);
  };

  /** Ponteiro em px locais do adesivo: sem escala do palco e sem a rotação. */
  const local = (e: React.PointerEvent) => {
    const el = raiz.current!;
    const r = el.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const giro = (rotate * Math.PI) / 180;
    // A escala sai da diagonal do retângulo girado contra a diagonal local.
    const larguraGirada = w * Math.abs(Math.cos(giro)) + h * Math.abs(Math.sin(giro));
    const escala = r.width / (larguraGirada || 1);
    const dx = (e.clientX - (r.left + r.width / 2)) / escala;
    const dy = (e.clientY - (r.top + r.height / 2)) / escala;
    return {
      x: dx * Math.cos(-giro) - dy * Math.sin(-giro) + w / 2,
      y: dx * Math.sin(-giro) + dy * Math.cos(-giro) + h / 2,
      escala,
      w,
      h,
    };
  };

  const mirar = (l: { x: number; y: number; w: number; h: number }, base: number) => {
    const vx = l.x - l.w;
    const vy = l.y - l.h;
    const dist = Math.hypot(vx, vy);
    if (dist > 4) angulo.set(Math.atan2(vy, vx));
    // Perto do canto a dobra cresce até o dobro do repouso.
    const perto = Math.max(0, 1 - dist / Math.max(l.w, l.h));
    return base * (1 + perto);
  };

  const arrasto = React.useRef<{ x: number; y: number; px: number; py: number; escala: number } | null>(
    null,
  );

  const mover = (x: number, y: number) => {
    pos.current = { x, y };
    if (raiz.current) {
      raiz.current.style.left = `${x}px`;
      raiz.current.style.top = `${y}px`;
    }
  };

  return (
    <div
      ref={raiz}
      role="button"
      tabIndex={0}
      aria-roledescription="adesivo arrastável"
      aria-label={label}
      className={cn(
        "absolute touch-none select-none outline-none focus-visible:[box-shadow:var(--focus)]",
        pego ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      style={{
        left: defaultPosition.x,
        top: defaultPosition.y,
        rotate: `${rotate}deg`,
        borderRadius: radius,
        zIndex: z,
        ...style,
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") levar(peel);
      }}
      onPointerMove={(e) => {
        const l = local(e);
        const g = arrasto.current;
        if (g) {
          mover(g.x + (e.clientX - g.px) / g.escala, g.y + (e.clientY - g.py) / g.escala);
          mirar(l, 0);
          return;
        }
        if (e.pointerType === "mouse") levar(mirar(l, peel));
      }}
      onPointerLeave={() => {
        if (!arrasto.current) levar(0);
      }}
      // Imagem dentro da peça dispara o arrasto nativo do navegador, que cancela
      // o ponteiro no meio do gesto.
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        const l = local(e);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        arrasto.current = { ...pos.current, px: e.clientX, py: e.clientY, escala: l.escala };
        setZ(++topo);
        setPego(true);
        mirar(l, 0);
        levar(Math.min(l.w, l.h) * 0.25);
      }}
      onPointerUp={(e) => {
        if (!arrasto.current) return;
        arrasto.current = null;
        setPego(false);
        levar(e.pointerType === "mouse" ? peel : 0);
        onPositionChange?.(pos.current);
      }}
      onPointerCancel={() => {
        arrasto.current = null;
        setPego(false);
        levar(0);
      }}
      onKeyDown={(e) => {
        const passo = e.shiftKey ? 32 : 8;
        const d = {
          ArrowLeft: [-passo, 0],
          ArrowRight: [passo, 0],
          ArrowUp: [0, -passo],
          ArrowDown: [0, passo],
        }[e.key];
        if (!d) return;
        e.preventDefault();
        setZ(++topo);
        mover(pos.current.x + d[0], pos.current.y + d[1]);
        onPositionChange?.(pos.current);
      }}
      {...props}
    >
      {/* Sombra separada da frente: o recorte da dobra não pode cortá-la. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [box-shadow:var(--e-raised)] transition-[box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)]"
        style={{
          borderRadius: radius,
          boxShadow: pego
            ? "0 18px 32px -10px color-mix(in oklab, var(--foreground) 35%, transparent)"
            : undefined,
        }}
      />
      <div ref={frente} className="relative" style={{ borderRadius: radius }}>
        {children}
      </div>
      {/* O verso: a mesma caixa, cor de papel, refletida pela linha de dobra. */}
      <div
        ref={verso}
        aria-hidden
        className="pointer-events-none absolute inset-0 origin-top-left bg-muted"
        style={{
          borderRadius: radius,
          visibility: "hidden",
          backgroundImage:
            "linear-gradient(135deg, color-mix(in oklab, var(--foreground) 14%, transparent), transparent 60%)",
          boxShadow: "0 0 0 1px var(--border)",
        }}
      />
    </div>
  );
}
