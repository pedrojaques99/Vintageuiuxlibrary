"use client";

/**
 * Um catálogo de cinco páginas: capa, abertura de texto, dois objetos e o fecho.
 *
 * A capa antiga era foto com uma caixinha de card por cima ("Edição 07 /
 * Objetos sem pressa") e as páginas internas, foto com legenda em corpo de
 * formulário. Lia como componente, não como revista. Aqui a capa é capa: o
 * objeto sangrado sobre o papel, a manchete grande no topo e o número da
 * edição no pé, sem caixa nenhuma. As internas seguem uma grade só (margem,
 * fólio no pé, legenda curta), que é o que faz cinco páginas parecerem a
 * mesma publicação.
 */

import { Media, midia, useWireframe } from "../media";
import { PageCurl } from "../../../registry/visant/ui/page-curl";
import type { DemoProps } from "../catalog";

/** Recorte com alpha direto no papel, sem a caixa cinza da `Media`. */
function Objeto({ indice, className }: { indice: number; className?: string }) {
  const { wireframe } = useWireframe();
  const m = midia("cena", indice);
  if (wireframe || !m) return <Media papel="cena" indice={indice} className={className} />;
  return (
    <img
      src={m.src}
      alt=""
      draggable={false}
      className={`object-contain ${className ?? ""}`}
      style={{ filter: "drop-shadow(0 12px 14px color-mix(in oklab, black 30%, transparent))" }}
    />
  );
}

function Folio({ n }: { n: number }) {
  return <span className="absolute bottom-3 right-4 text-[10px] tabular-nums text-muted-foreground">{n}</span>;
}

function Capa() {
  return (
    <div
      className="relative flex size-full flex-col p-5"
      style={{
        background:
          "radial-gradient(110% 70% at 50% 70%, color-mix(in oklab, var(--foreground) 9%, var(--card)), var(--card))",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Objetos</p>
      <h3 className="mt-1 text-[28px] font-semibold leading-[0.95] tracking-tight text-foreground">
        Sem
        <br />
        pressa
      </h3>
      <Objeto indice={2} className="absolute inset-x-4 bottom-8 h-[58%] w-[calc(100%-2rem)]" />
      <span className="absolute bottom-3 left-5 text-[10px] tabular-nums text-muted-foreground">Nº 07</span>
    </div>
  );
}

function Texto({ titulo, corpo, numero }: { titulo: string; corpo: string; numero: number }) {
  return (
    <div className="relative flex size-full flex-col justify-end gap-3 p-6 pb-10">
      <h3 className="text-[22px] font-semibold leading-[1.05] tracking-tight text-foreground">{titulo}</h3>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{corpo}</p>
      <Folio n={numero} />
    </div>
  );
}

function Peca({ indice, nome, legenda, numero }: { indice: number; nome: string; legenda: string; numero: number }) {
  return (
    <div className="relative flex size-full flex-col p-6 pb-10">
      <Objeto indice={indice} className="min-h-0 w-full flex-1" />
      <p className="mt-3 text-[13px] font-medium text-foreground">{nome}</p>
      <p className="text-[11px] leading-snug text-muted-foreground">{legenda}</p>
      <Folio n={numero} />
    </div>
  );
}

const PAGINAS = [
  <Capa key="capa" />,
  <Texto
    key="abre"
    numero={2}
    titulo="Feito pra durar"
    corpo="Peças desenhadas devagar, pra ficar na mesa por anos e não na gaveta."
  />,
  <Peca key="f1" indice={3} numero={3} nome="Troféu" legenda="Latão escovado, base em degrau." />,
  <Peca key="f2" indice={4} numero={4} nome="Caixa" legenda="A embalagem que vira parte do presente." />,
  <Texto
    key="fim"
    numero={5}
    titulo="Até a próxima"
    corpo="A próxima edição sai na virada da estação. Guarda essa num lugar bom."
  />,
];

export default function PageCurlDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <PageCurl pages={PAGINAS} width={280} label="Revista Sem pressa" {...props} />
    </div>
  );
}
