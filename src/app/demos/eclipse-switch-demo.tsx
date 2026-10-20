"use client";

/**
 * A chave mostrando o gesto sem mexer na vitrine.
 *
 * A peça não aplica tema nenhum (é decisão do app), e a vitrine não pode
 * escurecer porque alguém clicou num ladrilho. Então o tema escolhido vale só
 * para a janelinha ao lado.
 *
 * A janelinha não pode usar a classe `dark` pra isso: com a vitrine já escura,
 * não existe classe que DESFAÇA o escuro dos ancestrais, e o "Claro" aparecia
 * escuro. Por isso a demo parte do tema real da página e, quando a chave pede o
 * outro, inverte a janelinha pelos próprios tokens (`bg-foreground` com
 * `text-background`). Funciona igual nos dois temas da vitrine.
 */

import * as React from "react";

import { cn } from "@/lib/utils";
import { EclipseSwitch, type Theme } from "../../../registry/visant/ui/eclipse-switch";
import type { DemoProps } from "../catalog";

/** O tema que a página está usando de fato, acompanhando a troca da vitrine. */
function useTemaDaPagina(ref: React.RefObject<HTMLElement | null>): Theme {
  const [tema, setTema] = React.useState<Theme>("light");
  React.useLayoutEffect(() => {
    const ler = () => setTema(ref.current?.closest(".dark") ? "dark" : "light");
    ler();
    const obs = new MutationObserver(ler);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [ref]);
  return tema;
}

export default function EclipseSwitchDemo({ props }: DemoProps) {
  const raiz = React.useRef<HTMLDivElement>(null);
  const pagina = useTemaDaPagina(raiz);
  const [escolha, setEscolha] = React.useState<Theme | null>(null);
  const tema = escolha ?? pagina;
  const invertida = tema !== pagina;

  return (
    <div ref={raiz} className="flex h-full w-full items-center justify-center gap-6">
      {/* Uma chave só: a versão `iconOnly` é a mesma ação num quadrado, e as duas
          lado a lado eram o mesmo controle desenhado duas vezes. Os knobs entram
          primeiro: o tema é da demo, senão a chave travaria no valor do painel. */}
      <EclipseSwitch {...props} theme={tema} onThemeChange={setEscolha} />
      <div
        className={cn(
          "w-56 rounded-[var(--r-surface)] border p-4",
          "transition-[background-color,border-color,color] duration-[var(--dur-slow)] ease-[var(--ease-in-out)]",
          invertida ? "border-transparent bg-foreground text-background" : "border-border bg-background text-foreground",
        )}
      >
        <p className="text-sm font-medium">Pedido 2048</p>
        <p
          className={cn(
            "mt-1 text-xs transition-[color] duration-[var(--dur-slow)] ease-[var(--ease-in-out)]",
            invertida ? "text-background/70" : "text-muted-foreground",
          )}
        >
          Sai amanhã cedo, chega na quinta.
        </p>
        <div
          className={cn(
            "mt-4 h-2 rounded-[var(--r-pill)] transition-[background-color] duration-[var(--dur-slow)] ease-[var(--ease-in-out)]",
            invertida ? "bg-background/20" : "bg-muted",
          )}
        >
          <div className="h-2 w-2/3 rounded-[var(--r-pill)] bg-[var(--brand)]" />
        </div>
      </div>
    </div>
  );
}
