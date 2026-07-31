"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StoreStatus — "aberto agora" de loja física.
 *
 * Colhido do concept Hockey Direct, e a razão dele existir é uma regra de
 * honestidade, não de UI:
 *
 * **O visitante pode estar em qualquer fuso.** Se você resolver a hora no
 * relógio do navegador, um cliente em Lisboa vê "aberto" com a loja de Londres
 * fechada. A hora é sempre resolvida no fuso DA LOJA, via `Intl`.
 *
 * E o componente **não renderiza nada até o JS confirmar a hora**. Um HTML
 * estático dizendo "aberto" é uma afirmação que ninguém verificou — e no
 * primeiro print de tela errado vira reclamação. Nada na tela é melhor que
 * horário errado na tela.
 *
 * Feriado não é calculável com o dado que a maioria dos clientes tem. Diga isso
 * em texto ao lado (`note`) em vez de fingir precisão.
 */

export interface StoreStatusProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Fuso IANA da loja, ex.: "Europe/London". */
  timeZone: string;
  openHour?: number;
  closeHour?: number;
  /** Dias abertos, 0 = domingo. Padrão: todos. */
  openDays?: number[];
  labels?: { open: (close: number) => string; closed: (open: number) => string };
}

const fmtHour = (h: number) => (h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`);

export function StoreStatus({
  timeZone,
  openHour = 9,
  closeHour = 17,
  openDays,
  labels = {
    open: (c) => `Open now until ${fmtHour(c)}`,
    closed: (o) => `Opens at ${fmtHour(o)}`,
  },
  className,
  ...props
}: StoreStatusProps) {
  const [state, setState] = React.useState<"open" | "closed" | null>(null);

  React.useEffect(() => {
    const read = () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "numeric",
        hourCycle: "h23",
        weekday: "short",
      }).formatToParts(new Date());

      const hour = Number(parts.find((p) => p.type === "hour")?.value);
      if (!Number.isFinite(hour)) return;

      const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
      const dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
      const dayOk = !openDays || openDays.includes(dayIdx);

      setState(dayOk && hour >= openHour && hour < closeHour ? "open" : "closed");
    };

    read();
    const t = setInterval(read, 60_000);
    return () => clearInterval(t);
  }, [timeZone, openHour, closeHour, openDays]);

  // Até o JS confirmar, a página não afirma nada.
  if (state === null) return null;

  return (
    <p
      data-state={state}
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-[7px] shrink-0 rounded-full",
          state === "open" ? "bg-[var(--brand)]" : "bg-[var(--muted-foreground)]",
        )}
      />
      <span className="text-[12px] font-bold uppercase tracking-[0.1em]">
        {state === "open" ? labels.open(closeHour) : labels.closed(openHour)}
      </span>
    </p>
  );
}
