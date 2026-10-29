"use client";

// Adaptado de Card stack — https://uiarc.dev/components/card-stack — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).

import * as React from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type Transition } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Card Stack: um baralho em que o card de cima é jogado para o fundo.
 *
 * Depoimento, case, foto de portfólio: quando há meia dúzia de peças e espaço
 * para uma, a pilha mostra que existe mais sem virar carrossel. O gesto é o de
 * baralho de verdade: arrasta o de cima, solta, ele sai na direção do arremesso
 * e volta por BAIXO dos outros. Nada se perde, a pilha só gira.
 *
 * Diferente do original (triagem com aceitar e recusar), aqui não há decisão:
 * a peça é de vitrine, não de fila de revisão. Por isso não há desfazer nem
 * estado vazio, e a API fica em quatro props.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **O arremesso tem duas metades.** Primeiro o card sai seguindo o dedo
 *    (ainda por cima de todos), DEPOIS troca de camada e volta para o fundo.
 *    Trocar a camada antes faria o card sumir atrás da pilha no meio do gesto.
 * 2. **Flick conta tanto quanto distância.** Soltar rápido joga mesmo com pouco
 *    caminho; soltar devagar e perto do centro devolve o card para casa na mola,
 *    com a velocidade da soltura, para assentar em vez de parar seco.
 * 3. **Só os quatro de cima aparecem.** Os demais ficam montados e invisíveis
 *    um degrau atrás, para entrar pela mesma mola quando subirem.
 * 4. **Teclado:** a pilha é uma parada de Tab; setas, Enter e Espaço mandam o
 *    card de cima para o fundo. `touch-action: pan-y` deixa a rolagem vertical
 *    da página livre no telefone.
 */

export interface CardStackProps<T> {
  /** Os cards, na ordem em que a pilha começa. */
  items: T[];
  /** Chave estável por item. */
  getKey: (item: T) => string;
  /** Nome curto do card, para o rótulo acessível e o aviso de troca. */
  getLabel: (item: T) => string;
  /** O conteúdo de cada card. */
  renderCard: (item: T) => React.ReactNode;
  /** Chamado quando um card vai para o fundo, com o item que subiu para o topo. */
  onCycle?: (top: T) => void;
  /** Nome acessível da pilha. */
  label?: string;
  className?: string;
}

const VISIVEIS = 4;
/** Quanto cada card de trás aparece abaixo do da frente, e quanto encolhe. */
const DEGRAU = 12;
const ENCOLHE = 0.05;
/**
 * O leque: cada card de trás sai levemente torto, alternando o lado. Pilha
 * perfeitamente alinhada lê como fatias de interface empilhadas; uns poucos graus
 * pra cada lado é o que faz ler como cartas de verdade numa mesa.
 */
const GIRO = [0, -5, 3.5, -2, 0];
/** Px por segundo a partir do qual a soltura é arremesso. */
const FLICK = 500;

const molaPilha: Transition = { type: "spring", visualDuration: 0.3, bounce: 0.1 };
const molaVolta: Transition = { type: "spring", visualDuration: 0.28, bounce: 0.15 };
const parado: Transition = { duration: 0 };

interface CartaProps {
  depth: number;
  total: number;
  topo: boolean;
  reduce: boolean;
  /** Sinal de envio por teclado: muda a cada pedido, com a direção. */
  envio: { n: number; dir: 1 | -1 } | null;
  onSend: () => void;
  label: string;
  children: React.ReactNode;
}

