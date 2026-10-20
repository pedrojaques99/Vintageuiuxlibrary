"use client";

/* Adaptado de Slot Text — https://uiarc.dev/components/slot-text — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui). */

import * as React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  usePresence,
  useReducedMotion,
  useTransform,
  useVelocity,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Slot Text — o valor que gira como rolo de caça-níquel até assentar.
 *
 * Pra troca que merece uma batida: preço mudando de plano, número trocando de
 * período, status de lançamento virando. Cada caractere é um rolo. Dígito gira
 * pela roda na direção em que o número andou; letra embaralha pelo alfabeto; os
 * rolos param um depois do outro, da esquerda pra direita, sem passar do alvo.
 *
 * ── O que não é óbvio ──────────────────────────────────────────────────────
 *
 * 1. **Número casa os rolos pelo fim.** De 999 pra 1.000 só os dígitos giram:
 *    o separador fica no lugar e o rolo novo nasce à esquerda. Símbolo na
 *    frente (R$, +) ganha rolo próprio e nunca vira dígito.
 * 2. **Trocar no meio do giro recomeça de onde o rolo está**, guardando o
 *    deslocamento de fração de célula. Nada pula.
 * 3. **O desfoque segue a velocidade do rolo**, então o giro rápido borra e o
 *    pouso é nítido. Parado, o filtro sai inteiro (custo zero).
 * 4. **A largura do rolo vai até o caractere novo numa mola sem rebote**:
 *    a palavra nunca muda de tamanho num quadro.
 * 5. **O embaralhado é determinístico.** A mesma troca gira as mesmas letras,
 *    então servidor e cliente desenham igual.
 * 6. **O valor inteiro é texto de verdade** num `sr-only`; os rolos são
 *    `aria-hidden`. `announce` liga um `aria-live` pra valor que muda sozinho.
 *
 * A duração passa dos 300 ms da casa de propósito: isso é um momento, não
 * resposta a gesto. Pra valor que muda a cada segundo, use `spins={0}`.
 * Com `prefers-reduced-motion` o valor troca seco.
 */

export interface SlotTextProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** O valor. Número passa por `format`; texto entra como está. */
  value: string | number;
  /** Formata número. Default: agrupamento pt-BR (12.480). */
  format?: (value: number) => string;
  /** Segundos que o primeiro rolo gira. */
  duration?: number;
  /** Segundos entre um rolo parar e o próximo. */
  stagger?: number;
  /** Voltas inteiras antes de pousar. 0 rola direto pro dígito novo. */
  spins?: number;
  /** De que ponta os rolos casam quando o tamanho muda. Número: fim; texto: começo. */
  align?: "start" | "end";
  /** Anuncia o valor novo ao leitor de tela, com educação. */
  announce?: boolean;
}

const DIGITOS = "0123456789";
const MINUSC = "abcdefghijklmnopqrstuvwxyz";
const MAIUSC = MINUSC.toUpperCase();
// Sai rápido, pousa longo e macio, nunca passa do alvo.
const POUSO = [0.12, 0.8, 0.16, 1] as const;
// Altura de cada célula, em em. A célula é mais alta que a linha pra que os
// vizinhos de um caractere pousado fiquem inteiros fora da janela.
const CELULA = 1.6;

const nada = () => () => {};
function useReduzir() {
  const hidratado = React.useSyncExternalStore(nada, () => true, () => false);
  return !!useReducedMotion() && hidratado;
}

const classe = (c: string) =>
  DIGITOS.includes(c) ? DIGITOS : MINUSC.includes(c) ? MINUSC : MAIUSC.includes(c) ? MAIUSC : null;

