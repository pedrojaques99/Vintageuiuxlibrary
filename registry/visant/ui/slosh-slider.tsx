"use client";

import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";

import { playSfx } from "@/lib/sfx-bus";
import { cn } from "@/lib/utils";

/**
 * Slosh Slider — o slider cujo preenchimento tem peso, como líquido num tubo.
 *
 * Um slider de volume, de intensidade, de "quanto" responde igual a qualquer
 * outro: o preenchimento cola no polegar e para seco. Aqui o polegar continua
 * exato (o valor é o que o dedo marcou), mas o preenchimento vem atrás com
 * inércia: arrastou rápido, ele passa do polegar, volta, e assenta. A borda
 * dele inclina conforme a velocidade, como a superfície de um líquido
 * chacoalhado. É controle de trabalho com um pouco de corpo, não brinquedo:
 * o número nunca mente, só a tinta balança.
 *
 * ── Decisões que não se veem de primeira ──────────────────────────────────
 *
 * 1. **Duas posições, uma verdade.** O polegar é o valor; o preenchimento é
 *    uma mola que PERSEGUE o polegar. Por isso o balanço não atrasa nem
 *    arredonda o valor, e o consumidor recebe `onValueChange` no ritmo do dedo.
 * 2. **Tudo em porcentagem, nada medido por quadro.** Posição e inclinação são
 *    motion values que viram um `clip-path` em `calc(% ± px)`. A única medida
 *    é o retângulo do trilho no evento de ponteiro, que é quando ele importa.
 * 3. **A inclinação vem da velocidade da mola, com teto.** Sem teto, um
 *    arremesso de ponta a ponta virava uma cunha atravessando o trilho.
 *    `tilt` é o desvio máximo da borda, em px, de cima até embaixo.
 * 4. **`viscosity` é o amortecimento.** Baixo, a tinta balança duas, três
 *    vezes; alto, assenta de uma vez, quase como slider comum.
 * 5. **O teclado também chacoalha.** Setas andam um `step`, Page anda dez,
 *    Home/End vão às pontas, e o pulo do polegar faz a tinta correr atrás.
 *
 * `prefers-reduced-motion`: a tinta cola no polegar, sem balanço e sem
 * inclinação.
 */

export interface SloshSliderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Rótulo visível; também nomeia o polegar pra leitor de tela. */
  label: string;
  /** Valor controlado. Sem ele, o slider guarda o próprio estado. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Amortecimento da tinta: baixo balança mais, alto assenta logo. */
  viscosity?: number;
  /** Inclinação máxima da borda da tinta, em px. 0 deixa a borda reta. */
  tilt?: number;
  /** Formata o número exibido ao lado do rótulo. */
  format?: (value: number) => string;
}

/** Meia largura do polegar, em px: o recuo da pista em cada ponta. */
const RESPIRO = 12;
/** Dentes do anel de foco no curso inteiro: um `focus` a cada dente cruzado no arrasto. */
const DENTES = 40;
const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const casas = (v: number) => (String(v).split(".")[1] ?? "").length;

