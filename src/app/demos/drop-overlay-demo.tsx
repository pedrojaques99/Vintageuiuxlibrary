"use client";

/**
 * O overlay de soltar só existe DENTRO do gesto, então a demo encena o gesto.
 *
 * Uma zona pequena de anexos, e um arquivo fantasma que entra por cima dela em
 * laço: repouso, arquivo pairando, soltou e o sistema aceitou, linha nova na
 * lista. Sem botão de "simular" e sem texto explicando: o laço É a explicação.
 * Arrastar um arquivo de verdade da máquina pra cima da zona também funciona e
 * toma a frente do laço; clicar na zona repete a cena.
 *
 * O relógio para fora da tela (`useStageActive`) e sob movimento reduzido.
 */

import * as React from "react";
import { FileImage, Paperclip } from "lucide-react";

import { DropOverlay } from "../../../registry/visant/ui/drop-overlay";
import { useStageActive } from "../stage";
import type { DemoProps } from "../catalog";

type Estado = "idle" | "over" | "drop";

const BASE = [
  { nome: "briefing.pdf", peso: "1,2 MB" },
  { nome: "referencias.zip", peso: "8,4 MB" },
];
const NOVOS = [
  { nome: "foto-capa.jpg", peso: "2,6 MB" },
  { nome: "paleta.png", peso: "340 KB" },
];

/* A cena em tempos: quanto cada estado dura antes do próximo. */
const TEMPO: Record<Estado, number> = { idle: 1500, over: 1400, drop: 750 };

export default function DropOverlayDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const [estado, setEstado] = React.useState<Estado>("idle");
  const [n, setN] = React.useState(0);
  const [real, setReal] = React.useState(false);
  const [reduzido, setReduzido] = React.useState(false);

  React.useEffect(() => {
    setReduzido(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  }, []);

  // O laço: cada estado agenda o seguinte. Arrasto de verdade suspende a cena.
  React.useEffect(() => {
    if (!ativo || real || reduzido) return;
    const id = window.setTimeout(() => {
      if (estado === "idle") {
        // Lista cheia: volta ao começo no repouso, antes do próximo arrasto.
        setN((v) => (v >= NOVOS.length ? 0 : v));
        setEstado("over");
      } else if (estado === "over") setEstado("drop");
      else {
        setN((v) => Math.min(NOVOS.length, v + 1));
        setEstado("idle");
      }
    }, TEMPO[estado]);
    return () => window.clearTimeout(id);
  }, [estado, ativo, real, reduzido]);

  const lista = [...BASE, ...NOVOS.slice(0, n)];

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div
        className="relative w-[340px] max-w-full cursor-default rounded-[var(--r-surface,0.875rem)] border border-border bg-card p-4"
        onClick={() => {
          setReal(false);
          setEstado("over");
        }}
        onDragOver={(e) => {
          // Sem o `preventDefault` o browser abre o arquivo numa aba nova e o
          // `drop` nunca chega ao React: o defeito clássico de zona de upload.
          e.preventDefault();
          setReal(true);
          setEstado("over");
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setEstado("idle");
          setReal(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setEstado("drop");
          window.setTimeout(() => {
            setN((v) => Math.min(NOVOS.length, v + 1));
            setEstado("idle");
            setReal(false);
          }, TEMPO.drop);
        }}
      >
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Paperclip className="size-4 text-muted-foreground" aria-hidden="true" />
          Anexos
        </p>
        <ul className="mt-3 flex flex-col">
          {lista.map((a) => (
            <li
              key={a.nome}
              className="flex items-center gap-3 border-t border-border py-2.5 text-sm first:border-t-0"
            >
              <FileImage className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-foreground">{a.nome}</span>
              <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{a.peso}</span>
            </li>
          ))}
        </ul>

        <DropOverlay state={estado} message="Solte pra anexar" doneMessage="Anexado" {...props} />

        {/* O arquivo fantasma, encenando o dedo que arrasta. Some no instante do
            soltar: dali em diante quem fala é o overlay. */}
        {!real ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-[60] flex items-center gap-2 rounded-[var(--r-control,0.5rem)] border border-border bg-background px-2.5 py-1.5 text-xs text-foreground [box-shadow:var(--e-raised)] transition-[transform,opacity] [transition-duration:var(--dur-slow)] [transition-timing-function:var(--ease-out)] motion-reduce:transition-none"
            style={{
              opacity: estado === "over" ? 1 : 0,
              transform:
                estado === "over"
                  ? "translate(18%, -64px) rotate(-4deg)"
                  : "translate(70%, -150px) rotate(8deg)",
            }}
          >
            <FileImage className="size-3.5 text-muted-foreground" />
            {NOVOS[n % NOVOS.length].nome}
          </span>
        ) : null}
      </div>
    </div>
  );
}
