"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx-bus";

interface VintageSliderProps {
  label?: string;
  min?: number;
  max?: number;
  value?: number;
  accent?: string;
  fmt?: (v: number) => string;
  onChange?: (value: number) => void;
  /**
   * Aperta a caixa pra ~56px: rótulo, leitura e trilho continuam, só a régua
   * min/max de baixo sai (os limites não mudam de um fader pro vizinho).
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
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const valRef = useRef(currentValue);
  valRef.current = currentValue;
  /** Estalo a cada 1/20 do curso, só quando a mão move (nunca por prop). */
  const passoSom = useRef<number | null>(null);
  const estalarRef = useRef<(v: number) => void>(() => {});
  const estalar = (v: number) => {
    const passo = Math.round(((v - min) / (max - min)) * 20);
    if (passoSom.current !== null && passo !== passoSom.current) playSfx("detent");
    passoSom.current = passo;
  };
  estalarRef.current = estalar;

  useEffect(() => {
    if (value !== valRef.current) setCurrentValue(value);
  }, [value]);

  /**
   * O punho e a faixa são escritos no DOM na mão, dentro de um rAF.
   *
   * O relato era "lag ao arrastar", e a causa estava em dois lugares somados.
   * O primeiro é o culpado óbvio, e era deliberado: `transition-[width]` e
   * `transition-[left]` de 75ms no punho. Uma transição num valor que o dedo
   * está ditando não suaviza nada — ela atrasa o desenho em 75ms fixos, e o
   * punho passa o arraste inteiro correndo atrás do cursor. Some no arraste,
   * volta quando o valor chega de fora (roda, duplo clique, prop).
   *
   * O segundo é o caminho do estado: cada `pointermove` disparava um render do
   * componente E do dono do estado — no painel de dez faders da vitrine, um
   * fader arrastado repintava os outros nove. Aqui o movimento escreve pixel
   * direto e junta as amostras do frame num rAF só; o estado é atualizado uma
   * vez por frame, para o número embaixo do trilho.
   */
  const pendente = useRef<{ x: number; fine: boolean } | null>(null);
  const frame = useRef(0);

