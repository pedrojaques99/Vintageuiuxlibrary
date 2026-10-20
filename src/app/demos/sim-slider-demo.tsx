"use client";

/**
 * Investimento por mês e a receita que ele projeta, com a premissa embaixo.
 *
 * Uma leitura só do lado do resultado, e o teto da curva desenhado mudo: a
 * versão anterior tinha cinco rótulos para três números (investimento, receita,
 * retorno, "teto da faixa" e a premissa longa), e a peça virava legenda. O
 * retorno é a conta da receita sobre o investimento, então ele já está ali.
 */

import { SimSlider } from "../../../registry/visant/ui/sim-slider";
import type { DemoProps } from "../catalog";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function SimSliderDemo({ props }: DemoProps) {
  return (
    <SimSlider
      className="w-full"
      label="Investimento por mês"
      min={2000}
      max={20000}
      step={500}
      defaultValue={6000}
      format={brl}
      outputs={[{ label: "Receita projetada", value: (v) => brl(v * 3.2), primary: true }]}
      // A projeção distribuída em 12 meses, com a rampa de maturação da
      // campanha. A escala é a faixa inteira (por isso `/ 20000`): arrastar tem
      // que mostrar ganho, não redesenhar a mesma curva cheia.
      curve={(v) =>
        Array.from({ length: 12 }, (_, i) => (v / 20000) * (1 - Math.exp(-(i + 1) / 3.5)))
      }
      assumption="Ticket médio de R$180 e 2,4% de conversão, medidos nos últimos 90 dias. Não é garantia."
      {...props}
    />
  );
}
