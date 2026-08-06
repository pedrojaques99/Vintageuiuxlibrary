"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TestimonialWall — a parede de prova social com peças de tipos diferentes.
 *
 * A referência mistura, na mesma malha: citação escrita, número grande
 * ("1.291+ projetos"), retrato com nome sobreposto e depoimento em vídeo. Essa
 * mistura é o ponto — uma parede só de citação vira bloco de texto que ninguém
 * lê, e uma só de retrato não prova nada.
 *
 * O que resolvi aqui, e por quê:
 *
 * 1. **Um tipo por item, discriminado.** `kind` decide o desenho. Passar tudo
 *    como "card com children" devolve o problema para quem usa e a parede sai
 *    desalinhada no primeiro depoimento diferente.
 * 2. **Colunas de CSS, não grade calculada.** A ordem do DOM é a ordem de
 *    leitura, e depoimento tem altura imprevisível — `columns` + `break-inside`
 *    resolve sem medir nada em JS e sem reordenar quando a lista cresce.
 * 3. **O vídeo não autoplay.** É um `<button>` sobre o pôster: cabe teclado,
 *    tem rótulo acessível e não come banda de quem não pediu.
 * 4. **O tom vem do token.** As cores pastel da referência são da marca de lá;
 *    aqui são `muted`, `brand` e `card` — a parede muda de marca sem tocar no
 *    componente.
 */

type Tone = "card" | "muted" | "brand";

const TONE: Record<Tone, string> = {
  card: "bg-[var(--card,var(--background))] border border-[var(--border)]",
  muted: "bg-[var(--muted)] text-[var(--foreground)]",
  brand: "bg-[var(--brand)] text-[var(--brand-foreground)]",
};

interface Base {
  id: string;
  tone?: Tone;
}

export interface QuoteItem extends Base {
  kind: "quote";
  quote: React.ReactNode;
  /** Manchete curta acima da citação — o que a pessoa diria em 5 palavras. */
  headline?: React.ReactNode;
  author?: string;
  role?: string;
  /** Foto pequena do autor. */
  avatar?: React.ReactNode;
  /** 0 a 5. Fora da faixa, não desenha. */
  rating?: number;
}

export interface StatItem extends Base {
  kind: "stat";
  value: React.ReactNode;
  label: React.ReactNode;
  footnote?: React.ReactNode;
}

export interface PortraitItem extends Base {
  kind: "portrait";
  /** A foto, por slot. */
  media: React.ReactNode;
  name: string;
  role?: string;
  /** Vira depoimento em vídeo: aparece o botão de play. */
  onPlay?: () => void;
  ratio?: string;
}

export type TestimonialItem = QuoteItem | StatItem | PortraitItem;

export interface TestimonialWallProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TestimonialItem[];
  columns?: 2 | 3 | 4;
  /** O que aparece quando ainda não há depoimento nenhum. */
  empty?: React.ReactNode;
}

const COLS: Record<2 | 3 | 4, string> = {
  2: "sm:columns-2",
  3: "sm:columns-2 lg:columns-3",
  4: "sm:columns-2 lg:columns-3 xl:columns-4",
};

export function TestimonialWall({
  items,
  columns = 4,
  empty,
  className,
  ...props
}: TestimonialWallProps) {
  if (!items.length) {
    return (
      <div
        className={cn(
          "rounded-[var(--r-surface,1rem)] border border-dashed border-[var(--border)] p-10 text-center",
          "text-[14px] text-[var(--muted-foreground)]",
          className,
        )}
        {...props}
      >
        {empty ?? "Nenhum depoimento por aqui ainda."}
      </div>
    );
  }

  return (
    <div className={cn("columns-1 gap-4", COLS[columns], className)} {...props}>
      {items.map((item) => (
        <div key={item.id} className="mb-4 break-inside-avoid">
          <Card item={item} />
        </div>
      ))}
    </div>
  );
}

