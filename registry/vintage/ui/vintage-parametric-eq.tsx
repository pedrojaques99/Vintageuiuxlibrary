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
 * - **Cada banda é um sino** (filtro peaking RBJ, o biquad de verdade), e a
 *   curva grossa é a **soma em dB** dos sinos. Somar dB é o que uma cascata de
 *   peaking realmente faz, então a curva desenhada é a resposta, não uma
 *   ilustração dela.
 * - **Pouca tinta no gráfico.** Grade só no plano de 0 dB e três marcas de
 *   frequência no rodapé; o sino de uma banda só aparece quando ela está na
 *   mão (hover, foco ou arrasto). Linha que não responde a nada é ruído.
 * - **A curva veste a marca.** Traço, área e punhos usam `--brand` (borda e
 *   fundo, nunca texto); o painel continua sendo o do kit vintage. A leitura
 *   em texto fica na tinta do painel, que é onde o contraste está garantido.
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
  /** Cor da curva e dos punhos. Padrão: a marca selecionada. Só traço e fundo. */
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
  accent = "var(--brand)",
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

  /*
   * A soma é desenhada a cada 2 px de largura e o sino da banda em foco a cada
   * 4: o arrasto redesenha tudo a cada movimento, e 5 biquads por ponto é
   * conta de nada.
   */
  const somaDb = React.useCallback(
    (f: number) => {
      if (bypass) return 0;
      let s = 0;
      for (const b of bandas) s += sinoDb(f, b);
      return Math.max(-range, Math.min(range, s));
    },
    [bandas, bypass, range]
  );

  const caminho = React.useMemo(() => {
    const passos = Math.round(width / 2);
    let d = "";
    for (let i = 0; i <= passos; i++) {
      const x = (i / passos) * width;
      const y = dbParaY(somaDb(xParaF(x)));
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  }, [width, dbParaY, somaDb, xParaF]);

  /*
   * O próximo estado sai do ref, FORA do updater do `setBandas`.
   *
   * O `onChange` do pai morava dentro do updater, e updater é chamado pelo
   * React durante o render (e duas vezes em modo estrito): o pai ganhava um
   * `setState` no meio do render do EQ — o aviso "Cannot update a component
   * while rendering a different component" na vitrine, e um `onChange` em dobro
   * em desenvolvimento.
   */
  const bandasRef = React.useRef(bandas);
  bandasRef.current = bandas;
  const atualizar = (id: string, muda: Partial<EqBand>) => {
    // Sem som aqui, de propósito: o arrasto anda nos dois eixos ao mesmo
    // tempo, e um estalo por passo virava matraca contínua sob a mão.
    const prox = bandasRef.current.map((b) => (b.id === id ? { ...b, ...muda } : b));
    bandasRef.current = prox;
    setBandas(prox);
    onChange?.(prox);
  };

  const doPonteiro = (e: React.PointerEvent) => {
    const id = arrastando.current;
    const r = svgRef.current?.getBoundingClientRect();
    if (!id || !r) return;
    // A vitrine escala o palco com transform: o retângulo da tela vem escalado
    // e o desenho não. Divide pela escala antes de virar Hz e dB.
    const kx = r.width ? width / r.width : 1;
    const ky = r.height ? height / r.height : 1;
    const x = Math.max(0, Math.min(width, (e.clientX - r.left) * kx));
    const y = Math.max(0, Math.min(height, (e.clientY - r.top) * ky));

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
        "inline-block rounded-[var(--r-control,10px)] p-4",
        className
      )}
      style={{
        width: width + 32,
        // O painel do kit: chapa escura, luz de cima, sombra que fecha embaixo.
        background: "linear-gradient(180deg, var(--vintage-surface-3), var(--vintage-surface-2))",
        border: "1px solid var(--vintage-surface-1)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 1px rgba(0,0,0,0.5), 0 10px 24px -8px rgba(0,0,0,0.6)",
      }}
    >
      {/* Cabeçalho: nome, leitura da banda em foco e o A/B. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            color: "var(--vintage-text-muted)",
            fontFamily: "var(--font-vintage-mono, monospace)",
            textShadow: "0 -1px 0 rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {title}
        </span>

        <span
          className="flex-1 truncate text-right text-[11px] tabular-nums"
          style={{
            color: focada ? "var(--vintage-label)" : "var(--vintage-text-muted)",
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
          className="group relative flex shrink-0 items-center gap-1.5 rounded-[4px] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] outline-none"
          style={{
            fontFamily: "var(--font-vintage-mono, monospace)",
            color: bypass ? "var(--vintage-label)" : "var(--vintage-text-muted)",
            // Tecla de painel: afunda quando travada, em vez de virar um
            // bloco amarelo, que é chip de web e não botão de rack.
            background: bypass
              ? "linear-gradient(180deg, var(--vintage-surface-2), var(--vintage-surface-3))"
              : "linear-gradient(180deg, var(--vintage-surface-4), var(--vintage-surface-3))",
            boxShadow: bypass
              ? "inset 0 1px 3px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.6)"
              : "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 1px rgba(0,0,0,0.6), 0 2px 3px rgba(0,0,0,0.5)",
            transition:
              "color var(--dur-fast,160ms) var(--ease-out,ease), box-shadow var(--dur-press,120ms) var(--ease-out,ease)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-[inherit] group-focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--vintage-value))]"
          />
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: bypass ? "var(--vintage-value)" : "var(--vintage-surface-1)",
              boxShadow: bypass
                ? "0 0 6px var(--vintage-value)"
                : "inset 0 1px 1px rgba(0,0,0,0.8)",
            }}
          />
          BYPASS
        </button>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block touch-none select-none rounded-[6px]"
        style={{
          // Janela rebaixada na chapa: a mesma do osciloscópio e do XY.
          background:
            "radial-gradient(ellipse at 50% 40%, var(--vintage-surface-2), var(--vintage-surface-1))",
          boxShadow:
            "inset 0 2px 6px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06)",
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
        {/* Grade mínima: só o plano de 0 dB, que é a referência de tudo, e os
            extremos da régua escritos no canto, sem linha. */}
        <line
          x1={0}
          x2={width}
          y1={dbParaY(0)}
          y2={dbParaY(0)}
          stroke="var(--vintage-border)"
          strokeWidth={1}
          opacity={0.8}
        />
        {[range, -range].map((db) => (
          <text
            key={db}
            x={4}
            y={db > 0 ? dbParaY(db) + 9 : dbParaY(db) - 2}
            fontSize={9}
            fill="var(--vintage-text-muted)"
            fontFamily="var(--font-vintage-mono, monospace)"
          >
            {db > 0 ? `+${db}` : db}
          </text>
        ))}

        {/* Frequência: marca curta no rodapé, não linha cruzando a curva. */}
        {MARCAS.map((m) => (
          <g key={m.f}>
            <line
              x1={fParaX(m.f)}
              x2={fParaX(m.f)}
              y1={height - 4}
              y2={height}
              stroke="var(--vintage-border)"
              strokeWidth={1}
            />
            <text
              x={fParaX(m.f) + 3}
              y={height - 5}
              fontSize={9}
              fill="var(--vintage-text-muted)"
              fontFamily="var(--font-vintage-mono, monospace)"
            >
              {m.t}
            </text>
          </g>
        ))}

        {/* O sino só da banda na mão: mostra de quem é aquela corcova da soma
            sem encher o gráfico de cinco linhas paradas. */}
        {!bypass && focada && (
          <path
            d={caminhoDoSino(focada, width, dbParaY, xParaF)}
            fill="none"
            stroke={accent}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.55}
          />
        )}

        {/* A curva. Área preenchida até o plano, porque o que se lê num EQ é o
            desvio em relação ao zero, não a linha solta no ar. */}
        <path
          d={`${caminho}L${width},${dbParaY(0)}L0,${dbParaY(0)}Z`}
          fill={bypass ? "var(--vintage-text-dim)" : accent}
          opacity={bypass ? 0.05 : 0.12}
        />
        <path
          d={caminho}
          fill="none"
          stroke={bypass ? "var(--vintage-text-muted)" : accent}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ transition: "stroke var(--dur-fast,160ms) var(--ease-out, ease)" }}
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
              {emFoco && !bypass && (
                <line
                  x1={x}
                  x2={x}
                  y1={y}
                  y2={dbParaY(0)}
                  stroke={accent}
                  strokeWidth={1}
                  opacity={0.5}
                />
              )}
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

