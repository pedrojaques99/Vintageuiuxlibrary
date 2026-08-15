"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Dois caracteres que trocam sozinhos — o "sinal de vida" mais barato que existe.
 *
 * Nasceu como o ruído ao lado de um texto de status ("** Processando"), e é a
 * primitiva por trás de `status-ticker` e `working-glyph`. Um spinner diz
 * "esperando"; isso diz "a máquina está mexendo", que é outra sensação.
 *
 * 150ms é deliberado: acima de ~200ms lê como piscada quebrada, abaixo de ~100ms
 * vira ruído que cansa. Não é decorativo — é o batimento do sistema.
 *
 * `prefers-reduced-motion`: congela num par fixo (o texto continua legível, e o
 * layout não pula, porque a largura é sempre a mesma em fonte mono).
 */
export function GlitchChars({
  chars = "*•□./-®",
  length = 2,
  intervalMs = 150,
  className,
  style,
}: {
  /** Pool de caracteres sorteados. Troque para mudar o "sotaque" do ruído. */
  chars?: string;
  /** Quantos caracteres por quadro. Fonte mono ⇒ largura estável. */
  length?: number;
  /** Milissegundos entre quadros. */
  intervalMs?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [text, setText] = useState(() => chars.slice(0, length));

  useEffect(() => {
    const media =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    let id: ReturnType<typeof setInterval> | null = null;

    // A preferência é reavaliada por evento, não só na montagem: quem liga
    // "reduzir movimento" no meio de uma espera longa (é justamente aí que se
    // liga) ficava com o ruído correndo até trocar de página.
    const aplicar = () => {
      if (id) clearInterval(id);
      id = null;
      if (media?.matches) {
        setText(chars.slice(0, length));
        return;
      }
      id = setInterval(() => {
        setText(
          Array.from(
            { length },
            () => chars[Math.floor(Math.random() * chars.length)],
          ).join(""),
        );
      }, intervalMs);
    };

    aplicar();
    media?.addEventListener?.("change", aplicar);
    return () => {
      if (id) clearInterval(id);
      media?.removeEventListener?.("change", aplicar);
    };
  }, [chars, length, intervalMs]);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block select-none font-mono tabular-nums",
        className,
      )}
      style={style}
    >
      {text}
    </span>
  );
}
