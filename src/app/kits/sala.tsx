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
import { ArrowUpRight, Check, Copy } from "lucide-react";
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
        // Voz da casa, não da marca: o nome é a vitrine apontando pra peça.
        "inline-flex shrink-0 items-center gap-1 rounded-control px-1.5 py-0.5",
        "font-casa-mono text-casa-sm text-casa-fg-3 outline-none",
        "transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
        "hover:text-casa-fg focus-visible:[box-shadow:var(--focus)]",
        done && "text-casa-fg",
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
      <p className="casa min-w-0 max-w-2xl text-casa-base text-casa-fg-2">{children}</p>
      {acao ? <div className="flex shrink-0 items-center gap-2">{acao}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* meio                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Um trecho da sala. **Sem moldura**: separa por respiro.
 *
 * O título (quando há) é uma linha sussurrada. As peças NÃO aparecem mais em
 * linha: moram na camada de inspeção (`Pecas`), que mostra o nome no hover ou
 * no foco. Rótulo técnico fixo em cima de cada trecho era a página se
 * explicando em vez de parecer o produto.
 */
export function Bloco({
  titulo,
  pecas,
  nota,
  children,
  className,
}: {
  titulo?: string;
  /** Nomes de registry que este trecho está mostrando. */
  pecas?: string[];
  /** Vira `title` do título, nunca linha própria. */
  nota?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      {titulo ? (
        <h3 className="casa pb-2.5 text-casa-sm text-casa-fg-2" title={nota}>
          {titulo}
        </h3>
      ) : null}
      {pecas?.length ? <Pecas nomes={pecas}>{children}</Pecas> : children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* inspeção                                                                    */
/* -------------------------------------------------------------------------- */

/*
 * A camada de inspeção: a sala parece o produto, e a peça aparece quando se
 * pergunta por ela.
 *
 * O pedido do dono, literal: "finge que é um site normal, e no hover aparece
 * quais componentes foram usados". O rótulo fixo em cima de cada trecho
 * ("Dobra 3: serviço") transformava o mock em documentação. Aqui o nome da peça
 * só existe quando o ponteiro está na região, quando o foco do teclado entra
 * nela, ou quando a pessoa liga "Mostrar peças" na barra do kit (o caminho do
 * toque, que não tem hover).
 *
 * Um provider por sala (`Inspecao`, montado pelo `KitRoom`) guarda QUAL região
 * está sob o ponteiro. Sem ele, região dentro de região acenderia as duas,
 * porque `:hover` vale para todos os ancestrais. O provider lê o
 * `closest("[data-peca]")` do alvo: só a região mais interna acende.
 */

interface InspecaoValor {
  ativo: string | null;
  todas: boolean;
  abrir?: (nome: string) => void;
}

const InspecaoCtx = React.createContext<InspecaoValor>({ ativo: null, todas: false });

export function Inspecao({
  children,
  todas = false,
  onAbrir,
}: {
  children: React.ReactNode;
  /** Liga todas as etiquetas de uma vez (teclado, toque, ou curiosidade). */
  todas?: boolean;
  /** Abre a ficha da peça. Sem isto o link segue o `href` da ficha. */
  onAbrir?: (nome: string) => void;
}) {
  const [ativo, setAtivo] = React.useState<string | null>(null);
  const valor = React.useMemo(() => ({ ativo, todas, abrir: onAbrir }), [ativo, todas, onAbrir]);

  return (
    <InspecaoCtx.Provider value={valor}>
      <div
        onPointerOver={(e) => {
          if (e.pointerType !== "mouse") return;
          const alvo = e.target instanceof Element ? e.target.closest("[data-peca]") : null;
          const id = alvo?.getAttribute("data-peca") ?? null;
          setAtivo((antes) => (antes === id ? antes : id));
        }}
        onPointerLeave={() => setAtivo(null)}
      >
        {children}
      </div>
    </InspecaoCtx.Provider>
  );
}

type Canto = "topo-fim" | "topo-inicio" | "base-fim" | "base-inicio";

const CANTO: Record<Canto, string> = {
  "topo-fim": "right-2 top-2",
  "topo-inicio": "left-2 top-2",
  "base-fim": "right-2 bottom-2",
  "base-inicio": "left-2 bottom-2",
};

const ALVO =
  "rounded-control outline-none transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] focus-visible:[box-shadow:var(--focus)]";

/** Uma linha da etiqueta: o nome abre a ficha, o ícone copia o `add`. */
function LinhaPeca({ nome }: { nome: string }) {
  const { abrir } = React.useContext(InspecaoCtx);
  const { done, copy } = useCopy(installCommand(nome));
  const Icon = done ? Check : Copy;

  return (
    <li className="flex items-center gap-0.5">
      <a
        href={`/c/${encodeURIComponent(nome)}`}
        onClick={(e) => {
          if (!abrir || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          abrir(nome);
        }}
        title="Abrir a ficha da peça"
        className={cn(
          ALVO,
          "inline-flex min-w-0 flex-1 items-center gap-1 px-1.5 py-1 font-casa-mono text-casa-sm text-casa-fg hover:bg-casa-tile-2",
        )}
      >
        <span className="truncate">{nome}</span>
        <ArrowUpRight className="h-3 w-3 shrink-0 text-casa-fg-3" aria-hidden="true" />
      </a>
      <button
        type="button"
        onClick={copy}
        title={installCommand(nome)}
        aria-label={done ? `Copiado: ${nome}` : `Copiar o comando de ${nome}`}
        className={cn(
          ALVO,
          "grid size-6 shrink-0 place-items-center text-casa-fg-2 hover:bg-casa-tile-2 hover:text-casa-fg",
        )}
      >
        <Icon className="h-3 w-3" />
      </button>
    </li>
  );
}

/**
 * Uma região do mock feita com peça(s) do registry.
 *
 * Em repouso não desenha nada: é o produto. Com o ponteiro em cima (ou o foco
 * dentro, ou "Mostrar peças" ligado) ganha um contorno fino e a etiqueta no
 * canto, com o nome de cada peça (abre a ficha) e o copiar do comando.
 *
 * A etiqueta FLUTUA sobre a região, nunca empurra layout. E os botões dela
 * ficam sempre no DOM e na ordem do Tab: o teclado chega neles sem ponteiro, e
 * o foco é o que os acende.
 */
export function Pecas({
  nomes,
  children,
  className,
  canto = "topo-fim",
}: {
  nomes: string[];
  children: React.ReactNode;
  className?: string;
  canto?: Canto;
}) {
  const { ativo, todas } = React.useContext(InspecaoCtx);
  const id = React.useId();
  const aceso = todas || ativo === id;

  return (
    <div data-peca={id} className={cn("group/peca relative", className)}>
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-20 rounded-[6px] opacity-0",
          "[box-shadow:inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_40%,transparent)]",
          "bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)]",
          "transition-opacity [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
          aceso && "opacity-100",
        )}
      />
      <div
        data-peca-etiqueta
        className={cn(
          "casa absolute z-[29] w-max max-w-[min(20rem,calc(100vw-2rem))] rounded-control bg-casa-tile p-1 [box-shadow:var(--casa-shadow)]",
          CANTO[canto],
          "pointer-events-none opacity-0",
          "transition-opacity [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
          "focus-within:pointer-events-auto focus-within:opacity-100",
          aceso && "pointer-events-auto opacity-100",
        )}
      >
        <ul aria-label="Peças usadas aqui" className="flex flex-col">
          {nomes.map((n) => (
            <LinhaPeca key={n} nome={n} />
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * A janela do mock: a borda de app ou de navegador em volta da tela inteira.
 *
 * É o sinal mais barato de "isto é um produto de exemplo": a pessoa reconhece
 * uma janela sem ler nada. O endereço é o único texto, e ele é dado do mock.
 */
export function Janela({
  endereco,
  children,
  className,
}: {
  endereco: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-background",
        "[box-shadow:0_1px_2px_color-mix(in_oklab,var(--foreground)_6%,transparent),0_28px_64px_-28px_color-mix(in_oklab,var(--foreground)_28%,transparent)]",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-[color-mix(in_oklab,var(--card)_80%,var(--foreground)_4%)] px-3.5 py-2">
        <span className="flex w-12 shrink-0 gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2.5 rounded-full bg-[color-mix(in_oklab,var(--foreground)_16%,transparent)]"
            />
          ))}
        </span>
        <span className="mx-auto min-w-0 max-w-sm flex-1 truncate rounded-[var(--r-control,0.5rem)] bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] px-3 py-0.5 text-center font-mono text-micro text-muted-foreground">
          {endereco}
        </span>
        <span className="w-12 shrink-0" aria-hidden="true" />
      </div>
      {children}
    </div>
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
    <p className="casa max-w-2xl border-t border-casa-line pt-5 text-casa-base text-casa-fg-2">{children}</p>
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
