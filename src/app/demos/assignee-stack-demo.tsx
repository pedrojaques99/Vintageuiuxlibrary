"use client";

/**
 * A pilha sozinha no meio de um card é um enfeite. Ela vive numa linha.
 *
 * A demo antiga era uma pilha de três iniciais centralizada num quadro de 5rem:
 * nada dizia o que ela resolve, que é caber a equipe de uma tarefa no canto de
 * uma linha sem roubar espaço do que importa (o nome da tarefa). Por isso o
 * report leu "quase slop, pequeno no catálogo".
 *
 * Aqui ela aparece onde vive — quatro linhas de fila, encostada à direita — e
 * as duas coisas que a peça faz ficam à mão no mesmo card: passar o ponteiro
 * ABRE a pilha e diz o nome de quem está embaixo do cursor, e o "+2" conta quem
 * ficou de fora em vez de ser um número mudo.
 *
 * Foto de verdade nos avatares, do banco da vitrine — o fallback de iniciais
 * coloridas só deve aparecer quando FALTA foto, e uma linha inteira de iniciais
 * não testa esse caminho, testa o outro. A última linha fica sem foto de
 * propósito: é o caso real de time novo, e é onde o tom por pessoa se julga.
 */

import * as React from "react";

import { midia, useWireframe } from "../media";
import { PEOPLE } from "../demo-fixtures";
import { AssigneeStack, type Assignee } from "../../../registry/visant/ui/assignee-stack";

/** Mais gente do que cabe: o excedente é a parte da peça que se quer ver. */
const EQUIPE = [
  ...PEOPLE,
  { id: "6", name: "Bia Nogueira" },
  { id: "7", name: "Téo Sampaio" },
];

const FILA = [
  { titulo: "Rebrand Ribalta", coluna: "Revisão", pessoas: [0, 1, 2, 3, 4], foto: true },
  { titulo: "Landing Casa Vinte", coluna: "Fazendo", pessoas: [1, 5], foto: true },
  { titulo: "Manual de marca v2", coluna: "Fazendo", pessoas: [2, 3, 0, 6, 4, 5], foto: true },
  { titulo: "Naming da linha nova", coluna: "Fila", pessoas: [4, 6, 3], foto: false },
];

export default function AssigneeStackDemo() {
  const { wireframe } = useWireframe();

  // O avatar sai do banco de mídia da vitrine, mas respeita o interruptor de
  // wireframe: sem foto, a peça cai nas iniciais tonalizadas — que é o caminho
  // que precisa ser julgável.
  const comFoto = React.useCallback(
    (indices: number[], foto: boolean): Assignee[] =>
      indices.map((i, ordem) => ({
        ...EQUIPE[i % EQUIPE.length],
        avatarUrl: foto && !wireframe ? midia("retrato", i + ordem)?.src : undefined,
      })),
    [wireframe],
  );

  return (
    <div className="flex h-full w-full flex-col justify-center px-5">
      <ul className="divide-y divide-border rounded-[var(--r-surface,0.875rem)] border border-border bg-card">
        {FILA.map((t) => (
          <li key={t.titulo} className="flex items-center gap-4 px-4 py-3.5">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-corpo font-medium">{t.titulo}</span>
              <span className="text-micro uppercase tracking-[0.12em] text-muted-foreground">
                {t.coluna}
              </span>
            </span>
            {/* `ml-auto` e não `justify-between`: o nome da tarefa é quem pode
                crescer; a pilha tem largura própria e fica ancorada na borda. */}
            <div className="ml-auto shrink-0">
              <AssigneeStack assignees={comFoto(t.pessoas, t.foto)} max={4} size="md" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