function Carta({ depth, total, topo, reduce, envio, onSend, label, children }: CartaProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-10, 10]);
  const [voando, setVoando] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const lancar = React.useCallback(
    async (dir: number, vx = 0, vy = 0) => {
      if (reduce) {
        onSend();
        return;
      }
      setVoando(true);
      const largura = ref.current?.offsetWidth ?? 280;
      // Metade um: sai por cima, seguindo o arremesso.
      await Promise.all([
        animate(x, dir * largura * 0.75, { type: "spring", visualDuration: 0.2, bounce: 0, velocity: vx }),
        animate(y, y.get() - 16, { type: "spring", visualDuration: 0.2, bounce: 0, velocity: vy }),
      ]);
      // Metade dois: troca de camada e volta para casa, já no fundo.
      onSend();
      setVoando(false);
      animate(x, 0, molaVolta);
      animate(y, 0, molaVolta);
    },
    [onSend, reduce, x, y],
  );

  // O pedido que já existia quando a carta montou não é dela.
  const visto = React.useRef(envio?.n);
  React.useEffect(() => {
    if (envio?.n === visto.current) return;
    visto.current = envio?.n;
    if (envio && topo) void lancar(envio.dir);
    // Só o pedido novo dispara; `topo` é lido no momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envio?.n]);

  const fora = depth >= VISIVEIS;
  const d = Math.min(depth, VISIVEIS);

  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 top-0 h-[var(--card-stack-h)] origin-bottom"
      style={{ zIndex: voando ? total + 1 : total - depth }}
      initial={false}
      animate={{
        y: d * DEGRAU,
        scale: 1 - d * ENCOLHE,
        rotate: reduce ? 0 : GIRO[d] ?? 0,
        opacity: fora ? 0 : 1,
      }}
      transition={reduce ? parado : molaPilha}
      aria-hidden={topo ? undefined : true}
      // `inert` como atributo cru: o React 18 não conhece a prop e só repassa string.
      {...({ inert: topo ? undefined : "" } as object)}
    >
      <motion.div
        ref={ref}
        role={topo ? "group" : undefined}
        aria-roledescription={topo ? "card" : undefined}
        aria-label={topo ? label : undefined}
        style={{ x, y, rotate }}
        drag={topo && !voando}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          const dx = info.offset.x;
          const largura = ref.current?.offsetWidth ?? 280;
          const flick = Math.abs(info.velocity.x) > FLICK && Math.sign(info.velocity.x) === Math.sign(dx);
          if (dx !== 0 && (flick || Math.abs(dx) > largura * 0.35)) {
            void lancar(Math.sign(dx), info.velocity.x, info.velocity.y);
            return;
          }
          if (reduce) {
            x.jump(0);
            y.jump(0);
            return;
          }
          animate(x, 0, { ...molaVolta, velocity: info.velocity.x });
          animate(y, 0, { ...molaVolta, velocity: info.velocity.y });
        }}
        className={cn(
          "absolute inset-0 touch-pan-y select-none overflow-hidden rounded-[var(--r-surface)] border border-border bg-card text-foreground",
          topo && "pointer-events-auto cursor-grab active:cursor-grabbing",
          (topo || voando) && "[box-shadow:var(--e-raised)]",
        )}
      >
        {children}
        {/*
         * A sombra de profundidade: quanto mais fundo, mais o card afunda no
         * fundo do tema. É um véu da cor do `--background`, não um cinza, então
         * funciona igual no claro e no escuro, e some no card de cima.
         */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-background"
          initial={false}
          animate={{ opacity: Math.min(d, 3) * 0.18 }}
          transition={reduce ? parado : molaPilha}
        />
      </motion.div>
    </motion.div>
  );
}

export function CardStack<T>({ items, getKey, getLabel, renderCard, onCycle, label = "Pilha de cards", className }: CardStackProps<T>) {
  const reduce = useReducedMotion() ?? false;
  const [ordem, setOrdem] = React.useState<string[]>(() => items.map(getKey));
  const [envio, setEnvio] = React.useState<{ n: number; dir: 1 | -1 } | null>(null);
  const [aviso, setAviso] = React.useState("");
  const dica = React.useId();

  // Se a lista mudar, mantém a ordem do que sobrou e põe o novo no fim.
  React.useEffect(() => {
    const chaves = items.map(getKey);
    setOrdem((o) => [...o.filter((k) => chaves.includes(k)), ...chaves.filter((k) => !o.includes(k))]);
  }, [items, getKey]);

  const porChave = new Map(items.map((it) => [getKey(it), it]));

  // A ordem vive também num ref: o envio lê o topo do momento sem efeito colateral dentro do updater.
  const ordemRef = React.useRef(ordem);
  ordemRef.current = ordem;

  const enviar = () => {
    const o = ordemRef.current;
    if (o.length < 2) return;
    const nova = [...o.slice(1), o[0]];
    ordemRef.current = nova;
    setOrdem(nova);
    const topo = porChave.get(nova[0]);
    if (topo) {
      setAviso(`${getLabel(topo)}, agora no topo.`);
      onCycle?.(topo);
    }
  };

  return (
    <div className={cn("w-[min(100%,20rem)] [--card-stack-h:17rem]", className)}>
      <div
        role="group"
        aria-label={label}
        aria-describedby={dica}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          const dir = e.key === "ArrowLeft" ? -1 : ["ArrowRight", "Enter", " "].includes(e.key) ? 1 : 0;
          if (!dir) return;
          e.preventDefault();
          setEnvio((s) => ({ n: (s?.n ?? 0) + 1, dir }));
        }}
        className="relative isolate h-[calc(var(--card-stack-h)+3*12px)] rounded-[var(--r-surface)] outline-none focus-visible:[box-shadow:var(--focus)]"
      >
        {ordem.map((k, depth) => {
          const item = porChave.get(k);
          if (!item) return null;
          return (
            <Carta
              key={k}
              depth={depth}
              total={ordem.length}
              topo={depth === 0}
              reduce={reduce}
              envio={envio}
              onSend={enviar}
              label={`${getLabel(item)}, ${items.indexOf(item) + 1} de ${items.length}`}
            >
              {renderCard(item)}
            </Carta>
          );
        })}
      </div>
      <p id={dica} className="sr-only">
        Arraste o card de cima para mandá-lo ao fundo, ou use as setas.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {aviso}
      </p>
    </div>
  );
}

export default CardStack;
