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
 * A pintura toda é CSS nos pseudo-elementos, então o controle continua sendo o
 * controle nativo.
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
  className?: string;
  children?: (band: MeasureBand<T>, value: number) => React.ReactNode;
}

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
  className,
  children,
}: MeasurePickerProps<T>) {
  const band = bands.find((b) => value <= b.max) ?? bands[bands.length - 1];
  const id = React.useId();

  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

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
          "measure-range h-14 w-full cursor-grab bg-transparent active:cursor-grabbing",
        )}
      />

      {edgeLabels ? (
        <div className="flex justify-between text-[12px] font-bold uppercase tracking-[0.1em]">
          <span>{edgeLabels[0]}</span>
          <span>{edgeLabels[1]}</span>
        </div>
      ) : null}

      {children ? children(band, value) : null}
    </div>
  );
}
