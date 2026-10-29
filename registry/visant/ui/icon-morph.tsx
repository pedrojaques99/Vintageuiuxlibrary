"use client";

// Adaptado de Icon morph — https://uiarc.dev/components/icon-morph — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).

import * as React from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Icon Morph: o ícone que muda de estado em vez de ser trocado.
 *
 * Botão de ícone que alterna (menu e fechar, tocar e pausar, copiar e
 * copiado) costuma resolver com dois `<svg>` e um ternário. O olho lê isso
 * como pisca: some uma coisa, aparece outra, e a relação entre as duas fica
 * por conta de quem olha. Aqui as linhas de um estado VIRAM as linhas do
 * outro, e a mudança conta o que aconteceu.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **Os traços são desenhados aqui, e é a exceção consciente à regra da
 *    casa.** Morph precisa saber qual linha vira qual, e um ícone pronto do
 *    lucide é uma caixa fechada. A grade é a mesma do lucide (24 unidades,
 *    traço 1,75, ponta redonda), então ao lado de um ícone lucide não destoa.
 * 2. **Mola interrompível em tudo.** Quem clica duas vezes rápido vê o ícone
 *    voltar de onde estava, não do começo. Por isso nada aqui usa duração fixa
 *    no caminho principal.
 * 3. **O ícone é mudo.** Sai com `aria-hidden`; quem fala é o botão em volta,
 *    com `aria-pressed`, `aria-expanded` ou um rótulo que muda. Ícone que se
 *    anuncia sozinho vira leitura dupla.
 * 4. **Movimento reduzido chega no estado final sem viagem.** O estado é
 *    informação; a viagem é enfeite.
 *
 * A cor vem de `currentColor`: pinte pelo botão, nunca pelo ícone.
 */

export type IconMorphName = "menu" | "play" | "plus" | "copy" | "theme" | "chevron";

export interface IconMorphProps
  extends Omit<React.SVGProps<SVGSVGElement>, "ref" | "children" | "name"> {
  /** Qual par de estados desenhar. */
  name: IconMorphName;
  /** O segundo estado: fechar, pausar, check, lua, seta virada. */
  state?: boolean;
  /** Tamanho em px. */
  size?: number;
  /** Espessura do traço na grade de 24. */
  strokeWidth?: number;
}

// As molas da casa, em `visualDuration`. Ícone troca dezenas de vezes por
// sessão: a mola fica bem abaixo do teto de 300 ms, rápida o bastante pra
// nunca parecer que o clique esperou a animação.
const MOLA: Transition = { type: "spring", visualDuration: 0.18, bounce: 0.15 };
const MOLA_FIRME: Transition = { type: "spring", visualDuration: 0.14, bounce: 0.05 };
const MOLA_LISA: Transition = { type: "spring", visualDuration: 0.16, bounce: 0 };
const JA: Transition = { duration: 0 };
const SUMIR = { duration: 0.1 };

function Moldura({
  size = 24,
  strokeWidth = 1.75,
  className,
  children,
  ...rest
}: Omit<IconMorphProps, "name" | "state"> & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("block flex-none overflow-visible", className)}
      {...rest}
    >
      {children}
    </svg>
  );
}

// O triângulo é cortado ao meio em dois quadriláteros: cada metade vira uma barra da pausa.
const PLAY = ["M7 4.5 L12 7.42 L12 16.58 L7 19.5 Z", "M12 7.42 L19.5 11.8 L19.5 12.2 L12 16.58 Z"];
const PAUSA = ["M6.5 5 L10 5 L10 19 L6.5 19 Z", "M14 5 L17.5 5 L17.5 19 L14 19 Z"];

const RAIOS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const r = (v: number) => Math.round(v * 100) / 100;
  return `M${r(12 + Math.cos(a) * 7.5)} ${r(12 + Math.sin(a) * 7.5)} L${r(12 + Math.cos(a) * 10)} ${r(12 + Math.sin(a) * 10)}`;
});

