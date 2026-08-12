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
    return <span className="font-mono text-micro leading-none tracking-tight">{dep.label}</span>;
  return null;
}

const INTERACAO =
  "transition-colors [transition-duration:var(--dur-fast,160ms)] [transition-timing-function:var(--ease-out)] hover:text-[var(--brand)] focus-visible:text-[var(--brand)] outline-none";

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
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {deps.map((dep) => (
        <a
          key={dep.key}
          href={dep.href}
          target="_blank"
          rel="noreferrer"
          title={titulo(dep, dep.href)}
          className={cn(
            // Mono e com fundo, ao contrário das tags logo abaixo: as duas
            // faixas são pastilha e ficam coladas, e sem essa diferença a
            // pessoa lê "dnd-kit" como se fosse tag de busca. Nome de pacote é
            // identificador — a fonte mono diz isso sem precisar de rótulo.
            "inline-flex items-center gap-1.5 rounded-[var(--r-pill,9999px)] border border-border bg-muted/60 px-2 py-0.5 font-mono text-micro text-muted-foreground",
            "hover:border-[var(--brand)] focus-visible:border-[var(--brand)]",
            INTERACAO,
          )}
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
    <div className={className}>
      <h3 className="text-rotulo uppercase tracking-wider text-muted-foreground">
        Dependências npm
      </h3>
      {deps.length ? (
        <DepBadges name={name} className="mt-2" />
      ) : (
        <p className="mt-2 text-rotulo leading-relaxed text-muted-foreground">
          Nenhuma. Só os tokens da marca e o <span className="font-mono">cn</span> do projeto.
        </p>
      )}
    </div>
  );
}
