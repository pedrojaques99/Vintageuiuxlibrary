"use client";

/**
 * A demo é um controle de volume: é o lugar onde todo mundo já arrastou além
 * do limite esperando mais. Os ícones nas pontas mostram o empurrão junto com
 * o trilho esticado. Arraste até o fim e continue puxando.
 */

import * as React from "react";
import { Volume1, Volume2 } from "lucide-react";

import { ElasticSlider } from "../../../registry/visant/ui/elastic-slider";
import type { DemoProps } from "../catalog";

export default function ElasticSliderDemo({ props }: DemoProps) {
  const [volume, setVolume] = React.useState(64);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="w-full max-w-[320px]">
        <ElasticSlider
          label="Volume"
          value={volume}
          onValueChange={setVolume}
          format={(v) => `${v}%`}
          startIcon={<Volume1 className="size-4" />}
          endIcon={<Volume2 className="size-4" />}
          {...props}
        />
      </div>
    </div>
  );
}
