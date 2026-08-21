"use client";

/**
 * Quatro itens numa fileira, três com arte e um sem.
 *
 * O quarto não é sobra: é o que prova que a estante aguenta acervo real. Todo
 * catálogo tem item sem capa, e é ali que uma prateleira de objetos costuma
 * virar uma prateleira de objetos e um buraco. Aqui ele entra como livro
 * inteiro, com a capa desenhada da mesma semente.
 *
 * Passe o cursor: o rótulo só aparece sob o objeto que está sob o dedo. Com o
 * nome sempre impresso embaixo, o olho leria a LISTA e não a estante.
 */

import * as React from "react";

import { BookShelf, type ShelfItem } from "../../../registry/visant/ui/book-shelf";
import type { DemoProps } from "../catalog";

const ITENS: ShelfItem[] = [
  {
    seed: "atlas-da-oficina",
    title: "Atlas da Oficina",
    art: "/media/retrato-02.webp",
    pages: 240,
    note: "240 páginas",
  },
  {
    seed: "compendio-de-processos",
    title: "Compêndio de Processos",
    art: "/media/retrato-04.webp",
    pages: 900,
    note: "900 páginas",
  },
  {
    seed: "caderno-de-campo",
    title: "Caderno de Campo",
    art: "/media/retrato-06.webp",
    pages: 120,
    note: "120 páginas",
  },
  {
    seed: "arquetipo-sem-astrologia",
    title: "Arquétipo sem astrologia de marca",
    pages: 180,
    note: "sem capa cadastrada",
  },
];

export default function BookShelfDemo({ props }: DemoProps) {
  return (
    /* `grid place-items-center` e não `flex items-center`: num container flex o
       filho encolhe pra caber no conteúdo, e o conteúdo aqui pede `w-full` do
       pai — a largura vira circular e colapsa. O resultado é uma estante de
       quatro canvases de largura zero, que o react-three-fiber nunca configura
       (ele só monta com medida > 0) e que na tela aparece como área em branco,
       sem erro nenhum. */
    <div className="grid h-full w-full place-items-center p-3">
      <BookShelf
        items={ITENS}
        columns="grid-cols-2 sm:grid-cols-4"
        className="w-full"
        {...props}
      />
    </div>
  );
}
