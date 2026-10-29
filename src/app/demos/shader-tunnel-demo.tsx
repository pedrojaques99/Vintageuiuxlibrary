"use client";

/**
 * A peça sozinha e grande: é um fundo, e qualquer texto por cima competiria
 * com o shader. Passar o mouse rápido injeta energia.
 */

import { ShaderTunnel } from "../../../registry/visant/ui/shader-tunnel";
import type { DemoProps } from "../catalog";

export default function ShaderTunnelDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ShaderTunnel className="w-[560px] max-w-full rounded-[var(--r-surface)]" {...props} />
    </div>
  );
}
