"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Magnetic Select — um cacho de opções redondas onde a escolhida incha e as
 * outras abrem caminho; o cursor puxa a opção que está debaixo dele.
 *
 * Serve para escolha curta e visual (humor, cor, categoria, reação), em que um
 * `<select>` esconde demais e uma fileira de botões não diz "uma só". O cacho
 * diz: a escolhida ocupa o espaço de verdade, e as vizinhas se afastam dela.
 *
 * ── Decisões ───────────────────────────────────────────────────────────────
 *
 * 1. **O indicador é a própria opção.** Não há pílula correndo por trás: a
 *    escolhida cresce e veste a marca (`--brand` de fundo). Cresce por `scale`,
 *    e por isso o empurrão das vizinhas é calculado à parte — `scale` não mexe
 *    no layout de ninguém.
 * 2. **O empurrão é geometria, não layout.** Cada opção tem um lugar no cacho
 *    (centro + anel). Com a escolhida inchada, umas poucas passadas de
 *    relaxamento separam qualquer par que se sobreponha. A escolhida não sai do
 *    lugar: quem cede são as outras.
 * 3. **O ímã é só hover.** A opção sob o ponteiro anda uma fração da distância
 *    até ele (`pull`). Sem ponteiro fino (toque) não há ímã, há só o toque.
 * 4. **É um `radiogroup` de verdade.** Uma parada de Tab; setas trocam a
 *    escolha, Home/End vão às pontas. O rótulo da escolhida fica embaixo, numa
 *    região `aria-live`, porque um círculo com ícone não se explica sozinho.
 *
 * Com movimento reduzido tudo chega no lugar sem mola.
 */

export interface MagneticOption {
  value: string;
  label: string;
  /** Ícone (lucide-react, por exemplo). Sem ícone, a inicial do rótulo. */
  icon?: React.ReactNode;
}

export interface MagneticSelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  options: MagneticOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Diâmetro das opções em repouso. */
  size?: "sm" | "lg";
  /** 0–100. Quanto a opção sob o cursor é puxada até ele. */
  pull?: number;
  /** 0–100. Balanço da mola ao assentar. */
  bounce?: number;
  /** 0–100. O quanto a escolhida incha (e empurra as outras). */
  swell?: number;
  /** Contorno nas opções em repouso, para fundos onde `bg-card` some. */
  stroke?: boolean;
  /** Nome do grupo para leitor de tela. */
  label?: string;
}

type Ponto = { x: number; y: number };

/** Centro + anel. Com uma opção só, só o centro. */
function lugares(n: number, passo: number): Ponto[] {
  if (n <= 0) return [];
  const out: Ponto[] = [{ x: 0, y: 0 }];
  const anel = n - 1;
  for (let i = 0; i < anel; i++) {
    const a = -Math.PI / 2 + (i / anel) * Math.PI * 2 + Math.PI / anel;
    out.push({ x: Math.cos(a) * passo, y: Math.sin(a) * passo });
  }
  return out;
}

/** Separa pares sobrepostos; a escolhida (`fixa`) nunca se move. */
function relaxar(base: Ponto[], raios: number[], fixa: number, folga: number): Ponto[] {
  const p = base.map((b) => ({ ...b }));
  for (let it = 0; it < 12; it++) {
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const dx = p[j].x - p[i].x;
        const dy = p[j].y - p[i].y;
        const d = Math.hypot(dx, dy) || 0.001;
        const min = raios[i] + raios[j] + folga;
        if (d >= min) continue;
        const ux = dx / d;
        const uy = dy / d;
        const falta = min - d;
        // Quem é fixo não cede; entre dois livres, cada um cede metade.
        const wi = i === fixa ? 0 : j === fixa ? 1 : 0.5;
        const wj = 1 - wi;
        p[i].x -= ux * falta * wi;
        p[i].y -= uy * falta * wi;
        p[j].x += ux * falta * wj;
        p[j].y += uy * falta * wj;
      }
    }
  }
  return p;
}

