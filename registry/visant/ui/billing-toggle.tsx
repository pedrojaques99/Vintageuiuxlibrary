"use client";

/*
 * Adaptado de Billing Toggle — https://uiarc.dev/components/billing-toggle — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).
 */

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Billing Toggle, o mensal/anual que vende o anual sem gritar.
 *
 * Na tabela de preço, o interruptor de período é o único lugar onde o desconto
 * do anual aparece NA HORA da decisão. Por isso o selo mora dentro da opção, e
 * muda de frase quando ela é escolhida: antes promete ("-20%"), depois confirma
 * ("Você economiza R$ 96"). A promessa vira recibo no mesmo lugar.
 *
 * Decisões que não se veem de primeira:
 *
 * 1. **Um polegar só, que anda.** É o movimento que conta de onde se veio. Ele
 *    é medido (posição e largura do botão escolhido), porque as opções têm
 *    larguras diferentes: a do selo é maior, e colunas iguais desperdiçariam a
 *    mensal.
 * 2. **O selo cresce na mola até a frase nova.** Travar a caixa na frase mais
 *    longa deixava o "-20%" boiando numa barra vazia, que lia como progresso.
 *    Agora o selo tem o tamanho do que diz, a largura viaja com a mesma mola
 *    do polegar, e o polegar, que mede o botão, acompanha.
 * 3. **O selo é fundo da marca, nunca texto da marca.** `var(--brand)` como cor
 *    de letra no branco dá 1,29:1. Escolhido, o selo vira chapa da marca com
 *    `--brand-foreground` por cima; fora disso, fica neutro.
 * 4. **É um radiogroup de verdade.** Tab entra só na opção escolhida, setas
 *    trocam e levam o foco, Home/End vão às pontas.
 *
 * `BillingPrice` vem junto porque o toggle sozinho não fecha a conta: o número
 * precisa rolar pro valor novo no mesmo gesto, subindo quando sobe e descendo
 * quando desce. Guarde o período num estado só e derive todos os preços dele.
 */

export interface BillingToggleOption {
  value: string;
  label: string;
  /** Selo curto de desconto, como "-20%". */
  badge?: string;
  /** Frase do selo depois de escolhida, como "Você economiza R$ 96". Cai no `badge` se faltar. */
  activeBadge?: string;
}

export interface BillingToggleProps {
  /** Período escolhido. Controlado: guarde no estado do pai. */
  value: string;
  onValueChange: (value: string) => void;
  options?: BillingToggleOption[];
  /** Nome acessível do grupo. */
  label?: string;
  className?: string;
}

const OPCOES: BillingToggleOption[] = [
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual", badge: "-20%", activeBadge: "2 meses grátis" },
];

/** Criticamente amortecida: o polegar desliza e pousa sem quicar. */
const DESLIZE = { type: "spring" as const, visualDuration: 0.28, bounce: 0 };

const troca: Variants = {
  antes: { opacity: 0, y: "0.5em" },
  agora: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
  depois: { opacity: 0, y: "-0.5em", transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } },
};
const quieto: Variants = {
  antes: { opacity: 0 },
  agora: { opacity: 1, transition: { duration: 0.12 } },
  depois: { opacity: 0, transition: { duration: 0 } },
};

