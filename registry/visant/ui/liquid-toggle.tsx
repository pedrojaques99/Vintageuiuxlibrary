"use client";

import * as React from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Liquid Toggle — o interruptor cuja bolinha escorre de um lado ao outro.
 *
 * Um switch comum desliza um círculo rígido. Aqui a bolinha se comporta como
 * gota: a frente sai primeiro, o fundo vem atrás, ela se alonga no meio do
 * caminho e se recolhe ao chegar. O estado é o mesmo de qualquer switch; o que
 * muda é que a troca TEM peso, e o olho lê a direção antes de ler a cor.
 *
 * ── Como a gota é feita ────────────────────────────────────────────────────
 *
 * Não há forma animada nem SVG. A bolinha é uma pílula definida por DUAS
 * bordas, cada uma com a sua mola: a borda da frente usa a mola rápida, a de
 * trás a lenta. A largura é a distância entre elas, e é dela que sai o
 * alongamento — ninguém anima "esticar", ele acontece porque as duas molas
 * chegam em tempos diferentes. `stretch` só afasta as duas rigidezes.
 *
 * A altura encolhe na mesma proporção em que a largura cresce (volume quase
 * constante), senão a gota vira um retângulo inchado.
 *
 * Com movimento reduzido as duas bordas saltam juntas: o estado final chega,
 * sem viagem.
 */

export interface LiquidToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
  /** Controlado. */
  checked?: boolean;
  /** Estado inicial quando não controlado. */
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** 0–100. Rapidez da mola da frente. */
  speed?: number;
  /** 0–100. O quanto a gota se alonga no caminho. */
  stretch?: number;
  /** Contorno na trilha, para fundos onde o `bg-muted` some. */
  stroke?: boolean;
}

// Medidas da trilha, em px. A gota é um círculo de `D` com folga `P`.
const W = 56;
const H = 32;
const P = 3;
const D = H - P * 2;
const CURSO = W - P * 2 - D;

export function LiquidToggle({
  checked,
  defaultChecked = false,
  onCheckedChange,
  speed = 50,
  stretch = 50,
  stroke = false,
  disabled,
  className,
  onClick,
  ...props
}: LiquidToggleProps) {
  const reduzir = useReducedMotion() ?? false;
  const [interno, setInterno] = React.useState(defaultChecked);
  const ligado = checked ?? interno;

  // As duas bordas da gota, em px a partir da folga esquerda.
  const esq = useMotionValue(ligado ? CURSO : 0);
  const dir = useMotionValue(ligado ? CURSO + D : D);
  const largura = useTransform(() => dir.get() - esq.get());
  const altura = useTransform(largura, (w) => D * Math.pow(D / Math.max(D, w), 0.45));

  const primeira = React.useRef(true);
  React.useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const alvoEsq = ligado ? CURSO : 0;
    const alvoDir = alvoEsq + D;
    if (reduzir) {
      esq.jump(alvoEsq);
      dir.jump(alvoDir);
      return;
    }
    // Frente rápida, fundo lento: a diferença entre as duas é o alongamento.
    const rigida = 380 + (speed / 100) * 620;
    const mole = rigida * Math.pow(1 - (stretch / 100) * 0.95, 2.2);
    const frente = { type: "spring" as const, stiffness: rigida, damping: 2 * Math.sqrt(rigida) * 0.72 };
    const fundo = { type: "spring" as const, stiffness: mole, damping: 2 * Math.sqrt(mole) * 0.8 };
    const a = animate(dir, alvoDir, ligado ? frente : fundo);
    const b = animate(esq, alvoEsq, ligado ? fundo : frente);
    return () => {
      a.stop();
      b.stop();
    };
  }, [ligado, reduzir, speed, stretch, esq, dir]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      data-state={ligado ? "on" : "off"}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        const novo = !ligado;
        if (checked === undefined) setInterno(novo);
        onCheckedChange?.(novo);
      }}
      className={cn(
        "group relative inline-flex flex-none items-center rounded-[var(--r-pill)] outline-none",
        "bg-muted transition-[background-color,border-color] [transition-duration:var(--dur-base)] ease-[var(--ease-out)]",
        "data-[state=on]:bg-[var(--brand)]",
        "focus-visible:[box-shadow:var(--focus)] disabled:cursor-not-allowed disabled:opacity-50",
        stroke ? "border border-border data-[state=on]:border-[var(--brand)]" : "border border-transparent",
        className,
      )}
      style={{ width: W, height: H }}
      {...props}
    >
      <motion.span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 block rounded-[var(--r-pill)] [box-shadow:var(--e-raised)]",
          // A gota pinta com o par da trilha: `--brand-foreground` sobre a marca
          // (contraste garantido pelo tema) e `--muted-foreground` sobre o cinza.
          // `bg-background` some no escuro, onde trilha e gota ficam quase iguais.
          "bg-muted-foreground transition-[background-color] [transition-duration:var(--dur-base)] ease-[var(--ease-out)]",
          "group-data-[state=on]:bg-[var(--brand-foreground)]",
        )}
        style={{ left: P - 1, x: esq, width: largura, height: altura, y: "-50%" }}
      />
    </button>
  );
}
