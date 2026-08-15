"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * VintageParametricEQ — a curva, ao lado do banco de faders (não no lugar dele).
 *
 * ── Por que são DUAS peças, e não uma que substituiu a outra ───────────────
 *
 * Esta nasceu como reescrita do `vintage-eq`, respondendo ao "ficou redundante".
 * O diagnóstico continua valendo — banco de faders é seis números soltos e EQ é
 * **uma curva**, onde o ganho de cada banda vaza pras vizinhas —, mas a
 * conclusão estava errada por dois motivos:
 *
 * 1. **Trocar a API de um item publicado quebra quem instalou.** O `vintage-eq`
 *    entrega `labels`/`values`/`title`; esta peça entrega `bands`. Quem rodou
 *    `add @visant/vintage-eq` receberia, na atualização, um componente que não
 *    aceita nenhuma das props que ele passa.
 * 2. **O gráfico e o paramétrico não são a mesma ferramenta.** O de faders é o
 *    EQ de quem ouve — mexe onde dói, sem nomear frequência. O paramétrico é o
 *    de quem mistura — banda, ganho e Q. Os dois existem no mundo real lado a
 *    lado, e é por isso que os dois existem aqui.
 *
 * `vintage-eq` continua sendo o banco de faders, intacto. Esta é peça nova.
 *
 * Então aqui:
 *
 * - **Eixo x logarítmico**, 20 Hz a 20 kHz. Grave ocupa metade da tela como
 *   ocupa metade da audição; linear espremeria tudo que importa em 5% da régua.
 * - **Cada banda é um sino** (filtro peaking), e a curva grossa é a **soma em
 *   dB** dos sinos. Somar dB é o que uma cascata de peaking realmente faz, então
 *   a curva desenhada é a resposta, não uma ilustração dela.
 * - **O punho anda nos dois eixos**: vertical é ganho, horizontal é a
 *   frequência central, presa entre as vizinhas. Roda do mouse aperta ou abre o
 *   Q, e é aí que o sino fica agulha ou fica montanha.
 * - **BYPASS achata a curva** e apaga a cor, sem perder os valores. É a
 *   comparação A/B, que é pra que serve um EQ.
 *
 * Mudança de contrato, dita em voz alta: `values`/`onChange` falavam em 0…10
 * (posição do fader). Agora falam em **dB**, −12 a +12, com 0 no plano. Quem
 * instalou a versão anterior precisa reler os números; guardar a escala antiga
 * seria guardar a mentira de que aquilo era um EQ.
 */

export interface EqBand {
  id: string;
  /** Nome curto da banda. É o que a pessoa fala, não o que o filtro calcula. */
  label: string;
  /** Frequência central em Hz. */
  freq: number;
  /** Ganho em dB. Zero é plano. */
  gain: number;
  /** Fator de qualidade. Alto = agulha estreita, baixo = montanha larga. */
  q: number;
}

const BANDAS_PADRAO: EqBand[] = [
  { id: "low", label: "LOW", freq: 60, gain: 3.5, q: 0.8 },
  { id: "lowmid", label: "LOW-MID", freq: 250, gain: -2.5, q: 1.1 },
  { id: "mid", label: "MID", freq: 900, gain: 1.5, q: 1.4 },
  { id: "highmid", label: "HIGH-MID", freq: 3200, gain: -1.5, q: 1.6 },
  { id: "air", label: "AIR", freq: 11000, gain: 4, q: 0.7 },
];

interface VintageEQProps {
  bands?: EqBand[];
  title?: string;
  /** Teto do eixo em dB. A régua vai de −range a +range. */
  range?: number;
  accent?: string;
  onChange?: (bands: EqBand[]) => void;
  /** Largura natural do painel da curva. */
  width?: number;
  height?: number;
  className?: string;
}

const F_MIN = 20;
const F_MAX = 20000;
const DECADAS = Math.log(F_MAX / F_MIN);

/** Rótulos da régua de frequência. Só os que a pessoa usa pra se orientar. */
const MARCAS = [
  { f: 100, t: "100" },
  { f: 1000, t: "1k" },
  { f: 10000, t: "10k" },
];

