"use client";

// Adaptado de Eclipse — https://uiarc.dev/components/theme-switch-eclipse — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).

import * as React from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Theme Switch: a chave de claro e escuro que conta a troca como um eclipse.
 *
 * O ícone de sol que vira lua é a chave mais vista da web, e por isso some na
 * página. Aqui a troca é um gesto só: a lua desliza por cima do sol, cobre o
 * disco e deixa um crescente; a coroa em volta encolhe junto. Voltar ao claro é
 * a lua saindo pelo mesmo caminho. Uma peça, uma direção, nada de dois ícones
 * cruzando opacidade.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **A chave não toca na página.** Ela não escreve em `document`, não põe
 *    classe no `<html>` e não lê `localStorage`. Ela só diz qual é o próximo
 *    tema por `onThemeChange` e entrega o botão que disparou, pra quem quiser
 *    começar uma view transition dali. Quem aplica o tema é o app: cada cliente
 *    guarda a preferência de um jeito, e uma chave que decide isso sozinha briga
 *    com o provedor que já existe.
 * 2. **Controlada ou não.** Com `theme` ela obedece; sem, guarda o próprio
 *    estado a partir de `defaultTheme`. Assim ela funciona solta numa vitrine e
 *    presa ao provedor num produto.
 * 3. **A lua é um disco da cor do botão, não um ícone.** O crescente nasce da
 *    sobreposição, então a lua precisa ter EXATAMENTE o fundo da chave. É por
 *    isso que o hover mexe na borda e nunca no fundo: fundo que muda no hover
 *    descobriria a lua como uma mancha.
 * 4. **O primeiro tema não anima.** Uma página que carrega no escuro não deve
 *    ver o eclipse acontecer sozinho; só troca depois da montagem viaja.
 */

export type Theme = "light" | "dark";

export interface ThemeSwitchProps
  extends Omit<React.ComponentPropsWithoutRef<"button">, "onClick" | "children"> {
  /** Tema atual. Passe para controlar; omita para a chave guardar o próprio estado. */
  theme?: Theme;
  /** Tema inicial quando não controlada. */
  defaultTheme?: Theme;
  /** Chamado no clique com o próximo tema e o botão que disparou. Quem aplica o tema é você. */
  onThemeChange?: (next: Theme, trigger: HTMLButtonElement) => void;
  /** Nome acessível. Por padrão diz para qual tema vai. */
  label?: string;
  /** Só o eclipse, num quadrado. Sem o texto ao lado. */
  iconOnly?: boolean;
}

// Mola que assenta sem quicar: o eclipse é um deslize, não um salto.
const mola: Transition = { type: "spring", visualDuration: 0.3, bounce: 0.12 };
const parado: Transition = { duration: 0 };
const RAIOS = [0, 45, 90, 135, 180, 225, 270, 315];

export function ThemeSwitch({
  theme,
  defaultTheme = "light",
  onThemeChange,
  label,
  iconOnly = false,
  className,
  ...rest
}: ThemeSwitchProps) {
  const [interno, setInterno] = React.useState<Theme>(defaultTheme);
  const atual = theme ?? interno;
  const escuro = atual === "dark";
  const proximo: Theme = escuro ? "light" : "dark";
  const reduce = useReducedMotion() ?? false;

  // Só depois do primeiro quadro as trocas viajam (decisão 4).
  const [montado, setMontado] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const t = reduce || !montado ? parado : mola;

  return (
    <button
      type="button"
      {...rest}
      aria-pressed={escuro}
      aria-label={label ?? (escuro ? "Mudar para o tema claro" : "Mudar para o tema escuro")}
      data-theme={atual}
      onClick={(e) => {
        if (theme === undefined) setInterno(proximo);
        onThemeChange?.(proximo, e.currentTarget);
      }}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 border border-border bg-card text-sm font-medium text-foreground",
        "rounded-[var(--r-control)] outline-none [box-shadow:var(--e-raised)]",
        "transition-[border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
        "hover:border-foreground/30 focus-visible:[box-shadow:var(--focus)]",
        iconOnly ? "size-10" : "h-10 px-3.5",
        className,
      )}
    >
      <span aria-hidden="true" className="relative grid size-5 place-items-center overflow-hidden">
        {/*
          Coroa: oito raios que se recolhem quando o disco é coberto.

          Era um anel em volta do disco, e anel com disco no meio é o desenho
          de um botão de rádio: no estado claro a chave lia como "opção
          marcada", não como sol. Raio é o que diz sol em qualquer tamanho.
        */}
        {RAIOS.map((angulo, i) => (
          <span
            key={angulo}
            className="absolute inset-0 grid place-items-center"
            style={{ transform: `rotate(${angulo}deg)` }}
          >
            <motion.span
              className="block h-[3px] w-[1.5px] -translate-y-[7.5px] rounded-[1px] bg-foreground"
              initial={false}
              animate={escuro ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 1 }}
              transition={reduce || !montado ? parado : { ...mola, delay: escuro ? 0 : 0.03 * i }}
            />
          </span>
        ))}
        {/* Sol: o disco que fica. */}
        <span className="absolute size-[9px] rounded-full bg-foreground" />
        {/* Lua: disco da cor do botão que desliza por cima e deixa o crescente. */}
        <motion.span
          className="absolute rounded-full bg-card"
          initial={false}
          animate={escuro ? { x: 3, y: -3 } : { x: 14, y: -14 }}
          style={{ width: 9, height: 9 }}
          transition={t}
        />
      </span>
      {!iconOnly && <span>{escuro ? "Escuro" : "Claro"}</span>}
    </button>
  );
}

export default ThemeSwitch;
