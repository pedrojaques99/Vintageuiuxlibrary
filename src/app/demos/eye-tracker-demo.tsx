"use client";

/**
 * Um bot por vez, grande, no fundo neutro do palco. O shader mora no corpo
 * dele, não atrás; as setas trocam a pele (e a forma que combina com ela).
 * Ele olha pro cursor e, com Tab, pro que ganhou foco; clique cumprimenta.
 */

import { EyeTracker, type EyeTrackerProps } from "../../../registry/visant/ui/eye-tracker";
import type { DemoProps } from "../catalog";
import { Trocador, useUmPorVez } from "./um-por-vez";

type Pele = NonNullable<EyeTrackerProps["shader"]>;

const PELES: readonly Pele[] = ["neon", "voronoi", "tunnel"];

/** A forma que cada pele veste melhor. */
const FORMA: Record<Pele, NonNullable<EyeTrackerProps["face"]>> = {
  neon: "card",
  voronoi: "orb",
  tunnel: "glass",
};

export default function EyeTrackerDemo({ props }: DemoProps) {
  const { shader: _s, face: _f, ...resto } = (props ?? {}) as EyeTrackerProps & Record<string, unknown>;
  const { atual, rodada, passo, repetir } = useUmPorVez(PELES, _s);
  // A forma dos knobs vale quando alguém mexe nela; senão, a que combina com a pele.
  const face = _f && _f !== "card" ? _f : FORMA[atual];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <EyeTracker key={`${atual}-${rodada}`} size={150} eyes="pupil" {...resto} shader={atual} face={face} />
      <Trocador nome={atual} onPasso={passo} onRepetir={repetir} rotulo="pele" />
    </div>
  );
}
