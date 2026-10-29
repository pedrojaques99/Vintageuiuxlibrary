"use client";

import * as React from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Time Dial — o relógio de 24 horas que se escolhe girando.
 *
 * Seletor de hora em lista suspensa responde "que horas", e só. Quando a
 * pergunta é "que horas PRA TODO MUNDO" (a reunião com o time em Lisboa, o
 * lançamento que cai de madrugada no cliente de Tóquio), a hora precisa de
 * lugar no dia: manhã, expediente, noite. O mostrador dá isso de graça, porque
 * o ângulo É o momento do dia.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **Meio-dia em cima, meia-noite embaixo.** É o caminho do sol: seis da
 *    manhã à esquerda, seis da tarde à direita. Um relógio de 12h com
 *    meio-dia no topo leria como ponteiro de parede e mentiria sobre o dia.
 * 2. **A faixa de expediente é desenhada no aro** (`band`), com a cor da marca
 *    como fundo translúcido. Ver se o ponteiro está dentro dela é a resposta
 *    que a peça existe pra dar; o número no centro só confirma.
 * 3. **O giro acumula.** O ângulo exibido é um contador sem teto: passar da
 *    meia-noite soma, não salta 360° para trás. Sem isso o ponteiro dá uma
 *    volta inteira ao contrário a cada virada de dia.
 * 4. **Ângulo não sofre com a escala da vitrine.** O `atan2` usa o centro medido
 *    na tela e o ponteiro, e a razão entre eles é a mesma com ou sem `scale`.
 * 5. **Teclado de slider de verdade:** o ponteiro é `role="slider"` com valor em
 *    minutos e texto "17:45". Setas andam `step`, PageUp/PageDown uma hora,
 *    Home/End vão à meia-noite e ao último passo.
 * 6. **O valor sai pronto pra uso** (minutos desde 00:00); fuso e cidade são
 *    conta de quem consome, como a demo mostra. A peça não carrega tabela de
 *    fuso que envelhece.
 */

export interface TimeDialProps {
  /** Minutos desde 00:00 (0 a 1439). Controlado. */
  value?: number;
  /** Valor inicial quando não controlado. */
  defaultValue?: number;
  onValueChange?: (minutes: number) => void;
  /** Passo em minutos, no gesto e nas setas. */
  step?: number;
  /** Faixa destacada no aro, em minutos: `[540, 1080]` = 9h às 18h. */
  band?: [number, number];
  /** Linha pequena embaixo da hora: a cidade, o dia. */
  caption?: React.ReactNode;
  /** Nome acessível do ponteiro. */
  label?: string;
  /** Diâmetro em px. */
  size?: number;
  className?: string;
}

const DIA = 1440;

const norm = (m: number) => ((m % DIA) + DIA) % DIA;
/** Minutos → graus a partir do topo, sentido horário (meio-dia = 0°). */
const grau = (m: number) => ((m - 720) / DIA) * 360;
/** Minutos desde 00:00 em "17:45". */
export const formatDialTime = (m: number) => {
  const v = norm(Math.round(m));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};

const MARCAS = [
  { m: 720, t: "12h" },
  { m: 1080, t: "18h" },
  { m: 0, t: "0h" },
  { m: 360, t: "6h" },
];

