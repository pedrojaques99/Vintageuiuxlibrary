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
 *
 * ── O que faltava (o "simples demais") ──────────────────────────────────────
 * Duas coisas, e nenhuma delas era enfeite.
 *
 * 1. **Não havia evidência.** O campo mostrava o número e escondia a régua: não
 *    dava para saber, olhando, se 64 estava perto do teto ou do chão. Num painel
 *    com doze parâmetros isso vira doze perguntas sem resposta. Agora um fio no
 *    pé do campo mostra a posição dentro de `min…max` — é a mesma anatomia dos
 *    outros medidores da casa (rótulo · valor · qualificador · evidência).
 *
 * 2. **Rótulo e valor gastavam duas linhas** para uma informação de uma linha.
 *    `layout="row"` põe os dois lado a lado e o campo encolhe quase pela metade,
 *    que é o que permite montar a coluna dupla de um painel de edição de
 *    verdade. O padrão continua `stack` porque quem já usa o item conta com a
 *    altura atual.
 *
 * `kind` é o vocabulário do painel de design: porcentagem, ângulo, pixel e
 * múltiplo só mudam o sufixo e o passo padrão — é a mesma peça, não uma peça
 * nova. Passar `suffix` ou `step` na mão continua vencendo o `kind`.
 */

/** Sufixo e passo que cada tipo de campo assume quando não recebe os seus. */
const KINDS = {
  number: { suffix: "", step: 1 },
  percent: { suffix: "%", step: 1 },
  angle: { suffix: "°", step: 1 },
  px: { suffix: "px", step: 1 },
  multiple: { suffix: "×", step: 0.1 },
} as const;

export type ScrubKind = keyof typeof KINDS;

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
  /** Vocabulário do painel de design. Só define sufixo e passo padrão. */
  kind?: ScrubKind;
  /** "row" = rótulo e valor na mesma linha (campo metade da altura). */
  layout?: "stack" | "row";
  disabled?: boolean;
  onChange: (value: number) => void;
  className?: string;
}

export const ScrubInput = React.memo<ScrubInputProps>(function ScrubInput({
  label,
  value,
  min,
  max,
  step: stepProp,
  suffix: suffixProp,
  icon,
  hint,
  kind = "number",
  layout = "stack",
  disabled = false,
  onChange,
  className,
}) {
  const step = stepProp ?? KINDS[kind].step;
  const suffix = suffixProp ?? KINDS[kind].suffix;

  const [editing, setEditing] = React.useState(false);
  const [scrubbing, setScrubbing] = React.useState(false);
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
      if (editing || disabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      setScrubbing(true);
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
        setScrubbing(false);
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
    [editing, disabled, value, min, max, onChange, clamp],
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
      if (disabled) return;
      const mult = e.shiftKey ? 0.1 : 1;
      // Setas ←→ também: no painel o gesto é horizontal, então quem tabula até
      // o campo tenta a seta que combina com o arrasto antes de tentar ↑↓.
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        onChange(clamp(value + step * mult));
      }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        onChange(clamp(value - step * mult));
      }
      // Home/End: as pontas em uma tecla. O `role="spinbutton"` promete isso.
      if (e.key === "Home") {
        e.preventDefault();
        onChange(clamp(min));
      }
      if (e.key === "End") {
        e.preventDefault();
        onChange(clamp(max));
      }
    },
    [editing, disabled, value, step, min, max, onChange, clamp, commitEdit],
  );

  // Posição do valor dentro da faixa: a evidência que faltava.
  const ratio = max === min ? 0 : (Math.min(max, Math.max(min, value)) - min) / (max - min);

  return (
    <div
      data-scrubbing={scrubbing || undefined}
      className={cn(
        // Respiro: 12 px de lado e 8 de cima e baixo. Com menos, o rótulo
        // encostava na borda e a coluna de parâmetros lia como planilha.
        "group relative isolate overflow-hidden rounded-[var(--r-control)] border border-border bg-card px-3 py-2",
        "transition-colors [transition-duration:var(--dur-fast)] ease-[var(--ease-out)]",
        "hover:border-ring/40 focus-within:border-ring focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
        // Repouso · hover · foco · arrastando · desabilitado, os cinco
        // distinguíveis: enquanto arrasta a borda vira a cor da marca, que é o
        // único estado que o cursor sozinho não conta (o ponteiro já saiu do
        // campo faz tempo).
        "data-[scrubbing]:border-[var(--brand)]",
        disabled && "pointer-events-none opacity-50",
        layout === "row"
          ? "flex items-center justify-between gap-3"
          : "flex flex-col gap-1.5",
        className,
      )}
      onWheel={disabled ? undefined : onWheel}
      onKeyDown={onKeyDown}
      // tabIndex sai do container enquanto edita: o foco pertence ao input.
      tabIndex={editing || disabled ? -1 : 0}
      role="spinbutton"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={display}
      aria-disabled={disabled || undefined}
      title={hint}
    >
      <span
        className={cn(
          "cursor-ew-resize touch-none select-none truncate font-mono text-[10px] uppercase leading-none tracking-widest text-muted-foreground",
          layout === "row" && "min-w-0 flex-1",
        )}
        onPointerDown={onScrubDown}
      >
        {icon && <span className="mr-1 inline-flex align-middle opacity-70">{icon}</span>}
        {label}
      </span>
      <div className={cn("flex min-w-0 items-center", layout === "row" && "shrink-0")}>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={onKeyDown}
            className={cn(
              "w-full bg-transparent font-mono text-[12px] tabular-nums text-foreground outline-none",
              layout === "row" && "w-16 text-right",
            )}
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

      {/*
       * A régua. Fio no pé do campo, só `transform` (nada de largura animada) e
       * SEM transição: o valor está sendo produzido pela mão da pessoa, então
       * ele segue o dedo. Transição aqui seria latência com boa aparência.
       *
       * Só aparece quando precisa: no hover, no foco e no arrasto. Em repouso,
       * doze fios coloridos numa coluna eram doze riscos disputando o olho com
       * os números.
       */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-[var(--brand)] opacity-0 transition-opacity [transition-duration:var(--dur-fast)] ease-[var(--ease-out)] group-hover:opacity-100 group-focus-within:opacity-100 group-data-[scrubbing]:opacity-100"
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
});
