"use client";

/**
 * A demo é uma comparação, porque a peça É uma comparação.
 *
 * Uma faixa de logos bonita não prova nada sozinha — logo de cliente sempre
 * PARECE ok quando quem montou já ajustou tudo à mão. O que a peça vende é
 * exatamente o passo que ninguém vê: as mesmas seis marcas, entregues como
 * chegam (altura de arquivo, cada uma com a sua), viram uma fileira com ritmo.
 *
 * Por isso o controle troca entre "cru" e a peça, e por isso os dois estados
 * usam os MESMOS seis SVGs — se a comparação trocasse os desenhos, ela deixaria
 * de ser sobre normalização.
 *
 * Os logos são desenhados aqui e não vêm do acervo: a vitrine não tem marca de
 * terceiro no banco de mídia, e caixa cinza no lugar do logo esconderia justo a
 * parte que a peça arruma. A cor é `currentColor` em todos porque token é a
 * regra da casa — o caos que a demo mostra é o de TAMANHO, que é o caro.
 *
 * A faixa puxa GSAP pelo `@visant/marquee`; por isso a demo mora em arquivo
 * próprio, e o pedaço só chega quando o card chega.
 */

import * as React from "react";

import { LogoWall, type LogoWallItem } from "../../../registry/visant/ui/logo-wall";
import { SegmentedControl } from "../../../registry/visant/ui/segmented-control";
import type { DemoProps } from "../catalog";

/**
 * Seis marcas com anatomias de propósito diferentes: wordmark comprido,
 * monograma quadrado, emblema alto. `bruto` é a altura em que cada arquivo
 * chegaria — é ela que produz a fileira torta do modo "cru". `scale` é a
 * correção óptica, o número que se acha olhando.
 */
interface Marca {
  id: string;
  name: string;
  /** Correção óptica: o número que a peça aplica sobre a altura base. */
  scale: number;
  /** A altura em que o arquivo chegaria. Só o modo "cru" usa. */
  bruto: string;
  svg: React.ReactNode;
}

