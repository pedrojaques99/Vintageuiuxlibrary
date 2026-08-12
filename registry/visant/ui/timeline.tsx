"use client";

import * as React from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Timeline — a linha do tempo que avança junto com a página.
 *
 * ── O que estava errado aqui, e não era "estilo" ───────────────────────────
 *
 * Esta peça entrou no registry colada de fora e ninguém passou a régua:
 *
 * · **Copy de outra marca dentro do item.** O componente escrevia, fixo no
 *   corpo, "Changelog from my journey" e "I've been working on Aceternity for
 *   the past 2 years". Quem instalasse recebia o texto de outra pessoa e teria
 *   que editar o arquivo do registry pra tirar. Agora a cabeça é slot: sem
 *   `title` a linha começa direto no primeiro nó, que é o piso honesto.
 * · **Cor crua de paleta.** `bg-white`, `dark:bg-neutral-950`, `text-black`,
 *   `from-purple-500 via-blue-500`. Roxo e azul não são de marca nenhuma —
 *   eram de todas. Agora o trilho é `--border` e o preenchido é `--brand`, então
 *   a mesma linha sai na cor de quem instalou.
 * · **Animar `height`.** O preenchimento crescia por altura, que é layout a cada
 *   quadro. Virou `scaleY` com origem no topo: mesma leitura, no compositor.
 * · **Nó sem estado.** Os doze pontos eram idênticos do começo ao fim, então a
 *   linha não dizia onde a pessoa está. Agora cada nó tem três estados — feito,
 *   agora, a seguir — e eles saem da MESMA fração que preenche o trilho, medida
 *   uma vez por layout. Sem isso o ponto e o traço discordariam na tela.
 * · **`py-20 md:px-10 max-w-7xl` embutido.** A peça impunha a largura e o
 *   respiro da página inteira, então ela só cabia numa página inteira. Dentro de
 *   um painel, de uma coluna ou de um card, saía cortada. Agora o item ocupa o
 *   que o pai der.
 *
 * ── A anatomia ────────────────────────────────────────────────────────────
 *
 * `rótulo (meta) → título → corpo`, com o nó do trilho ao lado servindo de
 * evidência. Sem `meta`, o rótulo vira "Etapa 01" — numerar é melhor que deixar
 * o degrau sem nome, porque é o número que deixa a pessoa dizer "travei na 3".
 *
 * Quem pediu menos movimento recebe a linha inteira preenchida e todos os nós
 * no estado final: o conteúdo é o mesmo, sem percurso.
 */

export interface TimelineEntry {
  title: React.ReactNode;
  content: React.ReactNode;
  /** O rótulo acima do título: data, fase, prazo. Sem isto vira "Etapa 01". */
  meta?: React.ReactNode;
}

export interface TimelineProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  data: TimelineEntry[];
  /** Cabeça opcional. Sem ela a linha começa direto no primeiro nó. */
  title?: React.ReactNode;
  /** Uma frase abaixo do título. Só aparece se `title` existir. */
  description?: React.ReactNode;
  /** O que a linha diz quando `data` chega vazio. */
  emptyLabel?: React.ReactNode;
}

const ESTADO = {
  feito: "feito",
  agora: "agora",
  aseguir: "a seguir",
} as const;

