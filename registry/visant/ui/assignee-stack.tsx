"use client";

import * as React from "react";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type Assignee = { id: string; name: string; avatarUrl?: string };

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Tom da inicial, derivado do nome.
 *
 * Sem foto, todo mundo virava o mesmo círculo cinza com duas letras — cinco
 * pastilhas idênticas não são cinco pessoas, são um borrão. Um tom por pessoa,
 * estável (sai do id, não da posição na lista), devolve a identidade que a foto
 * daria. Sai dos tokens de gráfico do tema, então acompanha claro e escuro e a
 * marca de quem instala; nada de cor crua.
 *
 * O tom vai no TEXTO e o fundo é o tom diluído no card, em vez de círculo
 * chapado com letra branca. Não é gosto: `--chart-4` é um amarelo claro, e
 * letra branca em cima dele some.
 *
 * Mas o tom CRU no texto também não serve, e isso o portão de legibilidade
 * provou: `--chart-4` sobre o fundo diluído dele mesmo dá 1,3:1 — as duas
 * letras somem, justamente na única forma que resta quando não há foto. A
 * versão anterior deste comentário afirmava contraste nos cinco tons; era
 * afirmação, não medida.
 *
 * A tinta agora é o tom **puxado para a cor do texto do tema**: metade do
 * caminho até `--foreground`. A identidade continua (o amarelo continua sendo
 * o amarelo, e cada pessoa mantém o seu), e a legibilidade passa a vir do
 * tema — escurece no claro, clareia no escuro, sem tabela de exceção.
 */
const TONES = [
  "bg-[color-mix(in_oklab,var(--chart-1)_16%,var(--card))] text-[color-mix(in_oklab,var(--chart-1)_50%,var(--foreground))]",
  "bg-[color-mix(in_oklab,var(--chart-2)_16%,var(--card))] text-[color-mix(in_oklab,var(--chart-2)_50%,var(--foreground))]",
  "bg-[color-mix(in_oklab,var(--chart-3)_16%,var(--card))] text-[color-mix(in_oklab,var(--chart-3)_50%,var(--foreground))]",
  "bg-[color-mix(in_oklab,var(--chart-4)_16%,var(--card))] text-[color-mix(in_oklab,var(--chart-4)_50%,var(--foreground))]",
  "bg-[color-mix(in_oklab,var(--chart-5)_16%,var(--card))] text-[color-mix(in_oklab,var(--chart-5)_50%,var(--foreground))]",
];