export function MagneticSelect({
  options,
  value,
  defaultValue,
  onValueChange,
  size = "lg",
  pull = 55,
  bounce = 55,
  swell = 50,
  stroke = false,
  label = "Escolha uma opção",
  className,
  ...props
}: MagneticSelectProps) {
  const reduzir = useReducedMotion() ?? false;
  const [interno, setInterno] = React.useState(defaultValue ?? options[0]?.value);
  const atual = value ?? interno;
  const iAtual = Math.max(0, options.findIndex((o) => o.value === atual));

  const [ima, setIma] = React.useState<{ i: number; dx: number; dy: number } | null>(null);
  const botoes = React.useRef<(HTMLButtonElement | null)[]>([]);

  const d = size === "lg" ? 48 : 36;
  const r = d / 2;
  const escala = 1.3 + (swell / 100) * 0.7;
  const folga = d * 0.14;
  const passo = d + folga;

  const base = React.useMemo(() => lugares(options.length, passo), [options.length, passo]);
  const raios = options.map((_, i) => (i === iAtual ? r * escala : r));
  const pos = relaxar(base, raios, iAtual, folga);

  // A caixa é o pior caso entre TODAS as escolhas possíveis, não a atual: se
  // ela acompanhasse a escolha, trocar de opção empurraria a página.
  const lado = React.useMemo(() => {
    let meia = r;
    for (let s = 0; s < base.length; s++) {
      const rs = base.map((_, i) => (i === s ? r * escala : r));
      relaxar(base, rs, s, folga).forEach((q, i) => {
        meia = Math.max(meia, Math.abs(q.x) + rs[i], Math.abs(q.y) + rs[i]);
      });
    }
    return Math.ceil(meia * 2 + d * 0.3);
  }, [base, r, escala, folga, d]);

  const mola = reduzir
    ? { duration: 0 }
    : {
        type: "spring" as const,
        stiffness: 420,
        damping: 2 * Math.sqrt(420) * (1 - (bounce / 100) * 0.65),
      };

  const escolher = (i: number, focar = false) => {
    const o = options[i];
    if (!o) return;
    if (value === undefined) setInterno(o.value);
    onValueChange?.(o.value);
    if (focar) botoes.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = options.length;
    const mapa: Record<string, number> = {
      ArrowRight: (iAtual + 1) % n,
      ArrowDown: (iAtual + 1) % n,
      ArrowLeft: (iAtual - 1 + n) % n,
      ArrowUp: (iAtual - 1 + n) % n,
      Home: 0,
      End: n - 1,
    };
    if (!(e.key in mapa)) return;
    // As setas são do grupo: sem parar aqui, um atalho de página (galeria,
    // carrossel) ouvindo no `document` também anda e rouba o foco.
    e.preventDefault();
    e.stopPropagation();
    escolher(mapa[e.key], true);
  };

  return (
    <div className={cn("inline-flex flex-col items-center gap-3", className)} {...props}>
      <div
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="relative"
        style={{ width: lado, height: lado }}
      >
        {options.map((o, i) => {
          const on = i === iAtual;
          const puxe = ima && ima.i === i ? ima : null;
          return (
            <motion.button
              key={o.value}
              ref={(el) => {
                botoes.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.label}
              tabIndex={on ? 0 : -1}
              data-state={on ? "on" : "off"}
              onClick={() => escolher(i)}
              onPointerMove={(e) => {
                if (e.pointerType !== "mouse" || pull === 0) return;
                const b = e.currentTarget.getBoundingClientRect();
                const k = (pull / 100) * 0.45;
                setIma({
                  i,
                  dx: (e.clientX - (b.left + b.width / 2)) * k,
                  dy: (e.clientY - (b.top + b.height / 2)) * k,
                });
              }}
              onPointerLeave={() => setIma((m) => (m?.i === i ? null : m))}
              initial={false}
              animate={{
                x: pos[i].x + (puxe?.dx ?? 0),
                y: pos[i].y + (puxe?.dy ?? 0),
                scale: on ? escala : 1,
              }}
              whileTap={reduzir ? undefined : { scale: (on ? escala : 1) * 0.92 }}
              transition={mola}
              className={cn(
                "absolute left-1/2 top-1/2 grid place-items-center rounded-[var(--r-pill)] outline-none",
                "transition-[background-color,border-color,color] [transition-duration:var(--dur-fast)] ease-[var(--ease-out)]",
                "focus-visible:[box-shadow:var(--focus)]",
                on
                  ? "z-10 border border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)] [box-shadow:var(--e-raised)]"
                  : cn(
                      "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                      stroke ? "border border-border" : "border border-transparent",
                    ),
              )}
              style={{ width: d, height: d, marginLeft: -r, marginTop: -r }}
            >
              <span aria-hidden="true" className="grid place-items-center [&>svg]:size-[45%]" style={{ width: d, height: d }}>
                {o.icon ?? (
                  <span className="text-[length:var(--text-corpo,0.8125rem)] font-semibold">
                    {o.label.slice(0, 1)}
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
      <span
        aria-live="polite"
        className="text-[length:var(--text-corpo,0.8125rem)] font-medium text-foreground"
      >
        {options[iAtual]?.label}
      </span>
    </div>
  );
}
