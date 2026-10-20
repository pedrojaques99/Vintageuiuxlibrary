"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx-bus";

/**
 * VintageXYPad — dois parâmetros num gesto só.
 *
 * O que estava errado ("faz alterar algo"): a peça já emitia `onChange`, mas
 * ninguém do lado de fora escutava, então na vitrine ela era um ponto que
 * andava dentro de uma caixa. O conserto de verdade é a cena — o pad ligado a
 * um tubo que muda de desenho — mas três defeitos eram do componente:
 *
 * 1. **Sem teclado.** O gesto era o único jeito de mexer. Um controle de dois
 *    eixos que só obedece ao ponteiro exclui quem navega por Tab, e o dado é
 *    contínuo: seta anda 2%, com Shift anda 10%.
 * 2. **Sem captura de ponteiro.** Os ouvintes iam no `window`; arrastar pra
 *    fora, soltar em cima de outro card e voltar deixava o pad "colado" no
 *    cursor. `setPointerCapture` entrega o gesto ao alvo e devolve no `up`.
 * 3. **Rótulo em `--vintage-text-dim`.** Sobre o painel escuro isso dá 2,8:1,
 *    abaixo do piso de 3:1 — e é justamente o número que a pessoa quer ler
 *    enquanto arrasta. Passou a `--vintage-text-muted` (5,4:1).
 *
 * O rastro curto do cursor não é enfeite: num pad sem rastro, movimento rápido
 * some entre um quadro e outro, e a mão perde a noção do caminho que fez.
 */
interface VintageXYPadProps {
  size?: number;
  value?: { x: number; y: number };
  onChange?: (x: number, y: number) => void;
  labelX?: string;
  labelY?: string;
  color?: string;
  className?: string;
}

const PASSOS_RASTRO = 12;

