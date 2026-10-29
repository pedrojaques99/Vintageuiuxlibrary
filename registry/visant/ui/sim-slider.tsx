"use client";

import * as React from "react";

import { Slider } from "@/components/ui/slider";
import { playSfx } from "@/lib/sfx-bus";
import { cn } from "@/lib/utils";

/** Dentes do anel de foco no curso inteiro: um `focus` a cada dente cruzado. */
const DENTES = 40;

/**
 * Sim Slider — a dobra que deixa o visitante fazer a conta em vez de ler a conta.
 *
 * Uma dobra de prova afirma um número; um simulador entrega o número que a
 * pessoa foi buscar. É a peça que mais move intenção numa landing de serviço,
 * e é também a mais fácil de fazer errado — porque o erro dela não é visual, é
 * de honestidade.
 *
 * ── As três regras que o componente FORÇA ──────────────────────────────────
 *
 * 1. **`assumption` é obrigatório.** Não existe simulador sem premissa escrita.
 *    "Você fatura R$450k" sem dizer de onde saiu o multiplicador é chute com
 *    tipografia boa. A letra miúda não é rodapé legal: é o que separa uma
 *    ferramenta de uma promessa. Mesma disciplina do `@visant/measure-bar`, que
 *    se recusa a desenhar régua sem denominador honesto.
 * 2. **O resultado é derivado, nunca digitado.** `outputs[].value` recebe o
 *    valor do controle e devolve texto. Não há como a projeção discordar do
 *    controle, porque não existe segunda fonte.
 * 3. **A curva é opcional e some quando não há série honesta.** Sparkline
 *    decorativa — pontos inventados pra "dar movimento" — é a versão gráfica da
 *    barra de progresso falsa que para em 90%.
 * 4. **A curva tem teto desenhado.** Sem ele a peça quebra a própria regra: uma
 *    linha sozinha num retângulo é número sem régua. Pego na medição — no valor
 *    padrão a série ocupava 30% da caixa e lia como gráfico quebrado, quando na
 *    verdade dizia "você está a 30% do teto da faixa". Com o tracejado no topo,
 *    a mesma curva passa a afirmar isso.
 *
 * ── A escala vertical é FIXA, e é isso que a torna honesta ─────────────────
 *
 * `curve` devolve pontos de 0 a 1 e o desenho não renormaliza pelo máximo da
 * série atual. Se renormalizasse, arrastar o controle mudaria a forma da curva
 * sem mudar a projeção — a linha ficaria sempre igual de cheia, e crescimento
 * viraria enfeite. A escala é a faixa inteira do controle: no mínimo a curva
 * rasteja, no máximo ela encosta no teto. É o gesto que mostra o ganho.
 *
 * ── Motion: aqui o certo é quase não animar ────────────────────────────────
 *
 * Arrastar é gesto de alta frequência, e a regra da casa é clara: o que
 * acontece dezenas de vezes por minuto **não anima**. Então:
 *
 * · O número NÃO faz count-up a cada quadro. `@visant/count-up` é pra chegada
 *   (uma vez, na rolagem); usá-lo aqui deixaria o valor sempre correndo atrás
 *   do polegar, e o texto ilegível durante o arrasto inteiro.
 * · A curva também NÃO tem transição. Foi a primeira tentativa, e estava
 *   errada: com a curva assentando em 200ms e o número trocando na hora, os
 *   dois passam o arrasto inteiro discordando — o gráfico mostra um cenário e o
 *   texto mostra outro. Num simulador isso não é atraso, é informação falsa.
 *   Curva e número são a MESMA leitura, e leitura acompanha o dedo.
 * · O que anima é o que o gesto não controla: a curva ENTRA uma vez, na
 *   montagem, e nunca reinicia — trocar o atributo `points` não rearma uma
 *   animação CSS. É o raro `@keyframes` legítimo: ninguém interrompe uma
 *   entrada que acontece uma vez só.
 *
 *   Essa entrada era um traçado (`stroke-dasharray: 1` + `pathLength={1}` +
 *   `stroke-dashoffset` animado). **Não use.** Com `vector-effect:
 *   non-scaling-stroke` o dash passa a ser medido no espaço RENDERIZADO, não no
 *   do `viewBox`, então o comprimento normalizado deixa de valer e a linha sai
 *   picotada em marcha — e some junto a única coisa que a curva tinha que ser:
 *   contínua. Ou você tem traço honesto na diagonal (non-scaling-stroke), ou
 *   tem traçado animado. A escolha aqui é o traço, e a entrada virou fade.
 * · `tabular-nums` + largura travada pela maior leitura possível: sem isso o
 *   "R$1.000" → "R$18.500" empurra o rótulo vizinho a cada pixel de arrasto, e
 *   a dobra inteira treme.
 *
 * ── Por que o controle é o Slider do shadcn ────────────────────────────────
 *
 * Slider acessível é problema resolvido, e resolvê-lo de novo custa teclado,
 * `aria-valuetext`, RTL e arrasto com o ponteiro fora do trilho. Entra por
 * `registryDependencies`. O que este componente acrescenta é a ANATOMIA em
 * volta — leitura, projeção, curva e premissa — que é o que nenhuma lib traz.
 *
 * Roda do mouse ficou de fora de propósito: numa página que rola, roda sobre um
 * controle rouba a rolagem, e a saída (listener nativo com `passive: false`)
 * conserta o roubo criando outro problema — a pessoa que só queria descer a
 * página muda um número sem querer.
 */

export interface SimOutput {
  label: string;
  /** Recebe o valor do controle e devolve o texto já formatado. */
  value: (v: number) => string;
  /** Destaca esta leitura como a principal. Uma só, ou nenhuma. */
  primary?: boolean;
}

