"use client";

import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Tilt Card — o card que inclina em 3D sob o ponteiro, com o reflexo andando
 * junto.
 *
 * Uma foto de produto, uma capa, um cartão de membro: peças que vendem pela
 * matéria. Numa tela plana elas leem como recorte. Inclinar com o ponteiro e
 * deixar um brilho correr pela superfície dá o que falta, a sensação de objeto
 * que se pega na mão. É o que o card faz, e só isso.
 *
 * ── Decisões que não se veem de primeira ──────────────────────────────────
 *
 * 1. **O ponteiro vira -1…1 e passa por mola.** Inclinar direto no evento
 *    treme e para seco quando o cursor sai. Com mola o card segue com um
 *    respiro e, ao sair, volta deitado sozinho.
 * 2. **`sink` inverte o gesto.** Por padrão o canto sob o ponteiro vem na
 *    direção de quem olha, como cartão levantado pra luz. Com `sink` ele
 *    afunda, como se o dedo apertasse uma almofada: lê mais tátil em foto,
 *    menos vitrine.
 * 3. **O brilho é luz somada, não tinta.** É um gradiente radial com
 *    `mix-blend-mode: plus-lighter` sobre um tom que mistura fundo e frente
 *    do tema: em qualquer marca e nos dois modos ele só clareia, nunca mancha.
 *    Ele fica sob o ponteiro e acende com a inclinação: no centro, card
 *    deitado, não há reflexo nenhum.
 * 4. **A sombra anda contra a inclinação.** Um card que vira sem a sombra
 *    acompanhar parece decalque girando; a sombra deslocada é o que diz
 *    "levantou do chão".
 * 5. **Só onde há ponteiro fino.** No toque não existe hover: o card ficaria
 *    preso inclinado no último ponto tocado.
 *
 * `prefers-reduced-motion`: o card fica plano; o conteúdo é o mesmo.
 */

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inclinação máxima, em graus, em cada eixo. */
  maxTilt?: number;
  /** Força do brilho, de 0 (sem brilho) a 1. */
  glare?: number;
  /** Afunda o canto sob o ponteiro em vez de levantá-lo. */
  sink?: boolean;
  /** Distância da câmera, em px. Menor = perspectiva mais forte. */
  perspective?: number;
}

const MOLA = { stiffness: 260, damping: 24, mass: 0.6 };

export function TiltCard({
  maxTilt = 10,
  glare = 0.5,
  sink = false,
  perspective = 900,
  className,
  children,
  style,
  onPointerMove,
  onPointerLeave,
  ...props
}: TiltCardProps) {
  const reduzir = useReducedMotion();
  const [fino, setFino] = React.useState(false);

  React.useEffect(() => {
    try {
      setFino(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    } catch {
      setFino(false);
    }
  }, []);

  const ativo = fino && !reduzir;

  // Ponteiro dentro do card, -1…1 em cada eixo; 0 é repouso.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, MOLA);
  const sy = useSpring(py, MOLA);

  // Sinais medidos: rotateY positivo traz a borda esquerda pra frente,
  // rotateX positivo traz a de baixo.
  const lado = sink ? -1 : 1;
  const rotateY = useTransform(sx, (v) => -v * maxTilt * lado);
  const rotateX = useTransform(sy, (v) => v * maxTilt * lado);

  const brilhoX = useTransform(sx, (v) => 50 + v * 50);
  const brilhoY = useTransform(sy, (v) => 50 + v * 50);
  const forca = useTransform([sx, sy], ([a, b]) =>
    Math.min(1, Math.hypot(a as number, b as number)) * Math.max(0, Math.min(1, glare)) * 70,
  );
  const brilho = useMotionTemplate`radial-gradient(circle at ${brilhoX}% ${brilhoY}%, color-mix(in oklab, color-mix(in oklab, var(--background) 50%, var(--foreground)) ${forca}%, transparent) 0%, transparent 60%)`;

  const sombraX = useTransform(sx, (v) => v * maxTilt * -0.8 * lado);
  const sombraY = useTransform(sy, (v) => 14 + v * maxTilt * -0.8 * lado);
  const sombra = useMotionTemplate`${sombraX}px ${sombraY}px 40px -12px var(--sombra-inclinada)`;

  return (
    <div
      {...props}
      className={cn(
        // Sombra é ausência de luz nos dois temas: no claro, tinta do texto;
        // no escuro, o fundo da página, que é o tom mais fundo que existe.
        // Com `--foreground` no escuro ela virava um halo claro em volta do card.
        "relative [--sombra-inclinada:color-mix(in_oklab,var(--foreground)_28%,transparent)]",
        "dark:[--sombra-inclinada:color-mix(in_oklab,var(--background)_85%,transparent)]",
        className,
      )}
      style={{ perspective, ...style }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (!ativo || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set(((e.clientX - r.left) / r.width) * 2 - 1);
        py.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        px.set(0);
        py.set(0);
      }}
    >
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-[var(--r-surface)] bg-card [transform-style:preserve-3d]"
        style={
          ativo
            ? { rotateX, rotateY, boxShadow: sombra }
            : { boxShadow: "var(--e-raised)" }
        }
      >
        {children}
        {ativo && glare > 0 && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 [mix-blend-mode:plus-lighter]"
            style={{ backgroundImage: brilho }}
          />
        )}
      </motion.div>
    </div>
  );
}
