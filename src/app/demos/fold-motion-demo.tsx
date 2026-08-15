"use client";

/**
 * As sete variantes lado a lado, cada uma com o desenho do próprio movimento.
 *
 * ── O que o report acusou ──────────────────────────────────────────────────
 *
 * "ficou muito difícil de diferenciar as variações, o nome não é intuitivo, não
 * tem um desenho pra exemplificar o que é, pra qual direção vai."
 *
 * As três queixas têm a mesma causa: a demo antiga mostrava UMA variante por
 * vez, num card só. Movimento de 300ms visto isolado, com trinta segundos entre
 * um e outro, não é comparável — ninguém guarda na memória a curva do `settle`
 * tempo suficiente pra confrontar com a do `climax`. Comparação exige as duas na
 * mesma tela, no mesmo instante.
 *
 * ── As três correções ──────────────────────────────────────────────────────
 *
 * 1. **Todas as sete de uma vez.** Cada ladrilho É uma dobra de verdade, com a
 *    sua variante aplicada — o ladrilho anima como a dobra animaria.
 * 2. **Um desenho por variante**, dizendo o eixo e a direção antes de o
 *    movimento acontecer. É o que resolve "pra qual direção vai" também pra quem
 *    chega com `prefers-reduced-motion` ligado e não vê movimento nenhum.
 * 3. **Uma glosa curta ao lado do nome.** `drift-l` continua sendo o nome da API
 *    (renomear quebraria quem já instalou); a glosa é a tradução, e é o que o
 *    olho lê primeiro.
 *
 * O modo "uma por vez" existe porque as duas leituras são necessárias: juntas
 * mostram a diferença de DIREÇÃO, em sequência mostram a diferença de TEMPO —
 * que é justamente o que separa `rise` de `climax`.
 *
 * ── O que o segundo report acusou ──────────────────────────────────────────
 *
 * "sempre em loop — melhorar auto-layout fill container". Duas coisas:
 *
 * · **A cena era um cadáver depois de 2,4s.** A entrada acontece uma vez, então
 *   quem chegava ao card depois do primeiro quadro via sete ladrilhos parados e
 *   um botão "repetir" que ninguém clica. Uma peça de MOVIMENTO tem que estar em
 *   movimento quando o olho chega. Agora a rodada se repete sozinha, e o botão
 *   de repetir some — ele não era controle, era uma desculpa.
 * · **Sete ladrilhos em três colunas deixam um buraco.** 3+3+1: a última linha
 *   ficava com dois terços de ar, e era esse ar que o report chamou de layout
 *   mal preenchido. Em quatro colunas com a sétima ocupando duas, 4+3 fecha as
 *   duas linhas sem sobra — e as linhas dividem a altura em partes iguais, então
 *   o ladrilho cresce com o palco em vez de flutuar num `min-height`.
 *
 * O loop respeita as duas paradas da casa: relógio parado quando o palco sai da
 * tela (`useStageActive`), e nada de repetição sob `prefers-reduced-motion` —
 * ali as sete variantes já nascem no estado final, e um loop invisível seria só
 * remontagem cega a cada três segundos.
 */

import * as React from "react";

import { Chip } from "../../../registry/visant/ui/chip";
import { Fold, FoldPart, type FoldVariant } from "../../../registry/visant/lib/fold-motion";
import { useStageActive } from "../stage";

const MARCA = "var(--brand, currentColor)";

/**
 * O desenho é sempre o mesmo enquadramento — moldura da dobra + a seta do
 * movimento na cor da marca. Sem o enquadramento fixo, sete ícones diferentes
 * viram sete ícones, não sete variações de uma coisa.
 */
function Diagrama({ v }: { v: FoldVariant }) {
  return (
    <svg viewBox="0 0 52 30" className="h-[30px] w-[52px] shrink-0" aria-hidden fill="none">
      <rect x="0.5" y="0.5" width="51" height="29" rx="4" stroke="currentColor" opacity="0.22" />

      {v === "rise" ? (
        <g stroke={MARCA} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M26 24V10" />
          <path d="M22 14l4-4 4 4" />
        </g>
      ) : null}

      {v === "drift-l" ? (
        <g stroke={MARCA} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15h26" />
          <path d="M34 11l4 4-4 4" />
        </g>
      ) : null}

      {v === "drift-r" ? (
        <g stroke={MARCA} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 15H14" />
          <path d="M18 11l-4 4 4 4" />
        </g>
      ) : null}

      {v === "mask" ? (
        <>
          <path d="M9 9h34" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
          <g stroke={MARCA} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M26 11v12" />
            <path d="M22 19l4 4 4-4" />
          </g>
        </>
      ) : null}

      {v === "settle" ? (
        <>
          <rect
            x="8"
            y="4"
            width="36"
            height="22"
            rx="3"
            stroke="currentColor"
            opacity="0.35"
            strokeDasharray="3 3"
          />
          <rect x="13" y="7.5" width="26" height="15" rx="2.5" stroke={MARCA} strokeWidth="1.6" />
        </>
      ) : null}

      {v === "climax" ? (
        <>
          <g stroke={MARCA} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M26 21v-7" />
            <path d="M22.5 17.5l3.5-3.5 3.5 3.5" />
          </g>
          {/* a régua de tempo: o mesmo gesto, mais longo */}
          <path
            d="M9 25h34"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.45"
            strokeDasharray="2 3"
          />
        </>
      ) : null}

      {v === "invert" ? (
        <>
          <rect x="5" y="6" width="19" height="18" rx="2.5" fill="currentColor" opacity="0.85" />
          <rect x="28" y="6" width="19" height="18" rx="2.5" fill={MARCA} />
        </>
      ) : null}
    </svg>
  );
}

