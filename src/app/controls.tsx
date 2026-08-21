"use client";

/**
 * O painel que responde "serve pro meu caso?".
 *
 * A grade responde "isso existe?". O palco responde "como é?". Nenhuma das duas
 * responde a pergunta que decide se a peça entra no projeto — e essa só se
 * responde **mexendo**: pondo o `finish` em `mono` porque o logo do cliente é
 * monocromático, baixando o `speed` porque a faixa está rápida demais, vendo o
 * que sobra quando o `fade` desliga.
 *
 * Três decisões que valem explicação:
 *
 * - **Os controles são derivados, não escritos.** Vêm de `controls.generated.json`,
 *   que sai das props, que saem do TypeScript dos arquivos que o `shadcn add`
 *   entrega. Painel escrito à mão pra 72 itens estaria mentindo em duas semanas.
 * - **O painel mora abaixo do palco.** Sempre. O primeiro pixel depois do título
 *   é a peça rodando; knobs antes da peça é a página se explicando em vez de se
 *   mostrar.
 * - **O knob nasce do palco, e o snippet compara com o código.** São dois
 *   números diferentes e os dois importam. O knob abre no valor que a demo está
 *   passando, senão o painel diria `fade: off` embaixo de um trilho com fade. O
 *   snippet, esse, compara com o padrão do componente — porque o que a pessoa
 *   vai colar não tem a demo em volta, e tudo que difere do padrão precisa
 *   estar escrito. Nenhum dos dois valores é inventado aqui: um vem da tag da
 *   demo, o outro do TypeScript da peça.
 */

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "../../registry/visant/ui/segmented-control";
import { Slider } from "@/components/ui/slider";
import controlesGerados from "./controls.generated.json";

export type ValorDeKnob = string | number | boolean;

export interface Controle {
  prop: string;
  tipo: "escolha" | "chave" | "numero" | "texto";
  padrao: ValorDeKnob | null;
  resumo: string | null;
  /**
   * O valor que a DEMO passa, quando ela passa um diferente do padrão.
   *
   * É o que o knob mostra ao abrir. Sem ele o painel descrevia o componente
   * enquanto o palco mostrava outra coisa: chave `fade` desligada embaixo de um
   * trilho com fade, e quem clicasse pra ligar não veria mudança nenhuma.
   */
  inicial?: ValorDeKnob;
  valores?: string[];
  min?: number;
  max?: number;
  step?: number;
  rotulo?: string;
  secundario?: boolean;
}

export interface Preset {
  nome: string;
  props: Record<string, ValorDeKnob>;
}

interface ItemDeControles {
  componentes: Record<string, Controle[]>;
  presets?: Preset[];
}

const GERADOS = controlesGerados as unknown as Record<string, ItemDeControles>;

/**
 * Os controles de um item, para o componente que a demo declarou pilotar.
 *
 * Sem `alvo` não há painel. É de propósito: a demo precisa espalhar as props no
 * componente pra que o knob mexa em alguma coisa, e uma demo que ainda não fez
 * isso mostraria um painel que não faz nada — pior do que painel nenhum, porque
 * quem mexe conclui que a peça é que está quebrada.
 */
export function controlesDe(name: string, alvo?: string) {
  if (!alvo) return null;
  const item = GERADOS[name];
  const controles = item?.componentes?.[alvo];
  if (!controles?.length) return null;
  return { controles, presets: item.presets ?? [] };
}

export const temControles = (name: string, alvo?: string) => controlesDe(name, alvo) !== null;

/** O estado dos knobs: só o que a pessoa mexeu, nunca o mapa inteiro. */
export function useKnobs(controles: Controle[]) {
  const [props, setProps] = React.useState<Record<string, ValorDeKnob>>({});

  // Trocar de item pela seta do teclado sem zerar os knobs faria o `speed` de um
  // vazar pro `speed` do outro. A lista de controles é a identidade do item.
  const assinatura = controles.map((c) => c.prop).join(",");
  React.useEffect(() => setProps({}), [assinatura]);

  const set = React.useCallback((prop: string, valor: ValorDeKnob) => {
    setProps((antes) => ({ ...antes, [prop]: valor }));
  }, []);

  const aplicar = React.useCallback((p: Record<string, ValorDeKnob>) => setProps(p), []);
  const limpar = React.useCallback(() => setProps({}), []);

  const sujo = Object.keys(props).length > 0;
  return { props, set, aplicar, limpar, sujo };
}