/** Taxa de amostragem de referência pra desenhar a resposta dos biquads. */
const FS = 48000;

/**
 * Ganho em dB de um peaking RBJ (Audio EQ Cookbook) na frequência `f`.
 *
 * É a fórmula exata do biquad, não uma gaussiana parecida: a largura sai do Q
 * do jeito que a mesa de som calcula, e a soma das bandas bate com o que um
 * `BiquadFilterNode` do tipo `peaking` toca.
 */
function sinoDb(f: number, b: EqBand) {
  if (b.gain === 0) return 0;
  const A = Math.pow(10, b.gain / 40);
  const w0 = (2 * Math.PI * Math.min(b.freq, FS / 2 - 1)) / FS;
  const alpha = Math.sin(w0) / (2 * Math.max(0.1, b.q));
  const c = Math.cos(w0);
  const b0 = 1 + alpha * A;
  const b1 = -2 * c;
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * c;
  const a2 = 1 - alpha / A;
  // |H(e^jw)|² pelos cossenos de w e 2w.
  const w = (2 * Math.PI * f) / FS;
  const cw = Math.cos(w);
  const c2w = Math.cos(2 * w);
  const num = b0 * b0 + b1 * b1 + b2 * b2 + 2 * (b0 * b1 + b1 * b2) * cw + 2 * b0 * b2 * c2w;
  const den = a0 * a0 + a1 * a1 + a2 * a2 + 2 * (a0 * a1 + a1 * a2) * cw + 2 * a0 * a2 * c2w;
  return 10 * Math.log10(num / den);
}

function caminhoDoSino(
  b: EqBand,
  width: number,
  dbParaY: (db: number) => number,
  xParaF: (x: number) => number
) {
  const passos = Math.round(width / 4);
  let d = "";
  for (let i = 0; i <= passos; i++) {
    const x = (i / passos) * width;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${dbParaY(sinoDb(xParaF(x), b)).toFixed(1)}`;
  }
  return d;
}

function formatarHz(f: number) {
  return f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 1 : 2)} kHz` : `${Math.round(f)} Hz`;
}
