import * as React from "react";

import { cn } from "@/lib/utils";
/*
 * O lib se chama `cover-look`, e não `cover-art`, de propósito.
 *
 * O item entrega dois arquivos, e enquanto os dois tiveram o MESMO nome de base
 * o shadcn reescreveu o import errado na instalação: `@/lib/cover-art` virava
 * `@/components/ui/cover-art`, o arquivo passava a importar de si mesmo e o
 * projeto do cliente quebrava com "Circular definition of import alias". No
 * repo de origem isso não aparece — só o teste de instalação limpa pega.
 *
 * Regra que vale pra qualquer item de vários arquivos: dois arquivos do mesmo
 * item nunca compartilham nome de base.
 */
import { coverLook, mix, monogram, type CoverFamily, type CoverLook } from "@/lib/cover-look";

/**
 * Cover Art — a capa determinística que substitui a caixa cinza.
 *
 * ── O problema, e por que ele é caro ───────────────────────────────────────
 *
 * Todo catálogo tem itens sem arte. As três saídas de sempre são ruins: caixa
 * cinza (o card lê como carregamento que travou), imagem de stock (o catálogo
 * inteiro fica com a mesma cara), ou geração por IA (custa dinheiro por item,
 * demora, e muda entre execuções). Esta é a quarta: **uma capa desenhada em
 * CSS a partir do próprio item**, sempre a mesma pro mesmo item, em qualquer
 * render. Nenhum byte de imagem, nenhum arquivo em bucket, nenhuma chamada.
 *
 * ── Três famílias, porque e-book e ferramenta não são a mesma coisa ────────
 *
 * | família | desenho | quando |
 * |---|---|---|
 * | `book` | lombada à esquerda + título grande | o card É a capa de frente |
 * | `app` | wireframe de janela com monograma | lê como software |
 * | `plate` | tonal + título | o genérico honesto |
 *
 * O wireframe é wireframe **de propósito**: desenhar uma UI "realista" ali
 * competiria com a UI real em volta.
 *
 * ── As três armadilhas que já custaram tela ────────────────────────────────
 *
 * 1. **A chave não é o título.** Use o slug. Título editado no admin mudaria a
 *    capa embaixo do usuário, e capa que muda sozinha destrói o reconhecimento
 *    na prateleira — que é a única coisa que a capa gerada tem a oferecer.
 * 2. **O traço de dentro da janela é relativo, não um token de borda.** Com
 *    `--border` fixo, uma peça apareceu com a janela vazia porque o tom sorteado
 *    tinha praticamente a cor da linha. Alpha sobre a peça resolve em qualquer
 *    tom.
 * 3. **`titleless` existe pra peça grande.** Num billboard o `<h1>` já é o
 *    título; repeti-lo dentro da arte cria dois títulos brigando.
 *
 * Zero hex: a rampa tonal é `color-mix` entre `--card` e `--foreground`, então
 * a capa nasce da paleta de quem instalou e o tema escuro sai de graça.
 *
 * ── 4. A capa se mede pela CAIXA que a recebe ──────────────────────────────
 *
 * O desenho era todo em px fixo: título de 22px, 40px de folga no topo, janela
 * com 20px de recuo, linha de 7px. Só que esta peça é um slot — a mesma capa
 * entra num card de 90px na grade e num herói de 600px. Numa caixa de 150×112 o
 * título de 22px em quatro linhas pedia 100px depois de 40px de folga: sobrava
 * pela borda e o `overflow-hidden` cortava a palavra no meio ("Marca em 9 eta").
 * Era esse o "estourado".
 *
 * Agora a raiz é um container de tamanho (`container-type: size`) e cada medida
 * sai de `cqmin` — 1% do MENOR lado da caixa — presa entre um piso e um teto. É
 * o único jeito de a mesma arte funcionar em 90px e em 600px sem prop de
 * tamanho, sem media query e sem medir nada em JS.
 */

const TRACO = "color-mix(in oklch, var(--foreground) 18%, transparent)";
const BORDA_JANELA = "color-mix(in oklch, var(--foreground) 12%, transparent)";
const LARGURAS = ["72%", "54%", "84%", "46%"];

/** Realce no topo e sombra interna à direita e embaixo: faz a superfície ler
 *  como objeto, não como retângulo pintado. */
function Espessura() {
  return (
    <div
      className="absolute inset-0"
      aria-hidden="true"
      style={{
        boxShadow:
          "inset 0 1px 0 color-mix(in oklch, var(--foreground) 6%, transparent), inset -16px 0 26px -20px color-mix(in oklch, var(--background) 90%, black), inset 0 -18px 28px -22px color-mix(in oklch, var(--background) 90%, black)",
      }}
    />
  );
}

/**
 * As medidas da capa, todas em função do menor lado da caixa.
 *
 * Ficam num objeto e não espalhadas pelo JSX porque as três famílias precisam
 * combinar entre si na mesma prateleira: mudar o piso do título num lugar só é
 * como o desenho perde o conjunto.
 */
const M = {
  /** Respiro geral. */
  pad: "clamp(0.625rem,6cqmin,1.25rem)",
  /** Folga de topo do livro: o canto é território da etiqueta de formato. */
  padTopo: "clamp(1rem,15cqmin,2.5rem)",
  gap: "clamp(0.25rem,3.5cqmin,0.75rem)",
  regua: "clamp(1rem,10cqmin,2.25rem)",
  tituloLivro: "clamp(0.6875rem,12.5cqmin,1.375rem)",
  tituloPlaca: "clamp(0.625rem,11cqmin,1.25rem)",
} as const;

