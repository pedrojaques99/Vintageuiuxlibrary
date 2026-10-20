"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface VintageEQProps {
  labels?: string[];
  title?: string;
  values?: number[];
  accent?: string;
  onChange?: (values: number[]) => void;
  className?: string;
}

export function VintageEQ({
  labels = ["63Hz", "125Hz", "250Hz", "500Hz", "1kHz", "2kHz"],
  title = "GRAPHIC EQ",
  values: initialValues,
  accent,
  onChange,
  className,
}: VintageEQProps) {
  const [values, setValues] = useState(
    initialValues ?? labels.map(() => 5)
  );
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  /*
   * Um caminho só pra mudar uma banda — ponteiro, roda e teclado passam aqui.
   *
   * O próximo estado sai do ref, FORA de um updater de `setValues`: o
   * `onChange` do pai morava dentro do updater, que o React chama durante o
   * render (e duas vezes em modo estrito), e o pai ganhava `setState` no meio
   * do render do EQ.
   */
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const definir = useCallback((index: number, v: number) => {
    const next = [...valuesRef.current];
    next[index] = Math.max(0, Math.min(10, v));
    valuesRef.current = next;
    setValues(next);
    onChangeRef.current?.(next);
  }, []);

  const updateValue = useCallback(
    (index: number, clientY: number, fine: boolean) => {
      const slider = document.getElementById(`vintage-eq-slider-${index}`);
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      const pct = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const raw = pct * 10;
      definir(index, fine ? Math.round(raw * 100) / 100 : Math.round(raw * 10) / 10);
    },
    [definir]
  );

  /* Teclado: o fader era só do mouse. Seta = 0,1 (Shift = 0,02, o fino da
     roda), Page = 1, Home/End = limites. */
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    const passo = e.shiftKey ? 0.02 : 0.1;
    const atual = valuesRef.current[index];
    let v: number | null = null;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") v = atual + passo;
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") v = atual - passo;
    else if (e.key === "PageUp") v = atual + 1;
    else if (e.key === "PageDown") v = atual - 1;
    else if (e.key === "Home") v = 0;
    else if (e.key === "End") v = 10;
    if (v === null) return;
    e.preventDefault();
    e.stopPropagation();
    definir(index, Math.round(v * 100) / 100);
  };

  useEffect(() => {
    if (draggingIndex === null) return;
    const onMove = (e: MouseEvent) =>
      updateValue(draggingIndex, e.clientY, e.shiftKey);
    const onUp = () => setDraggingIndex(null);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [draggingIndex, updateValue]);

  const handleWheel = (index: number, e: React.WheelEvent) => {
    e.stopPropagation();
    const step = e.shiftKey ? 0.02 : 0.1;
    const dir = e.deltaY < 0 ? 1 : -1;
    definir(index, valuesRef.current[index] + dir * step);
  };

  const handleDoubleClick = (index: number) => definir(index, 5);

  return (
    <div
      className={cn(
        "inline-block bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)]",
        className
      )}
    >
      <h3 className="text-center text-[var(--vintage-text-dim)] text-2xl font-vintage-body font-bold mb-6">
        {title}
      </h3>
      <div className="flex gap-6 items-end">
        {labels.map((label, index) => {
          const isActive =
            draggingIndex === index || hoverIndex === index;
          return (
            <div
              key={index}
              className="flex flex-col items-center gap-4"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <div
                id={`vintage-eq-slider-${index}`}
                className="relative h-[300px] w-12 select-none rounded-lg outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--vintage-accent)]"
                style={{ cursor: draggingIndex === index ? "grabbing" : "grab" }}
                tabIndex={0}
                role="slider"
                aria-label={label}
                aria-orientation="vertical"
                aria-valuemin={0}
                aria-valuemax={10}
                aria-valuenow={Number(values[index].toFixed(2))}
                aria-valuetext={values[index].toFixed(1)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onMouseDown={(e) => {
                  setDraggingIndex(index);
                  updateValue(index, e.clientY, e.shiftKey);
                }}
                onWheel={(e) => handleWheel(index, e)}
                onDoubleClick={() => handleDoubleClick(index)}
                title={`${label}: ${values[index].toFixed(1)}\ndrag · shift=fine · scroll · dbl-click=reset`}
              >
                {/* Track */}
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--vintage-surface-3)] to-[var(--vintage-surface-2)] rounded-lg border border-[var(--vintage-surface-4)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                  <div className="absolute inset-x-0 top-0 h-full flex flex-col justify-between p-2">
                    {Array.from({ length: 16 }, (_, i) => (
                      <div
                        key={i}
                        className="w-full h-px bg-[var(--vintage-grid)] opacity-30"
                      />
                    ))}
                  </div>

                  {/* Center line (0 dB) */}
                  <div className="absolute left-1 right-1 top-1/2 h-[2px] -translate-y-px bg-[var(--vintage-text-dim)] opacity-40" />
                </div>

                {/* Handle */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-10 h-14 rounded pointer-events-none"
                  style={{
                    bottom: `calc(${(values[index] / 10) * 100}% - 28px)`,
                    background:
                      "linear-gradient(to bottom, var(--vintage-metal-channel-light), white, var(--vintage-metal-channel-dark))",
                    border: "2px solid var(--vintage-text-muted)",
                    boxShadow: isActive
                      ? `0 0 8px ${accent || "rgba(255,215,0,0.3)"}, 0 4px 8px rgba(0,0,0,0.4)`
                      : "0 4px 8px rgba(0,0,0,0.4)",
                    transition:
                      draggingIndex === index
                        ? "box-shadow 0.1s"
                        : "all 0.1s",
                  }}
                >
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-full bg-[var(--vintage-text-dim)] rounded-sm shadow-inner" />
                </div>
              </div>

              <div className="text-center">
                <div
                  className="text-xs font-vintage-mono mb-1"
                  style={{
                    color: isActive
                      ? accent || "var(--vintage-label)"
                      : "var(--vintage-text-muted)",
                    transition: "color 0.15s",
                  }}
                >
                  {values[index].toFixed(1)}
                </div>
                <div className="text-[var(--vintage-text-dim)] text-[10px] font-vintage-body">
                  {label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
