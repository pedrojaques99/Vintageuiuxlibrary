"use client";

/* Adaptado de Text Morph — https://uiarc.dev/components/text-morph — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui). */

import * as React from "react";
import { AnimatePresence, animate, motion, useReducedMotion, type AnimationPlaybackControls } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Text Morph — a palavra que vira a próxima sem piscar.
 *
 * Pra rótulo de estado que muda poucas letras: "Publicar → Publicando →
 * Publicado", "Seguir → Seguindo". Trocar o texto seco faz o botão mudar de
 * largura num quadro e o olho perde onde estava. Aqui as letras que as duas
 * palavras têm em comum deslizam pro lugar novo, as que chegam nascem de um
 * desfoque curto, as que saem se desfazem, e a largura acompanha numa mola.
 *
 * ── O que não é óbvio ──────────────────────────────────────────────────────
 *
 * 1. **Letra casa por caractere E ocorrência.** O segundo "i" de uma palavra é
 *    o segundo "i" da outra. Sem isso, palavras com letra repetida embaralham.
 * 2. **Só as letras novas escalonam**, na ordem de leitura. As que ficam já
 *    estão na tela; atrasá-las seria fingir que chegaram agora.
 * 3. **A moldura carrega a largura explícita.** A trilha de dentro já tem as
 *    letras novas no fluxo; a moldura mede a trilha e vai até ela numa mola.
 *    Carregar fonte ou redimensionar segue a medida na hora, sem animar,
 *    porque não é mudança de conteúdo.
 * 4. **A máscara mora no respiro.** Padding com margem negativa dá espaço pro
 *    desfoque e pras descendentes sem mexer no layout, e a borda esmaecida
 *    fica toda nesse espaço: texto parado nunca aparece apagado.
 * 5. **Leitor de tela lê o texto puro**, num `sr-only`. As letras animadas são
 *    `aria-hidden`. Não anuncia troca: quem precisa disso embrulha num
 *    `aria-live` do lado de fora, onde se sabe se a troca importa.
 *
 * Nunca quebra linha. Mantenha o rótulo curto.
 */

export interface TextMorphProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** O rótulo atual. Trocar a string dispara o morph. */
  children: string;
  /** Elemento renderizado. */
  as?: "span" | "div" | "p" | "strong" | "h1" | "h2" | "h3";
}

const ENTRA = [0.16, 1, 0.3, 1] as const;
const SAI = [0.22, 1, 0.36, 1] as const;
const MOLA = { type: "spring", visualDuration: 0.42, bounce: 0.16 } as const;
// As letras que saem começam a clarear antes da primeira nova ocupar o lugar.
const PASSAGEM = 0.05;

function letras(texto: string) {
  const vistos = new Map<string, number>();
  return Array.from(texto).map((char) => {
    const n = vistos.get(char) ?? 0;
    vistos.set(char, n + 1);
    return { char, key: `${char}-${n}` };
  });
}

const largura = (el: HTMLElement) => parseFloat(getComputedStyle(el).width);

export function TextMorph({ children, as: Tag = "span", className, ...props }: TextMorphProps) {
  const reduzir = !!useReducedMotion();
  const moldura = React.useRef<HTMLSpanElement>(null);
  const trilha = React.useRef<HTMLSpanElement>(null);
  const atual = React.useRef(0);
  const mola = React.useRef<AnimationPlaybackControls | null>(null);
  const glifos = React.useMemo(() => letras(children), [children]);

  const [rotulos, setRotulos] = React.useState({ agora: children, antes: children });
  if (rotulos.agora !== children) setRotulos({ agora: children, antes: rotulos.agora });
  const mantidas = React.useMemo(() => new Set(letras(rotulos.antes).map((g) => g.key)), [rotulos.antes]);
  let chegando = 0;

  React.useLayoutEffect(() => {
    const m = moldura.current;
    const t = trilha.current;
    if (!m || !t) return;
    const proxima = largura(t);
    if (!Number.isFinite(proxima)) return;
    if (atual.current && Math.abs(proxima - atual.current) > 0.5 && !reduzir) {
      mola.current = animate(m, { width: proxima }, MOLA);
    } else {
      mola.current?.stop();
      m.style.width = `${proxima}px`;
    }
    atual.current = proxima;
  }, [children, reduzir]);

  React.useEffect(() => {
    const m = moldura.current;
    const t = trilha.current;
    if (!m || !t || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const proxima = largura(t);
      if (!Number.isFinite(proxima) || Math.abs(proxima - atual.current) < 0.5) return;
      mola.current?.stop();
      m.style.width = `${proxima}px`;
      atual.current = proxima;
    });
    ro.observe(t);
    return () => ro.disconnect();
  }, []);

  return (
    <Tag className={className} {...props}>
      <span className="sr-only">{children}</span>
      <span
        ref={moldura}
        aria-hidden="true"
        style={{ padding: "0.5em 0.5em 0.5em 0.2em", margin: "-0.5em -0.5em -0.5em -0.2em" }}
        className="relative box-content inline-block whitespace-nowrap text-start [mask-image:linear-gradient(90deg,black_calc(100%-0.5em),transparent)]"
      >
        <span ref={trilha} className="relative inline-block whitespace-nowrap">
          <AnimatePresence mode="popLayout" initial={false}>
            {glifos.map(({ char, key }) => {
              const ordem = mantidas.has(key) ? 0 : chegando++;
              return (
                <motion.span
                  key={key}
                  layout="position"
                  className="inline-block origin-[50%_60%] whitespace-pre"
                  initial={reduzir ? false : { opacity: 0, scale: 0.8, y: "0.14em", filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, y: "0em", filter: "blur(0px)" }}
                  exit={
                    reduzir
                      ? { opacity: 0, transition: { duration: 0 } }
                      : { opacity: 0, scale: 0.86, y: "-0.1em", filter: "blur(4px)", transition: { duration: 0.18, ease: SAI } }
                  }
                  transition={
                    reduzir
                      ? { duration: 0 }
                      : { layout: MOLA, default: { duration: 0.28, ease: ENTRA, delay: PASSAGEM + Math.min(ordem, 8) * 0.032 } }
                  }
                >
                  {char === " " ? " " : char}
                </motion.span>
              );
            })}
          </AnimatePresence>
        </span>
      </span>
    </Tag>
  );
}
