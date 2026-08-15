"use client";

/**
 * A pastilha dentro de um filtro de verdade.
 *
 * A demo antiga eram três pastilhas soltas e centralizadas, e uma delas existia
 * só pra provar que `count={0}` não renderiza — a promessa da peça demonstrada
 * num vácuo, sem nada pra filtrar. Dava pra ver a cor trocar e mais nada.
 *
 * Aqui a barra manda num acervo real: as contagens saem do MESMO catálogo que os
 * cards abaixo, cruzadas entre os dois eixos. Isso faz a peça mostrar de graça
 * as três coisas que ela promete e que nenhuma pastilha solta consegue mostrar:
 *
 * · a contagem que **muda** quando o outro eixo muda,
 * · a faceta que zera — pastilha sem número e desligada, em vez de "(0)",
 * · o estado ligado carregando a marca no meio de uma fileira de desligadas.
 */

import * as React from "react";

import { Chip } from "../../../registry/visant/ui/chip";
import { Media, proporcao, type Papel } from "../media";

type Formato = "alto" | "quadrado" | "largo";

interface Peca {
  papel: Papel;
  indice: number;
  formato: Formato;
}

/** O formato sai da proporção REAL do arquivo — nada de rótulo escrito à mão. */
const formatoDe = (papel: Papel, indice: number): Formato => {
  const [w, h] = proporcao(papel, indice).split("/").map(Number);
  const r = w / h;
  if (r < 0.92) return "alto";
  if (r > 1.08) return "largo";
  return "quadrado";
};

const ACERVO: Peca[] = (
  [
    ...Array.from({ length: 7 }, (_, i) => ["retrato", i] as const),
    ...Array.from({ length: 8 }, (_, i) => ["cena", i] as const),
    ...Array.from({ length: 4 }, (_, i) => ["textura", i] as const),
  ] as Array<readonly [Papel, number]>
).map(([papel, indice]) => ({ papel, indice, formato: formatoDe(papel, indice) }));

const PAPEIS: Papel[] = ["cena", "retrato", "textura"];
const FORMATOS: Formato[] = ["alto", "quadrado", "largo"];

export default function ChipDemo() {
  const [papel, setPapel] = React.useState<Papel | null>(null);
  const [formato, setFormato] = React.useState<Formato | null>(null);

  const casa = React.useCallback(
    (p: Peca, eixoPapel: Papel | null, eixoFormato: Formato | null) =>
      (!eixoPapel || p.papel === eixoPapel) && (!eixoFormato || p.formato === eixoFormato),
    [],
  );

  const resultado = ACERVO.filter((p) => casa(p, papel, formato));

  // Contagem de faceta: cada pastilha conta o que sobraria com ELA ligada, já
  // respeitando o outro eixo. É o número que a loja grande mostra, e é o que
  // impede a pessoa de clicar num filtro que devolve tela vazia.
  const contaPapel = (v: Papel) => ACERVO.filter((p) => casa(p, v, formato)).length;
  const contaFormato = (v: Formato) => ACERVO.filter((p) => casa(p, papel, v)).length;

  const limpo = !papel && !formato;
  const assinatura = `${papel ?? "-"}:${formato ?? "-"}`;

  return (
    <div className="flex h-full w-full flex-col gap-3.5 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-destaque font-semibold tracking-tight">Acervo</span>
        <span className="font-mono text-micro uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
          {resultado.length} de {ACERVO.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        <Eixo rotulo="papel">
          {PAPEIS.map((v) => {
            const n = contaPapel(v);
            return (
              <Chip
                key={v}
                size="sm"
                pressed={papel === v}
                count={n}
                disabled={n === 0}
                className="rounded-[var(--r-pill,9999px)]"
                onClick={() => setPapel((a) => (a === v ? null : v))}
              >
                {v}
              </Chip>
            );
          })}
        </Eixo>

        <Eixo rotulo="formato">
          {FORMATOS.map((v) => {
            const n = contaFormato(v);
            return (
              <Chip
                key={v}
                size="sm"
                pressed={formato === v}
                count={n}
                disabled={n === 0}
                className="rounded-[var(--r-pill,9999px)]"
                onClick={() => setFormato((a) => (a === v ? null : v))}
              >
                {v}
              </Chip>
            );
          })}
          {/* Só aparece quando há o que limpar: botão que não faz nada é a
              mesma mentira que a contagem zero. */}
          {limpo ? null : (
            <button
              type="button"
              onClick={() => {
                setPapel(null);
                setFormato(null);
              }}
              className="alvo-toque ml-auto shrink-0 rounded-[var(--r-pill,9999px)] px-2 font-mono text-micro uppercase tracking-[0.12em] text-muted-foreground underline decoration-dotted underline-offset-4 outline-none transition-colors [transition-duration:var(--dur-fast)] hover:text-foreground focus-visible:text-foreground"
            >
              limpar
            </button>
          )}
        </Eixo>
      </div>

      <div
        key={assinatura}
        className="grid grid-cols-6 gap-2 animate-in fade-in-0 [animation-duration:var(--dur-base)] [animation-timing-function:var(--ease-out)] motion-reduce:animate-none"
      >
        {resultado.slice(0, 11).map((p) => (
          <Media
            key={`${p.papel}-${p.indice}`}
            papel={p.papel}
            indice={p.indice}
            ratio="1/1"
            className="rounded-[var(--r-control,0.5rem)] border border-border"
          />
        ))}
        {/* O resto tem número: duas fileiras que acabam sem aviso fariam a
            contagem lá em cima parecer errada. */}
        {resultado.length > 11 ? (
          <div className="flex aspect-square items-center justify-center rounded-[var(--r-control,0.5rem)] border border-dashed border-border font-mono text-apoio tabular-nums text-muted-foreground">
            +{resultado.length - 11}
          </div>
        ) : null}
        {resultado.length === 0 ? (
          <div className="col-span-6 rounded-[var(--r-control,0.5rem)] border border-dashed border-border py-6 text-center text-apoio text-muted-foreground">
            nada nesse cruzamento
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Eixo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[58px] shrink-0 font-mono text-micro uppercase tracking-[0.14em] text-muted-foreground">
        {rotulo}
      </span>
      {children}
    </div>
  );
}
