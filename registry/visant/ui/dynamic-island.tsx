"use client";

import * as React from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Dynamic Island — a pílula que guarda uma atividade em andamento e abre quando
 * alguém quer mexer nela.
 *
 * O problema que ela resolve é de espaço: uma chamada, um timer, uma música
 * tocando são coisas que o usuário quer VER o tempo todo e CONTROLAR de vez em
 * quando. Um card fixo rouba a tela; um toast some. A ilha fica pequena,
 * mostra o essencial (ícone e um número), e cresce no lugar quando tocada,
 * trazendo os controles junto. Tocar de novo devolve.
 *
 * ── Decisões que não se veem de primeira ──────────────────────────────────
 *
 * 1. **A casca anima largura e altura medidas, não `layout`.** A animação de
 *    layout do motion escala o elemento e corrige depois; numa pílula isso
 *    entorta o raio e espreme o texto no meio da viagem. Aqui o conteúdo é
 *    medido por um ResizeObserver e a casca vai até aquela caixa com mola, e
 *    o raio é CSS puro o caminho inteiro.
 * 2. **O conteúdo troca em cruz, a casca não pisca.** Mudar de atividade
 *    (`activityKey`) ou de tamanho troca o miolo com esmaecer curto, enquanto a
 *    mesma casca morfa de uma forma para outra. Quem olha vê UMA coisa mudando
 *    de forma, não duas trocando de lugar.
 * 3. **O toque de recolher é um botão de verdade por trás do miolo.** O miolo
 *    aberto tem os próprios botões (pausar, desligar), e botão dentro de botão
 *    não existe em HTML. Então a área inteira é um `<button>` em camada de
 *    baixo, e o miolo por cima só aceita ponteiro nos controles dele: clique
 *    no vazio cai no botão de recolher, clique no "pausar" fica no pausar.
 *    No teclado, Esc também recolhe.
 * 4. **A mola tem duração visual fixa e só o `bounce` muda.** Quem ajusta a
 *    peça quer mais ou menos vida, não mais ou menos tempo; o tempo fica no
 *    teto de 300 ms da casa, que é resposta a gesto.
 *
 * `prefers-reduced-motion`: a ilha vai direto para o tamanho final e o miolo
 * troca sem viagem.
 */

export interface DynamicIslandProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Nome da atividade, lido pelo leitor de tela (“Timer, 4:56”). */
  label: string;
  /** Chave da atividade. Trocar a chave morfa a ilha para a nova forma. */
  activityKey?: string;
  /** O miolo recolhido: ícone e um dado curto. */
  compact: React.ReactNode;
  /** O miolo aberto, com os controles da atividade. */
  children: React.ReactNode;
  /** Aberta ou recolhida, controlado. */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Vida da mola, de 0 (seca) a 0,6 (saltitante). */
  bounce?: number;
}

export function DynamicIsland({
  label,
  activityKey = "atividade",
  compact,
  children,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  bounce = 0.3,
  className,
  onKeyDown,
  ...props
}: DynamicIslandProps) {
  const reduzir = useReducedMotion();
  const [interno, setInterno] = React.useState(defaultExpanded);
  const aberta = expandedProp ?? interno;

  const definir = React.useCallback(
    (v: boolean) => {
      if (expandedProp === undefined) setInterno(v);
      onExpandedChange?.(v);
    },
    [expandedProp, onExpandedChange],
  );

  const mola = reduzir
    ? { duration: 0 }
    : { type: "spring" as const, visualDuration: 0.28, bounce: Math.min(0.6, Math.max(0, bounce)) };
  const molaRef = React.useRef(mola);
  molaRef.current = mola;

  // A caixa da casca, em px. "auto" até a primeira medida, então o HTML de
  // servidor já sai do tamanho do miolo. A primeira medida CRAVA o valor sem
  // animar: é ela que dá à casca uma largura própria, de onde a próxima troca
  // parte. Sem cravar, a casca seguiria em `auto`, cresceria junto com o miolo
  // novo no mesmo quadro, e a mola não teria distância nenhuma pra percorrer.
  const largura = useMotionValue<number | string>("auto");
  const altura = useMotionValue<number | string>("auto");
  const medida = React.useRef(false);
  const miolo = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const el = miolo.current;
    if (!el) return;
    const medir = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!medida.current) {
        largura.set(w);
        altura.set(h);
        medida.current = true;
        return;
      }
      animate(largura, w, molaRef.current);
      animate(altura, h, molaRef.current);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aberta, activityKey, largura, altura]);

  const chave = `${activityKey}:${aberta ? "aberta" : "recolhida"}`;

  return (
    <motion.div
      {...(props as React.ComponentProps<typeof motion.div>)}
      className={cn(
        "relative isolate overflow-hidden rounded-[var(--r-pill)] bg-foreground text-background [box-shadow:var(--e-raised)]",
        className,
      )}
      style={{ ...(props.style as object), width: largura, height: altura }}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);
        if (e.key === "Escape" && aberta) {
          e.stopPropagation();
          definir(false);
        }
      }}
    >
      {/* O alvo de abrir/recolher, sempre por baixo do miolo. */}
      <button
        type="button"
        aria-expanded={aberta}
        aria-label={aberta ? `Recolher ${label}` : `Abrir ${label}`}
        onClick={() => definir(!aberta)}
        className="absolute inset-0 z-0 cursor-pointer rounded-[inherit] outline-none focus-visible:[box-shadow:var(--focus)]"
      />

      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={chave}
          aria-hidden={!aberta}
          className={cn(
            "pointer-events-none relative z-10 w-max",
            // Só os controles do miolo aberto capturam ponteiro.
            aberta && "[&_a]:pointer-events-auto [&_button]:pointer-events-auto",
          )}
          initial={reduzir ? { opacity: 0 } : { opacity: 0, scale: 0.94, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={reduzir ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(4px)" }}
          transition={reduzir ? { duration: 0 } : { duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          {/*
            A medida mora num `div` de dentro, não no `motion.div`: em
            `popLayout` o AnimatePresence lê `children.props.ref`, e no React 18
            isso dispara "`ref` is not a prop" a cada troca de atividade.
          */}
          <div ref={miolo} className="w-max">
            {aberta ? children : compact}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