export function Timeline({
  data,
  title,
  description,
  emptyLabel = "Nenhuma etapa por aqui ainda.",
  className,
  ...props
}: TimelineProps) {
  const listaRef = React.useRef<HTMLOListElement>(null);
  const nosRef = React.useRef<(HTMLLIElement | null)[]>([]);
  const semMovimento = useReducedMotion();

  /**
   * A fração de cada etapa dentro da lista — medida, não estimada.
   *
   * Dividir 1 pelo número de etapas seria mais curto e estaria errado sempre que
   * uma etapa tem três linhas e a seguinte tem dez: o ponto acenderia antes ou
   * depois de o traço chegar nele, e a linha passaria a discordar de si mesma.
   * Aqui a fração sai do offset real do nó, então traço e ponto são a mesma
   * medida lida duas vezes.
   */
  const [fracoes, setFracoes] = React.useState<number[]>([]);

  React.useEffect(() => {
    const lista = listaRef.current;
    if (!lista) return;

    const medir = () => {
      const alturaTotal = lista.offsetHeight || 1;
      const topo = lista.getBoundingClientRect().top;
      setFracoes(
        nosRef.current.map((no) =>
          no ? (no.getBoundingClientRect().top - topo) / alturaTotal : 0,
        ),
      );
    };

    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(lista);
    return () => ro.disconnect();
  }, [data]);

  /*
   * `end 60%`, e não `end 50%`: o traço precisa terminar de encher ANTES de a
   * última etapa sair pela borda de cima, senão a linha nunca é vista completa
   * — a pessoa rola, o traço ainda está a 80% e o conteúdo já acabou.
   */
  const { scrollYProgress } = useScroll({
    target: listaRef,
    offset: ["start 85%", "end 60%"],
  });

  // `scaleY` e não `height`: altura é layout a cada quadro, escala é compositor.
  const escala = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const opacidade = useTransform(scrollYProgress, [0, 0.06], [0, 1]);

  const [alcancados, setAlcancados] = React.useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setAlcancados(fracoes.filter((f) => f <= p).length);
  });

  const total = semMovimento ? data.length : alcancados;

  if (!data.length) {
    return (
      <section
        className={cn(
          "rounded-[var(--r-surface,0.875rem)] border border-dashed border-border px-5 py-8 text-center",
          className,
        )}
        {...props}
      >
        <p className="text-[length:var(--text-apoio,0.75rem)] text-muted-foreground">
          {emptyLabel}
        </p>
      </section>
    );
  }

  return (
    <section className={cn("min-w-0", className)} {...props}>
      {title && (
        <header className="mb-6 min-w-0">
          <h2 className="text-[length:var(--text-titulo,1.1875rem)] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1.5 max-w-prose text-[length:var(--text-apoio,0.75rem)] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </header>
      )}

      {/*
       * O trilho é irmão do `<ol>`, não filho.
       *
       * `<ol>` só aceita `<li>` (mais `<script>`/`<template>`): um `<div>` solto
       * lá dentro é HTML inválido e entra na contagem que o leitor de tela
       * anuncia — "lista de 4 itens" numa linha do tempo de 3 etapas. Como o
       * `<ol>` é o único filho em fluxo deste `div`, o `inset-y-0` do trilho dá
       * exatamente a altura da lista, que era o motivo de ele estar lá dentro.
       */}
      <div className="relative min-w-0">
        {/*
         * O trilho vai de ponta a ponta da LISTA, por `inset-y-0` — não por uma
         * altura medida em JS e escrita em `style`. Era assim antes, e o número
         * ficava velho toda vez que uma etapa mudava de altura (fonte que troca,
         * texto que reflui no celular), deixando o traço curto ou sobrando por
         * baixo do último nó.
         */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-[3px] top-0 w-px bg-border"
        >
          <motion.div
            className="absolute inset-x-0 top-0 h-full origin-top"
            style={{
              scaleY: semMovimento ? 1 : escala,
              opacity: semMovimento ? 1 : opacidade,
              background: "var(--brand, var(--foreground))",
            }}
          />
        </div>

        <ol ref={listaRef} className="min-w-0 list-none pl-8">
        {data.map((item, i) => {
          const estado =
            i < total - 1 ? ESTADO.feito
            : i === total - 1 ? ESTADO.agora
            : ESTADO.aseguir;
          const aceso = estado !== ESTADO.aseguir;

          return (
            <li
              key={i}
              ref={(el) => {
                nosRef.current[i] = el;
              }}
              className={cn("relative min-w-0", i > 0 && "mt-8")}
            >
              {/*
               * O nó carrega o estado, e ele muda por `background` e `box-shadow`
               * — nunca por tamanho. Ponto que cresce ao acender empurra o texto
               * ao lado meio pixel e a coluna inteira treme na rolagem.
               */}
              <span
                aria-hidden="true"
                /*
                 * `-left-8` = -2rem = -32px, que é exatamente o `pl-8` da lista:
                 * o nó começa na borda esquerda do `<ol>`, ocupa 0..7px, e seu
                 * centro cai em 3,5px — o mesmo centro do trilho, que mora em
                 * `left-[3px]` com 1px de largura. Estava em `-1.75rem` e o nó
                 * saía 4px à direita da linha, encostado nela em vez de
                 * enfiado nela. Se mexer no `pl-` da lista, mexa aqui junto.
                 */
                className={cn(
                  "absolute -left-8 top-[0.3rem] block size-[7px] rounded-full",
                  "transition-[background-color,box-shadow]",
                  "[transition-duration:var(--dur-base,200ms)]",
                  "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
                )}
                style={{
                  background: aceso
                    ? "var(--brand, var(--foreground))"
                    : "var(--background)",
                  boxShadow: aceso
                    ? estado === ESTADO.agora
                      ? "0 0 0 4px color-mix(in oklch, var(--brand, var(--foreground)) 18%, transparent)"
                      : "none"
                    : "inset 0 0 0 1px var(--border)",
                }}
              />

              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-mono text-[length:var(--text-micro,0.625rem)] uppercase tracking-[0.14em] text-muted-foreground">
                  {item.meta ?? `Etapa ${String(i + 1).padStart(2, "0")}`}
                </span>
                {/*
                 * O qualificador só aparece no degrau em que a pessoa está. Nos
                 * outros ele seria ruído repetido N vezes — e "feito" em doze
                 * linhas seguidas para de significar feito.
                 */}
                {estado === ESTADO.agora && (
                  <span
                    className="font-mono text-[length:var(--text-micro,0.625rem)] uppercase tracking-[0.14em]"
                    style={{ color: "var(--brand, var(--foreground))" }}
                  >
                    · {ESTADO.agora}
                  </span>
                )}
              </div>

              <h3
                className={cn(
                  "mt-0.5 text-[length:var(--text-destaque,0.9375rem)] font-semibold tracking-tight",
                  aceso ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.title}
              </h3>

              <div className="mt-1.5 min-w-0">{item.content}</div>
            </li>
          );
        })}
        </ol>
      </div>
    </section>
  );
}
