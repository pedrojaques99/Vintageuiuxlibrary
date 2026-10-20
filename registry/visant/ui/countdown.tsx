"use client";

/* Adaptado de Countdown — https://uiarc.dev/components/countdown — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui). */

import * as React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Countdown — a contagem pra um momento marcado: lançamento, live, fim de lote.
 *
 * Cada dígito é uma roda que gira pelo caminho curto, então a contagem anda pra
 * baixo e a virada de 00 pra 59 é UM passo, não cinquenta e nove. Quando chega
 * a zero, os dígitos se desfazem no rótulo de pronto ("Ao vivo") com um ponto
 * pulsando na cor da marca.
 *
 * ── O que não é óbvio ──────────────────────────────────────────────────────
 *
 * 1. **O alvo nunca depende do fuso de quem visita.** Número é epoch, `Date` é
 *    usada como veio, ISO com `Z` ou offset é exato. ISO SEM offset é hora de
 *    parede no `timeZone` (ou UTC): "2026-11-20T19:00" com
 *    `timeZone="America/Sao_Paulo"` é o mesmo instante pra quem abre de Lisboa.
 * 2. **A dezena de minuto e segundo gira numa roda de seis.** É isso que deixa
 *    00 → 59 ser um passo só. A dezena de hora (com dias na tela) roda em três.
 * 3. **O relógio só bate com a peça na tela e a aba visível.** Voltar lê o
 *    relógio de novo, então nada acumula atraso. O tique acorda logo depois do
 *    segundo cheio CONTADO DO ALVO, não de quando a página carregou.
 * 4. **O fim é armado à parte.** `onComplete` dispara na hora mesmo com a aba
 *    escondida, e uma vez só, e só se a contagem estava correndo aqui.
 * 5. **A maior unidade absorve o resto.** Sem `days` em `units`, as horas
 *    passam de 24. Isso é decisão de copy ("faltam 30 horas"), não bug.
 * 6. **Antes de hidratar não há hora.** O servidor desenha zeros esmaecidos,
 *    nunca um número que o cliente vai desmentir no primeiro quadro.
 *
 * O leitor de tela ouve a frase inteira ("2 dias, 4 horas") num `role="timer"`;
 * as rodas são `aria-hidden`. Com `prefers-reduced-motion` o dígito troca seco.
 */

export type CountdownUnit = "days" | "hours" | "minutes" | "seconds";

export interface CountdownProps {
  /** O instante alvo. Ver a nota 1 sobre string sem offset. */
  target: Date | number | string;
  /** Fuso IANA pra string sem offset, como "America/Sao_Paulo". */
  timeZone?: string;
  /** Unidades na tela, da maior pra menor. A maior absorve o resto. */
  units?: CountdownUnit[];
  /** Dígitos grandes com rótulo, ou uma linha compacta pra faixa e tabela. */
  variant?: "large" | "compact";
  /** O que aparece quando o alvo passa. Os dígitos viram ele. */
  completeLabel?: React.ReactNode;
  /** Dispara uma vez, no instante em que chega a zero com a peça montada. */
  onComplete?: () => void;
  /** Nome falado, como "A live começa em". */
  label?: string;
  /** Relógio em epoch ms. Passe um sincronizado com o servidor quando o do aparelho não for confiável. */
  clock?: () => number;
  className?: string;
}

const PADRAO: CountdownUnit[] = ["days", "hours", "minutes", "seconds"];
const SEGUNDOS: Record<CountdownUnit, number> = { days: 86_400, hours: 3_600, minutes: 60, seconds: 1 };
const LIMITE: Record<CountdownUnit, number> = { days: Infinity, hours: 24, minutes: 60, seconds: 60 };
// [rótulo grande, letra compacta, singular, plural]
const NOMES: Record<CountdownUnit, [string, string, string, string]> = {
  days: ["Dias", "d", "dia", "dias"],
  hours: ["Horas", "h", "hora", "horas"],
  minutes: ["Minutos", "min", "minuto", "minutos"],
  seconds: ["Segundos", "s", "segundo", "segundos"],
};
const MAX_TIMEOUT = 2_147_483_647;
const relogioDoSistema = () => Date.now();

const MOLA_TIQUE = { type: "spring", visualDuration: 0.26, bounce: 0.12 } as const;
const MOLA_LISA = { type: "spring", visualDuration: 0.4, bounce: 0 } as const;
const MOLA_FORMA = { type: "spring", visualDuration: 0.42, bounce: 0.16 } as const;

