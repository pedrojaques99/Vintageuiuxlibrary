"use client";

/**
 * Três mascotes da mesma família num fundo vivo: o do meio é o que os knobs
 * pilotam (vidro sobre os fios de luz), os dos lados mostram o orbe e o da cor
 * da marca. Todos olham pro cursor e, com Tab, pro rosto que ganhou foco.
 */

import { EyeTracker } from "../../../registry/visant/ui/eye-tracker";
import { ShaderNeon } from "../../../registry/visant/ui/shader-neon";
import type { DemoProps } from "../catalog";

export default function EyeTrackerDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative flex h-[280px] w-[400px] max-w-full items-center justify-center gap-6 overflow-hidden rounded-[var(--r-surface)]">
        <ShaderNeon
          aria-hidden
          lines={4}
          speed={22}
          amplitude={35}
          glow={38}
          className="!absolute inset-0 !aspect-auto h-full"
        />
        <EyeTracker size={68} face="orb" eyes="dots" greeting="Opa" />
        <EyeTracker size={124} face="glass" eyes="pupil" greeting="Oi, tudo bem?" {...props} />
        <EyeTracker size={68} face="brand" eyes="slant" greeting="Bora" />
      </div>
    </div>
  );
}