  const pintar = useCallback((pct: number) => {
    if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    if (thumbRef.current) thumbRef.current.style.left = `calc(${pct}% - 7px)`;
  }, []);

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
      valRef.current = snapped;
      pintar(((snapped - min) / (max - min)) * 100);
      estalarRef.current(snapped);
      setCurrentValue(snapped);
      onChange?.(snapped);
    },
    [min, max, onChange, pintar]
  );

  const agendar = useCallback(
    (clientX: number, fine: boolean) => {
      pendente.current = { x: clientX, fine };
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const p = pendente.current;
        pendente.current = null;
        if (p) update(p.x, p.fine);
      });
    },
    [update]
  );

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    []
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
    passoSom.current = Math.round(((valRef.current - min) / (max - min)) * 20);
    update(e.clientX, e.shiftKey);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) agendar(e.clientX, e.shiftKey);
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
    if (passoSom.current === null) estalar(currentValue);
    estalar(next);
    setCurrentValue(next);
    onChange?.(next);
  };

  /*
   * Teclado: o slider era só do ponteiro. Seta = 1% (Shift = 0,2%, o mesmo
   * fino da roda), Page = 10%, Home/End = limites.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const faixa = max - min;
    const passo = e.shiftKey ? faixa * 0.002 : faixa * 0.01;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = currentValue + passo;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = currentValue - passo;
    else if (e.key === "PageUp") next = currentValue + faixa * 0.1;
    else if (e.key === "PageDown") next = currentValue - faixa * 0.1;
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    next = Math.max(min, Math.min(max, next));
    if (passoSom.current === null) estalar(currentValue);
    estalar(next);
    setCurrentValue(next);
    onChange?.(next);
  };

  const handleDoubleClick = () => {
    const mid = (min + max) / 2;
    setCurrentValue(mid);
    onChange?.(mid);
  };

  const percentage = ((currentValue - min) / (max - min)) * 100;
  const cor = accent || "var(--vintage-light)";
  const leitura = fmt ? fmt(currentValue) : currentValue.toFixed(1);
  const gravado = "0 -1px 0 rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06)";

  return (
    <div
      className={cn(
        // `select-none` no container inteiro: o rótulo e a faixa min/max ficam
        // no caminho do arraste, e texto selecionável ali é o que faz o
        // controle "piscar azul" enquanto o usuário mexe nele.
        "relative w-[220px] select-none rounded-[var(--r-control,10px)]",
        dense ? "px-3 py-2" : "px-4 py-3",
        className
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      title={`${label}: ${leitura}
arraste · shift = fino · roda · duplo clique = centro`}
      style={{
        // O painel do kit: chapa escura, luz de cima, sombra que fecha embaixo.
        background: "linear-gradient(180deg, var(--vintage-surface-3), var(--vintage-surface-2))",
        border: "1px solid var(--vintage-surface-1)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 1px rgba(0,0,0,0.5), 0 10px 24px -8px rgba(0,0,0,0.6)",
      }}
    >
      {/* Rótulo e leitura na mesma linha: o número fica onde o olho já está. */}
      <div
        className={cn(
          "flex items-baseline justify-between font-vintage-mono",
          dense ? "mb-1" : "mb-2"
        )}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            color: hover || dragging ? "var(--vintage-label)" : "var(--vintage-text-muted)",
            textShadow: gravado,
            transition: "color var(--dur-fast,160ms) var(--ease-out,ease)",
          }}
        >
          {label}
        </span>
        <span className="text-[11px] tabular-nums" style={{ color: "var(--vintage-value)" }}>
          {leitura}
        </span>
      </div>

      <div
        ref={trackRef}
        className={cn(
          // `touch-none` impede o navegador de interpretar o arraste como
          // rolagem da página no toque — sem isso o slider não anda no celular.
          "relative cursor-ew-resize touch-none rounded-[4px] outline-none",
          "focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--vintage-value))]",
          dense ? "h-6" : "h-8"
        )}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(currentValue.toFixed(2))}
        aria-valuetext={leitura}
        onKeyDown={handleKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Régua serigrafada: onze traços, o do meio maior. */}
        <div className="pointer-events-none absolute inset-x-[7px] top-0 flex h-full justify-between">
          {Array.from({ length: 11 }, (_, i) => (
            <span
              key={i}
              className="w-px"
              style={{
                height: i === 5 ? "100%" : i % 5 === 0 ? "80%" : "45%",
                marginTop: "auto",
                marginBottom: "auto",
                background: "var(--vintage-text-muted)",
                opacity: i % 5 === 0 ? 0.55 : 0.3,
              }}
            />
          ))}
        </div>

        {/* O rasgo na chapa, e a faixa acesa dentro dele. */}
        <div
          className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 overflow-hidden rounded-full"
          style={{
            background: "var(--vintage-surface-1)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div
            ref={fillRef}
            className="h-full rounded-full"
            style={{
              width: `${percentage}%`,
              background: `linear-gradient(90deg, color-mix(in srgb, ${cor} 35%, transparent), ${cor})`,
              boxShadow: `0 0 6px color-mix(in srgb, ${cor} 50%, transparent)`,
              transition: dragging ? "none" : "width 75ms linear",
            }}
          />
        </div>

        {/* Capa do fader: metal escovado, frisos de pega, sombra pra baixo. */}
        <div
          ref={thumbRef}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-[14px] rounded-[3px] pointer-events-none",
            // O punho continua mais alto que o trilho: é o que dá o alvo de
            // arraste e a leitura de peça física. Encolhe junto, não some.
            dense ? "h-6" : "h-8"
          )}
          style={{
            left: `calc(${percentage}% - 7px)`,
            transition: dragging ? "none" : "left 75ms linear",
            background:
              "linear-gradient(90deg, var(--vintage-metal-channel-dark) 0%, var(--vintage-metal-channel-light) 35%, var(--vintage-metal-mid) 65%, var(--vintage-metal-light) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.55), 0 0 0 1px rgba(0,0,0,0.6), 0 3px 4px rgba(0,0,0,0.55)",
          }}
        >
          <div
            className="absolute inset-y-[5px] left-1/2 w-[2px] -translate-x-1/2"
            style={{ background: "rgba(0,0,0,0.55)" }}
          />
        </div>
      </div>

      {!dense && (
        <div className="mt-1 flex justify-between font-vintage-mono text-[9px] tabular-nums">
          <span style={{ color: "var(--vintage-text-muted)" }}>{min}</span>
          <span style={{ color: "var(--vintage-text-muted)" }}>{max}</span>
        </div>
      )}
    </div>
  );
}
