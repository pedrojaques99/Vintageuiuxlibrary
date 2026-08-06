"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Campo numérico que se arrasta — o controle de painel de edição.
 *
 * Resolve o aperto que slider e input não resolvem juntos: slider gasta largura
 * e perde precisão; input exige clique, seleção e teclado para cada ajuste. Numa
 * sidebar com 12 parâmetros, arrastar o rótulo lateralmente dá ajuste contínuo
 * em zero pixel extra, e duplo-clique ainda dá o valor exato.
 *
 * Quatro entradas para o mesmo valor, todas esperadas por quem vem de
 * After Effects / Figma / Blender:
 *   arrastar · roda do mouse · setas ↑↓ · duplo-clique para digitar
 * `shift` em qualquer uma delas = passo fino (0.1×).
 *
 * Sensibilidade = `(max-min)/300`: a faixa inteira cabe em ~300px de arrasto,
 * então o gesto tem o mesmo "peso" para 0–1 e para 0–5000.
 *
 * Pointer events (não mouse events) porque o mesmo painel roda em tablet — e
 * `touch-none` nos alvos de arrasto impede o scroll da página de roubar o gesto.
 *
 * Listeners vão no `document`, não no elemento: o ponteiro sai do campo em
 * qualquer arrasto real. Por isso o cleanup no unmount existe — sem ele um
 * unmount no meio do arrasto deixa o cursor `ew-resize` preso na página inteira.
 */
export interface ScrubInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  icon?: React.ReactNode;
  /** Vira `title` — bom lugar para explicar o parâmetro. */
  hint?: string;
  onChange: (value: number) => void;
  className?: string;
}

export const ScrubInput = React.memo<ScrubInputProps>(function ScrubInput({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  icon,
  hint,
  onChange,
  className,
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const scrub = React.useRef<{ startX: number; startValue: number } | null>(null);
  const listeners = React.useRef<{
    onMove: (e: PointerEvent) => void;
    onUp: () => void;
  } | null>(null);

  const clamp = React.useCallback(
    (v: number) => {
      const c = Math.max(min, Math.min(max, v));
      // toFixed(10) mata o lixo de ponto flutuante do arredondamento por step.
      return parseFloat((Math.round(c / step) * step).toFixed(10));
    },
    [min, max, step],
  );

  const decimals = React.useMemo(() => {
    const s = String(step);
    const dot = s.indexOf(".");
    return dot === -1 ? 0 : s.length - dot - 1;
  }, [step]);

  const display = `${value.toFixed(decimals)}${suffix}`;

  const startEdit = React.useCallback(() => {
    setDraft(String(value));
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [value]);

  const commitEdit = React.useCallback(() => {
    setEditing(false);
    const parsed = parseFloat(draft);
    if (!Number.isNaN(parsed)) onChange(clamp(parsed));
  }, [draft, onChange, clamp]);

  const onScrubDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (editing) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      scrub.current = { startX: e.clientX, startValue: value };
      const sensitivity = (max - min) / 300;

      const onMove = (me: PointerEvent) => {
        if (!scrub.current) return;
        const dx = me.clientX - scrub.current.startX;
        onChange(
          clamp(scrub.current.startValue + dx * sensitivity * (me.shiftKey ? 0.1 : 1)),
        );
      };
      const onUp = () => {
        scrub.current = null;
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        listeners.current = null;
      };

      listeners.current = { onMove, onUp };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    },
    [editing, value, min, max, onChange, clamp],
  );

  React.useEffect(
    () => () => {
      if (listeners.current) {
        document.removeEventListener("pointermove", listeners.current.onMove);
        document.removeEventListener("pointerup", listeners.current.onUp);
        document.removeEventListener("pointercancel", listeners.current.onUp);
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    },
    [],
  );

  const onWheel = React.useCallback(
    (e: React.WheelEvent) => {
      e.stopPropagation();
      const dir = e.deltaY < 0 ? 1 : -1;
      onChange(clamp(value + dir * step * (e.shiftKey ? 0.1 : 1)));
    },
    [value, step, onChange, clamp],
  );

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (editing) {
        if (e.key === "Enter") commitEdit();
        if (e.key === "Escape") setEditing(false);
        return;
      }
      const mult = e.shiftKey ? 0.1 : 1;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        onChange(clamp(value + step * mult));
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onChange(clamp(value - step * mult));
      }
    },
    [editing, value, step, onChange, clamp, commitEdit],
  );

  return (
    <div
      className={cn(
        "group flex flex-col gap-1 rounded-[var(--r-control)] border border-border bg-card px-2 py-1.5",
        "transition-colors [transition-duration:var(--dur-fast)] ease-[var(--ease-out)]",
        "hover:border-ring/40 focus-within:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      // tabIndex sai do container enquanto edita: o foco pertence ao input.
      tabIndex={editing ? -1 : 0}
      role="spinbutton"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      title={hint}
    >
      <span
        className="cursor-ew-resize touch-none select-none truncate font-mono text-[10px] uppercase leading-none tracking-widest text-muted-foreground"
        onPointerDown={onScrubDown}
      >
        {icon && <span className="mr-1 inline-flex align-middle opacity-70">{icon}</span>}
        {label}
      </span>
      <div className="flex min-w-0 items-center">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent font-mono text-[12px] tabular-nums text-foreground outline-none"
            autoFocus
          />
        ) : (
          <span
            className="cursor-ew-resize touch-none select-none font-mono text-[12px] leading-none tabular-nums text-foreground"
            onPointerDown={onScrubDown}
            onDoubleClick={startEdit}
          >
            {display}
          </span>
        )}
      </div>
    </div>
  );
});
