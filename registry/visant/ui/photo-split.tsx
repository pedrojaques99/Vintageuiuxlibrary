"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Fold, FoldPart } from "@/lib/fold-motion";
import { PhotoFrame } from "@/components/ui/photo-frame";
import { SectionIntro } from "@/components/ui/section-intro";

/**
 * PhotoSplit — a dobra alternada: foto de um lado, argumento do outro.
 *
 * ── Por que ela é composição e quase não tem código próprio ────────────────
 *
 * A dobra foto ↔ texto é o padrão mais copiado da web, e é exatamente por isso
 * que ela costuma sair errada: cada projeto reescreve as três partes dela do
 * zero, e cada reescrita perde uma decisão que a casa já tinha tomado. Aqui as
 * três partes já existem no registry, e esta peça só as arruma:
 *
 * · **`@visant/photo-frame`** revela a foto — a máscara abre e a imagem assenta
 *   mais devagar que a máscara. A proporção declarada é o que impede o salto de
 *   layout que quebraria o gatilho de rolagem.
 * · **`@visant/section-intro`** escreve a coluna de texto, com as DUAS medidas
 *   de linha (título e parágrafo pedem larguras diferentes), `text-balance` no
 *   título e `text-pretty` no lead.
 * · **`@visant/fold-motion`** dá a entrada, na variante `drift`: o texto entra
 *   deslizando da borda externa, e o esconderijo é aplicado pelo componente —
 *   nunca por CSS estático, senão um script que falha apaga a dobra inteira.
 *
 * O que sobra de trabalho próprio é a anatomia, e ela é a parte que se erra:
 *
 * 1. **A alternância não é do consumidor.** Escrever `side="left"` em uma dobra
 *    e `side="right"` na seguinte é uma contabilidade que quebra em silêncio no
 *    dia em que alguém insere uma dobra no meio — e o defeito, duas fotos
 *    seguidas do mesmo lado, é justamente o que a alternância existe pra evitar.
 *    `PhotoSplitStack` escreve o lado de cada filha, igual ao `NavDrawerList`
 *    escrevendo o índice da cascata. Quem quiser mandar continua mandando: um
 *    `side` explícito na filha ganha do automático.
 * 2. **A inversão é `flex-row-reverse`, não `order`.** Com `order`, a dobra
 *    invertida empilharia o texto ANTES da foto no celular — metade das dobras
 *    da página com uma ordem e metade com a outra. Em `row-reverse` com
 *    `flex-wrap`, a foto continua vindo primeiro quando empilha, sempre.
 * 3. **A quebra é do CONTAINER.** Nenhum `sm:`/`lg:` no arquivo: as duas colunas
 *    têm base mínima e o `flex-wrap` decide. Uma dobra montada dentro de uma
 *    coluna de 700px empilha; a mesma dobra em página inteira não. Media query
 *    de viewport erraria as duas.
 * 4. **A entrada vem do lado de FORA.** Foto à esquerda → o texto entra pela
 *    direita. Convergir para o centro é o que faz a dobra parecer fechar; entrar
 *    os dois do mesmo lado faz a página parecer escorregar.
 *
 * `prefers-reduced-motion` é herdado das três peças: a moldura não mascara nem
 * deriva, e a dobra nasce no estado final. Zera o movimento, nunca o resultado.
 */

export interface PhotoSplitProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A mídia, por slot: `<img>`, `next/image`, `<video>`. */
  media: React.ReactNode;
  title: React.ReactNode;
  /** O rótulo acima do título. Decorativo — vai com `aria-hidden`. */
  eyebrow?: React.ReactNode;
  lead?: React.ReactNode;
  /** Botões e links abaixo do texto. */
  actions?: React.ReactNode;
  /** De que lado fica a FOTO. Dentro de `PhotoSplitStack` é escrito automático. */
  side?: "left" | "right";
  /** Proporção da moldura, formato CSS. */
  ratio?: string;
  /** Deriva da foto na rolagem, em % da altura. 0 desliga. */
  parallax?: number;
  /** Legenda da foto. Entra como `<figcaption>` da moldura. */
  caption?: React.ReactNode;
  /** Respiro entre as duas colunas, em rem. */
  gap?: number;
  /** Peso da coluna da foto contra a do texto. 1 é meio a meio. */
  weight?: number;
  as?: "h2" | "h3";
}

