"use client";

/**
 * As primitivas de sala — a gramática que todas as cinco composições falam.
 *
 * O defeito que isto existe para matar: **caixa dentro de caixa**. A vitrine
 * empilhava até seis molduras antes da peça — casca, card da sala, palco com
 * borda, a composição se embrulhando de novo, painel com borda, tile com borda.
 * Numa página assim o olho conta borda, não componente. É o mesmo defeito que o
 * catálogo já tinha consertado (`Gallery.tsx`) e que as salas reintroduziram.
 *
 * A regra que estas peças impõem, e que nenhuma composição pode furar:
 *
 * 1. **A sala já é a superfície.** A composição NÃO se embrulha em
 *    `border + rounded + bg-card`. Ela desenha em cima do que a sala pintou.
 * 2. **Profundidade é degrau de superfície e espaço, não borda em todo nível.**
 *    `Bloco` separa por respiro e rótulo; `Painel` é o único que ganha contorno,
 *    e só quando o conteúdo É uma superfície de app distinta (um board, um
 *    editor) — nunca para "agrupar visualmente".
 * 3. **Rótulo de canto vira função.** O nome da peça era legenda de catálogo
 *    colada num produto (`generating-tile` no canto do painel). Aqui ele é o
 *    botão que copia o `add` daquela peça — que é a segunda coisa que a pessoa
 *    quer fazer depois de reconhecer a peça, e a razão de o nome estar ali.
 *
 * Isto é chrome de vitrine, não item de registry: mora em `src/app/` e não é
 * publicado. Composição só usa peça publicada; a moldura em volta é da casa.
 */

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { installCommand } from "../registry-meta";
import { useCopy } from "../copy-command";

/* -------------------------------------------------------------------------- */
/* peça                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * O nome da peça, clicável: copia `npx shadcn@latest add @visant/<nome>`.
 *
 * Fica em repouso com peso de rótulo — cinza, mono, micro — porque ele não
 * compete com o conteúdo do bloco. O que muda no hover é cor e borda, nunca
 * escala: a peça viva ao lado é que manda no palco.
 */
export function PecaTag({ name, className }: { name: string; className?: string }) {
  const { done, copy } = useCopy(installCommand(name));
  const Icon = done ? Check : Copy;

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copiar: ${installCommand(name)}`}
      aria-label={`Copiar comando de ${name}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[var(--r-pill,9999px)] border border-transparent px-1.5 py-0.5",
        "font-mono text-micro text-muted-foreground/70 outline-none",
        "transition-[color,border-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
        "hover:border-border hover:text-foreground focus-visible:border-[var(--brand)] focus-visible:[box-shadow:var(--focus)]",
        done && "border-[var(--brand)] text-[var(--brand)]",
        className,
      )}
    >
      {name}
      {/*
        Só o ícone, e nunca a palavra.

        Antes cada nome vinha seguido de "add", então um bloco com cinco peças
        escrevia `add` cinco vezes na mesma linha — uma coluna de ruído que não
        dizia nada de novo depois da primeira. O ícone ocupa a largura de um
        caractere, aparece no hover e no foco, e a confirmação troca o ícone em
        vez de trocar a largura (o "copiado" por extenso fazia a linha pular
        embaixo do dedo que acabou de clicar).
      */}
      <Icon
        className={cn(
          "h-2.5 w-2.5 shrink-0",
          done ? "opacity-100" : "opacity-0 group-hover/bloco:opacity-60",
          "transition-opacity [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
          // No toque não existe hover: lá o ícone é permanente.
          "[@media(pointer:coarse)]:opacity-60",
        )}
      />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* começo                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * O começo da sala: onde isto acontece no produto de verdade.
 *
 * Uma linha de contexto e uma frase. Sem ela a pessoa cai direto num board de
 * projeto sem saber se está vendo um exemplo, um produto ou um print — e a
 * composição inteira vira decoração.
 */
