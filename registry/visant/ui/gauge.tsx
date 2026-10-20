"use client";

/* Adaptado de Gauge — https://uiarc.dev/components/gauge — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui). */

import * as React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Gauge — um valor contra uma faixa conhecida, com o estado escrito por extenso.
 *
 * Serve pra cota de disco, saúde de conta, ocupação de agenda: um número que só
 * faz sentido contra o teto. Não é barra de progresso de tarefa (isso tem fim) e
 * não é painel de várias metas (isso pede vários medidores ou uma tabela).
 *
 * ── As decisões que não são óbvias ─────────────────────────────────────────
 *
 * 1. **O arco é a marca, o alerta é a exceção.** O traço sai em `var(--brand)`;
 *    só a faixa marcada com `alert` troca pra `--destructive`. Cor nunca carrega
 *    o estado sozinha: o nome da faixa ("Quase cheio") aparece escrito embaixo
 *    do número, em cor de texto, com um ponto da cor do arco ao lado.
 * 2. **O ponteiro cruza o anel.** Um risco curto em `--foreground` atravessa o
 *    traço no ponto do valor. É o que deixa ler o medidor quando a marca do
 *    cliente é clara demais pra contrastar com a trilha.
 * 3. **O estado troca quando a contagem cruza o limite, não antes.** A faixa
 *    acompanha o número que está na tela durante o enchimento, então a cor e o
 *    nome mudam exatamente na passagem. Mudar tudo no primeiro quadro entregaria
 *    o desfecho antes do gesto.
 * 4. **Enche uma vez, quando metade dele entra em vista**, e depois só reage a
 *    valor novo. Com `prefers-reduced-motion` o valor chega pronto.
 * 5. **Os dígitos ficam alinhados à direita numa caixa do tamanho do valor
 *    final**, pra coluna das unidades não pular enquanto conta.
 */

export interface GaugeBand {
  /** Valor (na escala de `min`..`max`) onde a faixa começa. */
  from: number;
  /** Nome do estado, escrito na tela. */
  label: string;
  /** Faixa de alerta: o arco troca pra `--destructive`. */
  alert?: boolean;
}

export interface GaugeProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Valor atual, entre `min` e `max`. */
  value: number;
  min?: number;
  max?: number;
  /** O que está sendo medido. Vira o nome acessível. */
  label: string;
  /** Qualificador: a régua em palavras ("360 de 500 GB"). */
  detail?: string;
  /** Faixas por valor inicial. A maior faixa alcançada dá o nome e a cor. */
  bands?: GaugeBand[];
  /** Largura máxima do anel, em px. */
  size?: number;
}

// Anel de 270° aberto embaixo, desenhado no sentido horário a partir da ponta esquerda.
const RAIO = 42;
const INICIO = -135;
const VAO = 270;

const ponto = (angulo: number, r: number) => {
  const rad = (angulo * Math.PI) / 180;
  return [50 + r * Math.sin(rad), 50 - r * Math.cos(rad)] as const;
};

function arco(fracao: number) {
  const fim = INICIO + VAO * Math.min(1, Math.max(0, fracao));
  const [x0, y0] = ponto(INICIO, RAIO);
  const [x1, y1] = ponto(fim, RAIO);
  return `M ${x0.toFixed(3)} ${y0.toFixed(3)} A ${RAIO} ${RAIO} 0 ${fim - INICIO > 180 ? 1 : 0} 1 ${x1.toFixed(3)} ${y1.toFixed(3)}`;
}

const TRILHA = arco(1);
// Primeiro enchimento: mais lento e sem passar do alvo, como um anel que fecha.
const ENCHER = { type: "spring", visualDuration: 0.8, bounce: 0 } as const;
// Valor novo depois disso: mola curta, com um fio de vida.
const MUDAR = { type: "spring", visualDuration: 0.4, bounce: 0.12 } as const;