export function SloshSlider({
  label,
  value: valueProp,
  defaultValue = 50,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  viscosity = 9,
  tilt = 14,
  format,
  className,
  ...props
}: SloshSliderProps) {
  const reduzir = useReducedMotion();
  const id = React.useId();
  const trilho = React.useRef<HTMLDivElement>(null);
  const [interno, setInterno] = React.useState(defaultValue);
  const valor = limitar(valueProp ?? interno, min, max);
  const pct = (v: number) => ((v - min) / (max - min || 1)) * 100;

  // O polegar: a verdade, em %.
  const polegar = useMotionValue(pct(valor));
  // A tinta: persegue o polegar com massa. `restDelta` baixo pra não parar torta.
  const tinta = useSpring(polegar, {
    stiffness: 210,
    damping: Math.max(2, viscosity),
    mass: 1,
    restDelta: 0.01,
  });
  const velocidade = useVelocity(tinta);
  // %/s → px de desvio da borda, com teto. Sinal: a crista vai na frente.
  const desvio = useTransform(velocidade, (v) =>
    reduzir ? 0 : limitar(v * 0.06, -tilt, tilt),
  );
  const borda = useTransform(() => (reduzir ? polegar.get() : tinta.get()));
  // A pista útil desconta meia largura de polegar em cada ponta: em 0 e em 100
  // o polegar fica inteiro dentro do trilho, e a tinta acompanha a mesma régua.
  const recorte = useMotionTemplate`polygon(0 0, calc(${RESPIRO}px + (100% - ${2 * RESPIRO}px) * ${borda} / 100 + ${desvio}px) 0, calc(${RESPIRO}px + (100% - ${2 * RESPIRO}px) * ${borda} / 100 - ${desvio}px) 100%, 0 100%)`;
  const esquerda = useMotionTemplate`calc(${RESPIRO}px + (100% - ${2 * RESPIRO}px) * ${polegar} / 100)`;

  React.useEffect(() => {
    polegar.set(pct(valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, min, max]);

  const definir = (cru: number) => {
    const n = limitar(Math.round((cru - min) / step) * step + min, min, max);
    const v = Number(n.toFixed(casas(step)));
    if (v === valor) return;
    if (valueProp === undefined) setInterno(v);
    onValueChange?.(v);
  };

  const doPonteiro = (clientX: number) => {
    const r = trilho.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    const util = r.width - 2 * RESPIRO;
    if (util <= 0) return;
    const fracao = limitar((clientX - r.left - RESPIRO) / util, 0, 1);
    // Som de anel de foco girando: só quando o arrasto cruza um dente novo.
    const d = Math.round(fracao * DENTES);
    if (dente.current !== null && d !== dente.current) playSfx("focus");
    dente.current = d;
    definir(min + fracao * (max - min));
  };

  const arrastando = React.useRef(false);
  const dente = React.useRef<number | null>(null);

  const teclas = (e: React.KeyboardEvent) => {
    const grande = step * 10;
    const mapa: Record<string, number> = {
      ArrowRight: valor + step,
      ArrowUp: valor + step,
      ArrowLeft: valor - step,
      ArrowDown: valor - step,
      PageUp: valor + grande,
      PageDown: valor - grande,
      Home: min,
      End: max,
    };
    if (!(e.key in mapa)) return;
    e.preventDefault();
    definir(mapa[e.key]);
  };

  const texto = format ? format(valor) : String(valor);

  return (
    <div {...props} className={cn("flex w-full flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id={`${id}-rotulo`} className="font-medium text-foreground">
          {label}
        </span>
        <span className="tabular-nums text-muted-foreground">{texto}</span>
      </div>

      <div
        ref={trilho}
        className="relative h-11 cursor-pointer touch-none select-none overflow-hidden rounded-[var(--r-pill)] bg-muted"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          arrastando.current = true;
          dente.current = null;
          e.currentTarget.setPointerCapture(e.pointerId);
          doPonteiro(e.clientX);
          // O foco vai pro polegar, pra que as setas continuem de onde o dedo parou.
          // `focusVisible: false`: foco vindo de ponteiro não acende o anel.
          (e.currentTarget.querySelector('[role="slider"]') as HTMLElement | null)?.focus({
            preventScroll: true,
            focusVisible: false,
          } as FocusOptions);
          e.preventDefault();
        }}
        onPointerMove={(e) => {
          if (arrastando.current) doPonteiro(e.clientX);
        }}
        onPointerUp={() => {
          arrastando.current = false;
        }}
        onPointerCancel={() => {
          arrastando.current = false;
        }}
      >
        <motion.div
          aria-hidden
          className="absolute inset-0 bg-[var(--brand)]"
          style={{ clipPath: recorte }}
        />

        <motion.div
          role="slider"
          tabIndex={0}
          aria-labelledby={`${id}-rotulo`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valor}
          aria-valuetext={texto}
          aria-orientation="horizontal"
          onKeyDown={teclas}
          // inset-y-1: o anel de foco (4px) cabe dentro do trilho, que recorta tudo o que passa da pílula.
          className="absolute inset-y-1 grid w-6 -translate-x-1/2 place-items-center rounded-[var(--r-control)] outline-none focus-visible:[box-shadow:var(--focus)]"
          style={{ left: esquerda }}
        >
          <span className="h-5 w-1 rounded-[var(--r-pill)] bg-foreground" />
        </motion.div>
      </div>
    </div>
  );
}