export function Abertura({
  contexto,
  children,
  acao,
}: {
  /** Em que tela do app isto seria — "a tela de projetos", "a home pública". */
  contexto: string;
  /** Uma frase. O que se está prestes a ver funcionando. */
  children: React.ReactNode;
  /** Controle que muda o que a sala mostra, quando existir. */
  acao?: React.ReactNode;
}) {
  /*
   * O rótulo de contexto saiu, e ele era `title` no lugar errado.
   *
   * A abertura escrevia "A TELA DE PROJETOS, POR DENTRO" em caixa-alta e, na
   * linha de baixo, a frase que dizia a mesma coisa em português. Isso a uma
   * tela de distância da tese do kit, que já tinha dito uma terceira vez. Três
   * versões da mesma informação em três tamanhos é o que faz uma página parecer
   * documentação, não produto.
   *
   * O `contexto` continua na assinatura porque as cinco salas o passam, e vira
   * o `title` do trecho: quem quiser a etiqueta a encontra, e ela não ocupa
   * linha. A frase, essa fica — é a única das três que tem verbo.
   */
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-6" title={contexto}>
      <p className="min-w-0 max-w-2xl text-corpo leading-relaxed text-muted-foreground">
        {children}
      </p>
      {acao ? <div className="flex shrink-0 items-center gap-2">{acao}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* meio                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Um trecho da sala. **Sem moldura** — separa por respiro e rótulo.
 *
 * O rótulo é uma linha só: título à esquerda, peças à direita. As peças são
 * `PecaTag`, então a linha que identifica também é a linha que instala.
 */
export function Bloco({
  titulo,
  pecas,
  nota,
  children,
  className,
}: {
  titulo: string;
  /** Nomes de registry que este trecho está mostrando. */
  pecas?: string[];
  /** Meia linha explicando o que olhar. Some se não houver o que dizer. */
  nota?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("group/bloco min-w-0", className)}>
      {/*
        Uma linha de cabeçalho, e ela sussurra.

        Duas coisas foram cortadas aqui depois de ver a sala pronta:

        - O rótulo era mono, CAIXA-ALTA e com `tracking-wider`. Cinco desses
          empilhados numa página é o tell de dashboard genérico: cada trecho
          gritando o próprio nome antes de mostrar qualquer coisa. Virou frase,
          no mesmo corpo do resto, discreta.
        - Título e nota ocupavam duas linhas dizendo a mesma coisa em dois
          tamanhos. Agora dividem uma, e a nota entra só quando acrescenta —
          quem escreve sente o peso de ocupar a linha do vizinho.

        Um bloco sem `titulo` não renderiza cabeçalho nenhum. Seção de template
        não precisa de legenda: precisa do conteúdo.
      */}
      {titulo || nota || pecas?.length ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pb-2.5">
          {titulo ? <h3 className="text-apoio text-foreground/80">{titulo}</h3> : null}
          {nota ? <p className="min-w-0 text-apoio text-muted-foreground">{nota}</p> : null}
          {pecas?.length ? (
            <span className="ml-auto flex flex-wrap items-center justify-end gap-0.5">
              {pecas.map((p) => (
                <PecaTag key={p} name={p} />
              ))}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * A ÚNICA coisa desta gramática que tem contorno.
 *
 * Use quando o conteúdo é uma superfície de app de verdade — um board, um
 * editor, um painel que no produto teria moldura própria. Nunca para agrupar
 * visualmente: agrupar é trabalho de `Bloco`, que agrupa com espaço.
 */
export function Painel({
  children,
  className,
  /** Barra de cabeçalho do painel, quando ele for uma janela de app. */
  barra,
}: {
  children: React.ReactNode;
  className?: string;
  barra?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border",
        // Meio degrau acima da sala, não uma cor nova: é o que separa sem
        // desenhar uma segunda página dentro da primeira.
        "bg-[color-mix(in_oklab,var(--card)_88%,var(--foreground)_4%)]",
        className,
      )}
    >
      {barra ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5 sm:px-5">
          {barra}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/**
 * Faixa de fundo dentro da sala, para separar ato de ato sem borda.
 *
 * É como a landing separa dobra de dobra: muda o chão, não desenha caixa.
 */
export function Faixa({
  children,
  tom = "recuo",
  className,
}: {
  children: React.ReactNode;
  /** `recuo` afunda meio degrau; `realce` sobe meio degrau. */
  tom?: "recuo" | "realce";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "-mx-4 px-4 sm:-mx-6 sm:px-6",
        tom === "recuo"
          ? "bg-[color-mix(in_oklab,var(--background)_92%,var(--foreground)_5%)]"
          : "bg-[color-mix(in_oklab,var(--card)_92%,var(--brand,var(--foreground))_6%)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* fim                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * O fim da sala: o que fica de pé quando a demo acaba.
 *
 * Sem isto a composição termina no ar — a pessoa rola, o conteúdo some e ela
 * conclui que acabou o carregamento. Uma frase de fechamento é o que transforma
 * "vi uns componentes" em "sei o que este kit resolve".
 */
export function Fecho({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-2xl border-t border-border pt-5 text-corpo leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * A pilha de atos da sala. Ritmo vertical em um lugar só.
 *
 * As composições escreviam `space-y-6`, `gap-8`, `mt-10` cada uma no seu gosto,
 * e por isso duas salas seguidas nunca respiravam igual.
 */
export function Atos({ children, className }: { children: React.ReactNode; className?: string }) {
  /*
   * O respiro encolheu junto com o texto.
   *
   * `gap-9 sm:gap-11` foi calibrado quando cada ato abria com rótulo em
   * caixa-alta mais uma nota em linha própria — três linhas de cabeçalho
   * pediam um vale grande antes para não colar no ato anterior. Com o
   * cabeçalho em uma linha sussurrada, o mesmo vale vira buraco, e buraco
   * também é ruído: a página parece ter perdido conteúdo no meio.
   */
  return <div className={cn("flex flex-col gap-7 sm:gap-9", className)}>{children}</div>;
}