function sorteio(semente: number) {
  let s = semente >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** As células do rolo, do que está visível agora até o alvo. */
function fita(de: string, para: string, voltas: number, subindo: boolean, semente: number) {
  if (de === para) return [para];
  const conj = classe(para);
  if (!conj) return [de, para];
  if (conj === DIGITOS && classe(de) === DIGITOS) {
    const a = Number(de);
    const b = Number(para);
    const passos = voltas * 10 + (subindo ? (b - a + 10) % 10 : (a - b + 10) % 10);
    return Array.from({ length: passos + 1 }, (_, i) => String((a + (subindo ? i : -i) + 100) % 10));
  }
  const r = sorteio(semente);
  const meio = Array.from({ length: Math.max(2, voltas * 5 + 2) }, () => conj[Math.floor(r() * conj.length)]!);
  return [de, ...meio, para];
}

const visivel = (c: string) => (c === " " ? " " : c);

interface RoloProps {
  char: string;
  ordem: number;
  entrando: boolean;
  subindo: boolean;
  duration: number;
  stagger: number;
  spins: number;
  reduzir: boolean;
}

function Rolo({ char, ordem, entrando, subindo, duration, stagger, spins, reduzir }: RoloProps) {
  const pos = useMotionValue(0);
  const larg = useMotionValue<number | "auto">("auto");
  const medidor = React.useRef<HTMLSpanElement>(null);
  const [presente, liberar] = usePresence();
  const [rolo, setRolo] = React.useState(() => ({
    char,
    fita: entrando && !reduzir ? fita("", char, spins, subindo, char.charCodeAt(0) + ordem) : [char],
    de: 0,
    cresce: entrando,
    tempo: duration + ordem * stagger,
  }));

  if (rolo.char !== char) {
    const agora = pos.get();
    const i = Math.max(0, Math.min(rolo.fita.length - 1, Math.round(agora)));
    const naTela = rolo.fita[i]!;
    setRolo({
      char,
      fita: reduzir
        ? [char]
        : fita(naTela, char, spins, subindo, char.charCodeAt(0) * 31 + naTela.charCodeAt(0) * 7 + ordem + rolo.fita.length),
      de: reduzir ? 0 : agora - i,
      cresce: false,
      tempo: duration + ordem * stagger,
    });
  }

  const blur = useTransform(useVelocity(pos), (v) => {
    const q = Math.min(Math.abs(v) * 0.05, 2.4);
    return q < 0.15 ? "none" : `blur(${q.toFixed(2)}px)`;
  });
  const y = useTransform(pos, (v) => `translate3d(0, ${(-v * CELULA).toFixed(4)}em, 0)`);

  React.useLayoutEffect(() => {
    const medida = medidor.current?.getBoundingClientRect().width ?? 0;
    const ultima = rolo.fita.length - 1;
    if (reduzir) {
      pos.jump(ultima);
      larg.jump(medida);
      return;
    }
    pos.jump(rolo.de);
    const giro = animate(pos, ultima, { duration: ultima === 0 ? 0.2 : rolo.tempo, ease: [...POUSO] });
    if (rolo.cresce) larg.jump(0);
    if (larg.get() === "auto") {
      larg.jump(medida);
      return () => giro.stop();
    }
    const cresce = animate(larg, medida, { type: "spring", visualDuration: Math.min(rolo.tempo, 0.6), bounce: 0 });
    return () => {
      giro.stop();
      cresce.stop();
    };
  }, [rolo, pos, larg, reduzir]);

  // Rolo que sai fecha a largura até zero antes de ser removido.
  React.useLayoutEffect(() => {
    if (presente) return;
    if (reduzir) {
      liberar();
      return;
    }
    const sai = animate(larg, 0, { type: "spring", visualDuration: 0.35, bounce: 0, onComplete: liberar });
    return () => sai.stop();
  }, [presente, liberar, larg, reduzir]);

  return (
    <motion.span className="relative inline-block h-[1.15em] flex-none" style={{ width: larg }}>
      <span ref={medidor} className="invisible inline-block whitespace-pre">
        {visivel(char)}
      </span>
      {/* A janela passa um pouco da linha pra o caractere esmaecer na borda em vez de ser cortado. */}
      <span className="absolute -inset-x-[0.08em] -inset-y-[0.22em] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_0.24em,black_calc(100%-0.24em),transparent)]">
        <motion.span
          className="absolute inset-x-[0.08em] top-[-0.005em] flex flex-col items-center will-change-transform"
          style={{ transform: y, filter: blur }}
        >
          {rolo.fita.map((c, i) => (
            <span key={i} className="box-border block h-[1.6em] whitespace-pre pt-[0.225em] leading-[1.15]">
              {visivel(c)}
            </span>
          ))}
        </motion.span>
      </span>
    </motion.span>
  );
}

const ptBR = (n: number) => n.toLocaleString("pt-BR");

export function SlotText({
  value,
  format = ptBR,
  duration = 0.9,
  stagger = 0.07,
  spins = 1,
  align,
  announce = false,
  className,
  ...props
}: SlotTextProps) {
  const reduzir = useReduzir();
  const texto = typeof value === "number" ? format(value) : value;
  const peloFim = (align ?? (typeof value === "number" ? "end" : "start")) === "end";
  const chars = Array.from(texto);
  // Uma sequência de símbolos na frente casa pelo começo; o resto casa pela ponta alinhada.
  const lead = peloFim ? chars.findIndex((c) => /[\p{L}\p{N}]/u.test(c)) : 0;
  const prefixo = lead < 0 ? chars.length : lead;
  const chave = (i: number) => (i < prefixo ? `p${i}` : peloFim ? `e${chars.length - 1 - i}` : `s${i}`);
  const [iniciais] = React.useState(() => new Set(chars.map((_, i) => chave(i))));
  const [rumo, setRumo] = React.useState({ value, subindo: true });
  if (rumo.value !== value) {
    setRumo({ value, subindo: typeof value === "number" && typeof rumo.value === "number" ? value >= rumo.value : true });
  }

  return (
    <span
      className={cn("relative inline-block whitespace-nowrap align-bottom leading-[1.15] tabular-nums", className)}
      {...props}
    >
      <span className="sr-only" aria-live={announce ? "polite" : undefined}>
        {texto}
      </span>
      <span className="inline-flex h-[1.15em] items-start" aria-hidden="true">
        <AnimatePresence initial={false}>
          {chars.map((c, i) => (
            <Rolo
              key={chave(i)}
              char={c}
              ordem={i}
              entrando={!iniciais.has(chave(i))}
              subindo={rumo.subindo}
              duration={duration}
              stagger={stagger}
              spins={spins}
              reduzir={reduzir}
            />
          ))}
        </AnimatePresence>
      </span>
    </span>
  );
}