export function VintageXYPad({
  size = 160,
  value,
  onChange,
  labelX = "X",
  labelY = "Y",
  color = "var(--vintage-value)",
  className,
}: VintageXYPadProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState(value ?? { x: 0.5, y: 0.5 });
  const [rastro, setRastro] = React.useState<{ x: number; y: number }[]>([]);
  const arrastando = React.useRef(false);
  const celulaRef = React.useRef<number | null>(null);

  const atual = value ?? pos;

  const aplicar = React.useCallback(
    (x: number, y: number) => {
      const cx = Math.max(0, Math.min(1, x));
      const cy = Math.max(0, Math.min(1, y));
      // Estalo por célula de uma grade 8×8: a mão sente onde está sem olhar.
      const celula = Math.min(7, Math.floor(cx * 8)) * 8 + Math.min(7, Math.floor(cy * 8));
      if (celulaRef.current !== null && celula !== celulaRef.current) playSfx("detent");
      celulaRef.current = celula;
      if (!value) setPos({ x: cx, y: cy });
      setRastro((p) => [...p, { x: cx, y: cy }].slice(-PASSOS_RASTRO));
      onChange?.(cx, cy);
    },
    [onChange, value]
  );

  const doPonteiro = React.useCallback(
    (e: React.PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      aplicar((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    },
    [aplicar]
  );

  const soltar = () => {
    arrastando.current = false;
    setRastro([]);
  };

  const porTecla = (e: React.KeyboardEvent) => {
    const passo = e.shiftKey ? 0.1 : 0.02;
    const mapa: Record<string, [number, number]> = {
      ArrowLeft: [-passo, 0],
      ArrowRight: [passo, 0],
      ArrowUp: [0, passo],
      ArrowDown: [0, -passo],
    };
    const d = mapa[e.key];
    if (d) {
      e.preventDefault();
      aplicar(atual.x + d[0], atual.y + d[1]);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      aplicar(0.5, 0.5);
    }
  };

  const leitura = `${labelX} ${(atual.x * 100).toFixed(0)}%, ${labelY} ${(atual.y * 100).toFixed(0)}%`;

  return (
    <div
      className={cn("inline-flex flex-col gap-2 rounded-[var(--r-control,10px)] p-2.5", className)}
      style={{
        // O painel do kit: chapa escura, luz de cima, sombra que fecha embaixo.
        background: "linear-gradient(180deg, var(--vintage-surface-3), var(--vintage-surface-2))",
        border: "1px solid var(--vintage-surface-1)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 1px rgba(0,0,0,0.5), 0 10px 24px -8px rgba(0,0,0,0.6)",
      }}
    >
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`Campo de dois eixos: ${labelX} e ${labelY}. Setas movem, Shift acelera, Home centraliza.`}
        className={cn(
          "group relative rounded-[6px] cursor-crosshair touch-none outline-none overflow-hidden"
        )}
        style={{
          width: size,
          height: size,
          // Janela rebaixada, a mesma do osciloscópio e do EQ.
          background:
            "radial-gradient(ellipse at 50% 40%, var(--vintage-surface-2), var(--vintage-surface-1))",
          boxShadow:
            "inset 0 2px 6px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06)",
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          /*
           * Três defeitos do arrasto, todos daqui:
           * - sem `preventDefault` o navegador começava uma seleção de texto
           *   junto, e o gesto pintava de azul o que o cursor cruzava;
           * - `focus()` sem `preventScroll` rolava a página pra mostrar o
           *   campo inteiro, e o pad fugia de baixo do dedo no meio do gesto;
           * - o rastro ficava na tela depois de soltar, como gesto travado.
           */
          e.preventDefault();
          arrastando.current = true;
          celulaRef.current = null;
          setRastro([]);
          e.currentTarget.setPointerCapture?.(e.pointerId);
          e.currentTarget.focus({ preventScroll: true });
          doPonteiro(e);
        }}
        onPointerMove={(e) => {
          if (arrastando.current) doPonteiro(e);
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onLostPointerCapture={soltar}
        onKeyDown={porTecla}
      >
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox={`0 0 ${size} ${size}`}
        >
          {[0.25, 0.5, 0.75].map((t) => (
            <g key={t}>
              <line
                x1={t * size}
                y1={0}
                x2={t * size}
                y2={size}
                stroke="var(--vintage-text-muted)"
                strokeWidth={0.5}
                opacity={t === 0.5 ? 0.4 : 0.15}
              />
              <line
                x1={0}
                y1={t * size}
                x2={size}
                y2={t * size}
                stroke="var(--vintage-text-muted)"
                strokeWidth={0.5}
                opacity={t === 0.5 ? 0.4 : 0.15}
              />
            </g>
          ))}

          {/* Rastro: o caminho recente da mão, apagando. */}
          {rastro.length > 1 && (
            <polyline
              points={rastro
                .map((p) => `${p.x * size},${(1 - p.y) * size}`)
                .join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.35}
            />
          )}
        </svg>

        <div
          className="absolute pointer-events-none"
          style={{
            left: `${atual.x * 100}%`,
            top: 0,
            bottom: 0,
            width: 1,
            background: color,
            opacity: 0.3,
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: `${(1 - atual.y) * 100}%`,
            left: 0,
            right: 0,
            height: 1,
            background: color,
            opacity: 0.3,
          }}
        />

        <div
          className="absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${atual.x * 100}%`,
            top: `${(1 - atual.y) * 100}%`,
            width: 10,
            height: 10,
            background: `radial-gradient(circle at 50% 35%, color-mix(in srgb, ${color} 40%, white) 0%, ${color} 55%)`,
            boxShadow: `0 0 8px ${color}, 0 0 18px color-mix(in srgb, ${color} 40%, transparent)`,
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${atual.x * 100}%`,
            top: `${(1 - atual.y) * 100}%`,
            width: 20,
            height: 20,
            border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
          }}
        />
        {/* Foco num filho: a janela tem `overflow-hidden` e sombra inline. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[6px] group-focus-visible:[box-shadow:inset_0_0_0_2px_var(--vintage-value)]"
        />
      </div>

      <div
        className="flex justify-between"
        style={{ width: size }}
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="sr-only">{leitura}</span>
        {[
          [labelX, atual.x],
          [labelY, atual.y],
        ].map(([rotulo, v]) => (
          <span
            key={String(rotulo)}
            aria-hidden
            className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.08em] tabular-nums"
            style={{
              color: "var(--vintage-text-muted)",
              fontFamily: "var(--font-vintage-mono, monospace)",
              textShadow: "0 -1px 0 rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {rotulo}: {((v as number) * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}
