"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useKnobDrag } from "@/hooks/use-knob-drag";

interface VintageLargeKnobProps {
  label?: string;
  min?: number;
  max?: number;
  value?: number;
  log?: boolean;
  accent?: string;
  /**
   * Lado da peça INTEIRA em px — coroa de marcações inclusive.
   *
   * Antes o corpo era fixo em 318px e a coroa vazava 19% para fora dele sem que
   * nada reservasse esse espaço: o anel de marcações caía por cima do rótulo
   * logo abaixo. Aqui o `size` é a caixa que a peça de fato ocupa, e o corpo
   * mora dentro dela.
   */
  size?: number;
  fmt?: (v: number) => string;
  onChange?: (value: number) => void;
  className?: string;
}

/** Proporção corpo/caixa herdada do desenho original (318 de 442). */
const RAZAO_CORPO = 318 / 442;

function LargeKnobTicks() {
  const ticks = Array.from({ length: 27 }, (_, i) => {
    const angle = -135 + (i / 26) * 270;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 9 === 0;
    const outerR = 210;
    const innerR = isMajor ? 190 : 197;
    const cx = 221,
      cy = 221;

    return (
      <line
        key={i}
        x1={cx + Math.cos(rad) * innerR}
        y1={cy + Math.sin(rad) * innerR}
        x2={cx + Math.cos(rad) * outerR}
        y2={cy + Math.sin(rad) * outerR}
        stroke="var(--vintage-text-dim)"
        strokeWidth={isMajor ? "8" : "3"}
        strokeLinecap="round"
      />
    );
  });

  // `inset-0`, e não mais um `inset` negativo: a coroa cabe no viewBox de 442
  // com folga de 11px, então ela desenha dentro da caixa da peça em vez de
  // invadir o que vier depois no fluxo.
  return (
    <svg
      viewBox="0 0 442 442"
      className="absolute inset-0 w-full h-full"
      fill="none"
    >
      {ticks}
    </svg>
  );
}

/**
 * O corpo tem duas camadas de propósito.
 *
 * O que gira é o material — o escovado cônico e o marcador. O que fica parado é
 * a luz: o aro externo e o brilho especular vêm da lâmpada da sala, e girar
 * junto com o eixo é o erro que fazia o knob parecer feito de luz.
 */
function LargeKnobBody({ rotation }: { rotation: number }) {
  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 318 318" className="w-full h-full" fill="none">
        <defs>
          <radialGradient id="lk-outer" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#4a4a4a" />
            <stop offset="0.7" stopColor="#2a2a2a" />
            <stop offset="1" stopColor="#1a1a1a" />
          </radialGradient>
          <linearGradient id="lk-sheen" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        <circle cx="159" cy="159" r="159" fill="url(#lk-outer)" />
        <circle cx="159" cy="159" r="145" fill="#323336" fillOpacity="0.96" />
      </svg>

      <div
        className="absolute inset-0 transition-transform duration-75 motion-reduce:transition-none"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg viewBox="0 0 318 318" className="w-full h-full" fill="none">
          <foreignObject x="20" y="20" width="278" height="278">
            {/* Sem `xmlns` no div: sobra do export do Figma. Dentro de um SVG
                inline o conteúdo do foreignObject já é parseado como HTML, e o
                atributo só existia para o React reclamar e o tsc barrar. */}
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background:
                  "conic-gradient(from 90deg, #969AA0 0deg, #5D636C 9deg, #555B69 22deg, #DFDFDF 41deg, #71798A 63deg, #A9ABB3 83deg, #CBD2D6 120deg, #FFFFFF 149deg, #5E646A 186deg, #8E959D 219deg, #FFFFFF 245deg, #7E8691 269deg, #575D6B 284deg, #6C747F 301deg, #F1F1F3 337deg, #979AA3 349deg, #B1B3B9 356deg, #969AA0 360deg)",
                opacity: 0.85,
              }}
            />
          </foreignObject>

          <circle cx="159" cy="30" r="10" fill="var(--vintage-value)" />
        </svg>
      </div>

      {/* Luz da sala: fica onde está, aconteça o que acontecer com o eixo. */}
      <svg
        viewBox="0 0 318 318"
        className="absolute inset-0 w-full h-full pointer-events-none"
        fill="none"
      >
        <circle cx="159" cy="159" r="139" fill="url(#lk-sheen)" />
        <circle
          cx="159"
          cy="159"
          r="130"
          fill="transparent"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="8"
        />
      </svg>
    </div>
  );
}

export function VintageLargeKnob({
  label = "VOLUME",
  min = 0,
  max = 10,
  value = 5,
  log = false,
  accent = "var(--vintage-value)",
  size = 260,
  fmt,
  onChange,
  className,
}: VintageLargeKnobProps) {
  const [hover, setHover] = useState(false);
  const {
    currentValue,
    rotation,
    isDragging,
    handleMouseDown,
    handleDoubleClick,
    handleWheel,
    handleKeyDown,
  } = useKnobDrag({ min, max, value, sensitivity: 0.015, log, onChange });

  return (
    <div
      // `inline-flex` em coluna: o rótulo entra no fluxo abaixo da caixa da
      // peça, e não mais debaixo de um irmão posicionado que vazava por cima.
      className={cn("inline-flex flex-col items-center select-none", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`${label}: ${fmt ? fmt(currentValue) : currentValue.toFixed(2)}\ndrag ↕ · shift=fine · scroll · dbl-click=reset`}
    >
      <div
        className="relative rounded-full outline-none focus-visible:[box-shadow:0_0_0_2px_var(--vintage-accent)]"
        style={{
          width: size,
          height: size,
          cursor: isDragging ? "grabbing" : "grab",
          opacity: hover || isDragging ? 1 : 0.9,
          transition: "opacity 0.15s, filter 0.2s",
          filter: hover
            ? `drop-shadow(0 0 12px color-mix(in srgb, ${accent} 20%, transparent))`
            : "none",
        }}
        // Alcançável por teclado: setas, Page, Home/End (ver `useKnobDrag`).
      tabIndex={0}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Number(currentValue.toFixed(2))}
      aria-valuetext={fmt ? fmt(currentValue) : currentValue.toFixed(1)}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      >
        <LargeKnobTicks />
        <div
          className="absolute"
          style={{
            width: `${RAZAO_CORPO * 100}%`,
            height: `${RAZAO_CORPO * 100}%`,
            left: `${((1 - RAZAO_CORPO) / 2) * 100}%`,
            top: `${((1 - RAZAO_CORPO) / 2) * 100}%`,
          }}
        >
          <LargeKnobBody rotation={rotation} />
        </div>
      </div>

      {/* Tipografia amarrada ao `size`: trocar o tamanho da peça não pode
          deixar um rótulo de 30px sob um knob de 160. */}
      <div className="text-center" style={{ marginTop: size * 0.07 }}>
        <div
          className="font-vintage-display font-black tracking-widest uppercase leading-none"
          style={{
            fontSize: Math.round(size * 0.09),
            color: hover ? "var(--vintage-label)" : "var(--vintage-value)",
            transition: "color 0.15s",
          }}
        >
          {label}
        </div>
        <div
          className="font-vintage-mono font-bold tracking-widest leading-none"
          style={{
            fontSize: Math.round(size * 0.065),
            marginTop: size * 0.03,
            color: accent,
          }}
        >
          {fmt ? fmt(currentValue) : currentValue.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