/**
 * O valor efetivo de um controle: o que a pessoa mexeu, senão o que está no
 * palco, senão o padrão do componente.
 *
 * Os três degraus existem porque são três verdades diferentes, e confundi-las é
 * o que fazia o painel mentir.
 */
export const valorAtual = (c: Controle, props: Record<string, ValorDeKnob>) => {
  const mexido = props[c.prop];
  if (mexido !== undefined) return mexido;
  if (c.inicial !== undefined) return c.inicial;
  return c.padrao ?? (c.tipo === "chave" ? false : c.tipo === "numero" ? 0 : "");
};

/* ────────────────────────────────────────────────────────────────────────── */

function Rotulo({ controle }: { controle: Controle }) {
  return (
    <span
      className="font-mono text-rotulo text-foreground"
      title={controle.resumo ?? undefined}
    >
      {controle.rotulo ?? controle.prop}
    </span>
  );
}

function Chave({
  controle,
  valor,
  onChange,
}: {
  controle: Controle;
  valor: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={valor}
      aria-label={controle.prop}
      onClick={() => onChange(!valor)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
        "[transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
        // Marca como fundo e borda, nunca como cor de texto: `--brand` sobre o
        // papel claro dá 1,29:1, e isso some pra quem lê.
        valor ? "border-[var(--brand)] bg-[var(--brand)]" : "border-border bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 block h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-background shadow-sm transition-[left]",
          "[transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
          valor ? "left-[1.125rem]" : "left-0.5",
        )}
      />
    </button>
  );
}