function toneOf(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

const SIZES = {
  sm: { box: "h-7 w-7", text: "text-[10px]", overlap: "-space-x-2" },
  md: { box: "h-8 w-8", text: "text-[11px]", overlap: "-space-x-2.5" },
  lg: { box: "h-10 w-10", text: "text-[13px]", overlap: "-space-x-3" },
} as const;

/**
 * Pilha de responsáveis — quem toca a tarefa, em círculos sobrepostos.
 *
 * ── O que estava errado ─────────────────────────────────────────────────────
 * A pilha se declarava `role="img"`: para o leitor de tela era um desenho, e
 * para o teclado não existia. O nome de cada pessoa morava num `title` nativo,
 * que só aparece com mouse parado em cima por um segundo e nunca aparece no
 * celular. E o "+N" era um `<span>` — o excedente, que é justamente a
 * informação escondida, era a única parte inalcançável.
 *
 * Agora é um grupo de verdade: UM ponto de tabulação, setas ←/→ andando pelas
 * pessoas, `Home`/`End` nas pontas. Um ponto só porque uma lista de projetos
 * tem uma dessas por linha — um Tab por avatar transformaria a travessia da
 * página em dezenas de paradas antes do conteúdo.
 *
 * ── A micro-interação, e por que ela é utilidade ────────────────────────────
 * Parada, a pilha economiza espaço escondendo rosto atrás de rosto. Com o
 * ponteiro em cima (ou com o foco dentro) ela ABRE: os círculos deslizam para
 * os seus lugares e o nome de quem está sob o cursor aparece embaixo. É o
 * mesmo aperto que o `title` tentava resolver, resolvido onde dá para ver e
 * com teclado junto.
 *
 * Só `transform` anima — a abertura é `margin` virando `translateX`, nunca
 * largura. E `hover` não é a única porta: `focus-within` abre igual, senão em
 * touch a pilha nunca abriria.
 *
 * ── Por que a pilha abre para a ESQUERDA ────────────────────────────────────
 * A primeira versão abria empurrando todo mundo para a direita: o último
 * círculo — e principalmente o "+N", que é a informação que a pilha esconde —
 * andava para fora do container e estourava a borda do cartão. E não era acaso:
 * o lugar natural desta peça é encostada à direita da linha, então crescer para
 * a direita é crescer para fora, sempre.
 *
 * Agora o círculo mais à direita fica ANCORADO (deslocamento zero) e os outros
 * recuam para a esquerda. A pilha abre para dentro da linha, onde já existe
 * folga, e a borda direita nunca se move. O espaço que a abertura vai ocupar é
 * reservado em `padding-left` no repouso: `transform` não empurra layout, então
 * sem a reserva a pilha aberta passaria por cima do texto do vizinho.
 */
export function AssigneeStack({
  assignees,
  max = 4,
  size = "sm",
  onSelect,
  className,
}: {
  assignees: Assignee[];
  max?: number;
  size?: "sm" | "md" | "lg";
  /** Quando presente, clicar/Enter numa pessoa devolve ela. Aditivo. */
  onSelect?: (assignee: Assignee) => void;
  className?: string;
}) {
  const [focus, setFocus] = React.useState(0);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const visible = assignees?.slice(0, max) ?? [];
  const extra = (assignees?.length ?? 0) - visible.length;
  // O "+N" é o último item navegável, então entra na conta do teclado.
  const count = visible.length + (extra > 0 ? 1 : 0);

  const move = React.useCallback(
    (to: number) => {
      const i = (to + count) % count;
      setFocus(i);
      refs.current[i]?.focus();
    },
    [count],
  );

  if (!assignees?.length) return null;

  const s = SIZES[size];
  const names = assignees.map((a) => a.name).join(", ");
  const rest = assignees.slice(max);
  // No "+N" o rótulo lista quem ficou de fora: é a informação que a pilha
  // escondeu, e mostrá-la é a razão de o "+N" ser alcançável.
  const shown =
    hovered == null
      ? null
      : hovered < visible.length
        ? visible[hovered].name
        : rest.map((a) => a.name).join(", ");

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        move(focus - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        move(focus + 1);
        break;
      case "Home":
        e.preventDefault();
        move(0);
        break;
      case "End":
        e.preventDefault();
        move(count - 1);
        break;
    }
  };

  // O passo da abertura e a reserva que ela consome. O deslocamento de cada
  // círculo é negativo e cresce da direita para a esquerda: o último fica no
  // lugar, o primeiro anda o percurso inteiro.
  const passo = size === "lg" ? 12 : size === "md" ? 10 : 8;
  const abertura = (count - 1) * passo;
  const desloca = (i: number) => `${-(count - 1 - i) * passo}px`;

  return (
    <div className={cn("relative", className)} style={{ paddingLeft: abertura }}>
      <div
        role="group"
        aria-label={`Colaboradores: ${names}`}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHovered(null)}
        className={cn(
          // `group/pilha` e não `group`: estas peças vivem dentro de cartões que
          // já têm o seu `group`, e o hover do cartão inteiro abriria a pilha
          // sem ninguém ter chegado perto dela.
          "group/pilha flex items-center",
          s.overlap,
        )}
      >
        {visible.map((a, i) => (
          <button
            key={a.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            tabIndex={i === focus ? 0 : -1}
            onFocus={() => {
              setFocus(i);
              setHovered(i);
            }}
            onBlur={() => setHovered(null)}
            onMouseEnter={() => setHovered(i)}
            onClick={() => onSelect?.(a)}
            aria-label={a.name}
            className={cn(
              "relative rounded-full ring-2 ring-card",
              // A abertura: cada círculo anda o suficiente para desfazer a
              // sobreposição, e quem está mais à ESQUERDA anda mais — ver a
              // nota sobre a direção.
              "transition-transform [transition-duration:var(--dur-base,200ms)] ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
              "group-hover/pilha:translate-x-[var(--abre)] group-focus-within/pilha:translate-x-[var(--abre)]",
              // Quem está sob o cursor sobe na pilha para o rosto não ficar
              // cortado pelo vizinho.
              hovered === i ? "z-20" : "z-10",
              !onSelect && "cursor-default",
            )}
            style={{ ["--abre" as string]: desloca(i) }}
          >
            <Avatar className={s.box}>
              {a.avatarUrl && <AvatarImage src={a.avatarUrl} alt="" />}
              <AvatarFallback className={cn(s.text, "font-semibold", toneOf(a.id))}>
                {initials(a.name)}
              </AvatarFallback>
            </Avatar>
          </button>
        ))}

        {extra > 0 && (
          <button
            ref={(el) => {
              refs.current[visible.length] = el;
            }}
            type="button"
            tabIndex={focus === visible.length ? 0 : -1}
            onFocus={() => {
              setFocus(visible.length);
              setHovered(visible.length);
            }}
            onBlur={() => setHovered(null)}
            onMouseEnter={() => setHovered(visible.length)}
            // O excedente conta QUEM é: é a informação que a pilha escondeu, e
            // era a única inalcançável por teclado.
            aria-label={`Mais ${extra}: ${rest.map((a) => a.name).join(", ")}`}
            className={cn(
              s.box,
              s.text,
              "relative z-10 flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-card",
              "transition-[transform,color,background-color] [transition-duration:var(--dur-base,200ms)] ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
              "group-hover/pilha:translate-x-[var(--abre)] group-focus-within/pilha:translate-x-[var(--abre)]",
              "hover:bg-muted hover:text-foreground focus-visible:text-foreground",
            )}
            // O "+N" é sempre o último da fila, então é ele que fica ancorado.
            style={{ ["--abre" as string]: desloca(visible.length) }}
          >
            +{extra}
          </button>
        )}
      </div>

      {/*
       * Quem é a pessoa. Absoluto e `pointer-events-none` de propósito: um
       * rótulo que empurra layout faria a linha do cartão pular a cada vez que
       * o mouse passa — o defeito que o `title` nativo evitava ficando inútil.
       *
       * Ancorado à direita pelo mesmo motivo da abertura: a pilha vive na borda
       * direita da linha, e um rótulo que cresce para a direita cresce para fora
       * do cartão no primeiro nome comprido.
       */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-0 top-full z-30 mt-1 max-w-[14rem] truncate whitespace-nowrap rounded-[var(--r-control,0.5rem)] border border-border bg-card px-1.5 py-0.5 text-[11px] leading-tight text-foreground",
          "transition-opacity [transition-duration:var(--dur-fast,160ms)] ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
          shown ? "opacity-100" : "opacity-0",
        )}
      >
        {shown ?? ""}
      </span>
    </div>
  );
}