export function TimeDial({
  value,
  defaultValue = 540,
  onValueChange,
  step = 15,
  band,
  caption,
  label = "Hora",
  size = 240,
  className,
}: TimeDialProps) {
  const reduzir = useReducedMotion();
  const [interno, setInterno] = React.useState(() => norm(defaultValue));
  const atual = value !== undefined ? norm(value) : interno;
  const atualRef = React.useRef(atual);
  atualRef.current = atual;

  const caixaRef = React.useRef<HTMLDivElement>(null);
  const arrastando = React.useRef(false);
  // Rotação exibida, acumulada (ver decisão 3).
  const giro = useMotionValue(grau(atual));
  const giroAlvo = React.useRef(grau(atual));

  // Segue o valor com o menor arco a partir de onde o ponteiro está.
  React.useEffect(() => {
    const alvo = grau(atual);
    const delta = ((((alvo - giroAlvo.current) % 360) + 540) % 360) - 180;
    giroAlvo.current += delta;
    if (arrastando.current || reduzir) giro.set(giroAlvo.current);
    else animate(giro, giroAlvo.current, { type: "spring", visualDuration: 0.25, bounce: 0.1 });
  }, [atual, giro, reduzir]);

  const definir = (m: number) => {
    const next = norm(Math.round(m / step) * step);
    if (next === atualRef.current) return;
    if (value === undefined) setInterno(next);
    onValueChange?.(next);
  };

  const doPonteiro = (cx: number, cy: number) => {
    const el = caixaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const a = (Math.atan2(cx - (r.left + r.width / 2), -(cy - (r.top + r.height / 2))) * 180) / Math.PI;
    definir(720 + (a / 360) * DIA);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const m = atualRef.current;
    const mapa: Record<string, number> = {
      ArrowRight: m + step,
      ArrowUp: m + step,
      ArrowLeft: m - step,
      ArrowDown: m - step,
      PageUp: m + 60,
      PageDown: m - 60,
      Home: 0,
      End: DIA - step,
    };
    if (e.key in mapa) {
      e.preventDefault();
      definir(mapa[e.key]);
    }
  };

  // Faixa no aro: um conic-gradient recortado por máscara radial. Sem SVG.
  const faixa = band
    ? (() => {
        const ini = grau(band[0]);
        const vao = ((((band[1] - band[0]) % DIA) + DIA) % DIA) * (360 / DIA);
        return `conic-gradient(from ${ini}deg, color-mix(in oklab, var(--brand) 28%, transparent) 0deg ${vao}deg, transparent ${vao}deg)`;
      })()
    : undefined;

  const R = size / 2;

  return (
    <div
      ref={caixaRef}
      className={cn("relative shrink-0 touch-none select-none rounded-full", className)}
      style={{ width: size, height: size }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        arrastando.current = true;
        doPonteiro(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => arrastando.current && doPonteiro(e.clientX, e.clientY)}
      onPointerUp={() => (arrastando.current = false)}
      onPointerCancel={() => (arrastando.current = false)}
    >
      {/* Disco */}
      <div className="absolute inset-0 rounded-full border border-border bg-card [box-shadow:var(--e-raised)]" />
      {faixa && (
        <div
          aria-hidden="true"
          className="absolute inset-[6px] rounded-full"
          style={{
            background: faixa,
            mask: "radial-gradient(circle, transparent 58%, black 58.5%)",
            WebkitMask: "radial-gradient(circle, transparent 58%, black 58.5%)",
          }}
        />
      )}

      {/* 96 marcas de 15 min; a hora cheia é mais longa, a cada 6h mais ainda. */}
      {Array.from({ length: 96 }, (_, i) => {
        const hora = i % 4 === 0;
        const seis = i % 24 === 0;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={cn("absolute left-1/2 top-0 w-px origin-bottom", hora ? "bg-muted-foreground" : "bg-border")}
            style={{
              height: R,
              transform: `translateX(-50%) rotate(${i * 3.75}deg)`,
              clipPath: `inset(4px 0 ${R - (seis ? 16 : hora ? 11 : 8)}px 0)`,
            }}
          />
        );
      })}
      {MARCAS.map(({ m, t }) => {
        const a = (grau(m) * Math.PI) / 180;
        const d = R - 30;
        return (
          <span
            key={t}
            aria-hidden="true"
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
            style={{ left: R + Math.sin(a) * d, top: R - Math.cos(a) * d }}
          >
            {t}
          </span>
        );
      })}

      {/* Centro */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-[34px] font-medium leading-none tabular-nums text-foreground">{formatDialTime(atual)}</span>
        {caption && <span className="text-xs text-muted-foreground">{caption}</span>}
      </div>

      {/* Ponteiro: a haste e a pega giram juntas. */}
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ rotate: giro }}>
        <span className="absolute left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-foreground" style={{ top: 22, height: R - 66 }} />
      </motion.div>
      <motion.div className="pointer-events-none absolute inset-0" style={{ rotate: giro }}>
        <div
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={DIA - step}
          aria-valuenow={atual}
          aria-valuetext={formatDialTime(atual)}
          onKeyDown={onKeyDown}
          className={cn(
            "pointer-events-auto absolute left-1/2 top-[6px] size-8 -translate-x-1/2 cursor-grab rounded-full border-2 border-background bg-[var(--brand)] [box-shadow:var(--e-raised)] active:cursor-grabbing",
            "focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
          )}
        />
      </motion.div>
    </div>
  );
}
