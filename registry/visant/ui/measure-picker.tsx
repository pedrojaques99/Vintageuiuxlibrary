"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * MeasurePicker — escolher por medida em vez de por código.
 *
 * Colhido do concept Hockey Direct, e a ideia vale muito além de hóquei:
 *
 * **Pergunte o que o cliente SABE responder.** Ele sabe a altura dele; não sabe
 * quantas polegadas o cabo deve ter. Toda vez que a loja pede a conversão ao
 * comprador, ela compra devolução. O componente recebe a medida que a pessoa
 * conhece e devolve o código do produto.
 *
 * ── Por que um `<input type="range">` de verdade ────────────────────────────
 * De graça vêm teclado (setas, Home/End), leitor de tela, arraste no toque e
 * repetição de tecla. Um "slider" montado com `div` e `pointermove` fica bonito
 * e inacessível — e ninguém percebe até um usuário de teclado tentar comprar.
 *
 * ── O que estava quebrado (e por que parecia "tímido") ──────────────────────
 * A pintura dos pseudo-elementos morava SÓ no `css` do `registry.json`, isto é,
 * só chegava em quem instalasse o item pelo `shadcn add`. Aqui dentro da vitrine
 * — e em qualquer projeto que copie o arquivo na mão — a classe `.measure-range`
 * não existia em CSS nenhum: o que aparecia era o range cru do browser, sem
 * trilha, sem polegar e sem transição. Daí "sem transition, sem interatividade":
 * não era timidez de desenho, era desenho que nunca chegou na tela.
 *
 * Agora a pintura mora nas classes do próprio componente (variantes arbitrárias
 * do Tailwind nos pseudo-elementos). O item passa a ser autossuficiente: quem
 * copia o arquivo recebe o desenho junto. A classe `.measure-range` fica no
 * lugar por compatibilidade com quem já instalou o CSS do registry — utilities
 * ganham de `@layer components`, então as duas convivem sem briga.
 *
 * ── A faixa desenhada na trilha ─────────────────────────────────────────────
 * As `bands` eram invisíveis: o comprador só descobria que mudou de tamanho
 * DEPOIS de arrastar. Um seletor de faixa que não mostra onde a faixa muda pede
 * que a pessoa adivinhe o resultado do próprio gesto. Agora cada faixa é um
 * segmento da trilha, com o divisor no ponto exato da troca — dá para mirar
 * antes de arrastar, e a mudança de faixa vira um evento visível.
 */

export interface MeasureBand<T> {
  /** Limite superior desta faixa, inclusivo. */
  max: number;
  value: T;
  note?: string;
}

export interface MeasurePickerProps<T> {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (v: number) => void;
  /** Faixas em ordem crescente de `max`. A última costuma ser `Infinity`. */
  bands: MeasureBand<T>[];
  label: string;
  /** Rótulo mostrado nas pontas da trilha. */
  edgeLabels?: [string, string];
  /** Formata o valor de entrada (ex.: 175 → "175cm · 5ft 9in"). */
  formatValue?: (v: number) => string;
  /**
   * Esconde a linha de cabeçalho (rótulo + valor). Aditivo e desligado por
   * padrão: o valor formatado só existia no `aria-valuetext`, ou seja, quem
   * enxerga nunca via o número que estava escolhendo.
   */
  hideReadout?: boolean;
  className?: string;
  children?: (band: MeasureBand<T>, value: number) => React.ReactNode;
}

/** Metade do polegar. A trilha desenhada recua isso nas duas pontas para que o
 *  divisor da faixa caia embaixo do CENTRO do polegar, não da borda dele. */
const THUMB_HALF = 14;

