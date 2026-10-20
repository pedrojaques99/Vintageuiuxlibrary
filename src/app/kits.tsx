"use client";

/**
 * Os kits — a unidade que a library vende.
 *
 * A vitrine de 65 cards estava organizada pelo que o repositório TEM, e não
 * pelo que se leva. Ninguém instala um `chip`: instala uma mesa de trabalho e
 * passa a tarde ajustando. O kit é essa unidade — um conjunto curado, com tema
 * próprio, composição viva e **um comando só**.
 *
 * Duas decisões que sustentam o resto do arquivo:
 *
 * - **A lista de peças de um kit é DERIVADA dos imports da sala**
 *   (`scripts/kits-pecas.mjs` → `kits.generated.json`). Foi por família até a
 *   colheita de 2026-10, que pôs 24 peças novas nas famílias: o comando único
 *   da Mesa passou a instalar 34 peças, e a sala só monta 13. Escrita à mão, a
 *   lista envelheceria; por família, ela mente. O import é o único lugar que diz
 *   o que a sala usa.
 * - **A composição é lazy.** Cinco salas montadas de uma vez seriam o dobro do
 *   peso da vitrine antiga — a página que vende puxa GSAP, a mesa puxa dnd-kit,
 *   o rig são treze peças skeuomórficas. Cada sala paga o que usa, quando é
 *   aberta.
 */

import * as React from "react";
import { CATALOG, type CatalogItem } from "./catalog";
import PECAS from "./kits.generated.json";

export interface Kit {
  /** Vai na URL e no `shadcn add @visant/<slug>`. */
  slug: string;
  /** Nome curto, para a barra de navegação entre salas. */
  label: string;
  title: string;
  /** Uma frase. O que a pessoa leva se instalar isto. */
  tese: string;
  /**
   * Sala escura: inverte os tokens no container (`.dark`) em vez de no
   * documento. É o que impede o painel de metal do rig de encostar no papel
   * claro da dobra de aquisição — o defeito que a lista única produzia a cada
   * rolagem.
   */
  escura?: boolean;
  /** Fundo da sala. Ausente = o fundo do tema da marca. */
  fundo?: string;
  Composicao: React.LazyExoticComponent<React.ComponentType>;
}

export const KITS: Kit[] = [
  {
    slug: "mesa-de-trabalho",
    label: "Mesa de trabalho",
    title: "Mesa de trabalho",
    tese: "A tela de dentro do app: board, trilho, linha do tempo e os controles que editam onde se lê.",
    Composicao: React.lazy(() => import("./kits/mesa-de-trabalho")),
  },
  {
    slug: "pagina-que-vende",
    label: "Página que vende",
    title: "Página que vende",
    tese: "A landing inteira na ordem que converte: promessa, serviço, passos, número, prova, acervo, chamada.",
    Composicao: React.lazy(() => import("./kits/pagina-que-vende")),
  },
  {
    slug: "motion-e-estado",
    label: "Motion e estado",
    title: "Motion e estado",
    tese: "O que a interface mostra enquanto o resultado não existe. Tudo rodando, porque parado não se julga.",
    escura: true,
    Composicao: React.lazy(() => import("./kits/motion-e-estado")),
  },
  {
    slug: "rig-vintage",
    label: "Rig vintage",
    title: "Rig vintage",
    tese: "A bancada skeuomórfica completa: knob, fader, VU, osciloscópio e pads, no painel escuro em que foram desenhados.",
    escura: true,
    fundo:
      "radial-gradient(120% 100% at 50% 0%, var(--vintage-surface-2), var(--vintage-surface-1))",
    Composicao: React.lazy(() => import("./VintageRig")),
  },
  {
    slug: "marca-viva",
    label: "Marca viva",
    title: "Marca viva",
    tese: "O que faz os outros quatro trocarem de cor: tema compilado, provider de runtime, hooks e o estado vazio.",
    Composicao: React.lazy(() => import("./kits/marca-viva")),
  },
];

/** As peças de um kit, na ordem do catálogo: as que a sala importa. */
export const pecasDoKit = (kit: Kit): CatalogItem[] => {
  const nomes = new Set((PECAS as Record<string, string[]>)[kit.slug] ?? []);
  return CATALOG.filter((i) => nomes.has(i.name));
};

export const kitPorSlug = (slug: string | null) =>
  KITS.find((k) => k.slug === slug) ?? null;
