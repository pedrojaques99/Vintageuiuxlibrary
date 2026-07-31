"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StickyFilterbar — barra de filtro que gruda e condensa.
 *
 * Colhida do concept Hockey Direct. É utilidade antes de ser efeito: com a
 * barra alta grudada, sobra menos grade na tela — e a grade é o que o comprador
 * veio ver. Cada pixel da barra é um pixel a menos de produto.
 *
 * ── O gotcha que custou caro ────────────────────────────────────────────────
 * A altura do cabeçalho **não pode ser chutada**. Ela muda com o viewport: no
 * Hockey Direct mediu 123px no desktop e **163px a 390px**, porque a busca
 * desce de linha. Um número fixo no CSS deixa a barra escondida atrás do header
 * em um dos dois casos.
 *
 * Por isso o componente MEDE o header e publica em `--header-h`, com
 * `ResizeObserver` e `document.fonts.ready` — a altura muda de novo quando a
 * fonte carrega.
 *
 * As linhas marcadas `collapsible` somem quando a barra está grudada. Mantenha
 * ali o que é refinamento e deixe fora o que é o filtro principal: o usuário
 * precisa continuar enxergando o eixo pelo qual está navegando.
 */

export interface StickyFilterbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Seletor do cabeçalho grudado a medir. */
  headerSelector?: string;
  children: React.ReactNode;
}

export function StickyFilterbar({
  headerSelector = "header",
  children,
  className,
  ...props
}: StickyFilterbarProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = React.useState(false);

  // Mede o header e publica a altura real como custom property.
  React.useEffect(() => {
    const header = document.querySelector<HTMLElement>(headerSelector);
    if (!header) return;

    const apply = () => {
      const h = Math.round(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(header);
    // A altura muda quando a fonte troca de fallback para a real.
    document.fonts?.ready.then(apply).catch(() => {});
    return () => ro.disconnect();
  }, [headerSelector]);

  // Condensa exatamente onde encosta — não num número solto, que produziria
  // uma piscada no meio do scroll.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const headerH =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue("--header-h"),
          10,
        ) || 0;
      setCondensed(el.getBoundingClientRect().top <= headerH + 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={ref}
      data-condensed={condensed || undefined}
      className={cn(
        "sticky z-30 border-b border-[var(--border)] bg-[var(--background)]",
        "[top:var(--header-h,0px)]",
        condensed && "shadow-[0_14px_24px_-22px_var(--shadow-color,rgb(0_0_0/0.5))]",
        "[&[data-condensed]_[data-collapsible]]:hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Uma linha da barra. `collapsible` some quando grudada — use nas facetas
 * secundárias, nunca no eixo principal.
 */
export function FilterRow({
  label,
  collapsible = false,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label?: string; collapsible?: boolean }) {
  return (
    <div
      {...(collapsible ? { "data-collapsible": "" } : {})}
      className={cn("flex items-center gap-4 py-2", className)}
      {...props}
    >
      {label ? (
        <p className="w-14 shrink-0 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
          {label}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