export function VintageParametricEQ({
  bands: bandasIniciais,
  title = "PARAMETRIC EQ",
  range = 12,
  accent = "var(--vintage-value)",
  onChange,
  width = 520,
  height = 220,
  className,
}: VintageEQProps) {
  const [bandas, setBandas] = React.useState<EqBand[]>(
    () => bandasIniciais ?? BANDAS_PADRAO
  );
  const [ativa, setAtiva] = React.useState<string | null>(null);
  const [bypass, setBypass] = React.useState(false);
  const arrastando = React.useRef<string | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const padY = 14;
  const meio = height / 2;

  const fParaX = React.useCallback(
    (f: number) => (Math.log(f / F_MIN) / DECADAS) * width,
    [width]
  );
  const xParaF = React.useCallback(
    (x: number) => F_MIN * Math.exp((x / width) * DECADAS),
    [width]
  );
  const dbParaY = React.useCallback(
    (db: number) => meio - (db / range) * (meio - padY),
    [meio, range, padY]
  );
  const yParaDb = React.useCallback(
    (y: number) => ((meio - y) / (meio - padY)) * range,
    [meio, range, padY]
  );

  /**
   * O sino de um peaking, em dB.
   *
   * Gaussiana na régua de oitavas: `sigma` sai do Q pela largura de banda, e é
   * a mesma forma que um biquad peaking desenha na faixa que interessa. A
   * fórmula exata do biquad daria as mesmas curvas com dez vezes mais conta por
   * quadro — e este desenho é redesenhado a cada pixel de arrasto.
   */
  const sino = (f: number, b: EqBand) => {
    const sigma = 0.65 / Math.max(0.25, b.q);
    const d = Math.log2(f / b.freq);
    return b.gain * Math.exp(-(d * d) / (2 * sigma * sigma));
  };

  const somaDb = React.useCallback(
    (f: number) => {
      if (bypass) return 0;
      let s = 0;
      for (const b of bandas) s += sino(f, b);
      return Math.max(-range, Math.min(range, s));
    },
    [bandas, bypass, range]
  );

  const caminho = React.useMemo(() => {
    const passos = 160;
    let d = "";
    for (let i = 0; i <= passos; i++) {
      const x = (i / passos) * width;
      const y = dbParaY(somaDb(xParaF(x)));
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  }, [width, dbParaY, somaDb, xParaF]);

  const atualizar = (id: string, muda: Partial<EqBand>) => {
    setBandas((p) => {
      const prox = p.map((b) => (b.id === id ? { ...b, ...muda } : b));
      onChange?.(prox);
      return prox;
    });
  };

  const doPonteiro = (e: React.PointerEvent) => {
    const id = arrastando.current;
    const r = svgRef.current?.getBoundingClientRect();
    if (!id || !r) return;
    const x = Math.max(0, Math.min(width, e.clientX - r.left));
    const y = Math.max(0, Math.min(height, e.clientY - r.top));

    const i = bandas.findIndex((b) => b.id === id);
    // A banda não passa por cima da vizinha: curvas cruzadas viram um desenho
    // que ninguém consegue ler nem desfazer.
    const piso = i > 0 ? bandas[i - 1].freq * 1.15 : F_MIN;
    const teto = i < bandas.length - 1 ? bandas[i + 1].freq / 1.15 : F_MAX;

    atualizar(id, {
      gain: Math.max(-range, Math.min(range, Math.round(yParaDb(y) * 10) / 10)),
      freq: Math.round(Math.max(piso, Math.min(teto, xParaF(x)))),
    });
  };

  const focada = bandas.find((b) => b.id === (ativa ?? arrastando.current));

  return (
    <div
      className={cn(
        "inline-block rounded-2xl border border-[var(--vintage-border)] p-4",
        "bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)]",
        className
      )}
      style={{ width: width + 32 }}
    >
      {/* Cabeçalho: nome, leitura da banda em foco e o A/B. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{
            color: "var(--vintage-label)",
            fontFamily: "var(--font-vintage-mono, monospace)",
          }}
        >
          {title}
        </span>

        <span
          className="flex-1 truncate text-right text-[11px] tabular-nums"
          style={{
            color: "var(--vintage-text-muted)",
            fontFamily: "var(--font-vintage-mono, monospace)",
          }}
        >
          {focada
            ? `${focada.label} · ${formatarHz(focada.freq)} · ${focada.gain > 0 ? "+" : ""}${focada.gain.toFixed(1)} dB · Q ${focada.q.toFixed(2)}`
            : "arraste um ponto · roda = Q"}
        </span>

        <button
          type="button"
          onClick={() => setBypass((v) => !v)}
          aria-pressed={bypass}
          className="shrink-0 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
          style={{
            fontFamily: "var(--font-vintage-mono, monospace)",
            color: bypass ? "var(--vintage-surface-1)" : "var(--vintage-text-muted)",
            background: bypass ? "var(--vintage-meter-yellow)" : "var(--vintage-surface-3)",
            border: "1px solid var(--vintage-border)",
          }}
        >
          {bypass ? "BYPASS" : "ACTIVE"}
        </button>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block touch-none select-none rounded-lg"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, var(--vintage-surface-2), var(--vintage-surface-1))",
          border: "1px solid var(--vintage-border)",
          boxShadow: "inset 0 0 24px rgba(0,0,0,0.6)",
          cursor: arrastando.current ? "grabbing" : "default",
        }}
        onPointerMove={(e) => {
          if (arrastando.current) doPonteiro(e);
        }}
        onPointerUp={() => {
          arrastando.current = null;
        }}
        onPointerLeave={() => {
          arrastando.current = null;
        }}
      >
        {/* Régua de dB */}
        {[-range, -range / 2, 0, range / 2, range].map((db) => (
          <g key={db}>
            <line
              x1={0}
              x2={width}
              y1={dbParaY(db)}
              y2={dbParaY(db)}
              stroke="var(--vintage-border)"
              strokeWidth={db === 0 ? 1 : 0.5}
              opacity={db === 0 ? 0.9 : 0.45}
            />
            <text
              x={4}
              y={dbParaY(db) - 3}
              fontSize={9}
              fill="var(--vintage-text-muted)"
              fontFamily="var(--font-vintage-mono, monospace)"
            >
              {db > 0 ? `+${db}` : db}
            </text>
          </g>
        ))}

        {/* Régua de frequência */}
        {MARCAS.map((m) => (
          <g key={m.f}>
            <line
              x1={fParaX(m.f)}
              x2={fParaX(m.f)}
              y1={0}
              y2={height}
              stroke="var(--vintage-border)"
              strokeWidth={0.5}
              opacity={0.45}
            />
            <text
              x={fParaX(m.f) + 4}
              y={height - 5}
              fontSize={9}
              fill="var(--vintage-text-muted)"
              fontFamily="var(--font-vintage-mono, monospace)"
            >
              {m.t}
            </text>
          </g>
        ))}

        {/* Sinos individuais, apagados: é o que mostra de quem é cada corcova
            da curva grossa. Sem eles a soma vira uma cobra sem autor. */}
        {!bypass &&
          bandas.map((b) => {
            let d = "";
            for (let i = 0; i <= 60; i++) {
              const x = (i / 60) * width;
              const y = dbParaY(sino(xParaF(x), b));
              d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
            }
            return (
              <path
                key={b.id}
                d={d}
                fill="none"
                stroke={accent}
                strokeWidth={1}
                opacity={ativa === b.id ? 0.5 : 0.16}
              />
            );
          })}

        {/* A curva. Área preenchida até o plano, porque o que se lê num EQ é o
            desvio em relação ao zero, não a linha solta no ar. */}
        <path
          d={`${caminho}L${width},${dbParaY(0)}L0,${dbParaY(0)}Z`}
          fill={bypass ? "var(--vintage-text-dim)" : accent}
          opacity={bypass ? 0.06 : 0.14}
        />
        <path
          d={caminho}
          fill="none"
          stroke={bypass ? "var(--vintage-text-muted)" : accent}
          strokeWidth={2}
          strokeLinejoin="round"
          style={{
            filter: bypass ? undefined : `drop-shadow(0 0 6px ${accent})`,
            transition: "stroke 160ms var(--ease-out, ease)",
          }}
        />

        {/* Punhos */}
        {bandas.map((b) => {
          const x = fParaX(b.freq);
          const y = dbParaY(bypass ? 0 : b.gain);
          const emFoco = ativa === b.id || arrastando.current === b.id;
          return (
            <g
              key={b.id}
              // Ponto de EQ é um valor contínuo com mínimo e máximo — `slider` é
              // o papel certo, e o ganho é o número que o leitor de tela anuncia.
              // A frequência entra no rótulo porque é o que nomeia a banda.
              tabIndex={0}
              role="slider"
              aria-label={`${b.label}, ${formatarHz(b.freq)}`}
              aria-valuemin={-range}
              aria-valuemax={range}
              aria-valuenow={b.gain}
              aria-valuetext={`${b.gain > 0 ? "+" : ""}${b.gain.toFixed(1)} decibéis em ${formatarHz(b.freq)}`}
              className="outline-none [&:focus-visible>circle:nth-of-type(2)]:stroke-[var(--vintage-label)]"
              style={{ cursor: "grab" }}
              onFocus={() => setAtiva(b.id)}
              onBlur={() => setAtiva(null)}
              onKeyDown={(e) => {
                const passo = e.shiftKey ? 0.1 : 1;
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault();
                  const d = e.key === "ArrowUp" ? passo : -passo;
                  atualizar(b.id, {
                    gain: Math.max(-range, Math.min(range, +(b.gain + d).toFixed(1))),
                  });
                } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  e.preventDefault();
                  const fator = e.key === "ArrowRight" ? 1.06 : 1 / 1.06;
                  const i = bandas.findIndex((x) => x.id === b.id);
                  const piso = i > 0 ? bandas[i - 1].freq * 1.15 : F_MIN;
                  const teto = i < bandas.length - 1 ? bandas[i + 1].freq / 1.15 : F_MAX;
                  atualizar(b.id, {
                    freq: Math.round(Math.max(piso, Math.min(teto, b.freq * fator))),
                  });
                } else if (e.key === "Home") {
                  e.preventDefault();
                  atualizar(b.id, { gain: 0, q: 1 });
                }
              }}
              onPointerDown={(e) => {
                arrastando.current = b.id;
                setAtiva(b.id);
                (e.currentTarget.ownerSVGElement as SVGSVGElement | null)?.setPointerCapture?.(
                  e.pointerId
                );
              }}
              onPointerEnter={() => setAtiva(b.id)}
              onPointerLeave={() => {
                if (!arrastando.current) setAtiva(null);
              }}
              onWheel={(e) => {
                // Roda aperta o Q. É o gesto que todo EQ de tela usa, e é o que
                // separa "levantar grave" de "tirar aquele apito de 3 kHz".
                const dir = e.deltaY < 0 ? 1 : -1;
                atualizar(b.id, {
                  q: Math.max(0.3, Math.min(8, +(b.q + dir * 0.15).toFixed(2))),
                });
              }}
              onDoubleClick={() => atualizar(b.id, { gain: 0, q: 1 })}
            >
              {/* Alvo generoso invisível: o círculo desenhado tem 7px de raio,
                  o dedo recebe 22. */}
              <circle cx={x} cy={y} r={22} fill="transparent" />
              <line
                x1={x}
                x2={x}
                y1={y}
                y2={dbParaY(0)}
                stroke={accent}
                strokeWidth={1}
                opacity={emFoco ? 0.6 : 0.25}
              />
              <circle
                cx={x}
                cy={y}
                r={emFoco ? 8 : 6}
                fill="var(--vintage-surface-1)"
                stroke={bypass ? "var(--vintage-text-muted)" : accent}
                strokeWidth={2}
                style={{ transition: "r 120ms var(--ease-out, ease)" }}
              />
              <text
                x={x}
                y={y - 14}
                fontSize={9}
                textAnchor="middle"
                fill={emFoco ? "var(--vintage-label)" : "var(--vintage-text-muted)"}
                fontFamily="var(--font-vintage-mono, monospace)"
                style={{ pointerEvents: "none" }}
              >
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function formatarHz(f: number) {
  return f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 1 : 2)} kHz` : `${Math.round(f)} Hz`;
}