function Regua() {
  return <span className="block h-px bg-border" style={{ width: M.regua }} />;
}

function Book({ title, look, titleless }: { title: string; look: CoverLook; titleless?: boolean }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: `linear-gradient(${look.angle}deg, ${mix(look.light)}, ${mix(look.dark)})` }}
    >
      <Espessura />
      {/* `pt-10` na composição de topo: quem embrulha esta capa costuma desenhar
          uma etiqueta de formato no canto superior esquerdo, e sem essa folga o
          título sai POR CIMA dela. O canto é território do card, não da capa. */}
      {!titleless && (
        <div
          className={cn(
            "relative flex h-full flex-col",
            look.titleOnTop ? "justify-start" : "justify-end",
          )}
          style={{
            gap: M.gap,
            padding: M.pad,
            // A lombada desenhada mora à esquerda: o texto começa depois dela.
            paddingLeft: `calc(${M.pad} * 1.4)`,
            paddingTop: look.titleOnTop ? M.padTopo : M.pad,
          }}
        >
          <Regua />
          {/* Três linhas, não quatro: em caixa pequena a quarta linha era o que
              transbordava, e capa de catálogo não é lugar de ler o título todo —
              é lugar de reconhecer o item. */}
          <span
            className="line-clamp-3 font-extrabold leading-[1.06] tracking-tight"
            style={{ fontSize: M.tituloLivro }}
          >
            {title}
          </span>
        </div>
      )}
    </div>
  );
}

function App({ title, look }: { title: string; look: CoverLook }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `linear-gradient(${look.angle}deg, ${mix(look.dark)}, var(--background))`,
      }}
    >
      <Espessura />
      <div
        className="absolute flex flex-col overflow-hidden rounded-[var(--r-control)]"
        style={{
          inset: M.pad,
          border: `1px solid ${BORDA_JANELA}`,
          background: mix(look.light),
        }}
      >
        {/* A barra de topo com o monograma é o que dá identidade a cada uma. */}
        <div
          className="flex shrink-0 items-center"
          style={{
            height: "clamp(0.875rem,13cqmin,2rem)",
            gap: M.gap,
            paddingInline: `calc(${M.pad} * 0.7)`,
            borderBottom: `1px solid ${BORDA_JANELA}`,
            background: "color-mix(in oklch, var(--foreground) 4%, transparent)",
          }}
        >
          <span
            className="font-bold tracking-[0.08em] text-foreground"
            style={{ fontSize: "clamp(0.4375rem,5cqmin,0.6875rem)" }}
          >
            {monogram(title)}
          </span>
          <span className="ml-auto flex gap-1" aria-hidden="true">
            <i className="block size-1 rounded-full" style={{ background: TRACO }} />
            <i className="block size-1 rounded-full" style={{ background: TRACO }} />
          </span>
        </div>

        <div className={cn("flex min-h-0 flex-1", !look.panelLeft && "flex-row-reverse")}>
          <div
            className="w-[26%] shrink-0"
            style={{
              [look.panelLeft ? "borderRight" : "borderLeft"]: `1px solid ${BORDA_JANELA}`,
              background: "color-mix(in oklch, var(--background) 22%, transparent)",
            }}
          />
          <div
            className="flex min-w-0 flex-1 flex-col justify-center"
            style={{ gap: M.gap, paddingInline: `calc(${M.pad} * 0.7)` }}
          >
            {Array.from({ length: look.lines }).map((_, i) => (
              <span
                key={i}
                className="block rounded-full"
                style={{
                  height: "clamp(2px,3.5cqmin,7px)",
                  width: LARGURAS[(i + look.spin) % LARGURAS.length],
                  background: TRACO,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Plate({ title, look, titleless }: { title: string; look: CoverLook; titleless?: boolean }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: `linear-gradient(${look.angle}deg, ${mix(look.light)}, ${mix(look.dark)})` }}
    >
      <Espessura />
      {!titleless && (
        <div
          className="relative flex h-full flex-col justify-end"
          style={{ gap: M.gap, padding: M.pad }}
        >
          <Regua />
          <span
            className="line-clamp-3 font-bold uppercase leading-[1.1] tracking-tight"
            style={{ fontSize: M.tituloPlaca }}
          >
            {title}
          </span>
        </div>
      )}
    </div>
  );
}

export interface CoverArtProps {
  title: string;
  /** Chave ESTÁVEL: slug > id > título. Ver a armadilha 1 acima. */
  seed: string;
  family?: CoverFamily;
  /** Fundo de peça grande: mesma linguagem, sem o título. */
  titleless?: boolean;
  className?: string;
}

export function CoverArt({
  title,
  seed,
  family = "plate",
  titleless = false,
  className,
}: CoverArtProps) {
  const look = coverLook(seed);
  return (
    // `container-type: size` e não `inline-size`: as medidas usam `cqmin`, que
    // precisa dos DOIS lados da caixa. É seguro aqui porque a raiz é
    // `absolute inset-0` — o tamanho vem do slot, nunca do conteúdo.
    <div
      className={cn("absolute inset-0 [container-type:size]", className)}
      aria-hidden="true"
    >
      {family === "book" ? (
        <Book title={title} look={look} titleless={titleless} />
      ) : family === "app" ? (
        // O wireframe já não tem título, então serve de fundo como está.
        <App title={title} look={look} />
      ) : (
        <Plate title={title} look={look} titleless={titleless} />
      )}
    </div>
  );
}
