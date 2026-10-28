"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { ChevronLeft, Nfc } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Wallet Stack — a carteira: cartões empilhados, um sobe e mostra o que tem dentro.
 *
 * Conta, cartão pré-pago, passe, clube de assinatura: quando a pessoa tem
 * TRÊS ou QUATRO dessas coisas, lista é burocrática e grade é fria. A carteira
 * é a metáfora que ela já carrega no bolso: o da frente inteiro, os de trás
 * mostrando só a borda de cima, o bastante pra contar quantos são.
 *
 * Três estados, uma pilha só:
 *
 * 1. **Repouso.** O da frente inteiro, os de trás num degrau curto.
 * 2. **Leque.** Passar o mouse (ou focar) abre o degrau e as bordas viram
 *    etiquetas legíveis. É a pré-visualização antes do gesto, e é o que avisa
 *    que os de trás também respondem a clique.
 * 3. **Aberto.** O cartão escolhido sobe pro topo e o detalhe dele (saldo,
 *    movimento) entra embaixo; os outros recolhem pro pé da caixa, ainda à
 *    vista, pra que trocar de cartão não exija voltar primeiro.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * - **A pilha gira, não reordena a lista.** `ativo` é um índice; a profundidade
 *   de cada cartão é a distância até ele. Assim a ordem que o cliente passou é a
 *   ordem em que as setas andam, e nenhum cartão troca de chave no meio da mola.
 * - **Uma parada de Tab.** Só o cartão da frente entra no Tab. Os de trás são alvo de
 *   ponteiro e ficam `aria-hidden`: pelo teclado, ←/→ trazem o próximo, Enter
 *   abre, Esc devolve. Um aviso `aria-live` diz qual está na frente.
 * - **Altura fixa.** A caixa não cresce ao abrir; o detalhe ocupa o espaço que
 *   a pilha deixa. Carteira que empurra a página a cada clique parece quebrada.
 * - **Redução de movimento:** os estados acontecem, sem viagem de mola.
 */

export type WalletTone = "brand" | "ink" | "card" | "muted";

export interface WalletCard {
  /** Chave estável. */
  id: string;
  /** Nome que aparece na borda visível (o emissor, o clube). */
  title: string;
  /** Qualificador curto à direita: "Débito", "Passe". */
  kind?: string;
  /** Os quatro últimos dígitos. */
  last4?: string;
  /** Nome impresso. */
  holder?: string;
  /** Validade, "09/29". */
  expiry?: string;
  /** Material do cartão, sempre por token. */
  tone?: WalletTone;
}

export interface WalletStackProps {
  cards: WalletCard[];
  /** Título da carteira, no cabeçalho e no rótulo acessível. */
  label?: string;
  /** O que aparece embaixo do cartão aberto. Sem isto, o cartão não abre. */
  renderDetail?: (card: WalletCard) => React.ReactNode;
  /** Cartão da frente ao montar. */
  defaultIndex?: number;
  /** Avisa quando o cartão da frente muda. */
  onActiveChange?: (card: WalletCard) => void;
  /** Avisa quando um cartão abre (com ele) ou fecha (`null`). */
  onOpenChange?: (card: WalletCard | null) => void;
  className?: string;
}

const LARG = 300;
const ALT = 189; // proporção ISO de cartão, 1,586
const CAIXA = 440;
/** Quanto cada cartão de trás aparece acima do da frente: repouso, leque. */
const DEGRAU = 10;
const LEQUE = 34;
const ENCOLHE = 0.04;

const mola: Transition = { type: "spring", visualDuration: 0.3, bounce: 0.12 };

const material: Record<WalletTone, string> = {
  brand: "bg-[var(--brand)] text-[var(--brand-foreground)]",
  ink: "bg-foreground text-background",
  card: "bg-card text-foreground border border-border",
  muted: "bg-muted text-foreground border border-border",
};

function Face({ card }: { card: WalletCard }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-between rounded-[var(--r-surface)] p-4 [box-shadow:var(--e-raised)]",
        material[card.tone ?? "card"],
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[15px] font-semibold">{card.title}</span>
        {card.kind && <span className="shrink-0 text-[11px] opacity-70">{card.kind}</span>}
      </div>
      <div className="flex items-center gap-2">
        {/* O chip é um retângulo com borda: o material lê como cartão sem ilustração. */}
        <span aria-hidden="true" className="h-6 w-8 rounded-[5px] border border-current opacity-40" />
        <Nfc aria-hidden="true" className="size-4 opacity-60" strokeWidth={1.75} />
      </div>
      <div className="flex items-end justify-between gap-3 text-[12px]">
        <div className="min-w-0">
          {card.last4 && (
            <div className="font-mono text-[15px] tabular-nums">
              {/* 60, não 50: com o claro neutro (fundo branco puro) o texto da marca
                  ficou um pouco mais claro, e a 50% os pontos caíam a 2,98:1. A
                  opacidade é relativa à cor da FACE do cartão, por isso não vira token. */}
              <span className="opacity-60">•••• </span>
              {card.last4}
            </div>
          )}
          {card.holder && <div className="mt-1 truncate opacity-70">{card.holder}</div>}
        </div>
        {card.expiry && <span className="shrink-0 font-mono tabular-nums opacity-70">{card.expiry}</span>}
      </div>
    </div>
  );
}

