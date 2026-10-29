"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label?: string;
  icon?: LucideIcon;
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** "fill" = itens crescem igualmente (com label); "compact" = botões de ícone. */
  variant?: "fill" | "compact";
  /**
   * Densidade. `md` é a régua da casa.
   *
   * `sm` existe para painel lateral: medido num painel de 340px onde três
   * grupos dividem a mesma linha, 12px de rótulo não cabem e o controle começa
   * a truncar palavra ("Por pesso…"). Encolher a tipografia é mais honesto do
   * que abreviar o rótulo, porque a abreviação some da leitura e o tamanho não.
   */
  size?: "sm" | "md";
  /**
   * Como o polegar vai de uma opção pra outra.
   *
   * - `slide` (padrão): desliza reto, sem passar do ponto. O da casa.
   * - `spring`: desliza e passa um tico do alvo antes de assentar, como mola.
   * - `stretch`: a borda da frente sai primeiro e a de trás vem depois; o
   *   polegar estica na direção do clique e encolhe ao chegar, como gota.
   * - `fade`: o polegar não viaja; some de um lado e acende no outro, com um
   *   leve crescer. Pra quando a ordem das opções não diz nada.
   */
  animation?: "slide" | "spring" | "stretch" | "fade";
  className?: string;
  "aria-label"?: string;
}

/** Overshoot curto da mola em CSS: passa ~6% e volta, dentro de 280 ms. */
const MOLA_CSS = "cubic-bezier(0.34,1.4,0.64,1)";
/** No `stretch`, quanto a borda de trás espera a da frente sair, em ms. */
const ATRASO_ESTICA = 70;

