"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sfx-bus";

/**
 * VintageSoundboardPad — o pad que agora **toca**.
 *
 * O relatado era literal: um pad de soundboard que não fazia som. A peça
 * desenhava o aceso, chamava `onTrigger` e cabia ao dono do app plugar áudio —
 * ou seja, a coisa que dá nome ao componente era exercício pro leitor.
 *
 * O som sai do `sfx-bus` da casa, e não de um `AudioContext` próprio. A razão
 * não é economia de linhas: um contexto de áudio por componente é o caminho
 * curto pra doze contextos numa página e pro navegador cortar o áudio inteiro.
 * O bus também já resolve o que sempre se esquece — contexto destravado só no
 * primeiro gesto, preferência de som guardada, e mudo sob
 * `prefers-reduced-motion`.
 *
 * `data-sfx-silent` no botão é obrigatório: sem ele, um app que monte o
 * `SfxProvider` na raiz sonorizaria o clique por delegação E o pad tocaria o
 * dele, dois estalos por dedo.
 *
 * Limite conhecido: o bus tem um timbre só (chimbau fechado) e um portão de
 * 60 ms. Pad diferente não soa em altura diferente, e rufar mais rápido que
 * isso perde toques. Dar voz por pad exige o bus expor o próprio contexto —
 * decisão do dono do `sfx-bus`, não desta peça.
 */
interface VintageSoundboardPadProps {
  label?: string;
  icon?: string;
  color?: string;
  active?: boolean;
  size?: number;
  /** Não toca nada. Para quando o app já cuida do áudio no `onTrigger`. */
  silent?: boolean;
  onTrigger?: () => void;
  onRelease?: () => void;
  className?: string;
}

export function VintageSoundboardPad({
  label = "PAD",
  icon,
  color = "var(--vintage-accent)",
  active: controlledActive,
  size = 96,
  silent = false,
  onTrigger,
  onRelease,
  className,
}: VintageSoundboardPadProps) {
  const [internalActive, setInternalActive] = React.useState(false);
  const isActive =
    controlledActive !== undefined ? controlledActive : internalActive;

  const bater = React.useCallback(() => {
    if (controlledActive === undefined) setInternalActive(true);
    if (!silent) {
      // `arm` antes de `press` porque o primeiro toque da página é justamente o
      // que destrava o contexto — sem isto o primeiro pad da sessão fica mudo.
      sfx.arm();
      sfx.press();
    }
    onTrigger?.();
  }, [controlledActive, onTrigger, silent]);

  const soltar = React.useCallback(() => {
    if (controlledActive === undefined) setInternalActive(false);
    onRelease?.();
  }, [controlledActive, onRelease]);

  return (
    <button
      type="button"
      aria-pressed={isActive}
      // O bus da casa não toca por cima: quem toca é o pad, logo abaixo.
      data-sfx-silent=""
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer select-none touch-none",
        "transition-transform active:scale-95",
        "outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className
      )}
      style={{
        width: size,
        height: size,
        background: isActive
          ? `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 80%, black))`
          : "var(--vintage-surface-2)",
        border: `2px solid ${isActive ? color : "var(--vintage-border)"}`,
        boxShadow: isActive
          ? `0 0 20px color-mix(in srgb, ${color} 25%, transparent), inset 0 1px 0 rgba(255,255,255,0.1)`
          : "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.3)",
        // O anel de foco herda a cor do pad em vez de um azul de sistema que
        // não existe em lugar nenhum desta bancada.
        ["--tw-ring-color" as string]: color,
        ["--tw-ring-offset-color" as string]: "var(--vintage-surface-1)",
      }}
      // Ponteiro em vez de mouse+touch: com os dois, um toque na tela disparava
      // `touchstart` e o `mousedown` sintetizado logo atrás — dois disparos.
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        bater();
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          bater();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") soltar();
      }}
    >
      {isActive && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            boxShadow: `inset 0 0 15px color-mix(in srgb, ${color} 20%, transparent)`,
          }}
        />
      )}

      {icon && (
        <span
          className="leading-none"
          style={{
            fontSize: size * 0.3,
            filter: isActive ? "brightness(1.2)" : "none",
          }}
        >
          {icon}
        </span>
      )}

      <span
        className="font-bold uppercase tracking-wider truncate max-w-[90%]"
        style={{
          fontSize: Math.max(9, size * 0.1),
          color: isActive ? "rgba(255,255,255,0.95)" : "var(--vintage-text-muted)",
          fontFamily: "var(--font-vintage-mono, monospace)",
        }}
      >
        {label}
      </span>

      <div
        className="absolute bottom-1.5 rounded-full transition-colors"
        style={{
          width: 6,
          height: 6,
          background: isActive ? color : "var(--vintage-surface-3a)",
          boxShadow: isActive ? `0 0 6px ${color}` : "none",
        }}
      />
    </button>
  );
}
