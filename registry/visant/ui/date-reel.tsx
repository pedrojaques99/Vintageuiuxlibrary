"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Date Reel — a data escolhida em rolos, dia, mês e ano, como no telefone.
 *
 * Calendário em grade é ótimo pra "quando nesta semana" e péssimo pra data de
 * nascimento: são dezenas de toques pra voltar trinta anos. O rolo resolve as
 * duas pontas com o mesmo gesto, e no telefone é o gesto que a pessoa já tem
 * na mão. A ordem dos rolos segue o pt-BR (dia, mês, ano).
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **O rolo é rolagem nativa com `scroll-snap`.** Inércia, encaixe, roda do
 *    mouse e arrasto no toque vêm do navegador, com a física da plataforma.
 *    Reescrever isso em JS dá um rolo que "quase" parece o do sistema, e o quase
 *    é o que se sente no dedo.
 * 2. **A curva é só pintura.** Cada linha recebe `rotateX` e opacidade pela
 *    distância ao centro, calculadas num `requestAnimationFrame` a partir do
 *    `scrollTop`. Nada disso muda layout, então a rolagem continua de graça.
 * 3. **O valor só muda quando o rolo para** (`scrollend`, com um relógio de
 *    reserva pra navegador que não tem). Disparar `onValueChange` a cada linha
 *    que passa faria o pai renderizar vinte vezes num arremesso.
 * 4. **Arrasto com mouse.** Rolagem nativa não arrasta com mouse; aqui o
 *    arrasto move o `scrollTop` dividindo o delta pela escala da tela
 *    (`r.height / offsetHeight`), e a soltura projeta a velocidade antes de
 *    encaixar, pra o arremesso ter a mesma cara do toque.
 * 5. **Fevereiro não tem 31.** Trocar o mês encurta o rolo do dia e prende o
 *    dia no último válido, sem inventar data.
 * 6. **Teclado:** cada rolo é `role="spinbutton"`; setas andam um, PageUp/PageDown
 *    andam cinco, Home/End vão às pontas. O texto lido é o da linha.
 */

export interface DateReelProps {
  /** Data escolhida (só dia, mês e ano importam). Controlado. */
  value?: Date;
  /** Data inicial quando não controlado. Padrão: hoje. */
  defaultValue?: Date;
  /** Chamado quando um rolo assenta numa data nova. */
  onValueChange?: (date: Date) => void;
  /** Primeiro e último ano do rolo de ano. */
  minYear?: number;
  maxYear?: number;
  /** Idioma dos nomes de mês. */
  locale?: string;
  /** Nome acessível do grupo. */
  label?: string;
  className?: string;
}

const LINHA = 36;
const VISIVEIS = 5;
const MEIO = Math.floor(VISIVEIS / 2);
const GRAU_POR_LINHA = 20;

const diasNoMes = (ano: number, mes: number) => new Date(ano, mes + 1, 0).getDate();

interface RoloProps {
  itens: string[];
  indice: number;
  onIndice: (i: number) => void;
  label: string;
  reduzir: boolean;
  className?: string;
}

