"use client";

/**
 * Uma pergunta de humor com sete respostas: escolha curta, visual e de uma só,
 * o caso em que o cacho ganha de uma lista. Os ícones vêm do lucide; o rótulo
 * da escolhida aparece embaixo, dito pela própria peça.
 */

import { Coffee, Flame, Leaf, Moon, Music, Sun, Zap } from "lucide-react";

import { MagneticSelect } from "../../../registry/visant/ui/magnetic-select";
import type { DemoProps } from "../catalog";

const HUMORES = [
  { value: "sol", label: "Animado", icon: <Sun /> },
  { value: "cafe", label: "Precisando de café", icon: <Coffee /> },
  { value: "folha", label: "Tranquilo", icon: <Leaf /> },
  { value: "fogo", label: "Na correria", icon: <Flame /> },
  { value: "lua", label: "Com sono", icon: <Moon /> },
  { value: "musica", label: "No ritmo", icon: <Music /> },
  { value: "raio", label: "Elétrico", icon: <Zap /> },
];

export default function MagneticSelectDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <MagneticSelect label="Como está o seu dia?" options={HUMORES} {...props} />
    </div>
  );
}
