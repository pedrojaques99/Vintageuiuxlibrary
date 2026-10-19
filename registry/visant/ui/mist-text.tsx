"use client";

import * as React from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Mist Text — o texto que sai da névoa, palavra por palavra (ou letra).
 *
 * Duas leituras do mesmo gesto, num componente só:
 *
 * · `mode="view"` — entra UMA vez quando chega na tela: desfoque + opacidade +
 *   uma subida mínima (0.35em). É o "soft blur in". Não desliza: a frase não vem
 *   de lugar nenhum, ela aparece onde já estava, como coisa que a neblina solta.
 * · `mode="scroll"` — amarrado à rolagem e REVERSÍVEL: rola pra baixo, a frase
 *   clareia; volta, ela some de novo na névoa. Pra frase-manifesto que a pessoa
 *   lê no ritmo do próprio dedo.
 *
 * ── As armadilhas ──────────────────────────────────────────────────────────
 *
 * 1. **`aria-label` em `<p>` e `<span>` não é lido.** O ARIA proíbe nome de
 *    autor em papel genérico e em parágrafo, e leitor de tela ignora — a frase
 *    fatiada viraria vinte palavras soltas ou silêncio. O texto inteiro vai
 *    numa cópia `sr-only`, e as fatias visuais ficam `aria-hidden`. Funciona
 *    igual em `h2` e em `span`, que é o que se quer de uma primitiva.
 * 2. **Letra solta em `inline-block` quebra no meio da palavra.** Com
 *    `by="letter"` cada palavra vira uma caixa `nowrap` com as letras dentro; a
 *    quebra de linha continua entre palavras, como num texto normal.
 * 3. **No modo scroll, a mola não é enfeite.** `useScroll` tenta usar o
 *    ScrollTimeline nativo quando pode, e dentro de um ancestral `sticky` o
 *    navegador calcula a faixa errada — a frase clareava inteira antes de entrar
 *    ou nunca terminava. Passar o progresso por `useSpring` força o caminho JS
 *    (que mede certo) e de quebra tira o degrau da roda do mouse.
 * 4. **A última palavra tem que chegar a 1.** A faixa de cada palavra se
 *    sobrepõe à seguinte (1.5 fatia), e na origem isso estourava o fim: a última
 *    parava em ~70% de opacidade com a rolagem já no fim. As faixas são
 *    normalizadas por `n + 0.5`, então a última termina exatamente em 1.
 * 5. **`prefers-reduced-motion` tira o movimento, não a névoa.** Fica a
 *    opacidade (informação de "isto acabou de chegar"); saem a subida e o
 *    desfoque.
 *
 * Sem cor própria: as fatias herdam `currentColor` do elemento.
 */

// Tokens de motion locais: o consumidor não tem `@/lib/motion`. Espelham
// `--ease-out` e a duração de cena (texto entrando na leitura).
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const DUR_REVEAL = 0.9;
// Cascata curta, com teto: frase de quarenta palavras não pode virar fila.
const STAGGER = { word: 0.035, letter: 0.03, cap: 0.6 } as const;
// Mola do modo scroll: amortecida o bastante pra não ter overshoot de opacidade.
const SCROLL_SPRING = { stiffness: 140, damping: 30, restDelta: 0.0005 } as const;
// Opacidade mínima no modo scroll: a frase ainda se adivinha dentro da névoa.
const SCROLL_FLOOR = 0.12;

type MistTag = "h1" | "h2" | "h3" | "h4" | "p" | "span";

export interface MistTextProps {
  /** A frase. Fatiada por espaço (palavra) ou por caractere (letra). */
  text: string;
  /** Elemento raiz. `span` para usar dentro de outra linha. */
  as?: MistTag;
  /** `word` para frase, `letter` para título curto. */
  by?: "word" | "letter";
  /** `view` entra uma vez; `scroll` acompanha a rolagem, ida e volta. */
  mode?: "view" | "scroll";
  /** Atraso antes da primeira fatia, em segundos. Só no modo `view`. */
  delay?: number;
  className?: string;
}