function Rolo({ itens, indice, onIndice, label, reduzir, className }: RoloProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const linhas = React.useRef<(HTMLDivElement | null)[]>([]);
  const assentado = React.useRef(indice);
  const quadro = React.useRef(0);
  const reserva = React.useRef<number | undefined>(undefined);
  const arrasto = React.useRef<{ y: number; topo: number; t: number; v: number } | null>(null);
  const montado = React.useRef(false);

  const pintar = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pos = el.scrollTop / LINHA;
    linhas.current.forEach((linha, i) => {
      if (!linha) return;
      const d = i - pos;
      const longe = Math.abs(d) > MEIO + 1;
      linha.style.transform = longe ? "" : `rotateX(${-d * GRAU_POR_LINHA}deg)`;
      linha.style.opacity = String(Math.max(0, 1 - Math.abs(d) * 0.28));
    });
  }, []);

  const assentar = React.useCallback(() => {
    const el = ref.current;
    if (!el || arrasto.current) return;
    const i = Math.min(itens.length - 1, Math.max(0, Math.round(el.scrollTop / LINHA)));
    if (i !== assentado.current) {
      assentado.current = i;
      onIndice(i);
    }
  }, [itens.length, onIndice]);

  const irPara = React.useCallback(
    (i: number, suave: boolean) => {
      const el = ref.current;
      if (!el) return;
      el.scrollTo({ top: i * LINHA, behavior: suave && !reduzir ? "smooth" : "auto" });
    },
    [reduzir],
  );

  // Valor de fora (atalho, mês que encurtou): o rolo vai até ele.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Na montagem o rolo já nasce no lugar; depois, viaja até ele.
    if (Math.round(el.scrollTop / LINHA) !== indice) irPara(indice, montado.current);
    montado.current = true;
    assentado.current = indice;
    pintar();
  }, [indice, irPara, pintar]);

  const onScroll = () => {
    cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(pintar);
    window.clearTimeout(reserva.current);
    reserva.current = window.setTimeout(assentar, 140);
  };

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scrollend", assentar);
    return () => {
      el.removeEventListener("scrollend", assentar);
      cancelAnimationFrame(quadro.current);
      window.clearTimeout(reserva.current);
    };
  }, [assentar]);

  const mover = (i: number) => {
    const next = Math.min(itens.length - 1, Math.max(0, i));
    irPara(next, true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const atual = assentado.current;
    const mapa: Record<string, number> = {
      ArrowDown: atual + 1,
      ArrowUp: atual - 1,
      PageDown: atual + 5,
      PageUp: atual - 5,
      Home: 0,
      End: itens.length - 1,
    };
    if (e.key in mapa) {
      e.preventDefault();
      mover(mapa[e.key]);
    }
  };

  // Arrasto com mouse (o toque já é nativo).
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    arrasto.current = { y: e.clientY, topo: el.scrollTop, t: performance.now(), v: 0 };
    el.style.scrollSnapType = "none";
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrasto.current;
    if (!a) return;
    const el = e.currentTarget;
    const escala = el.getBoundingClientRect().height / el.offsetHeight || 1;
    const topo = a.topo - (e.clientY - a.y) / escala;
    const agora = performance.now();
    a.v = (topo - el.scrollTop) / Math.max(1, agora - a.t);
    a.t = agora;
    el.scrollTop = topo;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrasto.current;
    if (!a) return;
    arrasto.current = null;
    const el = e.currentTarget;
    el.style.scrollSnapType = "";
    const r = el.getBoundingClientRect();
    const escala = r.height / el.offsetHeight || 1;
    if (Math.abs(e.clientY - a.y) < 4) {
      // Toque sem arrasto: a captura do ponteiro rouba o clique da linha, então
      // a linha tocada é achada pela altura do toque.
      const y = (e.clientY - r.top) / escala + el.scrollTop - LINHA * MEIO;
      mover(Math.floor(y / LINHA));
      return;
    }
    // Projeta ~180 ms de velocidade: arremesso curto anda poucas linhas, longo anda muitas.
    mover(Math.round((el.scrollTop + a.v * 180) / LINHA));
  };

  return (
    <div
      ref={ref}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={itens.length - 1}
      aria-valuenow={indice}
      aria-valuetext={itens[indice]}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "relative snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-[var(--r-control)] [perspective:600px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "cursor-grab select-none active:cursor-grabbing focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
        className,
      )}
      style={{ height: LINHA * VISIVEIS, paddingBlock: LINHA * MEIO }}
    >
      {itens.map((t, i) => (
        <div
          key={t + i}
          ref={(el) => {
            linhas.current[i] = el;
          }}
          aria-hidden="true"
          onClick={() => mover(i)}
          className={cn(
            "flex snap-center items-center justify-center whitespace-nowrap px-2 text-[17px] tabular-nums [backface-visibility:hidden]",
            i === indice ? "font-medium text-foreground" : "text-muted-foreground",
          )}
          style={{ height: LINHA }}
        >
          {t}
        </div>
      ))}
    </div>
  );
}

export function DateReel({
  value,
  defaultValue,
  onValueChange,
  minYear,
  maxYear,
  locale = "pt-BR",
  label = "Data",
  className,
}: DateReelProps) {
  const reduzir = !!useReducedMotion();
  const [interno, setInterno] = React.useState(() => defaultValue ?? new Date());
  const data = value ?? interno;
  const dataRef = React.useRef(data);
  dataRef.current = data;

  const anoAtual = new Date().getFullYear();
  const ini = minYear ?? anoAtual - 100;
  const fim = maxYear ?? anoAtual + 10;

  const meses = React.useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, { month: "long" });
    return Array.from({ length: 12 }, (_, m) => {
      const t = f.format(new Date(2000, m, 1));
      return t.charAt(0).toUpperCase() + t.slice(1);
    });
  }, [locale]);
  const anos = React.useMemo(() => Array.from({ length: fim - ini + 1 }, (_, i) => String(ini + i)), [ini, fim]);

  const ano = Math.min(fim, Math.max(ini, data.getFullYear()));
  const mes = data.getMonth();
  const total = diasNoMes(ano, mes);
  const dia = Math.min(data.getDate(), total);
  const dias = React.useMemo(() => Array.from({ length: total }, (_, i) => String(i + 1)), [total]);

  const trocar = React.useCallback(
    (parte: "d" | "m" | "a", i: number) => {
      const d0 = dataRef.current;
      let a = d0.getFullYear();
      let m = d0.getMonth();
      let d = d0.getDate();
      if (parte === "d") d = i + 1;
      if (parte === "m") m = i;
      if (parte === "a") a = ini + i;
      d = Math.min(d, diasNoMes(a, m));
      const next = new Date(a, m, d);
      if (next.getTime() === new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()).getTime()) return;
      if (value === undefined) setInterno(next);
      onValueChange?.(next);
    },
    [ini, onValueChange, value],
  );

  const onDia = React.useCallback((i: number) => trocar("d", i), [trocar]);
  const onMes = React.useCallback((i: number) => trocar("m", i), [trocar]);
  const onAno = React.useCallback((i: number) => trocar("a", i), [trocar]);

  return (
    <div role="group" aria-label={label} className={cn("relative flex items-stretch gap-1", className)}>
      {/* A faixa do meio fica atrás dos rolos: é o "aqui" da escolha. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 rounded-[var(--r-control)] bg-muted"
        style={{ top: LINHA * MEIO, height: LINHA }}
      />
      <div className="relative flex w-full gap-1 [mask-image:linear-gradient(to_bottom,transparent,black_28%,black_72%,transparent)]">
        <Rolo itens={dias} indice={dia - 1} onIndice={onDia} label="Dia" reduzir={reduzir} className="w-14" />
        <Rolo itens={meses} indice={mes} onIndice={onMes} label="Mês" reduzir={reduzir} className="flex-1" />
        <Rolo itens={anos} indice={ano - ini} onIndice={onAno} label="Ano" reduzir={reduzir} className="w-20" />
      </div>
    </div>
  );
}
