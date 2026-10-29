"use client";

/**
 * O VU com programa entrando por dois caminhos, como numa bancada.
 *
 * O knob GAIN abre e fecha um sinal simulado que corre sozinho — é isso que faz
 * a balística aparecer: ataque rápido, queda lenta, retentor de pico segurando
 * o transiente depois que a agulha já voltou. E a face do medidor aceita a mão
 * direto: arrastar em volta do pivô empurra a agulha, e o programa fica em
 * silêncio por um segundo antes de retomar, em vez de brigar com o dedo.
 *
 * O relógio obedece ao `useStageActive`: card fora da tela, programa parado.
 */

import * as React from "react";

import { useStageActive } from "../stage";
import { VintageMeter } from "../../../registry/vintage/ui/vintage-meter";
import { VintageKnob } from "../../../registry/vintage/ui/vintage-knob";
import type { DemoProps } from "../catalog";

export default function VintageMeterDemo({ props }: DemoProps) {
  const ativo = useStageActive();
  const [ganho, setGanho] = React.useState(6);
  const [nivel, setNivel] = React.useState(4);
  const manualAte = React.useRef(0);
  const t = React.useRef(0);

  React.useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => {
      if (performance.now() < manualAte.current) return;
      t.current += 1;
      // Duas senoides fora de fase mais um estalo esparso: dá frase musical em
      // vez do ruído branco que fazia a agulha tremer no lugar.
      const base =
        0.5 +
        0.3 * Math.sin(t.current * 0.18) +
        0.15 * Math.sin(t.current * 0.47);
      const estalo = Math.random() < 0.06 ? 0.35 : 0;
      setNivel(Math.max(0, Math.min(10, (base + estalo) * (ganho / 5) * 6)));
    }, 120);
    return () => clearInterval(id);
  }, [ativo, ganho]);

  return (
    <div className="flex h-full w-full items-center justify-center gap-4 p-4">
      <VintageKnob label="GAIN" size={64} value={ganho} onChange={setGanho} />
      <VintageMeter
        label="PROGRAM"
        value={nivel}
        onChange={(v) => {
          // A mão manda: o programa só volta um segundo depois do último toque.
          manualAte.current = performance.now() + 1000;
          setNivel(v);
        }}
        {...props}
      />
    </div>
  );
}
