"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fold Motion — hierarquia de entradas, em vez de trinta entradas iguais.
 *
 * ── O diagnóstico que gerou o item ─────────────────────────────────────────
 *
 * As ~30 dobras do `visantismo` tinham TODAS a mesma entrada: `translateY(14px)`
 * em 0.7s. Trinta entradas idênticas não são trinta entradas, são papel de
 * parede — ninguém percebe a segunda. O SSoT de motion já estava disciplinado
 * (zero `cubic-bezier` solto, zero duração local); o que faltava era
 * **hierarquia**.
 *
 * O contrato: cada dobra declara um `variant` e ganha UM movimento próprio.
 * Dobra sem variant fica no genérico, e isso é deliberado — as dobras de
 * respiro têm que ser silenciosas pras dobras de argumento serem ouvidas.
 *
 * | variant | o que faz | pra quando |
 * |---|---|---|
 * | `rise` | sobe 14px (o genérico) | dobra de respiro |
 * | `drift-l` / `drift-r` | entra deslizando, alternando o lado | sequências longas de dobras parecidas |
 * | `mask` | o título é revelado por trás de uma borda (`clip-path`) | quando o argumento é a FRASE |
 * | `settle` | assenta de `scale(1.03)` em vez de subir | dobra de NÚMERO: dado, não espetáculo |
 * | `climax` | sobe menos e demora mais | a dobra que pede dinheiro não deve parecer apressada |
 * | `invert` | o fundo troca de cor ao entrar | uma vez por página, no argumento central |
 * | `mist` | sai da névoa: desfoque + opacidade + subida mínima, nunca desliza | marca contemplativa, foto, atmosfera |
 *
 * ── A armadilha que este item conserta em relação à origem ─────────────────
 *
 * No original, o esconderijo era uma classe `.js` no `<html>` escrita por um
 * script no `<head>`: com JS ligado mas o script de reveal falhando, as trinta
 * dobras ficavam em `opacity: 0` — a página inteira sumia da primeira dobra pra
 * baixo, CTA inclusive. Ficou registrado como pendência aberta na origem.
 *
 * Aqui o esconderijo é aplicado **pelo próprio componente**, num
 * `useLayoutEffect`, e só depois de confirmar que o `IntersectionObserver`
 * existe. Não montou, não observou, não escondeu: o estado de repouso é o
 * conteúdo completo e legível, nunca uma tela em branco.
 *
 * `prefers-reduced-motion` é tratado no CSS **por dobra**, e não pelo guard
 * global com `*`. O guard zera duração e delay mas NÃO desfaz um estado inicial
 * escondido — uma dobra em `opacity: 0` continuaria invisível para sempre. Cada
 * variante nasce no estado final. Zera o movimento, nunca o resultado.
 *
 * `mist` segue a mesma regra e é a mais cuidadosa com ela: sob movimento
 * reduzido ela perde o desfoque e a subida, e NÃO perde a opacidade final —
 * desfoque é movimento para o olho (o foco "anda"), opacidade é informação.
 * O estado final é `filter: none`, não `blur(0)`: `blur(0)` ainda mantém a
 * dobra numa camada de filtro, e numa dobra com foto grande isso é custo de
 * composição pago a cada quadro de rolagem, para sempre, por um efeito que já
 * acabou.
 *
 * A entrada é **uma vez só**, não um efeito de ida e volta: o observer desiste
 * do alvo assim que ele entra.
 */

export type FoldVariant =
  | "rise"
  | "drift-l"
  | "drift-r"
  | "mask"
  | "settle"
  | "climax"
  | "invert"
  | "mist";

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export interface FoldProps extends React.HTMLAttributes<HTMLElement> {
  variant?: FoldVariant;
  /** Quanto da dobra precisa estar em tela pra ela entrar. */
  threshold?: number;
  as?: "section" | "div" | "article" | "aside";
  children?: React.ReactNode;
}

export function Fold({
  variant = "rise",
  threshold = 0.12,
  as: Tag = "section",
  className,
  children,
  ...props
}: FoldProps) {
  const ref = React.useRef<HTMLElement>(null);
  const [armado, setArmado] = React.useState(false);
  const [dentro, setDentro] = React.useState(false);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    // Sem observer não há animação a fazer, e conteúdo escondido pra sempre é
    // muito pior que conteúdo sem animação.
    if (!el || !("IntersectionObserver" in window)) return;
    setArmado(true);

    const io = new IntersectionObserver(
      (es) => {
        if (!es[0].isIntersecting) return;
        io.disconnect(); // entrada é uma vez só
        setDentro(true);
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-fold={variant}
      data-armed={armado ? "" : undefined}
      data-in={dentro ? "" : undefined}
      className={cn("visant-fold", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * O filho que a variante move, quando não é a dobra inteira.
 *
 * `settle` move os cartões de número, `drift-*` move o contêiner de conteúdo —
 * e nos dois casos mover a `<section>` seria errado: ela tem a largura da
 * viewport, então `translateX(-22px)` nela põe a borda esquerda em -22 e cria
 * estouro horizontal real. (Medido: -22px numa dobra antes de entrar. O
 * `overflow-x: hidden` do body mascarava o estouro sem resolver.) O
 * deslocamento vai no filho, e a dobra recorta com `overflow-x: clip` — `clip`
 * e não `hidden`, porque `hidden` criaria um contêiner de rolagem.
 */
export function FoldPart({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-fold-part="" className={className} {...props}>
      {children}
    </div>
  );
}