/**
 * Apple-like segmented control (trilho + pill ativo). Fonte única reusada pelo
 * cabeçalho da vitrine (seção e densidade), pelo Gallery e pelos kits.
 *
 * ── O que faltava (o "meio simples") ────────────────────────────────────────
 * Não faltava enfeite: faltava o pill. O "pill ativo" era só uma cor de fundo
 * que pulava de um botão para o outro — cada segmento tinha o seu, e o
 * `gap-1` entre eles fazia o trilho parecer três botões encostados em vez de um
 * controle só. Um segmented control de verdade tem UM polegar que ANDA: é o
 * movimento que conta de onde você veio, e é ele que faz o grupo ler como uma
 * peça única.
 *
 * Agora o polegar é um elemento só, absoluto, que translada por `transform`.
 * Nada de largura/altura animada — o trilho tem colunas iguais (`flex-1` no
 * fill, largura fixa no compact), então `translateX(índice · 100%)` cai exato
 * em qualquer quantidade de opções, sem medir DOM e sem ResizeObserver.
 *
 * O `gap` saiu e entraram divisores de fio de cabelo entre vizinhos inativos,
 * que somem ao lado do ativo — é o detalhe que separa "montado" de "desenhado",
 * e é o mesmo truque do iOS.
 *
 * ── Teclado ────────────────────────────────────────────────────────────────
 * Setas ←/→ (e ↑/↓) andam pelas opções e já trocam o valor, com Home/End nas
 * pontas. O grupo é UM ponto de tabulação (roving tabindex): com quatro desses
 * no cabeçalho da vitrine, um Tab por botão viraria uma travessia de doze
 * paradas antes de chegar no conteúdo.
 *
 * ── Ícone sem rótulo ───────────────────────────────────────────────────────
 * `aria-label` já entrega o nome pro leitor de tela; o `title` entrega pro
 * ponteiro. Quem troca "Barras/Linha" por dois ícones tira uma tradução do
 * caminho de quem vê — e não pode tirar o nome de quem não vê nem de quem não
 * reconhece o desenho.
 *
 * A API não mudou uma vírgula — o cabeçalho da vitrine inteira depende dela.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  variant = "fill",
  size = "md",
  animation = "slide",
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const n = options.length || 1;

  // Direção do último passo, pro `stretch` saber qual borda sai primeiro. A
  // ref só anda depois do commit: re-render sem troca dá direção 0, e mudar o
  // atraso com a transição já rodando não a reinicia.
  const anterior = React.useRef(activeIndex);
  const direcao = Math.sign(activeIndex - anterior.current);
  React.useEffect(() => {
    anterior.current = activeIndex;
  }, [activeIndex]);

  /*
   * O foco vai num efeito, não dentro do handler.
   *
   * `onChange` aqui troca a seção da vitrine inteira: a árvore acima re-renderiza
   * e o botão que eu tinha acabado de focar deixa de ser o mesmo nó. Focando
   * dentro do handler (antes do render) o foco ia para um elemento que morria em
   * seguida, caía no `body`, e a tecla SEGUINTE virava rolagem de página — foi
   * exatamente assim que `End` mandou a vitrine para o rodapé em vez de ir para
   * a última opção. Com a marca e o efeito, o foco pousa no nó que sobreviveu.
   */
  const pedirFoco = React.useRef(false);

  React.useEffect(() => {
    if (!pedirFoco.current) return;
    pedirFoco.current = false;
    refs.current[activeIndex]?.focus();
  }, [activeIndex]);

  const move = (to: number) => {
    const i = (to + n) % n;
    const opt = options[i];
    if (!opt) return;
    pedirFoco.current = true;
    onChange(opt.value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(activeIndex - 1);
        break;
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(activeIndex + 1);
        break;
      case "Home":
        e.preventDefault();
        move(0);
        break;
      case "End":
        e.preventDefault();
        move(n - 1);
        break;
    }
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        "relative isolate flex items-center rounded-xl bg-muted/50 p-1",
        className,
      )}
    >
      {/* O polegar. `inset` de 4px = o `p-1` do trilho; a largura é uma fração
          exata das colunas, então nada precisa ser medido em runtime. */}
      {animation === "stretch" ? (
        // As duas bordas andam separadas (`left` e `right`), e a da frente
        // não espera: é isso que estica. 200 ms + 70 de atraso cabem no teto
        // de 300 ms de resposta a gesto.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 -z-10 rounded-lg bg-background shadow-sm"
          style={{
            left: `calc(0.25rem + (100% - 0.5rem) * ${activeIndex} / ${n})`,
            right: `calc(0.25rem + (100% - 0.5rem) * ${n - 1 - activeIndex} / ${n})`,
            transitionProperty: "left, right",
            transitionDuration: "var(--dur-base,200ms)",
            transitionTimingFunction: "var(--ease-out,cubic-bezier(0.23,1,0.32,1))",
            transitionDelay:
              direcao > 0
                ? `${ATRASO_ESTICA}ms, 0ms`
                : direcao < 0
                  ? `0ms, ${ATRASO_ESTICA}ms`
                  : "0ms",
          }}
        />
      ) : animation !== "fade" ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1 -z-10 rounded-lg bg-background shadow-sm",
            animation === "spring"
              ? "transition-transform [transition-duration:280ms]"
              : "transition-transform [transition-duration:var(--dur-base,200ms)] [transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
          )}
          style={{
            width: `calc((100% - 0.5rem) / ${n})`,
            transform: `translateX(${activeIndex * 100}%)`,
            transitionTimingFunction: animation === "spring" ? MOLA_CSS : undefined,
          }}
        />
      ) : null}
      {options.map((opt, i) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        const soIcone = !!Icon && !opt.label;
        // O fio some ao lado do ativo (dos dois lados) para o polegar não
        // encostar em risco nenhum.
        const showDivider = i > 0 && i !== activeIndex && i - 1 !== activeIndex;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            aria-label={opt.ariaLabel || opt.label}
            title={soIcone ? opt.ariaLabel || opt.label : undefined}
            // Compara índice e não valor: se `value` não bater com opção
            // nenhuma, `activeIndex` cai em 0 e o grupo continua tabulável —
            // com `active ? 0 : -1` ele ficaria inalcançável por teclado.
            tabIndex={i === activeIndex ? 0 : -1}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-lg font-medium",
              "transition-[color,opacity,transform] [transition-duration:var(--dur-fast,160ms)] [transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
              "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
              size === "sm" ? "text-[11px]" : "text-xs",
              variant === "fill"
                ? cn("flex-1", size === "sm" ? "px-2 py-1" : "px-3 py-1.5")
                : size === "sm"
                  ? "h-6 w-7"
                  : "h-7 w-8",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              // Fio de cabelo entre vizinhos inativos.
              showDivider &&
                "before:absolute before:inset-y-1.5 before:left-0 before:w-px before:bg-border before:content-['']",
            )}
          >
            {animation === "fade" && (
              // No `fade` cada opção tem o próprio polegar: apaga num lado e
              // acende no outro, crescendo de 96% a 100%.
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 -z-10 rounded-lg bg-background shadow-sm",
                  "transition-[opacity,transform] [transition-duration:var(--dur-base,200ms)] [transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
                  active ? "scale-100 opacity-100" : "scale-[0.96] opacity-0",
                )}
              />
            )}
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {opt.label && <span className="whitespace-nowrap">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
