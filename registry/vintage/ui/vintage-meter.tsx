"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface VintageMeterProps {
  label?: string;
  /** Controlado. Sem ele o medidor guarda o próprio nível. */
  value?: number;
  /** Nível inicial quando o medidor é não-controlado. */
  defaultValue?: number;
  min?: number;
  max?: number;
  /**
   * Chamado a cada mudança vinda do usuário (arraste, roda, teclado).
   *
   * No modo controlado ele é obrigatório para a peça aceitar entrada: sem
   * `onChange` não há para onde escrever, e um arraste que não move o ponteiro
   * é pior do que um medidor assumidamente passivo.
   */
  onChange?: (value: number) => void;
  /** Desliga a entrada do usuário e devolve o VU de vitrine, só leitura. */
  readOnly?: boolean;
  className?: string;
}

/** Ângulo do ponteiro, em graus a partir da vertical. */
const ARCO = 90;

export function VintageMeter({
  label = "LEVEL",
  value,
  defaultValue = 0,
  min = 0,
  max = 10,
  onChange,
  readOnly = false,
  className,
}: VintageMeterProps) {
  const controlado = value !== undefined;
  const [interno, setInterno] = useState(value ?? defaultValue);
  const nivel = value ?? interno;

  // No controlado sem `onChange` não existe entrada possível — ver a prop.
  const interativo = !readOnly && (!controlado || Boolean(onChange));

  const faceRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const peakRef = useRef<SVGLineElement>(null);
  const targetRef = useRef(nivel);
  const currentRef = useRef(nivel);
  const peakRefVal = useRef(nivel);
  const peakHold = useRef(0);
  const rafRef = useRef<number>(0);

  targetRef.current = nivel;

  useEffect(() => {
    let running = true;
    function animate() {
      if (!running) return;
      const diff = targetRef.current - currentRef.current;
      // Ataque rápido, queda lenta: é a balística de um VU de verdade.
      const speed = diff > 0 ? 0.25 : 0.08;
      currentRef.current += diff * speed;

      const normalized = (currentRef.current - min) / (max - min);
      const rotation = -ARCO / 2 + normalized * ARCO;

      if (needleRef.current) {
        needleRef.current.setAttribute(
          "transform",
          `rotate(${rotation} 70 65)`
        );
      }

      // Retentor de pico: sobe na hora, segura ~1s e desce devagar. É o que
      // deixa o transiente visível depois que a agulha já voltou.
      const agora = performance.now();
      if (currentRef.current > peakRefVal.current) {
        peakRefVal.current = currentRef.current;
        peakHold.current = agora;
      } else if (agora - peakHold.current > 900) {
        peakRefVal.current -= (max - min) * 0.004;
        if (peakRefVal.current < currentRef.current) {
          peakRefVal.current = currentRef.current;
        }
      }
      if (peakRef.current) {
        const pn = (peakRefVal.current - min) / (max - min);
        peakRef.current.setAttribute(
          "transform",
          `rotate(${-ARCO / 2 + pn * ARCO} 70 65)`
        );
      }

      rafRef.current = requestAnimationFrame(animate);
    }
    animate();
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [min, max]);

  const emitir = useCallback(
    (v: number) => {
      const clamped = Math.max(min, Math.min(max, v));
      if (!controlado) setInterno(clamped);
      onChange?.(clamped);
    },
    [controlado, min, max, onChange]
  );

  /**
   * O arraste é angular, não horizontal: o dedo empurra a agulha em volta do
   * eixo dela. Qualquer ponto da face serve, porque o que conta é a direção do
   * cursor em relação ao pivô — o mesmo gesto de encostar o dedo no ponteiro.
   */
  const doPonteiro = useCallback(
    (clientX: number, clientY: number) => {
      const r = faceRef.current?.getBoundingClientRect();
      if (!r) return;
      // O pivô mora em (70,65) de um viewBox 140×70 — daí as frações.
      const px = r.left + r.width * 0.5;
      const py = r.top + r.height * (65 / 70);
      const theta = (Math.atan2(py - clientY, clientX - px) * 180) / Math.PI;
      const n = (135 - theta) / ARCO;
      emitir(min + Math.max(0, Math.min(1, n)) * (max - min));
    },
    [emitir, min, max]
  );

  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interativo) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    doPonteiro(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) doPonteiro(e.clientX, e.clientY);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interativo) return;
    const passo = (max - min) * (e.shiftKey ? 0.01 : 0.05);
    if (e.key === "ArrowUp" || e.key === "ArrowRight") emitir(nivel + passo);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") emitir(nivel - passo);
    else if (e.key === "Home") emitir(min);
    else if (e.key === "End") emitir(max);
    else return;
    e.preventDefault();
  };

  const normalized = (nivel - min) / (max - min);
  const isClipping = normalized > 0.85;

  return (
    <div
      className={cn(
        "relative flex w-[180px] h-[140px] flex-col gap-2 rounded-[var(--r-control,10px)] p-2.5",
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
      {/*
        A janela do VU: mostrador de papel creme iluminado por trás, atrás de um
        vidro. É o objeto que todo mundo reconhece como "medidor analógico"; o
        arco arco-íris sobre fundo preto que havia aqui era gráfico de painel
        web, não instrumento.
      */}
      <div
        className="relative flex-1 overflow-hidden rounded-[6px]"
        style={{
          background:
            "radial-gradient(130% 120% at 50% 100%, #f7e2a4 0%, #ecc86f 50%, #b98a33 100%)",
          boxShadow:
            "inset 0 2px 6px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div
          ref={faceRef}
          className={cn(
            // `touch-none`: sem isso o arraste na face vira rolagem da página no
            // celular e o medidor não anda.
            "absolute bottom-0 left-1/2 -translate-x-1/2 w-[150px] h-[75px] rounded-[4px] outline-none",
            "focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--vintage-value))]",
            interativo && "touch-none cursor-grab active:cursor-grabbing"
          )}
          role={interativo ? "slider" : undefined}
          tabIndex={interativo ? 0 : undefined}
          aria-label={interativo ? label : undefined}
          aria-valuemin={interativo ? min : undefined}
          aria-valuemax={interativo ? max : undefined}
          aria-valuenow={interativo ? Number(nivel.toFixed(2)) : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
        >
          <svg viewBox="0 0 140 70" className="w-full h-full overflow-visible">
            {/* Escala impressa: tinta escura, zona vermelha no último quarto. */}
            <path d={arco(0, 0.75, 52)} fill="none" stroke={TINTA} strokeWidth="1" />
            <path
              d={arco(0.75, 1, 52)}
              fill="none"
              stroke="var(--vintage-meter-red)"
              strokeWidth="3.5"
            />

            {Array.from({ length: 11 }, (_, i) => {
              const n = i / 10;
              const isMajor = i % 5 === 0;
              const [x1, y1] = polar(n, 52);
              const [x2, y2] = polar(n, isMajor ? 44 : 47);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={n > 0.75 ? "var(--vintage-meter-red)" : TINTA}
                  strokeWidth={isMajor ? "1.4" : "0.8"}
                />
              );
            })}

            {[0, 5, 10].map((num) => {
              const [x, y] = polar(num / 10, 37);
              return (
                <text
                  key={num}
                  x={x}
                  y={y + 2.5}
                  textAnchor="middle"
                  fill={num === 10 ? "var(--vintage-meter-red)" : TINTA}
                  fontSize="7"
                  fontWeight="600"
                  fontFamily="var(--font-vintage-mono)"
                >
                  {num}
                </text>
              );
            })}

            <text
              x="70"
              y="50"
              textAnchor="middle"
              fill={TINTA}
              fontSize="8"
              fontWeight="700"
              letterSpacing="1.5"
              fontFamily="var(--font-vintage-mono)"
            >
              VU
            </text>

            {/* Retentor de pico: traço curto na ponta do arco. */}
            <line
              ref={peakRef}
              x1="70"
              y1="20"
              x2="70"
              y2="13"
              stroke="var(--vintage-meter-red)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.7"
              transform="rotate(-45 70 65)"
            />

            {/* Ponteiro, animado por ref e não por estado do React. A sombra
                deslocada é o milímetro entre o ponteiro e o papel. */}
            <g ref={needleRef} transform="rotate(-45 70 65)">
              <line
                x1="70.7"
                y1="66"
                x2="70.7"
                y2="15"
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <line
                x1="70"
                y1="65"
                x2="70"
                y2="14"
                stroke={TINTA}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
            {/* Tampa do pivô, presa ao vidro: não gira. */}
            <circle cx="70" cy="68" r="7" fill="var(--vintage-surface-2)" />
            <circle
              cx="70"
              cy="68"
              r="7"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.6"
            />
          </svg>
        </div>

        {/* O vidro: reflexo da luz de cima, cortado em diagonal. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(168deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 38%, transparent 39%)",
          }}
        />
      </div>

      <div className="flex items-center justify-between font-vintage-mono leading-none">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            color: "var(--vintage-text-muted)",
            textShadow: "0 -1px 0 rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="text-[11px] tabular-nums"
            style={{ color: isClipping ? "var(--vintage-meter-red)" : "var(--vintage-value)" }}
          >
            {nivel.toFixed(1)}
          </span>
          {/* Lâmpada de pico: acende no vermelho, sem piscar. */}
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: isClipping ? "var(--vintage-meter-red)" : "var(--vintage-surface-1)",
              boxShadow: isClipping
                ? "0 0 6px var(--vintage-meter-red), 0 0 0 1px rgba(0,0,0,0.6)"
                : "inset 0 1px 1px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.6)",
              transition: "background var(--dur-fast,160ms) var(--ease-out,ease)",
            }}
          />
        </span>
      </div>
    </div>
  );
}

/** Tinta da serigrafia do mostrador. Material, não tema: papel creme leva tinta escura. */
const TINTA = "#2a2014";

/** Ponto da escala `n` (0…1) a `r` do pivô (70,65), no arco de ±45°. */
function polar(n: number, r: number): [number, number] {
  const rad = ((-45 + n * 90) * Math.PI) / 180;
  return [70 + Math.sin(rad) * r, 65 - Math.cos(rad) * r];
}

function arco(de: number, ate: number, r: number) {
  const [x1, y1] = polar(de, r);
  const [x2, y2] = polar(ate, r);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}
