import * as React from "react";

import { cn } from "@/lib/utils";
import { coverLook, mix, monogram, type CoverFamily, type CoverLook } from "@/lib/cover-art";

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

function Regua() {
  return <span className="block h-px w-9 bg-border" />;
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
            "relative flex h-full flex-col gap-3 pb-5 pl-7 pr-5",
            look.titleOnTop ? "justify-start pt-10" : "justify-end pt-5",
          )}
        >
          <Regua />
          <span className="line-clamp-4 text-[22px] font-extrabold leading-[1.06] tracking-tight">
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
        className="absolute inset-x-5 inset-y-6 flex flex-col overflow-hidden rounded-[var(--r-control)]"
        style={{ border: `1px solid ${BORDA_JANELA}`, background: mix(look.light) }}
      >
        {/* A barra de topo com o monograma é o que dá identidade a cada uma. */}
        <div
          className="flex h-8 shrink-0 items-center gap-2 px-3"
          style={{
            borderBottom: `1px solid ${BORDA_JANELA}`,
            background: "color-mix(in oklch, var(--foreground) 4%, transparent)",
          }}
        >
          <span className="text-[11px] font-bold tracking-[0.08em] text-foreground">
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
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3">
            {Array.from({ length: look.lines }).map((_, i) => (
              <span
                key={i}
                className="block h-[7px] rounded-full"
                style={{ width: LARGURAS[(i + look.spin) % LARGURAS.length], background: TRACO }}
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
        <div className="relative flex h-full flex-col justify-end gap-3 p-5">
          <Regua />
          <span className="line-clamp-4 text-[20px] font-bold uppercase leading-[1.1] tracking-tight">
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
    <div className={cn("absolute inset-0", className)} aria-hidden="true">
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