export interface SimSliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  label: string;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  /** Formata a leitura do próprio controle (o que a pessoa está movendo). */
  format?: (v: number) => string;
  outputs: SimOutput[];
  /** A premissa, por escrito. Sem ela o simulador não é ferramenta, é promessa. */
  assumption: string;
  /**
   * A série da curva para um dado valor, entre 0 e 1 cada ponto. Ausente, a
   * curva não desenha — e isso é o certo quando não há projeção temporal real.
   */
  curve?: (v: number) => number[];
  /**
   * O que o topo da caixa significa. É a régua da curva — sem ela a linha é um
   * traço num retângulo. Ausente, o tracejado ainda desenha, mudo.
   */
  ceilingLabel?: string;
  onValueChange?: (v: number) => void;
}

export function SimSlider({
  label,
  min,
  max,
  step = 1,
  defaultValue,
  format = (v) => String(v),
  outputs,
  assumption,
  curve,
  ceilingLabel,
  onValueChange,
  className,
  ...props
}: SimSliderProps) {
  const [value, setValue] = React.useState(defaultValue ?? Math.round((min + max) / 2));

  const dente = React.useRef<number | null>(null);
  const handle = React.useCallback(
    (v: number[]) => {
      // Som de anel de foco de lente girando, por dente de curso. O portão de
      // 45 ms do bus segura o arrasto rápido.
      const d = Math.round(((v[0] - min) / (max - min || 1)) * DENTES);
      if (dente.current !== d) playSfx("focus");
      dente.current = d;
      setValue(v[0]);
      onValueChange?.(v[0]);
    },
    [onValueChange, min, max],
  );

  // A largura de cada leitura é travada pela maior string possível — medida nos
  // dois extremos da faixa, não no valor atual. `ch` de fonte tabular é uma
  // régua confiável justamente porque todo dígito tem a mesma caixa.
  const widths = React.useMemo(
    () =>
      outputs.map((o) => Math.max(o.value(min).length, o.value(max).length)),
    [outputs, min, max],
  );
  const inputWidth = Math.max(format(min).length, format(max).length);

  const points = React.useMemo(() => {
    if (!curve) return null;
    const serie = curve(value);
    if (serie.length < 2) return null;
    const passo = 100 / (serie.length - 1);
    return serie
      .map((n, i) => `${(i * passo).toFixed(2)},${(100 - Math.min(Math.max(n, 0), 1) * 100).toFixed(2)}`)
      .join(" ");
  }, [curve, value]);

  return (
    <div
      className={cn(
        "sim-slider flex flex-col gap-6 rounded-[var(--r-surface)] border border-[var(--border)]",
        "bg-[var(--card)] p-[var(--pad-card,1.5rem)]",
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-[var(--muted-foreground)]">{label}</span>
          <span
            className="[font-family:var(--font-display,inherit)] text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] leading-none tabular-nums text-[var(--foreground)]"
            style={{ minWidth: `${inputWidth}ch` }}
          >
            {format(value)}
          </span>
        </div>

        <dl className="flex flex-wrap items-end gap-x-8 gap-y-4">
          {outputs.map((o, i) => (
            <div key={o.label} className="flex flex-col gap-1">
              <dt className="text-[13px] text-[var(--muted-foreground)]">{o.label}</dt>
              <dd
                className={cn(
                  "tabular-nums leading-none",
                  /*
                   * O número principal ganha TAMANHO e a fonte de display, não
                   * a cor da marca. Marca clara pintando número grande é o
                   * defeito preferido do simulador: o ciano da casa dá 1,29:1
                   * sobre papel branco, e o valor que a peça inteira existe
                   * para mostrar é o primeiro a sumir. A hierarquia aqui já
                   * vem do corpo — 2,5rem contra 1,25rem é o dobro.
                   */
                  o.primary
                    ? "[font-family:var(--font-display,inherit)] text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] text-[var(--foreground)]"
                    : "text-[1.25rem] text-[var(--muted-foreground)]",
                )}
                style={{ minWidth: `${widths[i]}ch` }}
              >
                {o.value(value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {points ? (
        <div className="relative">
          {ceilingLabel ? (
            <span className="pointer-events-none absolute right-0 top-0 -translate-y-1/2 bg-[var(--card)] pl-2 text-[11px] text-[var(--muted-foreground)]">
              {ceilingLabel}
            </span>
          ) : null}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="sim-slider-curve h-24 w-full"
          >
            {/* O teto: a régua da curva. Fica a 1 unidade do topo porque em
                `y=0` a metade de cima do traço sai do viewBox e some. */}
            <line
              className="sim-slider-ceiling"
              x1="0"
              y1="1"
              x2="100"
              y2="1"
              vectorEffect="non-scaling-stroke"
            />
            {/* A área sob a curva usa a cor da marca com opacidade — nunca um hex
                próprio, senão o simulador é a única peça da página fora do tema. */}
            <polygon className="sim-slider-area" points={`0,100 ${points} 100,100`} />
            {/* `vector-effect` porque o viewBox é esticado por `preserveAspectRatio:
                none`: sem isso a linha engorda na horizontal e afina na vertical.
                É também o que proíbe traçado animado aqui — ver o cabeçalho. */}
            <polyline className="sim-slider-line" points={points} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      ) : null}

      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={handle}
        aria-label={label}
        aria-valuetext={format(value)}
      />

      <p className="text-[12px] leading-[1.5] text-[var(--muted-foreground)]">{assumption}</p>
    </div>
  );
}
