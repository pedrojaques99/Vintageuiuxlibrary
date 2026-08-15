"use client";

/**
 * A sala do kit — uma por tela, e nada de outro kit na mesma tela.
 *
 * A vitrine antiga era uma coluna de 65 cards com quatro linguagens visuais
 * empilhadas: o painel de metal do rig encostava no papel claro de uma dobra de
 * landing, e rolar a página era atravessar três libraries. Aqui cada kit tem
 * **sala própria**, com o tema aplicado no container (`.dark` + fundo), e a
 * troca entre salas é explícita: seta, tecla ou chip.
 *
 * O que a sala precisa responder, de cima para baixo:
 *
 * 1. *O que é isto e o que eu levo?* — nome, tese, contagem de peças e de
 *    dependência npm, tudo antes da dobra.
 * 2. *Como eu instalo?* — um comando, no cabeçalho, não numa página de doc.
 * 3. *Serve pro meu caso?* — a composição inteira, viva, em tamanho real. Sem
 *    `FitStage`: aqui não se escala nada, porque a composição É a página.
 * 4. *E as peças por dentro?* — a tira embaixo, que leva ao catálogo.
 *
 * A tira fica DEPOIS da composição de propósito. Quem chega quer ver a coisa
 * montada; a lista de ingredientes é a segunda pergunta, e ela some entre a
 * tese e o palco se for posta antes.
 */

import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { KITS, pecasDoKit, type Kit } from "./kits";
import { TYPE_LABEL } from "./catalog";
import { kitInstallCommand } from "./registry-meta";
import { CopyCommand } from "./copy-command";
import { DepLogo } from "./dep-badges";
import { allDeps } from "./deps";
import { BugButton } from "./bug-report";
import { Chip } from "../../registry/visant/ui/chip";
import { SfxToggle } from "../../registry/visant/ui/sfx-toggle";