export function PhotoSplit({
  media,
  title,
  eyebrow,
  lead,
  actions,
  side = "left",
  ratio = "4/5",
  parallax = 0,
  caption,
  gap = 3.5,
  weight = 1.1,
  as = "h2",
  className,
  style,
  children,
  ...props
}: PhotoSplitProps) {
  return (
    <Fold
      as="section"
      // A dobra INTEIRA é o flex, e não um filho dela: o `fold-motion` move
      // `> [data-fold-part]`, filho direto. Com um invólucro no meio a variante
      // `drift` deixaria de encontrar a coluna de texto e a entrada sumiria sem
      // erro nenhum no console.
      variant={side === "left" ? "drift-r" : "drift-l"}
      className={cn(
        "flex flex-wrap items-center",
        side === "right" && "flex-row-reverse",
        className,
      )}
      // O `style` de quem chama vem depois: o respiro é padrão da peça, não
      // decisão dela sobre o que o consumidor pode ajustar.
      style={{ gap: `${gap}rem`, ...style }}
      {...props}
    >
      <div
        className="min-w-0 basis-[24rem]"
        style={{ flexGrow: weight, flexShrink: 1 }}
      >
        <PhotoFrame
          ratio={ratio}
          parallax={parallax}
          caption={caption}
          // A moldura abre do lado de FORA da dobra pra dentro, acompanhando o
          // mesmo sentido de convergência da entrada do texto.
          from={side === "left" ? "left" : "right"}
        >
          {media}
        </PhotoFrame>
      </div>

      <FoldPart
        className={cn(
          "flex min-w-0 flex-1 basis-[20rem] flex-col gap-6",
          // O clamp do `section-intro` é calibrado pra dobra de largura inteira:
          // numa coluna que vale metade da página, a mesma `vw` entrega um título
          // grande demais pro espaço que ele tem. O teto cai aqui, e só o teto —
          // o piso e a curva continuam sendo os do sistema.
          "[&_:is(h1,h2,h3)]:text-[clamp(1.625rem,1.25rem+1.5vw,2.5rem)]",
        )}
      >
        <SectionIntro
          align="start"
          as={as}
          eyebrow={eyebrow}
          title={title}
          lead={lead}
          actions={actions}
          // Medidas menores que o padrão da peça: a coluna aqui é estreita, e a
          // medida de linha tem que caber nela em vez de ser cortada pelo flex.
          titleWidth={17}
          leadWidth={46}
        />
        {children}
      </FoldPart>
    </Fold>
  );
}

export interface PhotoSplitStackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** De que lado começa a primeira foto. As seguintes alternam sozinhas. */
  start?: "left" | "right";
  /** Respiro entre as dobras, em rem. */
  space?: number;
}

/**
 * A pilha que escreve o lado de cada dobra.
 *
 * Clonar e não passar por contexto: o lado precisa chegar como PROP, porque é
 * ele que decide a variante de entrada e o sentido da abertura da moldura — e
 * as duas coisas são lidas no render da filha, não num efeito.
 */
export function PhotoSplitStack({
  start = "left",
  space = 6,
  className,
  style,
  children,
  ...props
}: PhotoSplitStackProps) {
  const itens = React.Children.toArray(children).filter(React.isValidElement);

  return (
    <div
      className={cn("flex flex-col", className)}
      style={{ gap: `${space}rem`, ...style }}
      {...props}
    >
      {itens.map((child, i) => {
        const filha = child as React.ReactElement<PhotoSplitProps>;
        const alternado: PhotoSplitProps["side"] =
          (i % 2 === 0) === (start === "left") ? "left" : "right";
        return React.cloneElement(filha, {
          // Um `side` escrito à mão na filha ganha: a pilha resolve o caso
          // normal, não impõe uma regra que não se pode quebrar.
          side: filha.props.side ?? alternado,
        });
      })}
    </div>
  );
}
