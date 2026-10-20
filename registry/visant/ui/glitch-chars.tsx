"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Caracteres que trocam sozinhos: o "sinal de vida" mais barato que existe.
 *
 * Nasceu como o ruído ao lado de um texto de status ("** Processando"), e é a
 * primitiva por trás de `status-ticker` e `working-glyph`. Um spinner diz
 * "esperando"; isso diz "a máquina está mexendo", que é outra sensação.
 *
 * 150ms é deliberado: acima de ~200ms lê como piscada quebrada, abaixo de ~100ms
 * vira ruído que cansa. Não é decorativo, é o batimento do sistema.
 *
 * ── Variações ──────────────────────────────────────────────────────────────
 *
 * - `preset` troca o sotaque do ruído sem a pessoa montar a lista na mão:
 *   símbolos (o original), blocos de sombra, braille (o mais fino, lê como
 *   ponto andando), binário e hexadecimal. `chars` ainda manda, se vier.
 * - `text` liga o modo decodificar: o ruído vai assentando da esquerda pra
 *   direita até virar a palavra, segura um respiro (`holdMs`) e embaralha de
 *   novo. É o "carregou" de um painel de máquina. Com `loop={false}` assenta
 *   uma vez e fica. O leitor de tela lê a palavra, nunca o ruído.
 *
 * `prefers-reduced-motion`: congela (no ruído, num quadro fixo; no
 * decodificar, já na palavra). Fonte mono, então a largura nunca pula.
 */

const PRESETS = {
  simbolos: "*•□./-®",
  blocos: "░▒▓█▌▐",
  braille: "⠁⠃⠇⡇⣇⣧⣷⣿⠿⠟⠛⠙",
  binario: "01",
  hex: "0123456789ABCDEF",
} as const;

export type GlitchPreset = keyof typeof PRESETS;

const sortear = (pool: string) => pool[Math.floor(Math.random() * pool.length)];

export function GlitchChars({
  chars,
  preset = "simbolos",
  length = 2,
  intervalMs = 150,
  text,
  holdMs = 1600,
  loop = true,
  className,
  style,
}: {
  /** Pool de caracteres sorteados. Passando isto, `preset` é ignorado. */
  chars?: string;
  /** Sotaque pronto do ruído. */
  preset?: GlitchPreset;
  /**
   * Quantos caracteres por quadro. Fonte mono garante largura estável.
   * @min 1
   * @max 12
   * @step 1
   */
  length?: number;
  /**
   * Milissegundos entre quadros.
   * @min 60
   * @max 400
   * @step 10
   */
  intervalMs?: number;
  /** Liga o modo decodificar: o ruído assenta até virar este texto. */
  text?: string;
  /**
   * No modo decodificar, quanto a palavra fica parada antes de embaralhar.
   * @min 400
   * @max 5000
   * @step 100
   */
  holdMs?: number;
  /** No modo decodificar, recomeça depois do respiro. */
  loop?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const pool = chars || PRESETS[preset] || PRESETS.simbolos;
  const [shown, setShown] = useState(() => text ?? pool.slice(0, length));

  useEffect(() => {
    const media =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    let id: ReturnType<typeof setInterval> | null = null;
    let espera: ReturnType<typeof setTimeout> | null = null;
    const parar = () => {
      if (id) clearInterval(id);
      if (espera) clearTimeout(espera);
      id = null;
      espera = null;
    };

    // Decodificar: `assentados` letras da esquerda já são a palavra; o resto
    // é ruído. Cada quadro assenta meia letra, então palavra longa demora mais,
    // como uma leitura de verdade.
    const decodificar = (alvo: string) => {
      let assentados = 0;
      id = setInterval(() => {
        assentados = Math.min(alvo.length, assentados + 0.5);
        const fixo = Math.floor(assentados);
        setShown(
          alvo.slice(0, fixo) +
            Array.from(alvo.slice(fixo), (c) => (c === " " ? " " : sortear(pool))).join(""),
        );
        if (fixo >= alvo.length) {
          parar();
          if (loop) espera = setTimeout(() => decodificar(alvo), holdMs);
        }
      }, intervalMs);
    };

    // A preferência é reavaliada por evento, não só na montagem: quem liga
    // "reduzir movimento" no meio de uma espera longa (é justamente aí que se
    // liga) ficava com o ruído correndo até trocar de página.
    const aplicar = () => {
      parar();
      if (media?.matches) {
        setShown(text ?? pool.slice(0, length));
        return;
      }
      if (text) {
        decodificar(text);
        return;
      }
      id = setInterval(() => {
        setShown(Array.from({ length }, () => sortear(pool)).join(""));
      }, intervalMs);
    };

    aplicar();
    media?.addEventListener?.("change", aplicar);
    return () => {
      parar();
      media?.removeEventListener?.("change", aplicar);
    };
  }, [pool, length, intervalMs, text, holdMs, loop]);

  return (
    <span
      className={cn("inline-block select-none whitespace-pre font-mono tabular-nums", className)}
      style={style}
    >
      {/* O ruído é desenho; com `text`, quem lê ouve só a palavra. */}
      <span aria-hidden="true">{shown}</span>
      {text ? <span className="sr-only">{text}</span> : null}
    </span>
  );
}
