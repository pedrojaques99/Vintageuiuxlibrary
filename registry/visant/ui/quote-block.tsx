import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * QuoteBlock — UM depoimento, do tamanho que ele merece.
 *
 * ── Por que existe, tendo `@visant/testimonial-wall` ao lado ────────────────
 *
 * A parede é prova por VOLUME: doze vozes pequenas, cada citação em 14px, e o
 * argumento é "muita gente disse". Ela resolve bem o problema dela e resolve
 * péssimo o oposto — a dobra em que a página para e mostra UMA frase, de um
 * cliente que a pessoa reconhece. Ali o argumento é PESO, e peso é tipografia:
 * a citação precisa ser lida antes da foto, em corpo de manchete, com o nome e
 * o cargo entrando depois como assinatura.
 *
 * Tentar isso com o `QuoteItem` da parede sai errado por construção: lá o card
 * é uma coluna de malha com `break-inside-avoid`, o avatar é 36px e a citação
 * mora em `opacity-80` embaixo do nome. Esticar aquilo produz um card gigante,
 * não um depoimento de capa. Por isso é peça nova e não variante — o que muda
 * é a ORDEM (citação primeiro, atribuição depois) e a hierarquia inteira.
 *
 * O que foi reaproveitado de lá, de propósito, para as duas parecerem irmãs:
 * a tabela `TONE` com os mesmos três tons, a mesma semântica
 * `figure`/`blockquote`/`figcaption`, e o mesmo `object-cover` no slot de mídia.
 *
 * ── As decisões que custam caro quando se erra ──────────────────────────────
 *
 * 1. **A aspa é desenhada, não é caractere.** Um `“` de fonte muda de forma, de
 *    peso e de altura a cada família de marca — e some quando a webfont não
 *    carrega, deixando um buraco no canto do bloco. O SVG daqui é o mesmo em
 *    qualquer marca e pinta com `--brand`, então ele É o pedaço de cor da peça.
 * 2. **A citação não leva `opacity`.** Desbotar a frase principal é o erro mais
 *    comum nesta dobra: o texto que a página inteira existe pra mostrar sai
 *    lavado, e o cargo do autor fica com mais contraste que o argumento. Quem
 *    desbota aqui é a atribuição, que é metadado.
 * 3. **A quebra é do CONTAINER, não da janela.** Sem `sm:`/`lg:` nenhum: o
 *    retrato tem largura declarada e a coluna de texto tem base mínima, então o
 *    `flex-wrap` empilha quando o CONTAINER aperta. É a mesma lição que a parede
 *    aprendeu com `column-width` — bloco de página não sabe onde vai ser montado,
 *    e media query de viewport mente dentro de uma coluna de 700px.
 * 4. **`cite` é do `<blockquote>`, o nome é do `<figcaption>`.** O HTML é
 *    explícito: pôr o autor dentro do `blockquote` faz o leitor de tela anunciar
 *    o nome como parte da fala. A atribuição fica fora, e o `cite` carrega a URL
 *    da fonte quando ela existe.
 * 5. **Sem estrelinha.** Nota de 5 é linguagem de agregador de review e mora na
 *    parede, onde há doze delas pra comparar. Numa citação única a estrela não
 *    acrescenta prova — encolhe o depoimento pra tamanho de e-commerce.
 */

type Tone = "card" | "muted" | "brand";

/** Mesmos três tons da parede: quem instala as duas vê o mesmo sistema. */
const TONE: Record<Tone, string> = {
  card: "bg-[var(--card,var(--background))] border border-[var(--border)]",
  muted: "bg-[var(--muted)] text-[var(--foreground)]",
  brand: "bg-[var(--brand)] text-[var(--brand-foreground)]",
};

export interface QuoteBlockProps
  // `role` sai do HTML porque aqui ele é o CARGO de quem falou — a mesma
  // colisão que o `rail` documenta em `heading` vs `title`. `cite` sai porque a
  // URL da fonte tem nome próprio (`source`) e vai no `<blockquote>`, não na raiz.
  extends Omit<React.HTMLAttributes<HTMLElement>, "cite" | "role"> {
  /** A fala. Curta: acima de ~40 palavras isto deixa de ser capa e vira parede. */
  quote: React.ReactNode;
  author: React.ReactNode;
  /** Cargo. Junto com `company` vira a linha "Cargo, Empresa". */
  role?: React.ReactNode;
  company?: React.ReactNode;
  /** O retrato, por slot: `<img>`, `next/image`, o que o projeto usar. */
  portrait?: React.ReactNode;
  /** Marca do cliente. Em B2B, o logo prova mais que o rosto — os dois cabem. */
  logo?: React.ReactNode;
  /** URL da fonte da citação (case, post, entrevista). Vai no `cite` do HTML. */
  source?: string;
  tone?: Tone;
  /** Sem moldura: o depoimento solto na página, sem caixa e sem respiro próprio. */
  bare?: boolean;
  /** Largura do retrato, em rem. É ela que decide quando a peça empilha. */
  portraitWidth?: number;
  /** Proporção do retrato, formato CSS. */
  ratio?: string;
  /** Retrato à direita. A citação continua vindo antes no DOM — e na leitura. */
  flip?: boolean;
}

