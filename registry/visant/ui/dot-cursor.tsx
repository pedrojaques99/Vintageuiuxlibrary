"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Dot Cursor — um ponto de 6px que acompanha o ponteiro com mola calma.
 *
 * Sobre algo interativo (`[data-cursor]`, link, botão) o ponto abre num anel
 * fino e vazado de 28px. Sem rótulo, sem bolha cheia, sem "View →" escrito
 * dentro: o anel diz "isto responde" e para por aí. O cursor nativo continua
 * lá — o ponto é companhia, não substituto, e por isso nunca atrapalha a mira.
 *
 * Monte UMA vez, perto da raiz do app. Ele é `position: fixed` e ouve a janela.
 *
 * ── As armadilhas ──────────────────────────────────────────────────────────
 *
 * 1. **O `translate` de centralizar mora num wrapper.** O `scale` animado pelo
 *    framer vira `transform` inline e sobrescreveria o `-translate-1/2` do
 *    Tailwind no mesmo nó — o anel cresceria a partir do canto, fora do
 *    ponteiro. Um nó centraliza, o de dentro escala.
 * 2. **Só em ponteiro fino e sem `prefers-reduced-motion`.** No toque não há
 *    ponteiro para seguir (o ponto ficaria preso no último toque), e um objeto
 *    perseguindo o mouse é exatamente o movimento que a preferência pede pra
 *    tirar. A guarda é checada ANTES de assinar o listener.
 * 3. **O preenchimento é transição CSS, não framer.** `currentColor` não é um
 *    valor que o framer saiba interpolar — ele salta. O CSS interpola
 *    `transparent ↔ currentColor` sem esforço, então o framer cuida só do
 *    `scale` e o fundo fica com `transition-[background-color]`.
 * 4. **`mix-blend-mode: difference` precisa de tinta CLARA.** É o que faz o
 *    ponto inverter sobre foto, texto e fundo e aparecer em qualquer um deles.
 *    O padrão é `var(--background)`, que é claro num tema claro; num tema
 *    escuro passe `ink="var(--foreground)"` — tinta escura em `difference`
 *    não inverte nada e o ponto some.
 * 5. **Saiu da janela, o ponto apaga.** Sem o `pointerleave` no documento ele
 *    ficaria parado na borda por onde o mouse saiu.
 */

// Tokens locais (o consumidor não tem `@/lib/motion`).
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const DUR_BASE = 0.2;
const DUR_SLOW = 0.3;
// Mola sem overshoot: segue, não quica. Um cursor que passa do ponto parece bêbado.
const SPRING_FOLLOW = { stiffness: 160, damping: 22, mass: 0.6 } as const;

const ANEL = 28; // px — o anel aberto
const PONTO = 6; // px — o ponto em repouso

export interface DotCursorProps {
  /** O que conta como interativo. O anel abre sobre o mais próximo deles. */
  selector?: string;
  /** Tinta do ponto. Precisa ser clara com `blend` ligado (armadilha 4). */
  ink?: string;
  /** `mix-blend-mode: difference`. Desligue para um ponto de cor fixa. */
  blend?: boolean;
  className?: string;
}

export function DotCursor({
  selector = "[data-cursor], a, button",
  ink = "var(--background)",
  blend = true,
  className,
}: DotCursorProps) {
  const [ligado, setLigado] = React.useState(false);
  const [ativo, setAtivo] = React.useState(false);
  const [sobre, setSobre] = React.useState(false);
  // Nasce fora da tela: o primeiro quadro não pode piscar um ponto no canto.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, SPRING_FOLLOW);
  const sy = useSpring(y, SPRING_FOLLOW);

  React.useEffect(() => {
    const fino = window.matchMedia("(pointer: fine)").matches;
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fino || reduz) return;
    setLigado(true);

    const mover = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      // `setState` com o mesmo valor não re-renderiza; checar a cada movimento
      // é barato e pega o caso do conteúdo que mudou sob o ponteiro parado.
      setSobre(!!(e.target as Element | null)?.closest?.(selector));
      setAtivo(true);
    };
    const sair = () => setAtivo(false);
    window.addEventListener("pointermove", mover, { passive: true });
    document.documentElement.addEventListener("pointerleave", sair);
    return () => {
      window.removeEventListener("pointermove", mover);
      document.documentElement.removeEventListener("pointerleave", sair);
    };
  }, [x, y, selector]);

  // Sem ponteiro fino não há nem nó: nada fixo flutuando no toque.
  if (!ligado) return null;

  return (
    <motion.div
      aria-hidden
      className={cn(
        "pointer-events-none fixed left-0 top-0 z-[60]",
        blend && "mix-blend-difference",
        className,
      )}
      style={{ x: sx, y: sy, color: ink }}
      initial={false}
      animate={{ opacity: ativo ? 1 : 0 }}
      transition={{ duration: DUR_BASE, ease: EASE_OUT }}
    >
      {/* translate num wrapper: o scale do framer sobrescreveria o transform do Tailwind */}
      <div className="-translate-x-1/2 -translate-y-1/2">
        <motion.div
          data-over={sobre ? "" : undefined}
          className="rounded-full border border-current bg-current transition-[background-color] [transition-duration:var(--dur-slow,300ms)] [transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))] data-[over]:bg-transparent"
          style={{ width: ANEL, height: ANEL }}
          initial={false}
          animate={{ scale: sobre ? 1 : PONTO / ANEL }}
          transition={{ duration: DUR_SLOW, ease: EASE_OUT }}
        />
      </div>
    </motion.div>
  );
}