function Seta({
  dir,
  onClick,
  label,
}: {
  dir: "prev" | "next";
  onClick: () => void;
  label: string;
}) {
  const Icon = dir === "prev" ? ArrowLeft : ArrowRight;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="alvo-toque grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-control,0.5rem)] border border-border text-muted-foreground outline-none transition-[color,border-color,transform] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--brand)] hover:text-foreground focus-visible:border-[var(--brand)] active:scale-[0.96] active:[transition-duration:var(--dur-press)] motion-reduce:active:scale-100"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/**
 * A tira de peças.
 *
 * É onde a peça solta continua existindo — e onde a promessa do comando único
 * se verifica: a pessoa conta os nomes e vê que são os mesmos que o `add`
 * traz. Peça que a composição não monta aparece esmaecida, com o motivo no
 * `title`, em vez de sumir e virar promessa quebrada.
 */
function Tira({
  kit,
  deps,
  onFocus,
}: {
  kit: Kit;
  /** O que o kit puxa de npm. Desceu do cabeçalho para cá, ver `KitRoom`. */
  deps: ReturnType<typeof allDeps>;
  onFocus: (name: string) => void;
}) {
  const pecas = pecasDoKit(kit);
  return (
    <div className="shell py-5">
      {/* Saiu o "clique para abrir a ficha no catálogo": chip com borda e
          cursor de mão não precisa de manual, e a frase ocupava a mesma linha
          do único rótulo que a tira precisa.

          "Zero dependência npm" é a informação mais cara desta linha para quem
          decide instalar, e ela é calculada, não escrita. Os logos ficam porque
          se leem de relance; o nome de cada pacote mora no `title`. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-apoio text-muted-foreground">
        <h3>as {pecas.length} peças</h3>
        <span aria-hidden>·</span>
        {deps.length ? (
          <span
            className="inline-flex items-center gap-2"
            title={deps.flatMap(({ info }) => info.packages).join(", ")}
          >
            <span className="flex items-center gap-1.5">
              {deps
                .filter(({ info }) => info.icon)
                .map(({ info }) => (
                  <DepLogo key={info.key} icon={info.icon!} className="h-3.5 w-3.5" />
                ))}
            </span>
            <span className="tabular-nums">
              {deps.length} {deps.length === 1 ? "dependência" : "dependências"} npm
            </span>
          </span>
        ) : (
          <span>zero dependência npm</span>
        )}
      </div>
      {/* Âncora de teste, como o `data-card-index` da vitrine: a suíte precisa
          contar o que a tira REALMENTE lista pra confrontar com o número que o
          cabeçalho anuncia. Sem ela, o teste teria de contar por classe do
          Tailwind e quebraria no primeiro ajuste de espaçamento. */}
      <div data-tira-pecas className="mt-2.5 flex flex-wrap gap-1.5">
        {pecas.map((p) => {
          const motivo = kit.ausentes?.[p.name];
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => onFocus(p.name)}
              title={motivo ? `${p.description}\n\nNão está na composição: ${motivo}` : p.description}
              className={cn(
                "group inline-flex items-center gap-1.5 rounded-[var(--r-pill,9999px)] border border-border px-2.5 py-1 text-left outline-none",
                "transition-[color,border-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
                "hover:border-[var(--brand)] focus-visible:border-[var(--brand)]",
                motivo && "opacity-55",
              )}
            >
              <span className="font-mono text-micro group-hover:text-[var(--brand)]">{p.name}</span>
              <span className="font-mono text-micro text-muted-foreground">
                {TYPE_LABEL[p.type]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function KitRoom({
  slug,
  onSlug,
  onFocus,
  onCatalogo,
}: {
  slug: string;
  onSlug: (slug: string) => void;
  /** Abre a ficha da peça no catálogo. */
  onFocus: (name: string) => void;
  /** Sai dos kits para a lista completa. */
  onCatalogo: () => void;
}) {
  const indice = Math.max(
    0,
    KITS.findIndex((k) => k.slug === slug),
  );
  const kit = KITS[indice];
  const pecas = React.useMemo(() => pecasDoKit(kit), [kit]);
  const deps = React.useMemo(() => allDeps(pecas.map((p) => p.name)), [pecas]);

  const passo = React.useCallback(
    (delta: number) => onSlug(KITS[(indice + delta + KITS.length) % KITS.length].slug),
    [indice, onSlug],
  );

  /*
   * ←/→ atravessam as salas — mas só com o foco em NADA.
   *
   * A primeira versão escutava a seta sempre que não se estivesse digitando, e
   * isso rouba a tecla de todo controle que usa seta: o knob vintage, o fader,
   * o range do measure-picker, o trilho de chips. Com um knob focado, → subia o
   * ganho E pulava de kit no mesmo gesto — dois efeitos para uma tecla, e o
   * segundo invisível para quem estava olhando o knob.
   *
   * A regra passa a ser a mais simples que resolve: a seta é da PÁGINA quando
   * nada está focado, e do CONTROLE assim que algo está. Modificador também
   * sai de cena (alt+← é voltar no histórico do navegador).
   */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const el = document.activeElement;
      if (el && el !== document.body) return;
      if (e.key === "ArrowRight") passo(1);
      else if (e.key === "ArrowLeft") passo(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [passo]);

  return (
    <div className="pb-20">
      {/*
        A barra das salas. Fica grudada abaixo do cabeçalho porque atravessar
        kits é a ação principal desta página — se ela sobe com o scroll, a
        pessoa que chegou ao fim da landing tem de rolar de volta para ver que
        existem outras quatro.

        Os chips rolam; as setas NÃO. Antes as duas coisas dividiam o mesmo
        container com `overflow-x-auto`, e no celular as setas ficavam a uma
        rolagem lateral de distância — que é o mesmo que não existirem. Por isso
        elas também sumiam do celular e apareciam duplicadas lá embaixo, no
        cabeçalho da sala: três cópias do mesmo par de botões na mesma tela.
        Agora existe um par só, sempre visível, em qualquer largura.
      */}
      <div className="sticky top-[var(--shell-header-h)] z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="shell flex items-center gap-2 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {KITS.map((k, i) => (
              <Chip
                key={k.slug}
                pressed={i === indice}
                count={pecasDoKit(k).length}
                onClick={() => onSlug(k.slug)}
                className="shrink-0 rounded-[var(--r-pill,9999px)] py-1.5 text-apoio"
              >
                {k.label}
              </Chip>
            ))}
          </div>
          <span className="flex shrink-0 items-center gap-2 pl-1 sm:pl-3">
            <SfxToggle />
            <Seta dir="prev" onClick={() => passo(-1)} label="Kit anterior (←)" />
            <Seta dir="next" onClick={() => passo(1)} label="Próximo kit (→)" />
          </span>
        </div>
      </div>

      {/*
        A sala — uma FAIXA, não um card.

        Ela era um card arredondado com borda, e dentro dele o palco tinha outra
        borda, e a composição se embrulhava numa terceira: quatro molduras antes
        da peça. Numa página assim o olho conta borda, não componente.

        Aqui a sala sangra até a borda da viewport e pinta a superfície do tema.
        Quem separa a sala da página é o CHÃO mudando, mais o filete de `border-y`
        — uma moldura, a mesma que uma dobra de landing usa. A profundidade que
        faltava vira degrau de superfície dentro da composição (`sala.tsx`).

        `key={kit.slug}` desmonta a anterior inteira: as salas têm relógio,
        canvas e estado próprios, e reaproveitar a árvore entre dois kits
        deixaria um `setInterval` da sala de motion rodando por baixo da bancada.

        `.dark` no container, nunca no documento: é o que mantém o cabeçalho da
        página no tema da pessoa enquanto a sala escura acontece dentro dele.
      */}
      <section
        key={kit.slug}
        className={cn(
          "border-b border-border",
          kit.escura ? "dark text-foreground" : "bg-card",
        )}
        style={
          kit.fundo
            ? { background: kit.fundo }
            : kit.escura
              ? { background: "var(--background)" }
              : undefined
        }
      >
        {/* `group`: o botão de bug só aparece quando a mão chega ao cabeçalho. */}
        <header className="shell group flex flex-col gap-5 pb-7 pt-8 sm:pb-9 sm:pt-12">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              {/*
                Saiu daqui o "KIT 01 DE 05".
                A barra de chips logo acima já mostra os cinco kits com o atual
                aceso — a etiqueta repetia, em caixa-alta, o que a pessoa acabou
                de ver e de clicar.
              */}
              <h2
                className="text-[clamp(1.75rem,4.2vw,2.9rem)] font-semibold leading-[1.02] tracking-[-0.03em]"
                style={{ fontFamily: "var(--font-display, inherit)" }}
              >
                {kit.title}
              </h2>
              <p className="mt-3 max-w-2xl text-destaque leading-relaxed text-muted-foreground">
                {kit.tese}
              </p>
            </div>
            <span className="shrink-0">
              <BugButton item={kit.slug} />
            </span>
          </div>

          {/*
            A linha de contagem desceu para a tira das peças.

            Ela dizia "11 peças · [seis logos] 9 dependências npm" entre a tese e
            o comando — o lugar mais caro da página, gasto com a resposta de uma
            pergunta que ninguém faz nos primeiros dois segundos. Quem chega
            quer saber o que o kit É; "isso pesa no meu bundle?" é pergunta de
            quem já decidiu olhar por dentro, e por isso agora ela mora ao lado
            da lista de peças, embaixo, onde a decisão de instalar acontece.
          */}

          {/*
            O comando, sozinho.

            Ele vinha com uma legenda ao lado ("um comando com as 11 peças. Ou
            uma de cada vez, pelo nome, lá embaixo.") que explicava o que a
            própria linha já mostra: o `add` com os nomes está escrito ali. E a
            segunda metade da frase ensinava a usar a página, que é o tipo de
            texto que só existe quando a página não se explica sozinha — os
            nomes das peças ficam clicáveis embaixo, e descobrir isso custa um
            hover, não um parágrafo.
          */}
          <CopyCommand
            variant="line"
            text={kitInstallCommand(pecas.map((p) => p.name))}
            className="w-full min-w-0 bg-muted/50 sm:max-w-[30rem]"
          />
        </header>

        {/*
          O palco. Sem escala, sem moldura e sem fundo próprios: a composição
          divide a superfície da sala, porque ela É a tela — não uma peça
          exposta dentro de uma.

          A espera tem a altura de uma tela cheia. Trocar de sala não pode fazer
          a página encolher e voltar a crescer embaixo do dedo de quem clicou.
        */}
        <div className="shell pb-14 sm:pb-20">
          <React.Suspense
            fallback={
              <div
                className="min-h-[60vh] w-full animate-pulse rounded-[var(--r-surface,0.875rem)] bg-muted/30"
                aria-busy="true"
              />
            }
          >
            <kit.Composicao />
          </React.Suspense>
        </div>
      </section>

      <Tira kit={kit} deps={deps} onFocus={onFocus} />

      {/* A saída para o outro modo de olhar. Não é um filtro nem uma aba
          escondida: é a frase que reconhece que existe gente que já sabe o
          nome da peça que quer. */}
      <p className="shell mt-2 text-center text-apoio text-muted-foreground">
        Procurando uma peça específica?{" "}
        <button
          type="button"
          onClick={onCatalogo}
          className="underline decoration-dotted underline-offset-4 hover:text-foreground"
        >
          ver as 65 no catálogo
        </button>
      </p>
    </div>
  );
}
