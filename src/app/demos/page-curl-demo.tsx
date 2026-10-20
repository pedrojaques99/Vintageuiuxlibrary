"use client";

/**
 * Um catálogo de cinco páginas: capa com foto, abertura de texto, objetos com
 * legenda e o fecho. É a cena em que a peça vende: material editorial que pede
 * para ser folheado, não rolado.
 */

import { Media } from "../media";
import { PageCurl } from "../../../registry/visant/ui/page-curl";
import type { DemoProps } from "../catalog";

function Foto({ indice, legenda, numero }: { indice: number; legenda: string; numero: number }) {
  return (
    <div className="flex size-full flex-col gap-2 p-4">
      <Media papel="cena" indice={indice} className="w-full flex-1 rounded-[var(--r-control)]" />
      <p className="text-xs text-muted-foreground">{legenda}</p>
      <span className="self-end text-[10px] tabular-nums text-muted-foreground">{numero}</span>
    </div>
  );
}

function Texto({ titulo, corpo, numero }: { titulo: string; corpo: string; numero: number }) {
  return (
    <div className="flex size-full flex-col justify-center gap-2 p-5">
      <h3 className="text-lg leading-tight font-medium text-foreground">{titulo}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{corpo}</p>
      <span className="mt-auto self-end text-[10px] tabular-nums text-muted-foreground">{numero}</span>
    </div>
  );
}

const PAGINAS = [
  <div key="capa" className="relative size-full">
    <Media papel="cena" indice={2} className="size-full" />
    <div className="absolute inset-x-3 bottom-3 rounded-[var(--r-control)] bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">Edição 07</p>
      <p className="text-base font-medium text-foreground">Objetos sem pressa</p>
    </div>
  </div>,
  <Texto
    key="abre"
    numero={2}
    titulo="Feito pra durar"
    corpo="Peças que a gente desenhou devagar, pra ficar na mesa por anos."
  />,
  <Foto key="f1" indice={3} numero={3} legenda="O troféu da casa, em latão escovado." />,
  <Foto key="f2" indice={4} numero={4} legenda="A caixa que vira parte do presente." />,
  <Texto
    key="fim"
    numero={5}
    titulo="Até a próxima"
    corpo="A próxima edição sai na virada da estação. Guarda essa num lugar bom."
  />,
];

export default function PageCurlDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <PageCurl pages={PAGINAS} label="Revista Objetos sem pressa" {...props} />
    </div>
  );
}
