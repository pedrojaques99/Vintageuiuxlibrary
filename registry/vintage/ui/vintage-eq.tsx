"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx-bus";

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
    // Estalo a cada 1/20 do curso da banda. `definir` só é chamado pela mão.
    if (Math.round(next[index] * 2) !== Math.round(valuesRef.current[index] * 2)) {
      playSfx("detent");
    }
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

  const gravado = "0 -1px 0 rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06)";
  const cor = accent || "var(--vintage-value)";

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-3 rounded-[var(--r-control,10px)] px-5 pt-3 pb-4",
        className
      )}
      style={{
        // O painel do kit: chapa escura, luz de cima, sombra que fecha embaixo.
        background: "linear-gradient(180deg, var(--vintage-surface-3), var(--vintage-surface-2))",
        border: "1px solid var(--vintage-surface-1)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 1px rgba(0,0,0,0.5), 0 10px 24px -8px rgba(0,0,0,0.6)",
      }}
    >
      <h3
        className="font-vintage-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--vintage-text-muted)", textShadow: gravado }}
      >
        {title}
      </h3>
      <div className="flex items-end gap-3">
        {labels.map((label, index) => {
          const isActive = draggingIndex === index || hoverIndex === index;
          return (
            <div
              key={index}
              className="flex flex-col items-center gap-2"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <span
                className="font-vintage-mono text-[10px] tabular-nums leading-none"
                style={{
                  color: isActive ? cor : "var(--vintage-text-muted)",
                  transition: "color var(--dur-fast,160ms) var(--ease-out,ease)",
                }}
              >
                {values[index].toFixed(1)}
              </span>

              <div
                id={`vintage-eq-slider-${index}`}
                className="relative h-[168px] w-8 select-none rounded-[4px] outline-none focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--vintage-value))]"
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
                title={`${label}: ${values[index].toFixed(1)}\narraste · shift = fino · roda · duplo clique = centro`}
              >
                {/* Régua serigrafada dos dois lados do rasgo; o 0 dB é maior. */}
                <div className="pointer-events-none absolute inset-y-[7px] inset-x-0 flex flex-col justify-between">
                  {Array.from({ length: 11 }, (_, i) => (
                    <div key={i} className="flex justify-between">
                      {[0, 1].map((lado) => (
                        <span
                          key={lado}
                          className="block h-px"
                          style={{
                            width: i === 5 ? 8 : i % 5 === 0 ? 6 : 4,
                            background: "var(--vintage-text-muted)",
                            opacity: i === 5 ? 0.8 : 0.4,
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* O rasgo na chapa. */}
                <div
                  className="absolute inset-y-0 left-1/2 w-[6px] -translate-x-1/2 rounded-full"
                  style={{
                    background: "var(--vintage-surface-1)",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                />

                {/* Capa do fader: metal escovado, frisos, sombra pra baixo. */}
                <div
                  className="absolute left-1/2 h-[14px] w-[26px] -translate-x-1/2 rounded-[3px] pointer-events-none"
                  style={{
                    bottom: `calc(${(values[index] / 10) * 100}% - 7px)`,
                    background:
                      "linear-gradient(180deg, var(--vintage-metal-channel-light) 0%, var(--vintage-metal-mid) 48%, var(--vintage-metal-light) 52%, var(--vintage-metal-channel-dark) 100%)",
                    boxShadow: isActive
                      ? `inset 0 1px 0 rgba(255,255,255,0.6), 0 0 0 1px rgba(0,0,0,0.6), 0 3px 4px rgba(0,0,0,0.55), 0 0 8px color-mix(in srgb, ${cor} 35%, transparent)`
                      : "inset 0 1px 0 rgba(255,255,255,0.6), 0 0 0 1px rgba(0,0,0,0.6), 0 3px 4px rgba(0,0,0,0.55)",
                    transition: "box-shadow var(--dur-fast,160ms) var(--ease-out,ease)",
                  }}
                >
                  <div
                    className="absolute inset-x-[4px] top-1/2 h-[2px] -translate-y-1/2"
                    style={{ background: "rgba(0,0,0,0.6)" }}
                  />
                </div>
              </div>

              <span
                className="font-vintage-mono text-[9px] font-semibold tracking-[0.08em] leading-none"
                style={{ color: "var(--vintage-text-muted)", textShadow: gravado }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
