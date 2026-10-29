"use client";

/* Adaptado de Activity Heatmap — https://uiarc.dev/components/activity-heatmap — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui). */

import * as React from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Activity Heatmap — um quadrado por dia, semanas em colunas.
 *
 * Pra ritmo ao longo de um período longo: entregas, treinos, posts, pedidos.
 * Serve quando sequência e semana parada importam mais que comparação exata
 * (aí é gráfico de barras). Não é seletor de data (aí é calendário).
 *
 * ── As decisões que não são óbvias ─────────────────────────────────────────
 *
 * 1. **Os níveis são a marca misturada no `--muted`.** Quatro tons de
 *    `color-mix` entre o vazio e `var(--brand)`, então a grade veste qualquer
 *    cliente e os dois temas sem paleta própria. A cor é fundo, nunca texto.
 * 2. **Os limites saem dos quartos do dia mais cheio**, a não ser que venham
 *    por prop. Escala fixa faz uma conta pequena parecer vazia e uma grande
 *    parecer saturada.
 * 3. **O estado de repouso é a grade inteira.** A onda de entrada (diagonal,
 *    teto de 420 ms somados) só esconde as células depois de o JS estar vivo e
 *    a grade ainda fora de vista. Sem script, o dado está lá.
 * 4. **Uma bolha só pra grade toda.** Ela salta pro lugar quando abre e
 *    desliza numa mola entre as células depois disso. 370 tooltips seriam 370
 *    nós pra nada.
 * 5. **Teclado anda como no calendário:** seta pra cima e pra baixo é um dia,
 *    pros lados é uma semana, Home e End vão às pontas, Enter e Espaço
 *    escolhem. A grade é uma parada de Tab só (tabindex itinerante).
 * 6. **No estreito a grade rola**, e abre já na semana mais recente: o fim é o
 *    que se quer ver primeiro.
 * 7. **Datas em UTC.** `YYYY-MM-DD` é um dia de calendário, não um instante; em
 *    fuso local o dia escorrega pro vizinho e servidor e cliente discordam.
 */

export interface ActivityDay {
  /** Dia como `YYYY-MM-DD`. */
  date: string;
  count: number;
}

export interface ActivityHeatmapProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Um item por dia, do mais antigo ao mais novo. Dia faltando conta zero. */
  days: ActivityDay[];
  /** Nome acessível da grade, como "Entregas em 2026". */
  label: string;
  /** Fecha o resumo: "1.284 entregas em {period}". */
  period: string;
  /** Substantivo da contagem, no singular e no plural. */
  unit?: { one: string; other: string };
  /** Teto dos níveis 1 a 3; acima do último é nível 4. Default: quartos do dia mais cheio. */
  thresholds?: [number, number, number];
  /** 0 = semana começa no domingo; 1 = na segunda. */
  weekStartsOn?: 0 | 1;
  /** Dia marcado com o anel de seleção. */
  selectedDate?: string | null;
  /** Clique, Enter ou Espaço num dia. */
  onSelectDate?: (date: string) => void;
  /** Controles ao lado do resumo, como um seletor de período. */
  actions?: React.ReactNode;
  locale?: string;
  /** Lado do quadrado, em px. */
  cellSize?: number;
}

const DIA = 86_400_000;
const ONDA = 420;
const GAP = 3;
const ROTULO = 28;
const REGISTROS = { one: "registro", other: "registros" };
const NIVEL = [
  "var(--muted)",
  "color-mix(in oklab, var(--brand) 28%, var(--muted))",
  "color-mix(in oklab, var(--brand) 52%, var(--muted))",
  "color-mix(in oklab, var(--brand) 76%, var(--muted))",
  "var(--brand)",
];

const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const semPonto = (s: string) => s.replace(/\.$/, "");

