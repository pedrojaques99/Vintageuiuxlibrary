"use client";

import * as React from "react";
import { motion, useSpring } from "framer-motion";

/**
 * Repulsive Hover — o elemento que se esquiva do cursor.
 *
 * O oposto do magnético: em vez de puxar o dedo pro alvo, ele afasta. Serve
 * quando o elemento é **decoração viva** (um selo de hero, uma peça de colagem,
 * um campo de glifos) e o movimento é o que faz a superfície parecer física.
 *
 * Fora de hero ele é armadilha, e vale dizer por quê: alvo que foge é alvo que
 * a pessoa erra. Nunca em botão de formulário, nunca em qualquer coisa que
 * precise ser clicada. O `strength` default é pequeno de propósito — a esquiva
 * boa é a que a pessoa sente antes de perceber.
 *
 * ── As quatro guardas ──────────────────────────────────────────────────────
 *
 * · **Só em ponteiro fino.** Em toque não existe hover: a peça ficaria parada
 *   fora do lugar, deslocada pelo último toque. Sem mouse, ela nem escuta.
 * · **`prefers-reduced-motion` desliga inteiro.** É movimento puro, sem dado
 *   nenhum embutido — o estado de repouso já é o conteúdo completo.
 * · **Distância zero não divide.** Cursor exatamente no centro dava `0/0` e a
 *   peça sumia num `NaN` de transform.
 * · **A mola volta ao repouso.** Fora do raio o alvo é 0, e é a mola que leva de
 *   volta — cortar o valor na hora faria a peça saltar quando o cursor sai
 *   rápido pela borda do raio.
 */
export interface RepulsiveHoverProps {
  children: React.ReactNode;
  /** Deslocamento máximo em px, no ponto mais próximo do cursor. */
  strength?: number;
  /** Raio de influência em px. Abaixo dele a peça começa a fugir. */
  radius?: number;
  className?: string;
}

export function RepulsiveHover({
  children,
  strength = 12,
  radius = 140,
  className,
}: RepulsiveHoverProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  // Mola macia e bem amortecida: a esquiva é elástica, não é gelatina.
  const x = useSpring(0, { stiffness: 140, damping: 18, mass: 0.6 });
  const y = useSpring(0, { stiffness: 140, damping: 18, mass: 0.6 });

  React.useEffect(() => {
    let fino = false;
    try {
      fino = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) fino = false;
    } catch {
      fino = false;
    }
    if (!fino) return;

    const mover = (e: PointerEvent) => {
      const el = ref.current;
      if (!el || (e.pointerType && e.pointerType !== "mouse")) return;

      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);

      if (dist >= radius) {
        x.set(0);
        y.set(0);
        return;
      }

      // Quanto mais perto, mais forte. `|| 1` cobre o cursor no centro exato.
      const forca = (radius - dist) / radius;
      const d = dist || 1;
      x.set((-dx / d) * forca * strength);
      y.set((-dy / d) * forca * strength);
    };
    const repousar = () => {
      x.set(0);
      y.set(0);
    };

    window.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerleave", repousar, { passive: true });
    return () => {
      window.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerleave", repousar);
    };
  }, [radius, strength, x, y]);

  return (
    <motion.div ref={ref} style={{ x, y }} className={className}>
      {children}
    </motion.div>
  );
}
