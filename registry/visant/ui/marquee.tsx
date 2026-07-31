"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Marquee — faixa contínua.
 *
 * Colhida do concept Hockey Direct, onde ela nasceu com API em vez de virar
 * um `@keyframes` solto. Nenhuma cor mora aqui: `band` pinta com `--brand` e o
 * texto com `--brand-foreground`, então a mesma faixa sai lime numa marca e
 * âmbar noutra sem fork.
 *
 * Três decisões que valem mais que o código:
 *
 * 1. **`linear`, sempre.** Qualquer easing num loop infinito cria uma pulsação
 *    que o olho lê como defeito.
 * 2. **A lista é duplicada e o track anda exatos 50%**, então a emenda nunca
 *    aparece. A cópia vai com `aria-hidden` — ela é artefato de animação, não
 *    conteúdo, e um leitor de tela não deve ouvir tudo duas vezes.
 * 3. **Fora da tela ela para.** Sem isso o compositor fica ocupado a página
 *    inteira, e num telefone isso é bateria gasta em pixel que ninguém vê.
 */

export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  items: React.ReactNode[];
  /** Segundos para uma volta completa. Mais itens pedem mais tempo. */
  speed?: number;
  /** Some nas bordas em vez de ser cortado a faca. */
  fade?: boolean;
  /** Faixa de cor sólida com a cor da marca. */
  band?: boolean;
  /** Inclina a faixa. Exige um pai com `overflow: hidden`. */
  tilt?: number;
  /** Anda para a direita. Duas faixas em sentidos opostos leem como sistema. */
  reverse?: boolean;
  gap?: number;
}

export function Marquee({
  items,
  speed = 46,
  fade = false,
  band = false,
  tilt = 0,
  reverse = false,
  gap = 56,
  className,
  style,
  ...props
}: MarqueeProps) {
  const trackRef = React.useRef<HTMLUListElement>(null);
  const [paused, setPaused] = React.useState(false);

  // Fora da tela não anima.
  React.useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const render = (hidden: boolean) =>
    items.map((item, i) => (
      <li
        key={`${hidden ? "b" : "a"}-${i}`}
        className="whitespace-nowrap"
        {...(hidden ? { "aria-hidden": true } : {})}
      >
        {item}
      </li>
    ));

  return (
    <div
      className={cn(
        "overflow-hidden",
        band && "bg-[var(--brand)] py-3.5 text-[var(--brand-foreground)]",
        className,
      )}
      style={{
        ...(fade
          ? {
              maskImage:
                "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
            }
          : null),
        ...(tilt
          ? { rotate: `${tilt}deg`, width: "108%", marginLeft: "-4%" }
          : null),
        ...style,
      }}
      {...props}
    >
      <ul
        ref={trackRef}
        className="marquee-track flex w-max items-center"
        style={{
          gap: `${gap}px`,
          animationDuration: `${speed}s`,
          animationDirection: reverse ? "reverse" : "normal",
          animationPlayState: paused ? "paused" : "running",
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {render(false)}
        {render(true)}
      </ul>
    </div>
  );
}