function Card({ item }: { item: TestimonialItem }) {
  const shell = cn(
    "overflow-hidden rounded-[var(--r-surface,1rem)]",
    TONE[item.tone ?? "card"],
  );

  if (item.kind === "stat") {
    return (
      <div className={cn(shell, "flex flex-col gap-3 p-[var(--pad-card,1.5rem)]")}>
        <strong className="[font-family:var(--font-display,inherit)] text-[clamp(2.25rem,1.8rem+2vw,3.25rem)] font-medium leading-none tracking-[-0.03em]">
          {item.value}
        </strong>
        <p className="text-balance text-[1.0625rem] font-medium leading-[1.25]">{item.label}</p>
        {item.footnote ? (
          <p className="text-pretty text-[13px] leading-[1.55] opacity-70">{item.footnote}</p>
        ) : null}
      </div>
    );
  }

  if (item.kind === "portrait") {
    return (
      <figure
        // `group` só quando há vídeo: card que não faz nada não deve reagir ao
        // mouse — hover em coisa inerte promete um clique que não existe.
        className={cn(shell, "relative isolate", item.onPlay && "group")}
        style={{ aspectRatio: item.ratio ?? "3 / 4" }}
      >
        <div
          className={cn(
            "absolute inset-0 -z-10 [&_img]:size-full [&_img]:object-cover",
            item.onPlay && [
              "[&_img]:transition-transform [&_img]:[transition-duration:var(--dur-slow)]",
              "[&_img]:ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
              "group-hover:[&_img]:scale-[1.04] motion-reduce:group-hover:[&_img]:scale-100",
            ],
          )}
        >
          {item.media}
        </div>

        {item.onPlay ? (
          <button
            type="button"
            onClick={item.onPlay}
            aria-label={`Ver o depoimento de ${item.name}`}
            className={cn(
              "absolute right-3 top-3 grid size-11 place-items-center rounded-[var(--r-pill,9999px)]",
              "bg-[var(--background)] text-[var(--foreground)]",
              "transition-[transform,box-shadow] [transition-duration:var(--dur-press,120ms)]",
              "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
              // Cresce junto com a foto: um gesto só, dois elementos.
              "group-hover:scale-105 group-hover:[box-shadow:var(--e-raised)]",
              "active:scale-95 motion-reduce:group-hover:scale-100",
              "focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
            )}
          >
            <svg viewBox="0 0 16 16" className="size-4 translate-x-px" fill="currentColor">
              <path d="M5 3.5 12.5 8 5 12.5z" />
            </svg>
          </button>
        ) : null}

        {/* A legenda paga o próprio contraste: a foto atrás é imprevisível. */}
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-white">
          <p className="text-[1.0625rem] font-semibold leading-[1.2]">{item.name}</p>
          {item.role ? <p className="text-[12px] leading-[1.4] opacity-85">{item.role}</p> : null}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className={cn(shell, "flex flex-col gap-3 p-[var(--pad-card,1.5rem)]")}>
      {item.avatar || item.author ? (
        <figcaption className="flex items-center gap-2.5">
          {item.avatar ? (
            <span className="size-9 shrink-0 overflow-hidden rounded-[var(--r-pill,9999px)] [&_img]:size-full [&_img]:object-cover">
              {item.avatar}
            </span>
          ) : null}
          <span className="min-w-0">
            {item.author ? (
              <span className="block truncate text-[15px] font-semibold leading-tight">
                {item.author}
              </span>
            ) : null}
            {item.role ? (
              <span className="block truncate text-[12px] leading-tight opacity-70">
                {item.role}
              </span>
            ) : null}
          </span>
        </figcaption>
      ) : null}

      {typeof item.rating === "number" && item.rating > 0 && item.rating <= 5 ? (
        <p aria-label={`${item.rating} de 5`} className="flex gap-0.5 text-[var(--brand)]">
          {Array.from({ length: Math.round(item.rating) }, (_, i) => (
            <svg key={i} aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
              <path d="m8 1.6 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4 4.2 13.4l.7-4.3-3.1-3 4.3-.6z" />
            </svg>
          ))}
        </p>
      ) : null}

      {item.headline ? (
        <p className="text-balance text-[15px] font-semibold leading-[1.35]">{item.headline}</p>
      ) : null}

      <blockquote className="text-pretty text-[14px] leading-[1.6] opacity-80">
        {item.quote}
      </blockquote>
    </figure>
  );
}