function montar(days: ActivityDay[], inicioSemana: 0 | 1, limites: [number, number, number] | undefined, locale: string) {
  const datas = days.map((d) => utc(d.date)).filter(Number.isFinite);
  const inicio = datas.length ? Math.min(...datas) : 0;
  const total = datas.length ? Math.round((Math.max(...datas) - inicio) / DIA) + 1 : 0;
  const contagens = new Array<number>(total).fill(0);
  for (const d of days) {
    const i = Math.round((utc(d.date) - inicio) / DIA);
    if (i >= 0 && i < total) contagens[i]! += Math.max(0, d.count);
  }
  const maior = contagens.reduce((a, b) => Math.max(a, b), 0);
  const tetos =
    limites ??
    ([Math.max(1, Math.ceil(maior * 0.25)), Math.max(2, Math.ceil(maior * 0.5)), Math.max(3, Math.ceil(maior * 0.75))] as [
      number,
      number,
      number,
    ]);
  const niveis = contagens.map((c) => (c <= 0 ? 0 : c <= tetos[0] ? 1 : c <= tetos[1] ? 2 : c <= tetos[2] ? 3 : 4));
  const recuo = (new Date(inicio).getUTCDay() - inicioSemana + 7) % 7;
  const semanas = Math.ceil((recuo + total) / 7);
  const nomeMes = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const meses: { col: number; nome: string }[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(inicio + i * DIA);
    if (i === 0 || d.getUTCDate() === 1) meses.push({ col: Math.floor((recuo + i) / 7), nome: semPonto(nomeMes.format(d)) });
  }
  // Mês parcial no começo só leva rótulo se houver espaço antes do próximo.
  if (meses.length > 1 && meses[1]!.col - meses[0]!.col < 3) meses.shift();
  return { inicio, total, contagens, niveis, recuo, semanas, meses, soma: contagens.reduce((a, b) => a + b, 0) };
}

const nada = () => () => {};

