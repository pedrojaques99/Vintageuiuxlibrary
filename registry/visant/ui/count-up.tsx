"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Count Up — o número que se apura em vez de aparecer pronto.
 *
 * Numa dobra de prova, o único elemento que AFIRMA um valor costuma ser o único
 * que não mostra o valor sendo apurado. A contagem é o gesto que falta. E ela é
 * de marketing (uma vez por sessão, na rolagem), não de controle respondendo a
 * clique — por isso pode passar dos 300 ms sem contrariar o motion da casa.
 *
 * ── O contrato, na ordem das armadilhas que ele evita ──────────────────────
 *
 * 1. **O texto final é a fonte.** O componente recebe a string pronta como
 *    `children` (`"R$450k"`, `"1.200"`, `"83%"`), extrai o número dela e
 *    reescreve exatamente a mesma string. Não existe `data-to` duplicando a
 *    copy: um número e a sua formatação são a mesma decisão editorial, e
 *    separá-los cria duas fontes pra mesma frase.
 * 2. **O que não dá pra parsear simplesmente não anima.** `"—"`, `"Em breve"`,
 *    `"0"` passam intactos. `null` aqui significa "deixa quieto", nunca
 *    "esvazia" — um contador que zera um traço é pior que contador nenhum.
 * 3. **`prefers-reduced-motion` sai fora inteiro.** Contagem é movimento puro,
 *    e o dado continua lá.
 * 4. **A largura é travada antes da primeira troca de texto.** Sem isso,
 *    `0 → 450` empurra o rótulo e a célula vizinha a cada quadro. A trava é
 *    medida com o valor final ainda na tela: é a única janela em que a medida é
 *    a do número cheio.
 * 5. **Sem JS, sem observer, sem hidratação: o número já está no HTML.** O
 *    componente só pode TIRAR o valor de vista depois de garantir que devolve.
 *
 * O locale entra por prop porque agrupamento de milhar é decisão de mercado, e
 * o registry serve cliente em mais de um.
 */

type Partes = {
  pre: string;
  pos: string;
  val: number;
  dec: number;
  agrupado: boolean;
};

/** `"R$450k"` → pre `"R$"`, 450, pos `"k"`. `"1.200"` → 1200 agrupado. */
function analisar(texto: string, decimal: string, milhar: string): Partes | null {
  const m = /^([^\d]*)(\d[\d.,\s]*?)([^\d]*)$/.exec(texto.trim());
  if (!m) return null;
  const cru = m[2];
  const iDec = cru.lastIndexOf(decimal);
  const dec = iDec >= 0 ? cru.length - iDec - 1 : 0;
  const normal = cru.split(milhar).join("").replace(decimal, ".");
  const val = parseFloat(normal);
  if (!isFinite(val) || val <= 0) return null;
  return { pre: m[1], pos: m[3], val, dec, agrupado: cru.includes(milhar) };
}

// easeOutQuint — o parente em JS do `--ease-out` da casa: chega rápido e assenta.
const ease = (t: number) => 1 - Math.pow(1 - t, 5);

export interface CountUpProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** O valor FINAL, já formatado. É ele que a contagem devolve no último quadro. */
  children: string;
  /** ms. Default 900 — fecha logo depois de uma entrada de dobra de 0.7s. */
  duration?: number;
  /** Atraso, pra escalonar uma fileira de números. */
  delay?: number;
  locale?: string;
  /** Separadores da string de ENTRADA. Default pt-BR. */
  decimalSep?: string;
  thousandSep?: string;
}

export function CountUp({
  children,
  duration = 900,
  delay = 0,
  locale = "pt-BR",
  decimalSep = ",",
  thousandSep = ".",
  className,
  ...props
}: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const partes = React.useMemo(
    () => analisar(children, decimalSep, thousandSep),
    [children, decimalSep, thousandSep],
  );

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !partes) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const formatar = (n: number) => {
      const corpo = partes.agrupado
        ? n.toLocaleString(locale, {
            minimumFractionDigits: partes.dec,
            maximumFractionDigits: partes.dec,
          })
        : n.toFixed(partes.dec);
      return partes.pre + corpo + partes.pos;
    };

    /*
     * Trava a largura AGORA, com o valor final ainda desenhado — mas a largura
     * do TEXTO, não a da caixa.
     *
     * `getBoundingClientRect()` do elemento responde a largura do bloco, e num
     * `display: block` isso é a coluna inteira. O número "1.291" numa coluna de
     * 443px gravava `min-width: 443px` no estilo inline: a partir daí a peça
     * tinha um piso de largura que não encolhia nunca. Numa página que muda de
     * largura, o resultado é a coluna empurrando a página de lado no celular —
     * defeito que só aparece DEPOIS de o layout mudar, então passa por todo
     * teste que carrega a página já no tamanho final.
     *
     * Um `Range` sobre o conteúdo mede a tinta, que é o que a reserva quer:
     * impedir o salto enquanto os dígitos trocam. E `max-width: 100%` fecha a
     * porta de vez — reserva nenhuma pode valer mais que o espaço que existe.
     */
    const range = document.createRange();
    range.selectNodeContents(el);
    const tinta = range.getBoundingClientRect().width;
    range.detach?.();
    el.style.minWidth = `${Math.ceil(tinta || el.getBoundingClientRect().width)}px`;
    el.style.maxWidth = "100%";

    let raf = 0;
    let timer = 0;
    const io = new IntersectionObserver(
      (es) => {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        let inicio: number | null = null;
        const passo = (now: number) => {
          if (inicio === null) inicio = now;
          const t = Math.min(1, (now - inicio) / duration);
          el.textContent = formatar(t === 1 ? partes.val : partes.val * ease(t));
          if (t < 1) raf = requestAnimationFrame(passo);
        };
        timer = window.setTimeout(() => {
          raf = requestAnimationFrame(passo);
        }, delay);
      },
      { threshold: 0.6 },
    );

    el.textContent = formatar(0); // só depois do observer existir
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      el.textContent = children; // desmontar nunca deixa um zero na tela
    };
  }, [partes, duration, delay, locale, children]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)} {...props}>
      {children}
    </span>
  );
}