const MARCAS: Marca[] = [
  {
    id: "axion",
    name: "Axion",
    scale: 1,
    bruto: "h-5",
    svg: (
      <svg viewBox="0 0 120 22" fill="currentColor" aria-hidden="true" className="h-full w-auto">
        <path d="M0 22 8 0h4.4l8 22h-4.6l-1.6-4.8H6.2L4.6 22H0Zm7.4-8.4h5L9.9 6.3l-2.5 7.3Z" />
        <path d="m23 22 7-11.2L23.4 0h5l4.2 7 4.2-7h4.9l-6.6 10.8L42 22h-5l-4.4-7.4L28.2 22H23Z" />
        <path d="M47 22V0h4.4v22H47Z" />
        <path d="M57 11c0-6.3 4.3-11 10.4-11S77.8 4.7 77.8 11s-4.3 11-10.4 11S57 17.3 57 11Zm16.4 0c0-4-2.4-6.9-6-6.9s-6 2.9-6 6.9 2.4 6.9 6 6.9 6-2.9 6-6.9Z" />
        <path d="M84 22V0h4.3l9.3 14V0h4.4v22h-4.3l-9.3-14v14H84Z" />
        <circle cx="113" cy="4" r="4" />
      </svg>
    ),
  },
  {
    id: "meridiano",
    name: "Meridiano",
    // Monograma quadrado ocupa a caixa inteira e sai maior que o wordmark do
    // lado; 0,82 é a correção que os põe no mesmo peso.
    scale: 0.82,
    bruto: "h-12",
    svg: (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className="h-full w-auto">
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.4" />
        <path d="M2 16h28M16 2c4 4.4 4 23.6 0 28M16 2c-4 4.4-4 23.6 0 28" stroke="currentColor" strokeWidth="2.4" />
      </svg>
    ),
  },
  {
    id: "northbound",
    name: "Northbound Studio",
    // Wordmark de 9:1 — sem teto de largura ele comeria três vagas da faixa.
    scale: 1.05,
    bruto: "h-3",
    svg: (
      <svg viewBox="0 0 176 18" fill="currentColor" aria-hidden="true" className="h-full w-auto">
        <path d="M0 18V0h3.6l8.2 11.6V0h4v18h-3.6L4 6.4V18H0Z" />
        <path d="M21 9c0-5.2 3.5-9 8.6-9S38.2 3.8 38.2 9s-3.5 9-8.6 9S21 14.2 21 9Zm13.2 0c0-3.2-1.9-5.5-4.6-5.5S25 5.8 25 9s1.9 5.5 4.6 5.5S34.2 12.2 34.2 9Z" />
        <path d="M43 18V0h7.4c4 0 6.6 2.2 6.6 5.6 0 2.4-1.3 4.1-3.4 4.9l4.1 7.5h-4.3l-3.6-6.9H47V18h-4Zm4-10.2h3.2c1.8 0 3-.9 3-2.3s-1.2-2.3-3-2.3H47v4.6Z" />
        <path d="M64.6 18V3.6H59V0h15.2v3.6h-5.6V18h-4Z" />
        <path d="M78 18V0h4v7.2h6.6V0h4v18h-4v-7.2H82V18h-4Z" />
        <path d="M98 11.2V0h4v10.9c0 2.3 1.3 3.6 3.4 3.6s3.4-1.3 3.4-3.6V0h4v11.2c0 4.2-2.9 6.8-7.4 6.8s-7.4-2.6-7.4-6.8Z" />
        <path d="M119 18V0h7.8c3.4 0 5.6 1.7 5.6 4.5 0 1.7-.9 3-2.4 3.7 1.9.6 3 2.1 3 4.2 0 3.3-2.4 5.6-6.2 5.6H119Zm4-10.8h3.2c1.4 0 2.3-.7 2.3-1.9s-.9-1.9-2.3-1.9H123v3.8Zm0 7.4h3.6c1.7 0 2.7-.8 2.7-2.2s-1-2.2-2.7-2.2H123v4.4Z" />
        <path d="M137 9c0-5.2 3.5-9 8.6-9s8.6 3.8 8.6 9-3.5 9-8.6 9-8.6-3.8-8.6-9Zm13.2 0c0-3.2-1.9-5.5-4.6-5.5S141 5.8 141 9s1.9 5.5 4.6 5.5 4.6-2.3 4.6-5.5Z" />
        <path d="M159 18V0h3.6l8.2 11.6V0h4v18h-3.6L163 6.4V18h-4Z" />
      </svg>
    ),
  },
  {
    id: "verso",
    name: "Verso",
    // Emblema alto: a caixa cheia deixa ele monumental ao lado dos wordmarks.
    scale: 0.9,
    bruto: "h-14",
    svg: (
      <svg viewBox="0 0 36 44" fill="none" aria-hidden="true" className="h-full w-auto">
        <path d="M18 1.5 34 8v14c0 9-6.6 16.5-16 20.5C8.6 38.5 2 31 2 22V8l16-6.5Z" stroke="currentColor" strokeWidth="2.4" />
        <path d="m11 18 7 12 7-12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "pauta",
    name: "Pauta",
    scale: 1.15,
    bruto: "h-6",
    svg: (
      <svg viewBox="0 0 56 20" fill="currentColor" aria-hidden="true" className="h-full w-auto">
        <rect y="2" width="10" height="4" rx="2" />
        <rect y="8" width="24" height="4" rx="2" />
        <rect y="14" width="16" height="4" rx="2" />
        <rect x="30" y="2" width="4" height="16" rx="2" />
        <rect x="38" y="2" width="4" height="16" rx="2" />
        <rect x="46" y="2" width="10" height="16" rx="5" />
      </svg>
    ),
  },
  {
    id: "kobo",
    name: "Kobo",
    scale: 0.88,
    bruto: "h-9",
    svg: (
      <svg viewBox="0 0 30 30" fill="currentColor" aria-hidden="true" className="h-full w-auto">
        <path d="M0 30V0h6v12L16 0h7.4L12.6 13 24 30h-7.2L9 18l-3 3.6V30H0Z" />
        <circle cx="26" cy="5" r="4" />
      </svg>
    ),
  },
];

type Modo = "cru" | "peca";

const OPCOES = [
  { value: "cru" as const, label: "cru" },
  { value: "peca" as const, label: "normalizado" },
];

export default function LogoWallDemo({ props }: DemoProps) {
  const [modo, setModo] = React.useState<Modo>("peca");

  const itens = React.useMemo<LogoWallItem[]>(
    () => MARCAS.map((m) => ({ id: m.id, name: m.name, scale: m.scale, logo: m.svg })),
    [],
  );

  return (
    <div className="flex h-full w-full flex-col justify-center gap-6 overflow-hidden px-3">
      <div className="flex justify-center">
        <SegmentedControl<Modo>
          value={modo}
          onChange={setModo}
          options={OPCOES}
          aria-label="Como os logos entram na faixa"
        />
      </div>

      {modo === "cru" ? (
        /* Os mesmos seis SVGs, cada um na altura em que o arquivo chegou. É
           literalmente o que sai de colar seis logos numa `<div>` com `flex`. */
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-foreground">
          {MARCAS.map((m) => (
            <span key={m.id} className={m.bruto}>
              {m.svg}
            </span>
          ))}
        </div>
      ) : (
        <LogoWall items={itens} heading="Confiam na gente" bleed={12} speed={64} {...props} />
      )}
    </div>
  );
}