export function WalletStack({
  cards,
  label = "Carteira",
  renderDetail,
  defaultIndex = 0,
  onActiveChange,
  onOpenChange,
  className,
}: WalletStackProps) {
  const reduzir = useReducedMotion();
  const total = cards.length;
  const [ativo, setAtivo] = React.useState(() => Math.min(Math.max(defaultIndex, 0), Math.max(total - 1, 0)));
  const [aberto, setAberto] = React.useState(false);
  const [leque, setLeque] = React.useState(false);
  const ativoRef = React.useRef(ativo);
  ativoRef.current = ativo;

  const trazer = (i: number) => {
    const next = ((i % total) + total) % total;
    if (next === ativoRef.current) return;
    setAtivo(next);
    onActiveChange?.(cards[next]);
    if (aberto) onOpenChange?.(cards[next]);
  };

  const abrir = (sim: boolean) => {
    if (sim && !renderDetail) return;
    setAberto(sim);
    onOpenChange?.(sim ? cards[ativoRef.current] : null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      trazer(ativo + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      trazer(ativo - 1);
    } else if (e.key === "Escape" && aberto) {
      e.preventDefault();
      abrir(false);
    }
  };

  // O botão da frente muda de cartão: se o foco estava na carteira, ele segue a frente.
  const raizRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const raiz = raizRef.current;
    if (raiz?.contains(document.activeElement)) raiz.querySelector<HTMLElement>("[data-frente]")?.focus();
  }, [ativo]);

  if (total === 0) return null;
  const atual = cards[ativo];

  // Onde cada cartão mora, por profundidade (0 = frente).
  const pousoFrente = aberto ? 0 : (CAIXA - ALT) / 2 + 24;
  const posicao = (prof: number) => {
    if (prof === 0) return { y: pousoFrente, scale: 1 };
    if (aberto) return { y: CAIXA - 30 + (prof - 1) * 6, scale: 1 - prof * ENCOLHE };
    return { y: pousoFrente - prof * (leque ? LEQUE : DEGRAU), scale: 1 - prof * ENCOLHE };
  };

  return (
    <div
      ref={raizRef}
      role="group"
      aria-label={label}
      className={cn("flex w-[320px] max-w-full flex-col gap-3", className)}
      onPointerEnter={() => setLeque(true)}
      onPointerLeave={() => setLeque(false)}
      onKeyDown={onKeyDown}
    >
      {/* A faixa de cima só tem trabalho com o cartão aberto (o "voltar"). O
          nome do grupo e o "1 de 4" já estão no `aria-label` e no aviso
          falado; escritos na tela, eram legenda em cima de uma pilha que se
          explica sozinha. A faixa fica com a altura reservada pra abrir não
          empurrar os cartões. */}
      <div className="flex h-8 items-center justify-end px-1">
        {aberto ? (
          <button
            type="button"
            onClick={() => {
              abrir(false);
              raizRef.current?.querySelector<HTMLElement>("[data-frente]")?.focus();
            }}
            className="inline-flex h-8 items-center gap-1 rounded-[var(--r-pill)] border border-border bg-background px-3 text-xs text-foreground [font:inherit] focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]"
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" />
            Todos
          </button>
        ) : null}
      </div>

      <div className="relative w-full overflow-hidden" style={{ height: CAIXA }}>
        {cards.map((card, i) => {
          const prof = (i - ativo + total) % total;
          const frente = prof === 0;
          const { y, scale } = posicao(prof);
          const props = {
            className: cn(
              "absolute left-1/2 top-0 block p-0 text-left [font:inherit]",
              "cursor-pointer rounded-[var(--r-surface)] focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
            ),
            style: { width: LARG, height: ALT, marginLeft: -LARG / 2, zIndex: total - prof, transformOrigin: "50% 0%" },
            initial: false as const,
            animate: { y, scale },
            transition: reduzir ? { duration: 0 } : mola,
          };
          return (
            <motion.button
              key={card.id}
              data-frente={frente ? "" : undefined}
              type="button"
              tabIndex={frente ? 0 : -1}
              aria-hidden={frente ? undefined : true}
              aria-label={frente ? `${card.title}${card.kind ? `, ${card.kind}` : ""}` : undefined}
              aria-expanded={frente && renderDetail ? aberto : undefined}
              onFocus={() => setLeque(true)}
              onBlur={() => setLeque(false)}
              onClick={() => (frente ? abrir(!aberto) : trazer(i))}
              {...props}
            >
              <Face card={card} />
            </motion.button>
          );
        })}

        <AnimatePresence initial={false}>
          {aberto && renderDetail && (
            <motion.div
              key={atual.id}
              className="absolute inset-x-0 overflow-y-auto px-1"
              style={{ top: ALT + 14, bottom: 40 }}
              initial={reduzir ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={reduzir ? { duration: 0.12 } : { ...mola, delay: 0.06 }}
            >
              {renderDetail(atual)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="sr-only" aria-live="polite">
        {atual.title} na frente, {ativo + 1} de {total}
        {aberto ? ", aberto" : ""}
      </p>
    </div>
  );
}