/** Distância do fuso pro UTC num instante, em ms. */
function offsetDoFuso(epoch: number, timeZone: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(epoch));
  const pega = (t: string) => Number(partes.find((p) => p.type === t)?.value ?? 0);
  return (
    Date.UTC(pega("year"), pega("month") - 1, pega("day"), pega("hour"), pega("minute"), pega("second")) -
    Math.floor(epoch / 1000) * 1000
  );
}

/** Resolve o alvo em epoch ms sem nunca ler o fuso do aparelho. */
export function toEpoch(target: Date | number | string, timeZone?: string) {
  if (typeof target === "number") return target;
  if (target instanceof Date) return target.getTime();
  const parede = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/.exec(target.trim());
  if (!parede) return Date.parse(target);
  const utc = Date.UTC(
    +parede[1]!,
    +parede[2]! - 1,
    +parede[3]!,
    +(parede[4] ?? 0),
    +(parede[5] ?? 0),
    +(parede[6] ?? 0),
  );
  if (!timeZone) return utc;
  // Duas passadas assentam o offset em cima de uma troca de horário de verão.
  const chute = utc - offsetDoFuso(utc, timeZone);
  return utc - offsetDoFuso(chute, timeZone);
}

function partesDe(segundos: number, units: CountdownUnit[]) {
  return units.map((unit, i) => ({
    unit,
    value: i === 0 ? Math.floor(segundos / SEGUNDOS[unit]) : Math.floor(segundos / SEGUNDOS[unit]) % LIMITE[unit],
  }));
}

/** Tamanho de cada roda. Ver a nota 2. */
function basesDe(unit: CountdownUnit, maior: boolean, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const dezena = i === n - 2 && n === 2 && !maior;
    return dezena ? (unit === "hours" ? 3 : 6) : 10;
  });
}

const nada = () => () => {};
const assinarVisibilidade = (avisar: () => void) => {
  document.addEventListener("visibilitychange", avisar);
  return () => document.removeEventListener("visibilitychange", avisar);
};

/** Um dígito na roda. A distância dele até a posição da roda decide onde fica e quão nítido aparece. */
function Glifo({ posicao, digito, base }: { posicao: MotionValue<number>; digito: number; base: number }) {
  const desvio = useTransform(posicao, (p) => ((((digito - p) % base) + base * 1.5) % base) - base / 2);
  const y = useTransform(desvio, (d) => `${d}em`);
  const opacity = useTransform(desvio, (d) => Math.max(0, 1 - Math.abs(d)));
  const visibility = useTransform(desvio, (d) => (Math.abs(d) >= 1 ? "hidden" : "visible"));
  const filter = useTransform(desvio, (d) =>
    Math.abs(d) < 0.02 || Math.abs(d) >= 1 ? "none" : `blur(${(Math.abs(d) * 2).toFixed(2)}px)`,
  );
  return (
    <motion.span className="absolute inset-x-0 top-[var(--pena)] text-center" style={{ y, opacity, filter, visibility }}>
      {digito}
    </motion.span>
  );
}

// A janela da roda esfuma nas bordas: o dígito girando some na pena, não é cortado.
const MASCARA =
  "linear-gradient(to bottom, transparent, currentColor calc(var(--pena) * 1.5), currentColor calc(100% - var(--pena) * 1.5), transparent)";

function Roda({ digito, base, atraso, reduzir }: { digito: number; base: number; atraso: number; reduzir: boolean }) {
  const posicao = useMotionValue(0);
  const roda = React.useRef({ digito: 0, alvo: 0, revelada: false });

  React.useEffect(() => {
    const r = roda.current;
    if (r.digito === digito) {
      r.revelada = true;
      return;
    }
    const sobe = (digito - r.digito + base) % base;
    const desce = base - sobe;
    r.alvo += desce <= sobe ? -desce : sobe;
    r.digito = digito;
    const primeira = !r.revelada;
    r.revelada = true;
    // Animação nova no mesmo valor assume a que está em voo, com a velocidade
    // dela. Sem cleanup de propósito: um re-run nunca deixa a roda no meio.
    if (reduzir) posicao.jump(r.alvo);
    else animate(posicao, r.alvo, primeira ? { ...MOLA_LISA, delay: atraso } : MOLA_TIQUE);
  }, [base, atraso, digito, posicao, reduzir]);

  return (
    <motion.span
      className="relative inline-block overflow-hidden [--pena:0.16em] -my-[var(--pena)] py-[var(--pena)]"
      style={{ maskImage: MASCARA, WebkitMaskImage: MASCARA }}
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "auto", opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={reduzir ? { duration: 0 } : MOLA_FORMA}
    >
      <span className="invisible">0</span>
      {Array.from({ length: base }, (_, v) => (
        <Glifo key={v} posicao={posicao} digito={v} base={base} />
      ))}
    </motion.span>
  );
}