export function QuoteBlock({
  quote,
  author,
  role,
  company,
  portrait,
  logo,
  source,
  tone = "card",
  bare = false,
  portraitWidth = 13,
  ratio = "4/5",
  flip = false,
  className,
  children,
  ...props
}: QuoteBlockProps) {
  return (
    <figure
      data-tone={bare ? undefined : tone}
      className={cn(
        "flex flex-wrap items-start gap-7",
        !bare && [
          "overflow-hidden rounded-[var(--r-surface,1rem)]",
          "p-[var(--pad-card,1.5rem)] sm:p-8",
          TONE[tone],
        ],
        className,
      )}
      {...props}
    >
      {portrait ? (
        <div
          className={cn(
            "shrink-0 overflow-hidden rounded-[var(--r-surface,1rem)] bg-[var(--muted)]",
            // Duas alturas de regra, igual ao `photo-frame`: o filho direto ganha
            // tamanho e o `img`/`video` em qualquer profundidade ganha o recorte.
            // `next/image` e `<picture>` embrulham a foto, e sem a segunda regra
            // o `object-cover` cai no invólucro e a imagem sai esticada.
            "[&>*]:size-full [&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover",
            // `order` e não `flex-row-reverse`: a ordem do DOM (fala primeiro)
            // é a ordem de leitura, e ela não deve mudar com a decoração.
            flip && "order-1",
          )}
          style={{ width: `${portraitWidth}rem`, aspectRatio: ratio }}
        >
          {portrait}
        </div>
      ) : null}

      {/*
       * `basis` mínima de 18rem: é ela que dispara o `flex-wrap`. Quando o
       * container não comporta retrato + 18rem de texto, a coluna quebra pra
       * linha de baixo e ocupa a largura inteira — empilhamento por medida real
       * do container, sem uma media query no arquivo.
       */}
      <div className="flex min-w-0 flex-1 basis-[18rem] flex-col gap-6">
        <blockquote cite={source} className="flex flex-col gap-4">
          <QuoteMark />
          {/*
           * O peso da peça mora nesta linha. `text-balance` porque a citação é
           * curta e quer linhas de comprimento parecido; `1.18` de entrelinha
           * porque em corpo grande a entrelinha padrão abre buraco entre as
           * linhas e a frase deixa de ser um bloco.
           */}
          <p
            className={cn(
              "text-balance [font-family:var(--font-display,inherit)]",
              "text-[clamp(1.375rem,1.05rem+1.35vw,2.125rem)] font-medium leading-[1.18] tracking-[-0.02em]",
            )}
          >
            {quote}
          </p>
        </blockquote>

        {children}

        <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="min-w-0">
            <span className="block text-[length:var(--text-destaque,0.9375rem)] font-semibold leading-tight">
              {author}
            </span>
            {role || company ? (
              // A única `opacity` da peça, e ela é aqui: metadado cede contraste
              // pra fala. Ver a decisão 2 no cabeçalho.
              <span className="block text-[length:var(--text-apoio,0.8125rem)] leading-[1.45] opacity-70">
                {role}
                {role && company ? ", " : null}
                {company}
              </span>
            ) : null}
          </span>

          {logo ? (
            // `ml-auto` empurra o logo pra ponta oposta do nome; `max-h` normaliza
            // a altura, porque logo de cliente chega em qualquer tamanho — é o
            // mesmo problema que o `@visant/logo-wall` resolve na faixa inteira.
            <span
              aria-hidden="true"
              className={cn(
                "ml-auto shrink-0 opacity-60",
                "[&_img]:h-[1.75rem] [&_img]:w-auto [&_svg]:h-[1.75rem] [&_svg]:w-auto",
              )}
            >
              {logo}
            </span>
          ) : null}
        </figcaption>
      </div>
    </figure>
  );
}

/**
 * A aspa de abertura, desenhada.
 *
 * A cor é `--brand`, e ela é o único pedaço de cor da peça — mas sobre o tom
 * `brand` a superfície JÁ é a cor da marca, e uma aspa da mesma cor
 * desapareceria no fundo. O negativo é resolvido por seletor de atributo, como
 * no `@visant/cta-surface`: quem decide não é uma prop repassada, é o tom que o
 * ancestral escreveu. O fallback em `currentColor` cobre o tema sem `--brand`.
 */
function QuoteMark() {
  return (
    <svg
      viewBox="0 0 32 24"
      aria-hidden="true"
      className={cn(
        "h-5 w-[1.75rem] shrink-0 text-[var(--brand,currentColor)]",
        "[[data-tone=brand]_&]:text-current [[data-tone=brand]_&]:opacity-55",
      )}
      fill="currentColor"
    >
      <path d="M0 24V13.4C0 6 4.2 1 11.4 0l1.2 3.6C8.6 4.8 6.4 7.4 6.4 10.6h5.4V24H0Zm18.8 0V13.4C18.8 6 23 1 30.2 0L31.4 3.6c-4 1.2-6.2 3.8-6.2 7h5.4V24H18.8Z" />
    </svg>
  );
}
