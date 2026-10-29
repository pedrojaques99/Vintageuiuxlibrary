"use client";

/**
 * A medida vira produto — e o produto aparece.
 *
 * A demo antiga arrastava um número e trocava duas palavras de texto embaixo
 * ("taco sugerido: Junior 52"). A peça inteira existe pra fazer a conversão que
 * o comprador não sabe fazer, e a conversão só convence quando ela CHEGA em
 * algo comprável: a foto, o código, a faixa de flex e o preço. Com texto, quem
 * arrasta não vê que mudou de produto — vê que mudou de string.
 *
 * O cartão mora no `children` da peça, e não ao lado dela, porque é ali que a
 * troca de faixa já é um evento: o `key` interno remonta o bloco, então mudar
 * de faixa REAPARECE enquanto arrastar dentro da mesma faixa não pisca. Um
 * cartão montado por fora perderia isso e teria que reimplementar o mesmo
 * cuidado.
 */

import * as React from "react";

import { MeasurePicker, type MeasureBand } from "../../../registry/visant/ui/measure-picker";
import { Media, type Papel } from "../media";
import type { DemoProps } from "../catalog";

interface Modelo {
  tier: string;
  codigo: string;
  preco: string;
  flex: string;
  papel: Papel;
  indice: number;
}

const FAIXAS: MeasureBand<Modelo>[] = [
  {
    max: 150,
    value: { tier: "P", codigo: "46 cm", preco: "R$ 279", flex: "até 150 cm", papel: "cena", indice: 6 },
  },
  {
    max: 168,
    value: { tier: "M", codigo: "52 cm", preco: "R$ 349", flex: "até 168 cm", papel: "cena", indice: 0 },
  },
  {
    max: 185,
    value: { tier: "G", codigo: "60 cm", preco: "R$ 429", flex: "até 185 cm", papel: "cena", indice: 3 },
  },
  {
    max: 200,
    value: { tier: "GG", codigo: "62 cm", preco: "R$ 589", flex: "até 200 cm", papel: "cena", indice: 2 },
  },
];

export default function MeasurePickerDemo({ props }: DemoProps) {
  const [altura, setAltura] = React.useState(163);

  return (
    // `accent-color` no palco, não no componente: o item não deve decidir a cor
    // do range nativo — quem instala escolhe, e aqui a escolha é o token da marca.
    <div className="flex h-full w-full flex-col justify-center p-5 [&_input[type=range]]:accent-[var(--brand)]">
      <MeasurePicker
        min={130}
        max={200}
        value={altura}
        onValueChange={setAltura}
        label="Sua altura"
        edgeLabels={["130 cm", "200 cm"]}
        formatValue={(x) => `${x} cm`}
        bands={FAIXAS}
        {...props}
      >
        {(faixa) => {
          const t = faixa.value;
          return (
            <div className="mt-2 flex items-center gap-4 rounded-[var(--r-surface,0.875rem)] border border-border p-3">
              <Media
                papel={t.papel}
                indice={t.indice}
                ratio="1/1"
                className="w-[92px] shrink-0 rounded-[var(--r-control,0.5rem)] border border-border"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-destaque font-semibold tracking-tight">
                  Modelo {t.tier} {t.codigo}
                </span>
                <span className="font-mono text-micro uppercase tracking-[0.14em] text-muted-foreground">
                  {t.flex} · corte na medida
                </span>
              </div>
              <span className="ml-auto shrink-0 font-mono text-destaque tabular-nums">
                {t.preco}
              </span>
            </div>
          );
        }}
      </MeasurePicker>
    </div>
  );
}