export function Countdown({
  target,
  timeZone,
  units = PADRAO,
  variant = "large",
  completeLabel = "Ao vivo",
  onComplete,
  label = "Tempo restante",
  clock = relogioDoSistema,
  className,
}: CountdownProps) {
  const raiz = React.useRef<HTMLDivElement>(null);
  const hidratado = React.useSyncExternalStore(nada, () => true, () => false);
  const reduzir = !!useReducedMotion() && hidratado;
  const fim = toEpoch(target, timeZone);
  const valido = Number.isFinite(fim);
  const unidades = units.length ? [...units].sort((a, b) => SEGUNDOS[b] - SEGUNDOS[a]) : PADRAO;

  const visivel = React.useSyncExternalStore(
    assinarVisibilidade,
    () => document.visibilityState === "visible",
    () => true,
  );
  const naTela = useInView(raiz, { amount: 0 });
  const correndo = visivel && naTela && valido;
  const [agora, setAgora] = React.useState<number | null>(null);
  const relogio = React.useRef(clock);
  React.useLayoutEffect(() => {
    relogio.current = clock;
  });

  React.useEffect(() => {
    if (!correndo) return;
    let t: ReturnType<typeof setTimeout>;
    const tique = () => {
      const hora = relogio.current();
      setAgora(hora);
      const falta = fim - hora;
      if (falta > 0) t = setTimeout(tique, (falta % 1000 || 1000) + 8);
    };
    t = setTimeout(tique, 0);
    return () => clearTimeout(t);
  }, [fim, correndo]);

  React.useEffect(() => {
    if (!valido) return;
    const falta = fim - relogio.current();
    if (falta <= 0) return;
    const t = setTimeout(() => setAgora(relogio.current()), Math.min(MAX_TIMEOUT, falta + 8));
    return () => clearTimeout(t);
  }, [fim, valido]);

  const falta = agora === null || !valido ? null : Math.max(0, fim - agora);
  const pronto = falta === 0;
  const aoCompletar = React.useRef(onComplete);
  React.useLayoutEffect(() => {
    aoCompletar.current = onComplete;
  });
  const estavaCorrendo = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (falta === null) return;
    if (falta > 0) {
      estavaCorrendo.current = fim;
      return;
    }
    if (estavaCorrendo.current === fim) {
      estavaCorrendo.current = null;
      aoCompletar.current?.();
    }
  }, [fim, falta]);

  const segundos = falta === null ? 0 : Math.ceil(falta / 1000);
  const partes = partesDe(segundos, unidades);
  const pendente = falta === null;
  const compacto = variant === "compact";

  // A casca vai numa mola até o tamanho do que segura: os dígitos viram o
  // rótulo de pronto sem pulo. offsetWidth é medida local, imune ao palco escalado.
  const conteudo = React.useRef<HTMLDivElement>(null);
  const largura = useMotionValue<number | "auto">("auto");
  const altura = useMotionValue<number | "auto">("auto");
  React.useLayoutEffect(() => {
    const no = conteudo.current;
    if (!no || typeof ResizeObserver === "undefined") return;
    let primeira = true;
    const obs = new ResizeObserver(() => {
      const w = no.offsetWidth;
      const h = no.offsetHeight;
      if (primeira || reduzir) {
        largura.jump(w);
        altura.jump(h);
        primeira = false;
        return;
      }
      animate(largura, w, MOLA_FORMA);
      animate(altura, h, MOLA_LISA);
    });
    obs.observe(no);
    return () => obs.disconnect();
  }, [altura, reduzir, largura]);

  const falado = pronto
    ? typeof completeLabel === "string"
      ? completeLabel
      : "Terminou"
    : pendente
      ? ""
      : partes
          .filter((p, i) => p.value > 0 || i === partes.length - 1)
          // Segundos só entram na fala no último minuto: anunciar cada um é ruído.
          .filter((p) => segundos < 60 || p.unit !== "seconds")
          .map((p) => `${p.value} ${p.value === 1 ? NOMES[p.unit][2] : NOMES[p.unit][3]}`)
          .join(", ");

  const troca = reduzir
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.16 },
      }
    : {
        initial: { opacity: 0, scale: 0.92, filter: "blur(4px)" },
        animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 0.92, filter: "blur(4px)", transition: { duration: 0.16 } },
        transition: MOLA_FORMA,
      };

  return (
    <div
      ref={raiz}
      role="timer"
      aria-label={label}
      data-variant={variant}
      data-complete={pronto || undefined}
      className={cn(
        "relative min-w-0 text-foreground",
        compacto ? "inline-flex align-middle" : "@container flex justify-center",
        className,
      )}
    >
      <motion.div
        className={cn(
          "relative flex justify-center",
          compacto &&
            "overflow-hidden rounded-[var(--r-pill)] border [transition:border-color_var(--dur-slow)_var(--ease-out),background-color_var(--dur-slow)_var(--ease-out)]",
          compacto &&
            (pronto
              ? "border-[var(--brand)] bg-[color-mix(in_oklab,var(--brand)_12%,var(--card))]"
              : "border-border bg-card"),
        )}
        style={{ width: largura, height: altura }}
      >
        <div
          ref={conteudo}
          aria-hidden="true"
          className={cn("relative inline-flex flex-none items-center justify-center", compacto && "min-h-8 px-3")}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {pronto ? (
              <motion.span
                key="pronto"
                className={cn(
                  "inline-flex items-center gap-[0.4em] whitespace-nowrap font-medium",
                  compacto
                    ? "text-corpo leading-snug"
                    : "text-[clamp(1.75rem,11cqi,2.5rem)] leading-tight tracking-tight",
                )}
                {...troca}
              >
                <span className="relative size-[max(0.3em,8px)] flex-none rounded-full bg-[var(--brand)]">
                  <span className="absolute inset-0 rounded-full bg-[var(--brand)] opacity-60 motion-safe:animate-ping" />
                </span>
                {completeLabel}
              </motion.span>
            ) : (
              <motion.span
                key="correndo"
                className={cn(
                  "inline-flex items-start whitespace-nowrap",
                  compacto
                    ? "gap-1.5 text-corpo font-medium leading-snug"
                    : "text-[clamp(1.75rem,12.5cqi,3rem)] font-medium leading-none tracking-tight",
                )}
                {...troca}
              >
                {partes.map((p, g) => {
                  const texto = String(p.value).padStart(2, "0");
                  const bases = basesDe(p.unit, g === 0, texto.length);
                  return (
                    <span key={p.unit} className="inline-flex items-start">
                      {!compacto && g > 0 && (
                        <span className="-translate-y-[0.06em] px-[0.12em] leading-none text-muted-foreground opacity-60">
                          :
                        </span>
                      )}
                      <span
                        className={cn(compacto ? "inline-flex items-baseline gap-px" : "inline-grid justify-items-center gap-1.5")}
                        // Coluna com piso igual: num card estreito os rótulos passam
                        // dos dígitos, e os dois-pontos ficariam desiguais.
                        style={compacto ? undefined : { minWidth: "min(calc((100cqi - 1.6em) / 4), 3.15rem)" }}
                      >
                        <span
                          className={cn(
                            "inline-flex tabular-nums [transition:opacity_var(--dur-slow)_var(--ease-out)]",
                            pendente && "opacity-30",
                          )}
                        >
                          <AnimatePresence initial={false}>
                            {[...texto].map((c, i) => (
                              <Roda
                                key={`${p.unit}${texto.length - i}`}
                                digito={Number(c)}
                                base={bases[i]!}
                                atraso={Math.min((g * 2 + i) * 0.035, 0.3)}
                                reduzir={reduzir}
                              />
                            ))}
                          </AnimatePresence>
                        </span>
                        <span
                          className={cn(
                            "text-muted-foreground",
                            compacto ? "text-corpo font-normal leading-snug" : "text-apoio leading-none tracking-normal",
                          )}
                        >
                          {NOMES[p.unit][compacto ? 1 : 0]}
                        </span>
                      </span>
                    </span>
                  );
                })}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <span className="sr-only">{falado}</span>
    </div>
  );
}