const VARIANTES: { v: FoldVariant; glosa: string }[] = [
  { v: "rise", glosa: "sobe 14px" },
  { v: "drift-l", glosa: "entra pela esquerda" },
  { v: "drift-r", glosa: "entra pela direita" },
  { v: "mask", glosa: "revela por trás da linha" },
  { v: "settle", glosa: "assenta de 1.03" },
  { v: "climax", glosa: "sobe menos, demora mais" },
  { v: "invert", glosa: "o fundo troca de cor" },
];

/** Cadência da cascata e o respiro antes de a rodada recomeçar. */
const PASSO = 340;
const RESPIRO = 1600;

const usaMovimento = () =>
  typeof window === "undefined" ||
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function FoldMotionDemo() {
  const ativo = useStageActive();
  const [modo, setModo] = React.useState<"juntas" | "sequencia">("juntas");
  const [rodada, setRodada] = React.useState(0);
  const [liberados, setLiberados] = React.useState(VARIANTES.length);

  React.useEffect(() => {
    // Palco fora da tela não gasta timer — e mostrar tudo é o repouso correto,
    // nunca uma grade de ladrilhos vazios esperando um relógio que não roda.
    if (modo === "juntas" || !ativo) {
      setLiberados(VARIANTES.length);
      return;
    }
    setLiberados(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setLiberados(i);
      if (i >= VARIANTES.length) window.clearInterval(id);
    }, PASSO);
    return () => window.clearInterval(id);
  }, [modo, rodada, ativo]);

  React.useEffect(() => {
    // O loop. Fora da tela ele não existe, e sob movimento reduzido também não:
    // ali a entrada já nasce pronta, então repetir seria remontar sete
    // componentes a cada ciclo para não mudar um pixel.
    if (!ativo || !usaMovimento()) return;
    const ciclo = (modo === "sequencia" ? PASSO * VARIANTES.length : 900) + RESPIRO;
    const id = window.setInterval(() => setRodada((n) => n + 1), ciclo);
    return () => window.clearInterval(id);
  }, [modo, ativo]);

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip
          className="alvo-toque"
          pressed={modo === "juntas"}
          onClick={() => {
            setModo("juntas");
            setRodada((n) => n + 1);
          }}
        >
          todas juntas
        </Chip>
        <Chip
          className="alvo-toque"
          pressed={modo === "sequencia"}
          onClick={() => {
            setModo("sequencia");
            setRodada((n) => n + 1);
          }}
        >
          uma por vez
        </Chip>
      </div>

      {/* Quatro colunas, duas linhas de altura igual, e a sétima ocupando duas
          colunas: 4+3 fecha o retângulo. Sem o `col-span-2` sobra um terço de
          linha vazio, que é o "ar" que o report cobrou. */}
      <div className="grid flex-1 grid-cols-4 grid-rows-2 gap-2.5">
        {VARIANTES.map(({ v, glosa }, i) => (
          <div key={v} className={i === VARIANTES.length - 1 ? "col-span-2" : undefined}>
            {i < liberados ? (
              // A entrada é uma vez só por contrato; remontar por `key` é o
              // único jeito honesto de rever, sem método imperativo inventado.
              <Fold
                key={`${v}-${rodada}`}
                variant={v}
                as="div"
                className="flex h-full flex-col justify-between gap-2 rounded-[var(--r-surface,0.875rem)] border border-border p-3"
              >
                <FoldPart className="flex h-full flex-col justify-between gap-2">
                  <Diagrama v={v} />
                  <div>
                    <h3 className="font-mono text-apoio tracking-tight">{v}</h3>
                    <p className="text-rotulo text-muted-foreground">{glosa}</p>
                  </div>
                </FoldPart>
              </Fold>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