export function Gauge({
  value,
  min = 0,
  max = 100,
  label,
  detail,
  bands,
  size = 176,
  className,
  ...props
}: GaugeProps) {
  const teto = max > min ? max : min + 1;
  const fracao = Math.min(1, Math.max(0, (value - min) / (teto - min)));
  const pct = Math.round(fracao * 100);

  const faixas = React.useMemo(() => [...(bands ?? [])].sort((a, b) => a.from - b.from), [bands]);
  const faixaEm = React.useCallback(
    (v: number) => faixas.filter((f) => v >= f.from - 1e-6).pop(),
    [faixas],
  );
  const faixaFinal = faixaEm(value);

  const ref = React.useRef<HTMLElement>(null);
  const emVista = useInView(ref, { once: true, amount: 0.5 });
  const reduzir = !!useReducedMotion();

  const varre = useMotionValue(0);
  const conta = useMotionValue(0);
  const [cheio, setCheio] = React.useState(false);
  const [faixaViva, setFaixaViva] = React.useState(faixaFinal);

  const caminho = useTransform(varre, arco);
  // A ponta redonda some no primeiro fiapo em vez de aparecer como um pingo.
  const opacidadeArco = useTransform(varre, (v) => Math.min(1, v / 0.02));
  const ponteiro = useTransform(varre, (v) => {
    const ang = INICIO + VAO * Math.min(1, Math.max(0, v));
    const [xa, ya] = ponto(ang, 34);
    const [xb, yb] = ponto(ang, 50.5);
    return `M ${xa.toFixed(3)} ${ya.toFixed(3)} L ${xb.toFixed(3)} ${yb.toFixed(3)}`;
  });
  const digitos = useTransform(conta, (v) => String(Math.round(Math.min(100, Math.max(0, v)))));

  React.useEffect(() => {
    if (reduzir) {
      varre.jump(fracao);
      conta.jump(fracao * 100);
      setFaixaViva(faixaFinal);
      setCheio(true);
      return;
    }
    if (!emVista) return;
    const transicao = cheio ? MUDAR : ENCHER;
    const a = animate(varre, fracao, transicao);
    const b = animate(conta, fracao * 100, {
      ...(cheio ? { type: "spring", visualDuration: 0.4, bounce: 0 } : ENCHER),
      onComplete: () => setCheio(true),
    });
    return () => {
      a.stop();
      b.stop();
    };
  }, [emVista, fracao, reduzir, cheio, varre, conta, faixaFinal]);

  // A faixa segue o número na tela: cor e nome trocam quando a contagem cruza o limite.
  useMotionValueEvent(conta, "change", (v) => {
    const proxima = faixaEm(min + (v / 100) * (teto - min));
    if (proxima !== faixaViva) setFaixaViva(proxima);
  });

  const faixa = reduzir ? faixaFinal : faixaViva;
  const cor = faixa?.alert ? "var(--destructive)" : "var(--brand)";
  const valorAria = Math.min(teto, Math.max(min, value));

  return (
    <figure
      ref={ref}
      className={cn("m-0 grid min-w-0 justify-items-center gap-2.5 text-center", className)}
      style={{ ["--gauge-cor" as string]: cor }}
      {...props}
    >
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={teto}
        aria-valuenow={valorAria}
        aria-valuetext={`${pct}%${faixaFinal ? `, ${faixaFinal.label}` : ""}${detail ? `, ${detail}` : ""}`}
        className="relative aspect-[100/90] w-full"
        style={{ maxWidth: size }}
      >
        <svg viewBox="0 0 100 90" aria-hidden="true" focusable="false" className="block size-full overflow-visible">
          <path d={TRILHA} fill="none" strokeWidth={9} strokeLinecap="round" className="stroke-muted" />
          <motion.path
            d={caminho}
            fill="none"
            strokeWidth={9}
            strokeLinecap="round"
            style={{ opacity: opacidadeArco, stroke: "var(--gauge-cor)" }}
            className="[transition:stroke_var(--dur-base)_var(--ease-out)] motion-reduce:[transition:none]"
          />
          {/* O ponteiro: um risco radial que atravessa o anel no ponto do valor. */}
          <motion.path d={ponteiro} fill="none" strokeWidth={2.5} strokeLinecap="round" className="stroke-foreground" />
        </svg>

        {/* O centro de verdade do anel é o meio de um quadrado da largura dele. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 grid aspect-square place-content-center justify-items-center gap-1">
          <span className="relative inline-flex items-baseline font-semibold leading-none tracking-tight tabular-nums text-foreground text-[2rem]">
            <span className="relative inline-flex justify-end">
              {/* Reserva a largura do valor final; os dígitos vivos se alinham à direita dela. */}
              <span className="invisible">{pct}</span>
              <motion.span className="absolute inset-y-0 right-0 whitespace-nowrap">{digitos}</motion.span>
            </span>
            <span className="ml-px text-[0.5em] font-medium text-muted-foreground">%</span>
          </span>
          {faixas.length > 0 && (
            <span className="relative inline-flex h-[1.45em] min-w-24 items-center justify-center overflow-hidden text-apoio font-medium text-foreground">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={(cheio || reduzir) && faixa ? faixa.label : ""}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap"
                  initial={reduzir ? { opacity: 0 } : { opacity: 0, y: "0.4em" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduzir ? { opacity: 0 } : { opacity: 0, y: "-0.4em" }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {(cheio || reduzir) && faixa && (
                    <>
                      <span className="size-1.5 rounded-[var(--r-pill)]" style={{ background: "var(--gauge-cor)" }} />
                      {faixa.label}
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
            </span>
          )}
        </div>
      </div>

      <figcaption className="grid min-w-0 gap-0.5">
        <strong className="text-corpo font-medium text-foreground">{label}</strong>
        {detail && <span className="text-apoio tabular-nums text-muted-foreground">{detail}</span>}
      </figcaption>
    </figure>
  );
}
