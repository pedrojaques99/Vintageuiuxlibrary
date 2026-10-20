"use client";

// Adaptado de Expandable card — https://uiarc.dev/components/expandable-card — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).

import * as React from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type Transition } from "motion/react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Expandable Card: o card de resumo que ganha espaço quando alguém pede.
 *
 * Plano, pedido, linha de log: a primeira leitura cabe numa linha, o detalhe
 * só interessa a quem abre. Accordion resolve lista; isto resolve UM card
 * sozinho, que pode crescer para os lados além de para baixo.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **Abrir e fechar é uma metamorfose só.** Largura e altura andam na mesma
 *    mola, sem quique, então fechar é o espelho exato de abrir. O tamanho anima
 *    de verdade (não `scale`): texto, borda e raio nunca esticam.
 * 2. **O detalhe já nasce na largura aberta.** O miolo é medido na largura
 *    final o tempo todo, então nada reflui enquanto a caixa cresce. Abrindo, ele
 *    entra depois que a caixa abriu espaço; fechando, sai antes dela encolher.
 * 3. **O painel fica montado, inerte.** Com altura zero e `inert`, o teclado
 *    não chega nele fechado, e um segundo clique no meio da animação reverte
 *    de onde está, com a velocidade que tinha.
 * 4. **A descrição rola só a palavra que mudou.** Quando o resumo atualiza
 *    ("3 itens" vira "4 itens"), só o que mudou sobe; o resto fica parado. O
 *    leitor de tela lê a frase inteira numa cópia escondida.
 * 5. **O divisor é sombra interna, não borda.** Borda daria 1px de altura no
 *    painel fechado e um estalo no fim do fechamento.
 */

export interface ExpandableCardProps
  extends Omit<React.ComponentPropsWithoutRef<"article">, "title" | "children" | "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"> {
  /** Título do card, dentro do botão que abre. */
  title: string;
  /** Linha de resumo. Quando muda, só as palavras novas rolam. */
  description?: string;
  /** O detalhe revelado ao abrir. */
  children: React.ReactNode;
  /** Começa aberto. */
  defaultExpanded?: boolean;
  /** Teto da largura fechado, em px. Sem ele o card ocupa o container. */
  width?: number;
  /** Teto da largura aberto, em px, para crescer para os lados. Padrão: `width`. */
  expandedWidth?: number;
}

// A mola "lisa" da casa: assenta sem passar do ponto, então nada quica no fechar.
const mola: Transition = { type: "spring", visualDuration: 0.3, bounce: 0 };
const parado: Transition = { duration: 0 };
const conteudo = (aberto: boolean): Transition =>
  aberto ? { duration: 0.2, ease: [0.23, 1, 0.32, 1], delay: 0.12 } : { duration: 0.1, ease: [0.23, 1, 0.32, 1] };

function Rolante({ texto, reduce }: { texto: string; reduce: boolean }) {
  return (
    <span className="relative block">
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          {texto.split(/(\s+)/).map((palavra, i) => (
            <motion.span
              key={`${i}:${palavra}`}
              className="inline-block whitespace-pre"
              initial={reduce ? false : { opacity: 0, y: "0.35em" }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
              exit={reduce ? undefined : { opacity: 0, y: "-0.3em", transition: { duration: 0.16 } }}
            >
              {palavra}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    </span>
  );
}

export function ExpandableCard({
  title,
  description,
  children,
  defaultExpanded = false,
  width,
  expandedWidth,
  className,
  style,
  onKeyDown,
  ...rest
}: ExpandableCardProps) {
  const [aberto, setAberto] = React.useState(defaultExpanded);
  const [espaco, setEspaco] = React.useState<number | null>(null);
  const trilho = React.useRef<HTMLDivElement>(null);
  const gatilho = React.useRef<HTMLButtonElement>(null);
  const painelId = React.useId();
  const reduce = useReducedMotion() ?? false;
  const t = reduce ? parado : mola;

  // O espaço disponível vem do trilho que centra o card. Até medir, o CSS limita.
  React.useLayoutEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const medir = () => setEspaco(el.clientWidth);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tetoAberto = expandedWidth ?? width;
  const caber = (teto: number | undefined) => (espaco === null ? undefined : Math.min(espaco, teto ?? espaco));
  const larguraCaixa = caber(aberto ? tetoAberto : width);
  const larguraMiolo = caber(tetoAberto);

  // A largura mora num motion value: a primeira medida pousa sem viagem, as seguintes saem da largura e velocidade atuais.
  const largura = useMotionValue<number | string>("100%");
  const pousou = React.useRef(false);
  React.useLayoutEffect(() => {
    if (larguraCaixa === undefined) return;
    if (!pousou.current) {
      pousou.current = true;
      largura.jump(larguraCaixa);
      return;
    }
    const c = animate(largura, larguraCaixa, t);
    return () => c.stop();
  }, [larguraCaixa]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={trilho} className="flex w-full min-w-0 justify-center">
      <motion.article
        {...rest}
        data-expanded={aberto}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented || e.key !== "Escape" || !aberto) return;
          e.preventDefault();
          setAberto(false);
          gatilho.current?.focus();
        }}
        style={{
          ...style,
          width: largura,
          maxWidth: espaco === null ? (aberto ? tetoAberto : width) ?? "100%" : "100%",
        }}
        className={cn(
          "overflow-hidden rounded-[var(--r-surface)] border border-border bg-card text-foreground [box-shadow:var(--e-raised)]",
          // O anel de foco vai no card, não no botão: o card recorta o que passa da borda.
          "has-[>button:focus-visible]:[box-shadow:var(--focus)]",
          className,
        )}
      >
        <button
          ref={gatilho}
          type="button"
          aria-expanded={aberto}
          aria-controls={painelId}
          onClick={() => setAberto((v) => !v)}
          className={cn(
            "flex min-h-16 w-full items-center justify-between gap-5 px-5 py-4 text-left outline-none",
            "transition-[background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
            "hover:bg-muted",
          )}
        >
          <span className="min-w-0">
            <strong className="block text-sm font-medium">{title}</strong>
            {description && (
              <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                <Rolante texto={description} reduce={reduce} />
              </span>
            )}
          </span>
          <motion.span
            className="inline-flex shrink-0 text-muted-foreground"
            initial={false}
            animate={{ rotate: aberto ? 180 : 0 }}
            transition={t}
          >
            <ChevronDown className="size-[18px]" aria-hidden="true" />
          </motion.span>
        </button>

        <motion.div
          id={painelId}
          // `inert` como atributo cru: o React 18 não conhece a prop e só repassa string.
          {...({ inert: aberto ? undefined : "" } as object)}
          initial={false}
          animate={{ height: aberto ? "auto" : 0 }}
          transition={t}
          className="overflow-hidden bg-muted text-sm text-muted-foreground [box-shadow:inset_0_1px_0_var(--border)]"
        >
          <motion.div
            className="px-5 pb-5 pt-4"
            style={larguraMiolo === undefined ? undefined : { width: larguraMiolo - 2 }}
            initial={false}
            animate={{ opacity: aberto ? 1 : 0 }}
            transition={reduce ? parado : conteudo(aberto)}
          >
            {children}
          </motion.div>
        </motion.div>
      </motion.article>
    </div>
  );
}

export default ExpandableCard;