/** O selo dá um pulinho quando a opção dele é escolhida. Rótulo de variante só dispara na troca. */
const pulo: Variants = {
  on: { scale: [1, 1.08, 1], transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  off: { scale: 1 },
};

const rola: Variants = {
  antes: (d: number) => ({ opacity: 0, y: `${d * 60}%` }),
  agora: { opacity: 1, y: 0 },
  depois: (d: number) => ({ opacity: 0, y: `${d * -60}%` }),
};

/**
 * Texto que troca no lugar, com a caixa indo na mola até a largura da frase nova.
 * Um medidor invisível dá a largura; a frase de saída fica presa na caixa e é
 * cortada por ela, então nada empurra o vizinho de supetão.
 */
function TrocaFixa({ texto, reduzido }: { texto: string; reduzido: boolean }) {
  const medidor = React.useRef<HTMLSpanElement>(null);
  const [largura, setLargura] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const el = medidor.current;
    if (!el) return;
    const medir = () => setLargura(el.offsetWidth);
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [texto]);

  return (
    <motion.span
      className="relative inline-grid overflow-hidden [&>*]:[grid-area:1/1]"
      initial={false}
      animate={largura === null ? undefined : { width: largura }}
      transition={reduzido ? { duration: 0 } : DESLIZE}
    >
      <span ref={medidor} aria-hidden="true" className="invisible absolute left-0 top-0 whitespace-nowrap">
        {texto}
      </span>
      <AnimatePresence initial={false}>
        <motion.span
          key={texto}
          className="justify-self-center whitespace-nowrap"
          variants={reduzido ? quieto : troca}
          initial="antes"
          animate="agora"
          exit="depois"
        >
          {texto}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

export function BillingToggle({
  value,
  onValueChange,
  options = OPCOES,
  label = "Período de cobrança",
  className,
}: BillingToggleProps) {
  const reduzido = !!useReducedMotion();
  const raizRef = React.useRef<HTMLDivElement>(null);
  const botoes = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [polegar, setPolegar] = React.useState<{ x: number; w: number } | null>(null);
  const escolhido = Math.max(0, options.findIndex((o) => o.value === value));

  const medir = React.useCallback(() => {
    const no = botoes.current[escolhido];
    if (!no) return;
    setPolegar((p) => (p && p.x === no.offsetLeft && p.w === no.offsetWidth ? p : { x: no.offsetLeft, w: no.offsetWidth }));
  }, [escolhido]);

  // Mede de novo quando a raiz muda de tamanho: fonte carregando tarde também muda a largura do botão.
  React.useLayoutEffect(() => {
    medir();
    const raiz = raizRef.current;
    if (!raiz || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(medir);
    obs.observe(raiz);
    return () => obs.disconnect();
  }, [medir]);

  const aoTeclar = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = options.length;
    const passo = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    const alvo = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : passo ? (i + passo + n) % n : -1;
    if (alvo < 0) return;
    e.preventDefault();
    onValueChange(options[alvo]!.value);
    botoes.current[alvo]?.focus();
  };

  return (
    <div
      ref={raizRef}
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative inline-flex items-center rounded-[var(--r-pill)] border border-border bg-muted p-1 text-sm",
        className,
      )}
    >
      {polegar && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 rounded-[var(--r-pill)] bg-background [box-shadow:var(--e-raised)]"
          initial={false}
          animate={{ x: polegar.x, width: polegar.w }}
          transition={reduzido ? { duration: 0 } : DESLIZE}
        />
      )}
      {options.map((o, i) => {
        const ativo = i === escolhido;
        const selo = ativo ? (o.activeBadge ?? o.badge) : o.badge;
        return (
          <button
            key={o.value}
            ref={(no) => {
              botoes.current[i] = no;
            }}
            type="button"
            role="radio"
            aria-checked={ativo}
            tabIndex={ativo ? 0 : -1}
            onClick={() => onValueChange(o.value)}
            onKeyDown={(e) => aoTeclar(e, i)}
            className={cn(
              "relative z-[1] inline-flex h-9 items-center gap-2 rounded-[var(--r-pill)] px-4 font-medium outline-none",
              "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:[box-shadow:var(--focus)]",
              ativo ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {/* Antes da primeira medida, o fundo mora no próprio botão: sem piscar vazio no primeiro quadro. */}
            {ativo && !polegar && (
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] bg-background [box-shadow:var(--e-raised)]" />
            )}
            <span>{o.label}</span>
            {selo && (
              <motion.span
                initial={false}
                variants={reduzido ? undefined : pulo}
                animate={ativo ? "on" : "off"}
                className={cn(
                  "inline-flex h-5 items-center rounded-[var(--r-pill)] px-2 text-xs font-medium tabular-nums",
                  "transition-colors duration-[var(--dur-base)] ease-[var(--ease-out)]",
                  ativo
                    ? "bg-[var(--brand)] text-[var(--brand-foreground)]"
                    : "border border-border bg-background text-muted-foreground",
                )}
              >
                <TrocaFixa texto={selo} reduzido={reduzido} />
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface BillingPriceProps {
  /** O preço a mostrar. Mudou, rola. */
  amount: number;
  /** Prefixo da moeda. */
  currency?: string;
  /** Texto depois do preço, como "/mês". */
  period?: string;
  /** Preço antigo, riscado só quando é maior que `amount`. */
  was?: number;
  /** Locale da formatação: agrupamento de milhar é decisão de mercado. */
  locale?: string;
  className?: string;
}

/** O preço que rola pro valor novo: sobe quando aumenta, desce quando diminui. */
export function BillingPrice({ amount, currency = "R$", period, was, locale = "pt-BR", className }: BillingPriceProps) {
  const reduzido = !!useReducedMotion();
  const anterior = React.useRef(amount);
  const direcao = amount >= anterior.current ? 1 : -1;
  React.useEffect(() => {
    anterior.current = amount;
  }, [amount]);
  const fmt = (v: number) => v.toLocaleString(locale);
  const mostraAntigo = was !== undefined && was > amount;

  return (
    <span className={cn("inline-flex items-baseline gap-2 text-foreground", className)}>
      <span className="inline-flex items-baseline gap-1">
        <span className="text-base text-muted-foreground">{currency}</span>
        <span className="relative inline-grid overflow-hidden text-4xl font-semibold leading-none tabular-nums">
          <AnimatePresence initial={false} custom={direcao}>
            <motion.span
              key={amount}
              custom={direcao}
              className="[grid-area:1/1]"
              variants={reduzido ? quieto : rola}
              initial="antes"
              animate="agora"
              exit="depois"
              transition={reduzido ? { duration: 0.12 } : { type: "spring", visualDuration: 0.3, bounce: 0.15 }}
            >
              {fmt(amount)}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
      {mostraAntigo && (
        <del className="text-sm tabular-nums text-muted-foreground">
          {currency} {fmt(was)}
        </del>
      )}
      {period && <span className="text-sm text-muted-foreground">{period}</span>}
    </span>
  );
}

export default BillingToggle;