function Numero({
  controle,
  valor,
  onChange,
}: {
  controle: Controle;
  valor: number;
  onChange: (v: number) => void;
}) {
  const { min = 0, max = 100, step = 1 } = controle;
  return (
    <div className="flex flex-1 items-center gap-2">
      <Slider
        value={[valor]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={controle.prop}
        className="flex-1"
      />
      <span className="w-10 shrink-0 text-right font-mono text-micro tabular-nums text-muted-foreground">
        {Number.isInteger(step) ? valor : valor.toFixed(2)}
      </span>
    </div>
  );
}

function Escolha({
  controle,
  valor,
  onChange,
}: {
  controle: Controle;
  valor: string;
  onChange: (v: string) => void;
}) {
  const valores = controle.valores ?? [];

  // Até quatro opções o trilho cabe e cada estado é visível de uma vez; acima
  // disso ele quebra em duas linhas e vira lista disfarçada de controle.
  if (valores.length <= 4) {
    return (
      <SegmentedControl
        value={valor}
        onChange={onChange}
        options={valores.map((v) => ({ value: v, label: v }))}
        size="sm"
        aria-label={controle.prop}
        className="min-w-0"
      />
    );
  }

  return (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      aria-label={controle.prop}
      className="min-w-0 flex-1 rounded-[var(--r-control,0.5rem)] border border-border bg-background px-2 py-1 font-mono text-rotulo text-foreground"
    >
      {valores.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}

function Texto({
  controle,
  valor,
  onChange,
}: {
  controle: Controle;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      aria-label={controle.prop}
      className="min-w-0 flex-1 rounded-[var(--r-control,0.5rem)] border border-border bg-background px-2 py-1 font-mono text-rotulo text-foreground"
    />
  );
}

function Linha({
  controle,
  props,
  set,
}: {
  controle: Controle;
  props: Record<string, ValorDeKnob>;
  set: (prop: string, v: ValorDeKnob) => void;
}) {
  const valor = valorAtual(controle, props);
  const mexido = controle.prop in props;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--r-control,0.5rem)] border px-3 py-2 transition-colors",
        "[transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
        mexido ? "border-[var(--brand)] bg-muted/30" : "border-border",
      )}
    >
      <Rotulo controle={controle} />
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
        {controle.tipo === "chave" && (
          <Chave
            controle={controle}
            valor={Boolean(valor)}
            onChange={(v) => set(controle.prop, v)}
          />
        )}
        {controle.tipo === "numero" && (
          <Numero
            controle={controle}
            valor={Number(valor)}
            onChange={(v) => set(controle.prop, v)}
          />
        )}
        {controle.tipo === "escolha" && (
          <Escolha
            controle={controle}
            valor={String(valor)}
            onChange={(v) => set(controle.prop, v)}
          />
        )}
        {controle.tipo === "texto" && (
          <Texto
            controle={controle}
            valor={String(valor)}
            onChange={(v) => set(controle.prop, v)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * O painel inteiro: presets, knobs em destaque, e o resto atrás de um clique.
 *
 * Prop pública nunca some do painel — some da *primeira tela*. Esconder de vez
 * seria a vitrine mentindo por omissão sobre o que a peça aceita.
 */
export function Customize({
  controles,
  presets,
  props,
  set,
  aplicar,
  limpar,
  sujo,
  className,
}: {
  controles: Controle[];
  presets: Preset[];
  props: Record<string, ValorDeKnob>;
  set: (prop: string, v: ValorDeKnob) => void;
  aplicar: (p: Record<string, ValorDeKnob>) => void;
  limpar: () => void;
  sujo: boolean;
  className?: string;
}) {
  const [abertoExtra, setAbertoExtra] = React.useState(false);
  const destaque = controles.filter((c) => !c.secundario);
  const extras = controles.filter((c) => c.secundario);

  const presetAtivo = presets.find(
    (p) =>
      Object.keys(p.props).length === Object.keys(props).length &&
      Object.entries(p.props).every(([k, v]) => props[k] === v),
  );

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-mono text-rotulo uppercase tracking-wider text-muted-foreground">
          Controles
        </h3>

        {presets.map((p) => (
          <button
            key={p.nome}
            type="button"
            onClick={() => aplicar(p.props)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-rotulo transition-colors",
              "[transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
              presetAtivo?.nome === p.nome
                ? "border-[var(--brand)] bg-[var(--brand)]/10 text-foreground"
                : "border-border text-muted-foreground hover:border-[var(--brand)] hover:text-foreground",
            )}
          >
            {p.nome}
          </button>
        ))}

        {sujo ? (
          <button
            type="button"
            onClick={limpar}
            className="ml-auto flex items-center gap-1.5 rounded-[var(--r-control,0.5rem)] border border-border px-2 py-1 font-mono text-micro text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--brand)] hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            restaurar
          </button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {destaque.map((c) => (
          <Linha key={c.prop} controle={c} props={props} set={set} />
        ))}
        {abertoExtra
          ? extras.map((c) => <Linha key={c.prop} controle={c} props={props} set={set} />)
          : null}
      </div>

      {extras.length ? (
        <button
          type="button"
          onClick={() => setAbertoExtra((v) => !v)}
          className="self-start font-mono text-rotulo text-muted-foreground underline underline-offset-4 transition-colors [transition-duration:var(--dur-fast)] hover:text-foreground"
        >
          {abertoExtra ? "menos controles" : `mais ${extras.length} controles`}
        </button>
      ) : null}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * O código de uso, com o que a pessoa acabou de configurar — e só isso.
 *
 * Despejar as 9 props com os valores padrão seria ruído: quem cola isso no
 * projeto passa a fixar valores que o componente já tem, e qualquer mudança
 * futura no padrão deixa de chegar nesse código. O snippet mostra a diferença,
 * que é o que a pessoa de fato precisa escrever.
 */
export function snippetDeUso(
  componente: string,
  controles: Controle[],
  props: Record<string, ValorDeKnob>,
) {
  const linhas: string[] = [];

  for (const c of controles) {
    // Compara com o padrão do COMPONENTE, não com o que a demo passou: o que a
    // pessoa vai colar no projeto dela não tem a demo em volta, então tudo que
    // difere do padrão precisa estar escrito — inclusive o que já estava no
    // palco antes de ela encostar num knob.
    const v = valorAtual(c, props);
    if (v === c.padrao) continue;

    if (typeof v === "boolean") linhas.push(v ? `  ${c.prop}` : `  ${c.prop}={false}`);
    else if (typeof v === "number") linhas.push(`  ${c.prop}={${v}}`);
    else linhas.push(`  ${c.prop}="${v}"`);
  }

  if (!linhas.length) return `<${componente} />`;
  return [`<${componente}`, ...linhas, "/>"].join("\n");
}