export function IconMorph({ name, state = false, ...props }: IconMorphProps) {
  const reduzido = useReducedMotion() ?? false;
  const id = React.useId().replace(/[^a-zA-Z0-9-]/g, "");
  const t = reduzido ? JA : MOLA;

  switch (name) {
    // As linhas de fora descem ao meio girando até o X; a do meio se recolhe.
    case "menu":
      return (
        <Moldura {...props}>
          <motion.path d="M4 6h16" initial={false} animate={state ? { y: 6, rotate: 45 } : { y: 0, rotate: 0 }} transition={t} />
          <motion.path
            d="M4 12h16"
            initial={false}
            animate={state ? { opacity: 0, scaleX: 0.2 } : { opacity: 1, scaleX: 1 }}
            transition={reduzido ? JA : { ...MOLA_FIRME, opacity: SUMIR }}
          />
          <motion.path d="M4 18h16" initial={false} animate={state ? { y: -6, rotate: -45 } : { y: 0, rotate: 0 }} transition={t} />
        </Moldura>
      );

    case "play":
      return (
        <Moldura {...props}>
          {PLAY.map((d, i) => (
            <motion.path key={i} d={d} fill="currentColor" strokeWidth={1.5} initial={false} animate={{ d: state ? PAUSA[i] : d }} transition={t} />
          ))}
        </Moldura>
      );

    // Cada barra do mais gira as pontas até virar uma perna do check.
    case "plus":
      return (
        <Moldura {...props}>
          <motion.path d="M12 5 L12 19" initial={false} animate={{ d: state ? "M20 6.5 L9.5 17" : "M12 5 L12 19" }} transition={t} />
          <motion.path d="M5 12 L19 12" initial={false} animate={{ d: state ? "M4.5 12 L9.5 17" : "M5 12 L19 12" }} transition={t} />
        </Moldura>
      );

    // As folhas se recolhem e o check se escreve, com um respiro curto entre os dois.
    case "copy":
      return (
        <Moldura {...props}>
          <motion.path
            d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
            initial={false}
            animate={state ? { x: 4, y: 4, opacity: 0 } : { x: 0, y: 0, opacity: 1 }}
            transition={reduzido ? JA : { ...MOLA_LISA, opacity: SUMIR }}
          />
          <motion.rect
            x="8" y="8" width="14" height="14" rx="2"
            initial={false}
            animate={state ? { scale: 0.7, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={reduzido ? JA : { ...MOLA_LISA, opacity: SUMIR }}
          />
          <motion.path
            d="M5 12.5 L9.5 17 L19 7.5"
            initial={false}
            animate={state ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={reduzido ? JA : { ...MOLA_LISA, delay: state ? 0.04 : 0, opacity: { duration: 0.06, delay: state ? 0.04 : 0 } }}
          />
        </Moldura>
      );

    // Sol vira lua: o disco cresce enquanto uma sombra entra pelo canto e cava o
    // crescente, e os raios giram e se recolhem. O crescente é desenhado como
    // contorno: a borda do disco fora da sombra mais a borda da sombra dentro do disco.
    case "theme": {
      const disco = { r: state ? 8.5 : 4.5 };
      const sombra = state ? { cx: 18, cy: 6, r: 6.5 } : { cx: 30, cy: -6, r: 6.5 };
      return (
        <Moldura {...props}>
          <defs>
            <mask id={`${id}-mordida`} maskUnits="userSpaceOnUse" x="-8" y="-8" width="40" height="40">
              <rect x="-8" y="-8" width="40" height="40" fill="white" stroke="none" />
              <motion.circle cx={30} cy={-6} r={6.5} fill="black" stroke="none" initial={false} animate={sombra} transition={t} />
            </mask>
            <clipPath id={`${id}-disco`}>
              <motion.circle cx={12} cy={12} r={4.5} initial={false} animate={disco} transition={t} />
            </clipPath>
          </defs>
          <motion.circle cx={12} cy={12} r={4.5} mask={`url(#${id}-mordida)`} initial={false} animate={disco} transition={t} />
          <motion.circle cx={30} cy={-6} r={6.5} clipPath={`url(#${id}-disco)`} initial={false} animate={sombra} transition={t} />
          <motion.g
            initial={false}
            animate={state ? { rotate: 90, scale: 0.4, opacity: 0 } : { rotate: 0, scale: 1, opacity: 1 }}
            transition={reduzido ? JA : { ...MOLA, opacity: SUMIR }}
          >
            {RAIOS.map((d) => (
              <path key={d} d={d} />
            ))}
          </motion.g>
        </Moldura>
      );
    }

    // Seta de abrir e fechar, ou de ordenar: meia volta na mola.
    case "chevron":
      return (
        <Moldura {...props}>
          <motion.path
            d="M6 9 L12 15 L18 9"
            initial={false}
            animate={{ rotate: state ? 180 : 0 }}
            style={{ transformOrigin: "50% 50%" }}
            transition={t}
          />
        </Moldura>
      );
  }
}

export default IconMorph;