/** Palavras, e — no modo letra — as letras de cada palavra, com índice global. */
function fatiar(text: string, by: "word" | "letter") {
  const palavras = text.split(" ");
  let n = 0;
  const grupos = palavras.map((p, wi) => {
    const sufixo = wi < palavras.length - 1 ? " " : "";
    // No modo letra o espaço NÃO é fatia: ele fica fora da caixa da palavra,
    // como espaço de verdade, que é onde a linha pode quebrar.
    const partes = by === "word" ? [p + sufixo] : Array.from(p);
    return partes.map((s) => ({ s, i: n++ }));
  });
  return { grupos, total: n };
}

export function MistText({
  text,
  as = "p",
  by = "word",
  mode = "view",
  delay = 0,
  className,
}: MistTextProps) {
  const { grupos, total } = React.useMemo(() => fatiar(text, by), [text, by]);
  const Corpo = mode === "scroll" ? CorpoScroll : CorpoView;
  return (
    <Corpo as={as} by={by} delay={delay} className={className} text={text} grupos={grupos} total={total} />
  );
}

type Grupos = ReturnType<typeof fatiar>["grupos"];

interface CorpoProps {
  as: MistTag;
  by: "word" | "letter";
  delay: number;
  className?: string;
  text: string;
  grupos: Grupos;
  total: number;
}

/**
 * O esqueleto comum aos dois modos: cópia acessível + fatias visuais. No modo
 * letra, a palavra é uma caixa `nowrap` (armadilha 2).
 */
function Fatias({
  by,
  grupos,
  render,
}: {
  by: "word" | "letter";
  grupos: Grupos;
  render: (s: string, i: number) => React.ReactNode;
}) {
  if (by === "word") return <>{grupos.map((g) => g.map(({ s, i }) => render(s, i)))}</>;
  return (
    <>
      {grupos.map((g, gi) => (
        <React.Fragment key={gi}>
          <span className="inline-block whitespace-nowrap">{g.map(({ s, i }) => render(s, i))}</span>
          {gi < grupos.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </>
  );
}

function CorpoView({ as, by, delay, className, text, grupos }: CorpoProps) {
  const reduce = useReducedMotion();
  const Tag = motion[as] as React.ElementType;
  const passo = by === "word" ? STAGGER.word : STAGGER.letter;

  const variants = (i: number) => ({
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: "0.35em", filter: "blur(10px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: DUR_REVEAL, ease: EASE_OUT, delay: delay + Math.min(i * passo, STAGGER.cap) },
    },
  });

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      // Margem negativa: entra quando a frase já está DENTRO da tela, não no
      // primeiro pixel — senão a cascata acontece no rodapé, fora do olho.
      viewport={{ once: true, margin: "-10% 0px" }}
    >
      <span className="sr-only">{text}</span>
      <Fatias
        by={by}
        grupos={grupos}
        render={(s, i) => (
          <motion.span key={i} aria-hidden className="inline-block whitespace-pre" variants={variants(i)}>
            {s}
          </motion.span>
        )}
      />
    </Tag>
  );
}

function CorpoScroll({ as, by, className, text, grupos, total }: CorpoProps) {
  const ref = React.useRef<HTMLElement>(null);
  const Tag = as as React.ElementType;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  // Mola: suaviza a roda e evita o ScrollTimeline nativo, que mede errado
  // dentro de `sticky` (armadilha 3). Não troque por `scrollYProgress` direto.
  const prog = useSpring(scrollYProgress, SCROLL_SPRING);
  const span = total + 0.5; // armadilha 4: a última faixa fecha em 1

  return (
    <Tag ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <Fatias
        by={by}
        grupos={grupos}
        render={(s, i) => (
          <FatiaScroll key={i} prog={prog} ini={i / span} fim={(i + 1.5) / span}>
            {s}
          </FatiaScroll>
        )}
      />
    </Tag>
  );
}

function FatiaScroll({
  prog,
  ini,
  fim,
  children,
}: {
  prog: MotionValue<number>;
  ini: number;
  fim: number;
  children: string;
}) {
  const reduce = useReducedMotion();
  const opacity = useTransform(prog, [ini, fim], [SCROLL_FLOOR, 1]);
  const blur = useTransform(prog, [ini, fim], reduce ? [0, 0] : [8, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return (
    <motion.span aria-hidden className="inline-block whitespace-pre" style={{ opacity, filter }}>
      {children}
    </motion.span>
  );
}
