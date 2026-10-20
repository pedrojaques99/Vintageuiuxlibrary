"use client";

/**
 * O cabeçalho de um site com o gatilho, e a escolha entre os dois desenhos da
 * peça: a gaveta lateral (`panel`) e a página inteira brutalista (`full`), com
 * a foto do acervo na metade esquerda.
 *
 * O drawer abre em tela cheia mesmo dentro do card, e é assim que tem que ser:
 * ele é um `Dialog` do Radix, portalizado no `body`. Simular a peça dentro da
 * moldura pediria `container` no portal e `absolute` no painel, e aí a vitrine
 * mostraria uma coisa que não é a que o `shadcn add` entrega.
 */

import * as React from "react";

import {
  NavDrawer,
  NavDrawerBurger,
  NavDrawerClose,
  NavDrawerContent,
  NavDrawerItem,
  NavDrawerList,
  NavDrawerTrigger,
} from "../../../registry/visant/ui/nav-drawer";
import { Media } from "../media";
import type { DemoProps } from "../catalog";

const LINKS = [
  ["Início", "01"],
  ["Serviços", "02"],
  ["Portfólio", "03"],
  ["Contato", "04"],
] as const;

const VARIANTES = [
  ["full", "Página inteira"],
  ["panel", "Gaveta"],
] as const;

export default function NavDrawerDemo({ props }: DemoProps) {
  const [variante, setVariante] = React.useState<"full" | "panel">("full");

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
      <div
        role="group"
        aria-label="Desenho do menu"
        className="inline-flex rounded-[var(--r-control,0.5rem)] border border-border p-0.5"
      >
        {VARIANTES.map(([v, nome]) => (
          <button
            key={v}
            type="button"
            aria-pressed={variante === v}
            onClick={() => setVariante(v)}
            className="rounded-[calc(var(--r-control,0.5rem)-2px)] px-3 py-1.5 text-[length:var(--text-apoio,0.8125rem)] text-muted-foreground outline-none transition-colors [transition-duration:var(--dur-fast)] hover:text-foreground focus-visible:[box-shadow:var(--focus)] aria-pressed:bg-muted aria-pressed:text-foreground"
          >
            {nome}
          </button>
        ))}
      </div>

      {/* O cabeçalho de mentira: marca à esquerda, gatilho à direita. */}
      <div className="flex w-[360px] max-w-full items-center justify-between border-b border-border pb-3">
        <span className="text-[length:var(--text-destaque,0.9375rem)] font-semibold tracking-[-0.02em] text-foreground">
          Marca
        </span>
        <NavDrawer>
          <NavDrawerTrigger asChild>
            <NavDrawerBurger />
          </NavDrawerTrigger>
          <NavDrawerContent
            title="Navegação"
            variant={variante}
            media={<Media papel="video" indice={2} />}
            brand={
              <span className="text-[length:var(--text-destaque,0.9375rem)] font-semibold tracking-[-0.02em] text-foreground">
                Marca
              </span>
            }
            footer={
              <div className="flex items-center justify-between">
                <span>pt-BR</span>
                <span>contato@marca.com</span>
              </div>
            }
            {...props}
          >
            <NavDrawerList>
              {LINKS.map(([label, n], i) => (
                // `NavDrawerClose asChild` em volta do item: em app com router o
                // clique no link não desmonta nada, e o drawer ficaria aberto.
                <NavDrawerClose asChild key={label}>
                  <NavDrawerItem href="#" meta={n} active={i === 0}>
                    {label}
                  </NavDrawerItem>
                </NavDrawerClose>
              ))}
            </NavDrawerList>
          </NavDrawerContent>
        </NavDrawer>
      </div>
    </div>
  );
}
