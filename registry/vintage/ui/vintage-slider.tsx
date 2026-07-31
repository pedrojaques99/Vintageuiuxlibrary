"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface VintageSliderProps {
  label?: string;
  min?: number;
  max?: number;
  value?: number;
  accent?: string;
  fmt?: (v: number) => string;
  onChange?: (value: number) => void;
  /**
   * Aperta a caixa de ~124px para ~75px, sem tirar nada: rótulo, trilho e faixa
   * min/valor/max continuam lá.
   *
   * Existe porque o rig nasceu para uma bancada larga, com poucos controles
   * grandes. Num painel de parâmetros — dez ou quinze sliders empilhados numa
   * coluna de 300px — a folga do rig vira rolagem, e o operador perde de vista
   * metade dos controles que precisa comparar entre si.
   *
   * A LARGURA não é assunto desta prop: `cn` roda tailwind-merge, então
   * `className="w-full"` já ganha do w-[220px] padrão.
   */
  dense?: boolean;
  className?: string;
}

export function VintageSlider({
  label = "GAIN",
  min = 0,
  max = 10,
  value = 5,
  accent,
  fmt,
  onChange,
  dense = false,
  className,
}: VintageSliderProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const valRef = useRef(currentValue);
  valRef.current = currentValue;

  useEffect(() => {
    if (value !== valRef.current) setCurrentValue(value);
  }, [value]);

  const update = useCallback(
    (clientX: number, fine: boolean) => {
      const r = trackRef.current?.getBoundingClientRect();
      if (!r) return;
      const raw = (clientX - r.left) / r.width;
      const pct = Math.max(0, Math.min(1, raw));
      const v = min + pct * (max - min);
      const snapped = fine
        ? Math.round(v * 100) / 100
        : Math.round(v * 10) / 10;
      setCurrentValue(snapped);
      onChange?.(snapped);
    },
    [min, max, onChange]
  );

  // Pointer events com captura, e não listener de mouse no `document`.
  //
  // O motivo é um bug que aparece no primeiro arraste: sem `preventDefault` no
  // mousedown o browser começa uma SELEÇÃO DE TEXTO junto, e arrastar o slider
  // vai pintando de azul tudo que o cursor cruza. A captura resolve o outro
  // lado do mesmo problema — os eventos continuam chegando aqui mesmo com o
  // cursor fora do trilho, sem precisar ouvir o documento inteiro.
  //
  // É o mesmo desenho que o `scrub-input` já usa, e de quebra o controle passa
  // a funcionar no toque, que o caminho de mouse nunca cobriu.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    update(e.clientX, e.shiftKey);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) update(e.clientX, e.shiftKey);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const step = e.shiftKey ? (max - min) * 0.002 : (max - min) * 0.01;
    const dir = e.deltaY < 0 ? 1 : -1;
    const next = Math.max(min, Math.min(max, currentValue + dir * step));
    setCurrentValue(next);
    onChange?.(next);
  };

  const handleDoubleClick = () => {
    const mid = (min + max) / 2;
    setCurrentValue(mid);
    onChange?.(mid);
  };

  const percentage = ((currentValue - min) / (max - min)) * 100;

  return (
    <div
      className={cn(
        // `select-none` no container inteiro: o rótulo e a faixa min/max ficam
        // no caminho do arraste, e texto selecionável ali é o que faz o
        // controle "piscar azul" enquanto o usuário mexe nele.
        "relative w-[220px] select-none bg-gradient-to-b from-[var(--vintage-surface-3)] to-[var(--vintage-surface-2)] rounded-lg border-2 border-[var(--vintage-surface-4)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_4px_8px_rgba(0,0,0,0.3)]",
        dense ? "p-2.5" : "p-4",
        className
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      title={`${label}: ${fmt ? fmt(currentValue) : currentValue.toFixed(2)}\ndrag · shift=fine · scroll · dbl-click=reset`}
      style={{
        opacity: hover || dragging ? 1 : 0.9,
        transition: "opacity 0.15s",
      }}
    >
      <div
        className={cn(
          "text-center text-[var(--vintage-label)] font-vintage-mono tracking-widest opacity-80",
          dense ? "text-[10px] mb-1.5" : "text-xs mb-5"
        )}
      >
        {label}
      </div>

      <div
        ref={trackRef}
        className={cn(
          // `touch-none` impede o navegador de interpretar o arraste como
          // rolagem da página no toque — sem isso o slider não anda no celular.
          "relative cursor-ew-resize touch-none",
          dense ? "h-5 mb-1.5" : "h-8 mb-3"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="absolute inset-0 bg-[var(--vintage-surface-2)] rounded border border-[var(--vintage-border)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--vintage-meter-green)] via-[var(--vintage-meter-yellow)] to-[var(--vintage-meter-red)] rounded transition-[width] duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Thumb */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-3 rounded pointer-events-none transition-[left] duration-75",
            // O punho continua mais alto que o trilho: é o que dá o alvo de
            // arraste e a leitura de peça física. Encolhe junto, não some.
            dense ? "h-7" : "h-10"
          )}
          style={{
            left: `calc(${percentage}% - 6px)`,
            background:
              "linear-gradient(to bottom, var(--vintage-metal-light), var(--vintage-metal-dark))",
            border: "2px solid var(--vintage-text-muted)",
            boxShadow: dragging
              ? "0 0 8px rgba(255,215,0,0.3), 0 4px 8px rgba(0,0,0,0.4)"
              : "0 4px 8px rgba(0,0,0,0.4)",
          }}
        />
      </div>

      <div className="flex justify-between text-[9px] font-vintage-mono">
        <span className="text-[var(--vintage-text-muted)]">{min}</span>
        <span style={{ color: accent || "var(--vintage-label)" }}>
          {fmt ? fmt(currentValue) : currentValue.toFixed(1)}
        </span>
        <span className="text-[var(--vintage-text-muted)]">{max}</span>
      </div>
    </div>
  );
}
