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
 * - **A lista de peças de um kit é DERIVADA do catálogo**, por família. Uma
 *   lista escrita à mão aqui envelheceria na primeira colheita: peça nova
 *   entraria no catálogo e ficaria fora do kit sem ninguém perceber, e o
 *   comando único passaria a entregar menos do que a sala mostra.
 * - **A composição é lazy.** Cinco salas montadas de uma vez seriam o dobro do
 *   peso da vitrine antiga — a página que vende puxa GSAP, a mesa puxa dnd-kit,
 *   o rig são treze peças skeuomórficas. Cada sala paga o que usa, quando é
 *   aberta.
 */

import * as React from "react";
import { CATALOG, type CatalogItem, type Family } from "./catalog";

export interface Kit {
  /** Vai na URL e no `shadcn add @visant/<slug>`. */
  slug: string;
  /** Nome curto, para a barra de navegação entre salas. */
  label: string;
  title: string;
  /** Uma frase. O que a pessoa leva se instalar isto. */
  tese: string;
  /** De onde saem as peças. A ordem aqui é a ordem da tira. */
  familias: Family[];
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
  /**
   * Peça que existe no kit e NÃO aparece na composição, com o motivo.
   *
   * Sem isto, a tira embaixo da sala vira uma promessa que a sala desmente: a
   * pessoa conta onze nomes, acha nove na tela e conclui que a demo está
   * quebrada. O motivo aparece ao lado do nome.
   */
  ausentes?: Record<string, string>;
}

export const KITS: Kit[] = [
  {
    slug: "mesa-de-trabalho",
    label: "Mesa de trabalho",
    title: "Mesa de trabalho",
    tese: "A tela de dentro do app: board, trilho, linha do tempo e os controles que editam onde se lê.",
    familias: ["trabalho"],
    Composicao: React.lazy(() => import("./kits/mesa-de-trabalho")),
    ausentes: {
      "data-table": "acoplada a Next (next-auth + next/navigation) — roda em app Next, não aqui",
    },
  },
  {
    slug: "pagina-que-vende",
    label: "Página que vende",
    title: "Página que vende",
    tese: "A landing inteira na ordem que converte: promessa, serviço, passos, número, prova, acervo, chamada.",
    familias: ["aquisicao"],
    Composicao: React.lazy(() => import("./kits/pagina-que-vende")),
  },
  {
    slug: "motion-e-estado",
    label: "Motion e estado",
    title: "Motion e estado",
    tese: "O que a interface mostra enquanto o resultado não existe. Tudo rodando, porque parado não se julga.",
    familias: ["motion"],
    escura: true,
    Composicao: React.lazy(() => import("./kits/motion-e-estado")),
    ausentes: {
      "motion-layer": "biblioteca de scroll — sustenta o marquee da página que vende",
      "smooth-scroll-provider": "provider de página inteira; não cabe dentro de um painel",
      "octahedron-loader":
        "quebrado: o .lottie da marca não está no repo (ver bugs/REPORTS.md)",
      "spring-dots":
        "sonda a cor no documento, não no host: nesta sala escura o ponto sai quase preto (ver bugs/REPORTS.md)",
    },
  },
  {
    slug: "rig-vintage",
    label: "Rig vintage",
    title: "Rig vintage",
    tese: "A bancada skeuomórfica completa: knob, fader, VU, osciloscópio e pads, no painel escuro em que foram desenhados.",
    familias: ["vintage"],
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
    familias: ["marca", "fundacao"],
    Composicao: React.lazy(() => import("./kits/marca-viva")),
    ausentes: {
      "vintage-base": "fundação do rig — as variáveis de painel vivem na sala vintage",
      "vintage-theme": "idem: é o tema que a sala vintage aplica",
      "use-knob-drag": "o gesto do knob; se vê arrastando um knob na sala vintage",
      "sfx-bus": "o barramento por trás do botão de som ao lado",
    },
  },
];

/** As peças de um kit, na ordem do catálogo. Fonte única: o catálogo. */
export const pecasDoKit = (kit: Kit): CatalogItem[] =>
  CATALOG.filter((i) => kit.familias.includes(i.family));

export const kitPorSlug = (slug: string | null) =>
  KITS.find((k) => k.slug === slug) ?? null;

/** Em que kit uma peça mora. Usado para levar do catálogo de volta à sala. */
export const kitDaPeca = (name: string): Kit | null => {
  const item = CATALOG.find((i) => i.name === name);
  if (!item) return null;
  return KITS.find((k) => k.familias.includes(item.family)) ?? null;
};
