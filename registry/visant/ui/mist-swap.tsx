"use client";

import * as React from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Mist Swap — a troca de slide como névoa.
 *
 * O slide que sai se desfaz no desfoque (e encolhe um fio) enquanto o próximo
 * assenta vindo de um desfoque mais largo. Os dois se cruzam no mesmo lugar: não
 * há deslize nem corte, só uma coisa virando outra. É a troca de foto de uma
 * marca contemplativa, não um carrossel.
 *
 * ── O contrato de tamanho ──────────────────────────────────────────────────
 *
 * O componente é `absolute inset-0`: ele PREENCHE o pai e não tem altura
 * própria. O pai precisa de tamanho (aspect-ratio, altura, ou ser ele mesmo uma
 * caixa medida) e de `position: relative`. Sem isso a troca acontece numa caixa
 * de 0px e parece que nada renderiza. A decisão é deliberada: os dois slides
 * empilhados no mesmo ponto durante a troca só são possíveis fora do fluxo, e
 * uma moldura que reserva o espaço é responsabilidade de quem desenha a página.
 *
 * ── As armadilhas ──────────────────────────────────────────────────────────
 *
 * 1. **Relógio fora da tela é trabalho que ninguém vê.** O intervalo só corre
 *    com a peça em vista (`useInView`). Também evita que a pessoa role até a
 *    moldura e a pegue no meio de uma troca que começou lá atrás.
 * 2. **Molduras vizinhas não podem trocar juntas.** Duas `MistSwap` lado a lado
 *    com o mesmo `interval` sincronizam e a página "pisca" inteira. Use `start`
 *    para não mostrarem o mesmo slide, e intervalos defasados (5200 / 6100).
 * 3. **`prefers-reduced-motion` para a rotação.** Troca automática é movimento
 *    que a pessoa não pediu; o slide de `start` fica parado.
 * 4. **A chave é o ÍNDICE do slide, não o nó.** `AnimatePresence` precisa de
 *    uma chave estável por slide para manter o que sai montado durante a saída.
 * 5. **`initial={false}`:** o primeiro slide já nasce no lugar. Só as TROCAS
 *    passam pela névoa — a montagem da página não é uma troca.
 *
 * O `overlay` é desenhado DENTRO de cada slide (e não uma vez por cima), para
 * que uma camada em `mix-blend-mode` (textura, pedra, grão) se misture com a
 * foto certa durante o cruzamento, e não com o fundo.
 */

// Tokens locais: o consumidor não tem `@/lib/motion`. `--ease-out` e a
// duração de deriva de cena (névoa saindo de uma foto).
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const DUR_DRIFT = 1.4;

export interface MistSwapProps {
  /** Os slides. Qualquer ReactNode: `<img>`, `<video>`, um bloco de texto. */
  children: React.ReactNode;
  /** Milissegundos entre trocas. Defase entre molduras vizinhas. */
  interval?: number;
  /** Índice inicial, para molduras vizinhas não abrirem no mesmo slide. */
  start?: number;
  /** Duração do cruzamento, em segundos. */
  transition?: number;
  /** Camada por cima de cada slide (textura em `darken`, gradiente de leitura). */
  overlay?: React.ReactNode;
  className?: string;
}

export function MistSwap({
  children,
  interval = 5200,
  start = 0,
  transition = DUR_DRIFT,
  overlay,
  className,
}: MistSwapProps) {
  const slides = React.Children.toArray(children);
  const n = slides.length;
  const ref = React.useRef<HTMLDivElement>(null);
  const naTela = useInView(ref, { margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [i, setI] = React.useState(() => (n ? ((start % n) + n) % n : 0));

  React.useEffect(() => {
    if (!naTela || reduce || n < 2) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % n), interval);
    return () => window.clearInterval(id);
  }, [naTela, reduce, n, interval]);

  // A lista pode encolher entre renders; o índice nunca aponta para o vazio.
  const atual = n ? i % n : 0;

  return (
    <div ref={ref} className={cn("absolute inset-0 overflow-hidden", className)}>
      <AnimatePresence initial={false}>
        {n ? (
          <motion.div
            key={atual}
            className="absolute inset-0 [&>img]:size-full [&>img]:object-cover [&>video]:size-full [&>video]:object-cover"
            initial={{ opacity: 0, filter: "blur(24px)", scale: 1.05 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(24px)", scale: 0.98 }}
            transition={{ duration: transition, ease: EASE_OUT }}
          >
            {slides[atual]}
            {overlay}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