export function MeasurePicker<T>({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  bands,
  label,
  edgeLabels,
  formatValue,
  hideReadout = false,
  className,
  children,
}: MeasurePickerProps<T>) {
  const bandIndex = Math.max(
    0,
    bands.findIndex((b) => value <= b.max),
  );
  const band = bands[bandIndex] ?? bands[bands.length - 1];
  const id = React.useId();

  const span = max - min || 1;
  const pct = (v: number) => `${((Math.min(max, Math.max(min, v)) - min) / span) * 100}%`;

  // Segmentos da trilha: um por faixa, do fim da anterior até o `max` dela.
  // `Infinity` na última é o caso normal — vira o fim da trilha.
  const segments = bands.map((b, i) => {
    const from = i === 0 ? min : bands[i - 1].max;
    const to = Number.isFinite(b.max) ? Math.min(b.max, max) : max;
    return { from, to, band: b, index: i };
  });

  return (
    <div className={cn("w-full", className)}>
      {/* O `label` fica sempre sr-only: o rótulo visível abaixo é decorativo
          (`aria-hidden` no valor), e amarrar os dois faria o leitor de tela ler
          o nome duas vezes. */}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      {hideReadout ? null : (
        // Rótulo · valor: a anatomia mínima. Sem isto o número que a pessoa
        // está escolhendo só existia para o leitor de tela.
        <div aria-hidden="true" className="mb-1 flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-bold uppercase leading-none tracking-[0.1em] text-[var(--muted-foreground)]">
            {label}
          </span>
          <span className="font-mono text-[13px] leading-none tabular-nums text-[var(--foreground)]">
            {formatValue ? formatValue(value) : value}
          </span>
        </div>
      )}

      <div className="relative isolate">
        {/* Trilha desenhada. `pointer-events-none` porque quem recebe o gesto é
            sempre o input nativo por cima — a trilha é só a evidência. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2"
          style={{ paddingInline: THUMB_HALF }}
        >
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            {segments.map((s) => (
              <span
                key={s.index}
                className={cn(
                  "absolute inset-y-0 transition-colors [transition-duration:var(--dur-base,200ms)] [transition-timing-function:var(--ease-out,ease)]",
                  s.index === bandIndex
                    ? "bg-[var(--brand,var(--foreground))]"
                    : s.index < bandIndex
                      ? "bg-[var(--foreground)] opacity-30"
                      : "bg-transparent",
                )}
                style={{ left: pct(s.from), right: `calc(100% - ${pct(s.to)})` }}
              />
            ))}
            {/* Divisores: onde a recomendação troca. É o que dá para mirar. */}
            {segments.slice(0, -1).map((s) => (
              <span
                key={`div-${s.index}`}
                className="absolute inset-y-0 w-px bg-[var(--background)]"
                style={{ left: pct(s.to) }}
              />
            ))}
          </div>
        </div>

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          aria-valuetext={formatValue ? formatValue(value) : undefined}
          className={cn(
            // `measure-range` fica pelo CSS do registry (quem já instalou).
            // O desenho abaixo é do componente, para ele não depender disso.
            "measure-range relative z-10 h-10 w-full cursor-grab appearance-none bg-transparent",
            "active:cursor-grabbing focus-visible:outline-none",
            // Trilha nativa some: quem pinta é a camada de faixas acima.
            "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent",
            "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent",
            // Polegar: 28px, o alvo de toque que o dedo pede.
            "[&::-webkit-slider-thumb]:-mt-[11px] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--foreground)] [&::-webkit-slider-thumb]:bg-[var(--background)]",
            "[&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--foreground)] [&::-moz-range-thumb]:bg-[var(--background)]",
            // Só `transform` e `box-shadow` animam — nada de largura/altura.
            "[&::-webkit-slider-thumb]:transition-[transform,box-shadow] [&::-webkit-slider-thumb]:[transition-duration:var(--dur-press,120ms)] [&::-webkit-slider-thumb]:[transition-timing-function:var(--ease-out,ease)]",
            "[&::-moz-range-thumb]:transition-[transform,box-shadow] [&::-moz-range-thumb]:[transition-duration:var(--dur-press,120ms)] [&::-moz-range-thumb]:[transition-timing-function:var(--ease-out,ease)]",
            // Repouso · hover · foco · press, distinguíveis nos dois temas
            // porque todos saem de token, não de cor fixa.
            "[&::-webkit-slider-thumb]:shadow-[0_0_0_0_var(--muted)] [&::-moz-range-thumb]:shadow-[0_0_0_0_var(--muted)]",
            "hover:[&::-webkit-slider-thumb]:shadow-[0_0_0_5px_var(--muted)] hover:[&::-moz-range-thumb]:shadow-[0_0_0_5px_var(--muted)]",
            "focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_3px_var(--brand,var(--foreground))] focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_3px_var(--brand,var(--foreground))]",
            "active:[&::-webkit-slider-thumb]:scale-90 active:[&::-moz-range-thumb]:scale-90",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      {edgeLabels ? (
        <div className="flex justify-between text-[12px] font-bold uppercase tracking-[0.1em]">
          <span>{edgeLabels[0]}</span>
          <span>{edgeLabels[1]}</span>
        </div>
      ) : null}

      {children ? (
        // `key` na faixa: trocar de faixa é o evento que importa aqui, então a
        // recomendação REAPARECE em vez de trocar o texto no lugar. Arrastar
        // dentro da mesma faixa não anima nada — o valor segue o dedo.
        <div
          key={bandIndex}
          className="mt-2 animate-in fade-in-0 slide-in-from-bottom-1 [animation-duration:var(--dur-base,200ms)] [animation-timing-function:var(--ease-out,ease)]"
        >
          {children(band, value)}
        </div>
      ) : null}
    </div>
  );
}
