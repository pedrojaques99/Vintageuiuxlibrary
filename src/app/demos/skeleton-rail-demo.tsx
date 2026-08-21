"use client";

/**
 * Os cinco esqueletos virando as cinco coisas de verdade, na mesma caixa.
 *
 * ── Por que a cena mostra o conjunto, e não um formato ─────────────────────
 *
 * A demo anterior alternava esqueleto de trilho e trilho, e provava a única
 * coisa que importa numa peça dessas: que a troca não mexe um pixel. Mas
 * mostrava um formato só, e o report leu isso como o que era — um item que só
 * serve no dia em que a tela que carrega é um trilho. Agora a mesma prova roda
 * quatro vezes ao mesmo tempo, uma por formato, com o trilho embaixo.
 *
 * O relógio é UM. Se cada bloco tivesse o seu, o card viraria pisca-pisca e a
 * comparação — que é entre a fileira cinza e a fileira cheia, no mesmo instante
 * — se perderia.
 *
 * ── O que cada par tem que casar, e por isso está cravado ─────────────────
 *
 * · O texto real é `leading-[22px]` com `line-clamp-3`: 3 × 22px = os mesmos
 *   66px do `SkeletonText` com `lineHeight={14} gap={8}`. O clamp é o que
 *   garante três linhas em qualquer largura de coluna.
 * · A linha da lista é 56px cravados nos dois lados, com a mesma régua de 1px
 *   entre elas — 1px vezes quatro linhas já é um salto visível.
 * · A legenda do card é `leading-[14px]` e `leading-[12px]`, que são as alturas
 *   dos dois blocos do `SkeletonCard`.
 *
 * Se alguma dessas divergir, o card do catálogo denuncia sozinho: a cena dá um
 * degrau a cada volta. É de propósito que ela seja o teste.
 *
 * Relógio preso ao `useStageActive` (card fora da tela não gasta timer) e o
 * ciclo para no conteúdo sob `prefers-reduced-motion`: trocar a cena inteira a
 * cada dois segundos é o maior movimento da página, e quem pediu menos
 * movimento não deve receber justo esse.
 */

import * as React from "react";

import { Media } from "../media";
import { useStageActive } from "../stage";
import { Rail } from "../../../registry/visant/ui/rail";
import type { DemoProps } from "../catalog";
import {
  SkeletonRail,
  SkeletonCard,
  SkeletonList,
  SkeletonMedia,
  SkeletonText,
} from "../../../registry/visant/ui/skeleton-rail";

/** As medidas do trilho são UMA, e as duas peças recebem a mesma. É o ponto. */
const MEDIDAS = { itemWidth: 200, gap: 18 } as const;
const CARDS = 5;
const LINHAS = 4;

const RAIO = "var(--r-surface, 0.875rem)";

/** Rótulo de vitrine: distingue os quatro formatos, e não explica nenhum. */
function Formato({ nome, children }: { nome: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="font-mono text-micro uppercase tracking-[0.14em] text-muted-foreground">
        {nome}
      </span>
      {children}
    </div>
  );
}

export default function SkeletonRailDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    if (!ativo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCarregando(false);
      return;
    }
    const id = setTimeout(() => setCarregando((v) => !v), carregando ? 1600 : 3400);
    return () => clearTimeout(id);
  }, [ativo, carregando]);

  return (
    <div className="flex h-full w-full flex-col justify-center gap-6 px-4">
      <div className="grid grid-cols-2 items-start gap-5 sm:grid-cols-4">
        <Formato nome="card">
          {carregando ? (
            <SkeletonCard ratio="4 / 3" label="Carregando o card" />
          ) : (
            <figure className="m-0 min-w-0">
              <Media papel="cena" indice={3} ratio="4/3" className="rounded" />
              <figcaption className="mt-3 truncate text-[0.8125rem] leading-[14px] text-foreground">
                Ensaio de verão
              </figcaption>
              <p className="mt-1.5 truncate text-[0.75rem] leading-[12px] text-muted-foreground">
                12 fotos
              </p>
            </figure>
          )}
        </Formato>

        <Formato nome="mídia">
          {carregando ? (
            <SkeletonMedia ratio="16 / 9" label="Carregando a mídia" />
          ) : (
            <Media
              papel="cena"
              indice={5}
              ratio="16/9"
              className="w-full"
              style={{ borderRadius: RAIO }}
            />
          )}
        </Formato>

        <Formato nome="texto">
          {carregando ? (
            <SkeletonText lines={3} lineHeight={14} gap={8} label="Carregando o texto" />
          ) : (
            <p className="m-0 line-clamp-3 text-[0.8125rem] leading-[22px] text-muted-foreground">
              A coleção nasceu de um arquivo de negativos comprado num sebo de
              Santa Teresa, e levou dois anos pra virar impressão de novo.
            </p>
          )}
        </Formato>

        <Formato nome="lista">
          {carregando ? (
            <SkeletonList rows={LINHAS} rowHeight={56} label="Carregando a lista" />
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {["Marina", "Téo", "Íris", "Bento"].map((nome, i) => (
                <li
                  key={nome}
                  className={`flex h-[56px] min-w-0 items-center gap-3 border-b border-border ${
                    i === LINHAS - 1 ? "border-b-0" : ""
                  }`}
                >
                  <span className="size-9 shrink-0 overflow-hidden rounded-full">
                    <Media papel="retrato" indice={i} className="size-full" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="truncate text-[0.8125rem] leading-[14px] text-foreground">
                      {nome}
                    </span>
                    <span className="truncate text-[0.75rem] leading-[12px] text-muted-foreground">
                      revisão
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[0.75rem] leading-[12px] tabular-nums text-muted-foreground">
                    {String(i + 2).padStart(2, "0")}h
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Formato>
      </div>

      {carregando ? (
        <SkeletonRail cards={CARDS} ratio="4 / 5" label="Carregando a coleção" {...MEDIDAS} {...props} />
      ) : (
        // Sem `heading`/`hint` de propósito: com eles o trilho desenha uma
        // fileira de TEXTO sempre visível, e o esqueleto espelha a fileira de
        // SETAS (dois alvos de 40px, só a partir de `lg`). As duas fileiras têm
        // alturas diferentes, e a troca ganharia um degrau — justamente o salto
        // que esta peça existe pra não deixar acontecer.
        <Rail label="Coleção" {...MEDIDAS}>
          {Array.from({ length: CARDS }).map((_, i) => (
            <figure key={i} className="m-0 min-w-0">
              <Media papel="cena" indice={i} ratio="4/5" className="rounded" />
              {/* Entrelinha cravada, e não a do tema: as duas linhas de texto do
                  esqueleto são blocos de 14px e 12px. Casar a altura da linha é
                  o que faz a troca não mexer um pixel. */}
              <figcaption className="mt-3 truncate text-[0.8125rem] leading-[14px] text-foreground">
                Peça {String(i + 1).padStart(2, "0")}
              </figcaption>
              <p className="mt-1.5 truncate text-[0.75rem] leading-[12px] text-muted-foreground">
                edição limitada
              </p>
            </figure>
          ))}
        </Rail>
      )}
    </div>
  );
}
