"use client";

/**
 * O overlay de soltar só existe DENTRO do gesto.
 *
 * Mostrado parado, ele é um retângulo tracejado — e um retângulo tracejado não
 * explica por que alguém instalaria um componente para desenhá-lo. O que a peça
 * vende é a sequência: repouso → arquivo pairando → soltou e o sistema aceitou.
 *
 * Por isso o card faz as duas coisas. Aceita **arrasto de verdade** (arraste um
 * arquivo da sua máquina para cima dele) e, para quem está só rolando a vitrine,
 * o botão **encena o gesto** no mesmo estado que o `dragover` produziria. A
 * encenação não é uma segunda implementação: ela troca a mesma prop que o evento
 * do browser trocaria.
 */

import * as React from "react";

import { Chip } from "../../../registry/visant/ui/chip";
import { Media } from "../media";
import { DropOverlay } from "../../../registry/visant/ui/drop-overlay";
import type { DemoProps } from "../catalog";

type Estado = "idle" | "over" | "drop";

const INICIAL = 3;
const TETO = 6;

export default function DropOverlayDemo({ props }: DemoProps) {
  const [estado, setEstado] = React.useState<Estado>("idle");
  const [arquivos, setArquivos] = React.useState(INICIAL);
  const timers = React.useRef<number[]>([]);

  const limpar = React.useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  React.useEffect(() => limpar, [limpar]);

  const agendar = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /** O fecho do gesto — o mesmo para o arrasto de verdade e para a encenação. */
  const aceitar = React.useCallback((quantos: number) => {
    setEstado("drop");
    agendar(() => {
      setArquivos((n) => (n >= TETO ? INICIAL : Math.min(TETO, n + quantos)));
      setEstado("idle");
    }, 620);
  }, []);

  const encenar = () => {
    limpar();
    setEstado("over");
    agendar(() => aceitar(1), 900);
  };

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div
        className="relative flex-1 rounded-[var(--r-surface,0.875rem)] border border-border bg-card p-3"
        onDragOver={(e) => {
          // Sem o `preventDefault` o browser abre o arquivo numa aba nova e o
          // `drop` nunca chega ao React — é o defeito clássico de zona de upload.
          e.preventDefault();
          setEstado("over");
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setEstado("idle");
        }}
        onDrop={(e) => {
          e.preventDefault();
          limpar();
          aceitar(Math.max(1, e.dataTransfer?.files?.length ?? 1));
        }}
      >
        <div className="grid h-full grid-cols-3 grid-rows-2 gap-2">
          {Array.from({ length: arquivos }, (_, i) => (
            <Media
              key={i}
              papel="cena"
              indice={i}
              className="h-full w-full rounded-[var(--r-control,0.5rem)]"
            />
          ))}
          {arquivos < TETO ? (
            <div className="grid h-full place-items-center rounded-[var(--r-control,0.5rem)] border border-dashed border-border text-[1.1rem] text-muted-foreground">
              +
            </div>
          ) : null}
        </div>

        <DropOverlay state={estado} message="Solte os arquivos" doneMessage="Recebido" {...props} />
      </div>

      <div className="flex justify-center">
        <Chip className="alvo-toque" onClick={encenar}>
          simular arrasto
        </Chip>
      </div>
    </div>
  );
}
