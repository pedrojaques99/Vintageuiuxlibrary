"use client";

/**
 * A chave mostrando o gesto sem mexer na vitrine.
 *
 * A peça não aplica tema nenhum (é decisão do app), e a vitrine não pode
 * escurecer porque alguém clicou num ladrilho. Então o tema escolhido vale só
 * para a janelinha ao lado: a classe `dark` fica presa nela, os tokens trocam ali
 * dentro e a página continua como estava. É o mesmo contrato que um produto usa,
 * só que com a janelinha no lugar do `<html>`.
 */

import * as React from "react";

import { cn } from "@/lib/utils";
import { ThemeSwitch, type Theme } from "../../../registry/visant/ui/theme-switch";
import type { DemoProps } from "../catalog";

export default function ThemeSwitchDemo({ props }: DemoProps) {
  const [tema, setTema] = React.useState<Theme>("light");

  return (
    <div className="flex h-full w-full items-center justify-center gap-6">
      {/* Uma chave só: a versão `iconOnly` é a mesma ação num quadrado, e as duas
          lado a lado eram o mesmo controle desenhado duas vezes. Os knobs entram
          primeiro: o tema é da demo, senão a chave travaria no valor do painel. */}
      <ThemeSwitch {...props} theme={tema} onThemeChange={setTema} />

      <div
        className={cn(
          tema === "dark" && "dark",
          "w-56 rounded-[var(--r-surface)] border border-border bg-background p-4 text-foreground",
          "transition-[background-color,border-color,color] duration-[var(--dur-slow)] ease-[var(--ease-in-out)]",
        )}
      >
        <p className="text-sm font-medium">Pedido 2048</p>
        <p className="mt-1 text-xs text-muted-foreground">Sai amanhã cedo, chega na quinta.</p>
        <div className="mt-4 h-2 rounded-[var(--r-pill)] bg-muted">
          <div className="h-2 w-2/3 rounded-[var(--r-pill)] bg-[var(--brand)]" />
        </div>
      </div>
    </div>
  );
}
