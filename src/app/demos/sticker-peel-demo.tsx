"use client";

/**
 * Uma prancheta com quatro adesivos espalhados, como tampa de notebook. Clique
 * descola, arrastar muda de lugar. Os
 * knobs pilotam o primeiro (o redondo da marca); os outros mostram que a dobra
 * vale para pílula e quadrado. "Recomeçar" remonta a prancheta.
 */

import * as React from "react";
import { RotateCcw, Sparkles, Star } from "lucide-react";
import { StickerPeel } from "../../../registry/visant/ui/sticker-peel";
import type { DemoProps } from "../catalog";

export default function StickerPeelDemo({ props }: DemoProps) {
  const [rodada, setRodada] = React.useState(0);
  const [mexeu, setMexeu] = React.useState(false);
  const marcar = () => setMexeu(true);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-[280px] w-[380px] max-w-full overflow-hidden rounded-[var(--r-surface)] bg-muted">
        <div key={rodada} className="absolute inset-0">
          <StickerPeel
            label="Selo da marca"
            defaultPosition={{ x: 56, y: 44 }}
            rotate={-6}
            radius="9999px"
            peelOff
            onPeelOff={marcar}
            onPositionChange={marcar}
            {...props}
          >
            <span className="flex size-20 items-center justify-center rounded-[inherit] border-4 border-background bg-[var(--brand)] text-[var(--brand-foreground)]">
              <Star className="size-8" aria-hidden />
            </span>
          </StickerPeel>
          <StickerPeel
            label="Feito com calma"
            defaultPosition={{ x: 200, y: 52 }}
            rotate={5}
            radius="var(--r-pill)"
            peelOff
            onPeelOff={marcar}
            onPositionChange={marcar}
          >
            <span className="block rounded-[inherit] border-4 border-background bg-card px-4 py-2 text-sm font-medium text-foreground">
              Feito com calma
            </span>
          </StickerPeel>
          <StickerPeel
            label="Manda ver"
            defaultPosition={{ x: 84, y: 168 }}
            rotate={-3}
            radius="var(--r-pill)"
            peelOff
            onPeelOff={marcar}
            onPositionChange={marcar}
          >
            <span className="block rounded-[inherit] border-4 border-background bg-foreground px-4 py-2 text-sm font-medium text-background">
              Manda ver
            </span>
          </StickerPeel>
          <StickerPeel
            label="Brilho"
            defaultPosition={{ x: 236, y: 140 }}
            rotate={8}
            radius="var(--r-surface)"
            peelOff
            onPeelOff={marcar}
            onPositionChange={marcar}
          >
            <span className="flex size-16 items-center justify-center rounded-[inherit] border-4 border-background bg-card text-foreground">
              <Sparkles className="size-6" aria-hidden />
            </span>
          </StickerPeel>
        </div>
        <button
          type="button"
          disabled={!mexeu}
          onClick={() => {
            setRodada((r) => r + 1);
            setMexeu(false);
          }}
          className="absolute right-3 bottom-3 z-[999] inline-flex items-center gap-1.5 rounded-[var(--r-control)] bg-card px-3 py-1.5 text-xs text-foreground [box-shadow:var(--e-raised)] transition-opacity duration-[var(--dur-fast)] ease-[var(--ease-out)] outline-none focus-visible:[box-shadow:var(--focus)] disabled:opacity-50"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Recomeçar
        </button>
      </div>
    </div>
  );
}
