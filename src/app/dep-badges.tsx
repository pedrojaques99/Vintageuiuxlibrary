"use client";

/**
 * O que o item arrasta para o `package.json`, dito na tela.
 *
 * A pergunta que isto responde é anterior ao "serve pro meu caso?": é
 * *"quanto custa?"*. Quem tem orçamento de bundle decide por aqui se abre o
 * item — e o `timeline` puxando `framer-motion` é informação que muda a
 * decisão, não detalhe de implementação.
 *
 * Duas roupas, porque são dois gestos diferentes:
 *
 * - `icones` no card: reconhecer de longe, varrendo a grade. Clicar FILTRA — na
 *   vitrine, ver "gsap" e querer "então me mostra tudo que puxa gsap" é o
 *   movimento seguinte, e mandar a pessoa pro npm no meio da varredura seria
 *   tirá-la da página.
 * - `lista` na ficha de foco: ler com calma, com nome por extenso. Aqui o clique
 *   ABRE a doc da lib, porque a pessoa já parou no item e a dúvida virou "o que
 *   é essa lib?".
 *
 * O logo é `mask-image` da Iconify com `background-color: currentColor` — o
 * porquê está em `deps.ts`. Consequência prática: não existe hex neste arquivo,
 * e a faixa acompanha a marca que estiver aplicada, inclusive no hover.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { depsOf, iconUrl, type DepInfo } from "./deps";

/** O logo em si. `aria-hidden`: quem lê tela ouve o nome, que já está do lado. */
function Logo({ icon, className }: { icon: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("shrink-0 bg-current", className)}
      style={{
        // Os dois prefixos: o Safari só entendeu `mask-image` sem prefixo a
        // partir do 15.4, e a vitrine é a primeira coisa que um cliente abre.
        WebkitMaskImage: `url(${iconUrl(icon)})`,
        maskImage: `url(${iconUrl(icon)})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

/**
 * O logo solto, para quem monta o próprio controle — é o que o chip de filtro
 * recebe. Herda `currentColor`, então acompanha o chip quando ele acende.
 */
export function DepLogo({ icon, className = "h-3.5 w-3.5" }: { icon: string; className?: string }) {
  return <Logo icon={icon} className={className} />;
}

/** O texto do `title`: nome, pacotes de verdade e o que o clique faz. */
const titulo = (dep: DepInfo, acao: string) =>
  `${dep.packages.join(" · ")}\n${acao}`;

/**
 * Sem logo na Iconify, o nome ocupa o lugar do ícone.
 *
 * Deixar o buraco quebraria a leitura da faixa: um item com `gsap` e `lenis`
 * mostraria um ícone só e pareceria puxar uma dependência.
 */
function Marca({ dep, compacto }: { dep: DepInfo; compacto: boolean }) {
  if (dep.icon) return <Logo icon={dep.icon} className={compacto ? "h-3.5 w-3.5" : "h-3 w-3"} />;
  if (compacto)
    return <span className="text-casa-sm leading-none">{dep.label}</span>;
  return null;
}

const INTERACAO =
  "transition-colors [transition-duration:var(--dur-fast,160ms)] [transition-timing-function:var(--ease-out)] hover:text-casa-fg focus-visible:text-casa-fg outline-none";

export function DepBadges({
  name,
  variant = "lista",
  onPick,
  className,
}: {
  name: string;
  variant?: "icones" | "lista";
  /** Só no `icones`: filtra a grade por esta dependência. Ausente = vira link. */
  onPick?: (dep: string) => void;
  className?: string;
}) {
  const deps = depsOf(name);
  if (!deps.length) return null;

  if (variant === "icones") {
    return (
      <span className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
        {deps.map((dep) =>
          onPick ? (
            <button
              key={dep.key}
              type="button"
              // O card inteiro é clicável em volta: sem isto, filtrar por gsap
              // também abriria a peça em foco.
              onClick={(e) => {
                e.stopPropagation();
                onPick(dep.key);
              }}
              title={titulo(dep, "filtrar por esta dependência")}
              aria-label={`Filtrar por ${dep.label}`}
              className={cn("alvo-toque inline-flex items-center", INTERACAO)}
            >
              <Marca dep={dep} compacto />
            </button>
          ) : (
            <span
              key={dep.key}
              title={dep.packages.join(", ")}
              className="inline-flex items-center"
            >
              <Marca dep={dep} compacto />
            </span>
          ),
        )}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1", className)}>
      {deps.map((dep) => (
        <a
          key={dep.key}
          href={dep.href}
          target="_blank"
          rel="noreferrer"
          title={titulo(dep, dep.href)}
          // Logo e nome, em texto: nome de pacote é identificador, e o logo
          // já o separa de uma palavra comum sem precisar de pastilha.
          className={cn("inline-flex items-center gap-1.5 rounded-control text-casa-sm text-casa-fg-2", INTERACAO)}
        >
          <Marca dep={dep} compacto={false} />
          {dep.label}
        </a>
      ))}
    </div>
  );
}

/**
 * A frase que fecha a conta na ficha de foco.
 *
 * Item sem dependência é o caso mais comum do registry e o mais vendável — dizer
 * "nenhuma" em voz alta vale mais que a ausência de uma seção.
 */
export function DepResumo({ name, className }: { name: string; className?: string }) {
  const deps = depsOf(name);
  return (
    <div className={cn("flex items-baseline gap-3", className)}>
      <span className="shrink-0 text-casa-sm text-casa-fg-3">Pacotes</span>
      {deps.length ? (
        <DepBadges name={name} />
      ) : (
        <span className="text-casa-sm text-casa-fg-2">Nenhum, só os tokens da marca</span>
      )}
    </div>
  );
}