export function ActivityHeatmap({
  days,
  label,
  period,
  unit = REGISTROS,
  thresholds,
  weekStartsOn = 0,
  selectedDate = null,
  onSelectDate,
  actions,
  locale = "pt-BR",
  cellSize = 12,
  className,
  style,
  ...props
}: ActivityHeatmapProps) {
  const hidratado = React.useSyncExternalStore(nada, () => true, () => false);
  const reduzir = !!useReducedMotion() && hidratado;
  const raiz = React.useRef<HTMLDivElement>(null);
  const rolagem = React.useRef<HTMLDivElement>(null);
  const grade = React.useRef<HTMLDivElement>(null);
  const emVista = useInView(grade, { once: true, amount: 0.35 });

  const m = React.useMemo(
    () => montar(days, weekStartsOn, thresholds, locale),
    [days, weekStartsOn, thresholds, locale],
  );
  const fmt = React.useMemo(
    () => ({
      longo: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
      curto: new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
      semana: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
      num: new Intl.NumberFormat(locale),
    }),
    [locale],
  );
  const nome = (n: number) => (n === 1 ? unit.one : unit.other);

  // Onda de entrada: "parado" é a grade cheia; só esconde depois do JS vivo e fora de vista.
  const [onda, setOnda] = React.useState<"parado" | "escondido" | "entrando">("parado");
  React.useLayoutEffect(() => {
    if (!reduzir && !emVista) setOnda("escondido");
    // Só na montagem: depois disso quem manda é o observer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    if (onda !== "escondido" || !(emVista || reduzir)) return;
    const raf = requestAnimationFrame(() => setOnda(reduzir ? "parado" : "entrando"));
    return () => cancelAnimationFrame(raf);
  }, [onda, emVista, reduzir]);
  React.useEffect(() => {
    if (onda !== "entrando") return;
    const t = window.setTimeout(() => setOnda("parado"), ONDA + 400);
    return () => window.clearTimeout(t);
  }, [onda]);

  // Abre na semana mais recente.
  React.useLayoutEffect(() => {
    const el = rolagem.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [m.semanas]);

  const iSel = selectedDate ? Math.round((utc(selectedDate) - m.inicio) / DIA) : -1;
  const temSel = iSel >= 0 && iSel < m.total;
  const [foco, setFoco] = React.useState<number | null>(null);
  const iTab = foco !== null && foco < m.total ? foco : temSel ? iSel : m.total - 1;

  // A bolha: salta quando abre, desliza entre células depois.
  const [dica, setDica] = React.useState<{ i: number; x: number; y: number } | null>(null);
  const [aberta, setAberta] = React.useState(false);
  const estavaAberta = React.useRef(false);
  const esconder = React.useRef(0);
  React.useEffect(() => {
    estavaAberta.current = aberta;
  });
  React.useEffect(() => () => window.clearTimeout(esconder.current), []);

  const mostrar = (cel: HTMLElement, i: number) => {
    const no = raiz.current;
    const r = no?.getBoundingClientRect();
    const c = cel.getBoundingClientRect();
    if (!no || !r) return;
    window.clearTimeout(esconder.current);
    // Os retângulos são de TELA; a bolha é posicionada em px LOCAIS. Dentro de um ancestral com
    // `transform: scale` os dois divergem, e a bolha caía longe do dia. A escala desfaz a diferença.
    const escala = no.offsetWidth ? r.width / no.offsetWidth : 1;
    const largura = r.width / escala;
    // A bolha não passa da borda da peça.
    const x = Math.min(Math.max((c.left - r.left + c.width / 2) / escala, 72), largura - 72);
    setDica({ i, x, y: (c.top - r.top) / escala });
    setAberta(true);
  };
  const fecharEm = (ms: number) => {
    window.clearTimeout(esconder.current);
    esconder.current = window.setTimeout(() => setAberta(false), ms);
  };

  const alvo = (el: EventTarget | null) => {
    const cel = (el as Element | null)?.closest?.<HTMLElement>("[data-i]");
    return cel && grade.current?.contains(cel) ? { cel, i: Number(cel.dataset.i) } : null;
  };
  const focar = (i: number) => grade.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.focus();

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const h = alvo(e.target);
    if (!h) return;
    const passos: Record<string, number> = {
      ArrowUp: h.i - 1,
      ArrowDown: h.i + 1,
      ArrowLeft: h.i - 7,
      ArrowRight: h.i + 7,
      Home: 0,
      End: m.total - 1,
    };
    if (e.key in passos) {
      e.preventDefault();
      focar(Math.min(Math.max(passos[e.key]!, 0), m.total - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectDate?.(iso(m.inicio + h.i * DIA));
    } else if (e.key === "Escape" && aberta) {
      e.preventDefault();
      setAberta(false);
    }
  }

  const diag = Math.max(1, m.semanas - 1 + 6);
  const passoOnda = Math.min(12, ONDA / diag);
  const passo = cellSize + GAP;

  const linhas = Array.from({ length: 7 }, (_, lin) => (
    <div key={lin} role="row" className="flex" style={{ gap: GAP }}>
      {Array.from({ length: m.semanas }, (_, col) => {
        const i = col * 7 + lin - m.recuo;
        const atraso = onda === "entrando" ? `${Math.round((col + lin) * passoOnda)}ms` : "0ms";
        const visual: React.CSSProperties = {
          width: cellSize,
          height: cellSize,
          opacity: onda === "escondido" ? 0 : 1,
          transform: onda === "escondido" ? "scale(0.5)" : "none",
          transition:
            onda === "escondido"
              ? "none"
              : `opacity 360ms var(--ease-out) ${atraso}, transform var(--dur-slow) var(--ease-out) ${atraso}, background-color var(--dur-slow) var(--ease-out)`,
        };
        if (i < 0 || i >= m.total) return <span key={col} aria-hidden="true" className="flex-none" style={visual} />;
        const n = m.contagens[i]!;
        const data = new Date(m.inicio + i * DIA);
        const sel = temSel && i === iSel;
        return (
          <span
            key={col}
            role="gridcell"
            data-i={i}
            tabIndex={i === iTab ? 0 : -1}
            aria-selected={onSelectDate ? sel : undefined}
            aria-label={`${n ? fmt.num.format(n) : "Sem"} ${nome(n)}, ${fmt.longo.format(data)}`}
            onClick={() => onSelectDate?.(iso(data.getTime()))}
            className={cn(
              "block flex-none rounded-[min(var(--r-control),3px)] outline-offset-1 focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
              sel && "outline outline-[1.5px] outline-foreground",
              onSelectDate && "cursor-pointer",
            )}
            style={{ ...visual, background: NIVEL[m.niveis[i]!] }}
          />
        );
      })}
    </div>
  ));

  const diasDaSemana = Array.from({ length: 7 }, (_, lin) => {
    const d = (lin + weekStartsOn) % 7;
    // 4 de janeiro de 1970 foi domingo. Só os dias ímpares levam rótulo, como no papel.
    return d % 2 === 1 ? semPonto(fmt.semana.format(new Date((3 + d) * DIA))) : "";
  });

  const resumo = `${fmt.num.format(m.soma)} ${nome(m.soma)} em ${period}`;
  const dn = dica ? m.contagens[dica.i]! : 0;
  const deslizar = aberta && estavaAberta.current && !reduzir;

  return (
    <div ref={raiz} className={cn("relative grid min-w-0 gap-3 text-foreground", className)} style={style} {...props}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="m-0 text-corpo tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">
            {fmt.num.format(m.soma)} {nome(m.soma)}
          </span>{" "}
          em {period}
          <span className="sr-only" role="status">
            {resumo}
          </span>
        </p>
        {actions && <div className="flex flex-none items-center">{actions}</div>}
      </div>

      <div ref={rolagem} className="-m-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain p-1.5" onScroll={() => aberta && setAberta(false)}>
        <div
          className="grid w-max"
          style={{ gridTemplateColumns: `${ROTULO}px auto`, columnGap: GAP, rowGap: 6 }}
        >
          <div className="relative col-start-2 row-start-1 h-4 text-apoio leading-4 text-muted-foreground" aria-hidden="true">
            {m.meses.map((mes) => (
              <span key={`${mes.col}-${mes.nome}`} className="absolute top-0 whitespace-nowrap" style={{ left: mes.col * passo }}>
                {mes.nome}
              </span>
            ))}
          </div>
          <div
            className="col-start-1 row-start-2 grid text-micro text-muted-foreground"
            style={{ gridTemplateRows: `repeat(7, ${cellSize}px)`, rowGap: GAP }}
            aria-hidden="true"
          >
            {diasDaSemana.map((t, lin) => (
              <span key={lin} className="flex items-center whitespace-nowrap leading-none">
                {t}
              </span>
            ))}
          </div>
          <div
            ref={grade}
            role="grid"
            aria-label={label}
            aria-readonly="true"
            className="col-start-2 row-start-2 grid outline-none"
            style={{ gap: GAP }}
            onPointerOver={(e) => {
              const h = alvo(e.target);
              if (h) mostrar(h.cel, h.i);
            }}
            onPointerLeave={(e) => fecharEm(e.pointerType === "touch" ? 2400 : 110)}
            onFocus={(e) => {
              const h = alvo(e.target);
              if (!h) return;
              setFoco(h.i);
              mostrar(h.cel, h.i);
            }}
            onBlur={(e) => {
              if (!grade.current?.contains(e.relatedTarget as Node | null)) fecharEm(0);
            }}
            onKeyDown={onKeyDown}
          >
            {linhas}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-apoio text-muted-foreground" aria-hidden="true">
        <span>Menos</span>
        <span className="flex gap-[3px]">
          {NIVEL.map((cor, n) => (
            <span key={n} className="size-[11px] rounded-[min(var(--r-control),3px)]" style={{ background: cor }} />
          ))}
        </span>
        <span>Mais</span>
      </div>

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-10 size-0"
        initial={false}
        animate={{ x: dica?.x ?? 0, y: dica?.y ?? 0 }}
        transition={deslizar ? { type: "spring", visualDuration: 0.26, bounce: 0.12 } : { duration: 0 }}
      >
        <motion.div
          className="absolute bottom-2 left-0 grid whitespace-nowrap rounded-[var(--r-control)] bg-foreground px-3 py-1.5 text-background [box-shadow:var(--e-raised)]"
          initial={false}
          animate={aberta && dica ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduzir ? 1 : 0.96 }}
          transition={{ duration: aberta ? 0.16 : 0.12, ease: [0.16, 1, 0.3, 1] }}
          style={{ originX: 0.5, originY: 1, x: "-50%" }}
        >
          {dica && (
            <>
              <span className="text-corpo font-medium tabular-nums leading-snug">
                {dn ? `${fmt.num.format(dn)} ${nome(dn)}` : `Sem ${unit.other}`}
              </span>
              <span className="text-apoio leading-snug opacity-70">{fmt.curto.format(new Date(m.inicio + dica.i * DIA))}</span>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
