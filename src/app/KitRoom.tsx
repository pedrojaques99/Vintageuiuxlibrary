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
import { ArrowLeft, ArrowRight, Package } from "lucide-react";
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
  onFocus,
}: {
  kit: Kit;
  onFocus: (name: string) => void;
}) {
  const pecas = pecasDoKit(kit);
  return (
    <div className="border-t border-border px-4 py-4 sm:px-6">
      <div className="flex items-baseline gap-2">
        <h3 className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
          as {pecas.length} peças
        </h3>
        <span className="text-micro text-muted-foreground">
          clique para abrir a ficha no catálogo
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
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
              <span className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
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
    <div className="shell pb-20">
      {/*
        A barra das salas. Fica grudada abaixo do cabeçalho porque atravessar
        kits é a ação principal desta página — se ela sobe com o scroll, a
        pessoa que chegou ao fim da landing tem de rolar de volta para ver que
        existem outras quatro.
      */}
      <div className="shell-bleed sticky top-[var(--shell-header-h)] z-30 border-b border-border bg-background/85 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
          <span className="ml-auto hidden shrink-0 items-center gap-2 pl-3 sm:flex">
            <SfxToggle />
            <Seta dir="prev" onClick={() => passo(-1)} label="Kit anterior (←)" />
            <Seta dir="next" onClick={() => passo(1)} label="Próximo kit (→)" />
          </span>
        </div>
      </div>

      {/*
        A sala.

        `key={kit.slug}` desmonta a anterior inteira: as salas têm relógio,
        canvas e estado próprios, e reaproveitar a árvore entre dois kits
        deixaria um `setInterval` da sala de motion rodando por baixo da bancada.

        `.dark` no container, nunca no documento: é o que mantém o cabeçalho da
        página no tema da pessoa enquanto a sala escura acontece dentro dele.
      */}
      <div
        key={kit.slug}
        className={cn(
          "mt-6 overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border",
          kit.escura ? "dark text-foreground" : "bg-card",
        )}
        style={kit.fundo ? { background: kit.fundo } : kit.escura ? { background: "var(--background)" } : undefined}
      >
        {/* `group`: o botão de bug só aparece quando a mão chega ao cabeçalho. */}
        <header className="group flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
                kit {String(indice + 1).padStart(2, "0")} de {String(KITS.length).padStart(2, "0")}
              </p>
              <h2
                className="mt-1.5 text-[clamp(1.5rem,3.6vw,2.4rem)] font-semibold leading-[1.05] tracking-[-0.03em]"
                style={{ fontFamily: "var(--font-display, inherit)" }}
              >
                {kit.title}
              </h2>
              <p className="mt-2.5 max-w-2xl text-corpo leading-relaxed text-muted-foreground">
                {kit.tese}
              </p>
            </div>
            {/* No celular as setas somem daqui de cima (ficam na barra); no
                desktop elas acompanham o título, que é onde o olho está. */}
            <span className="hidden shrink-0 items-center gap-2 sm:flex">
              <BugButton item={kit.slug} />
              <Seta dir="prev" onClick={() => passo(-1)} label="Kit anterior (←)" />
              <Seta dir="next" onClick={() => passo(1)} label="Próximo kit (→)" />
            </span>
          </div>

          {/*
            O que se leva, em números que não mentem: a contagem de peças sai do
            catálogo e a de npm sai do extrator de dependências. "Zero
            dependência" é a informação mais cara deste cabeçalho para quem
            decide instalar, e ela é calculada, não escrita.
          */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-apoio text-muted-foreground">
            <span className="font-mono">{pecas.length} peças</span>
            <span aria-hidden>·</span>
            {deps.length ? (
              <span className="flex flex-wrap items-center gap-2">
                {deps.map(({ info, count }) => (
                  <span key={info.key} className="inline-flex items-center gap-1.5" title={info.packages.join(" · ")}>
                    {info.icon ? <DepLogo icon={info.icon} className="h-3 w-3" /> : null}
                    <span className="font-mono text-micro">
                      {info.label} <span className="tabular-nums">{count}</span>
                    </span>
                  </span>
                ))}
              </span>
            ) : (
              <span className="font-mono">zero dependência npm</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Um comando com os N nomes. Fica truncado na tela e vai inteiro
                para a área de transferência — é longo porque é verdadeiro. */}
            <CopyCommand
              variant="line"
              text={kitInstallCommand(pecas.map((p) => p.name))}
              className="min-w-0 flex-1 bg-muted/50 sm:max-w-[28rem] sm:flex-none"
            />
            <span className="text-apoio text-muted-foreground">
              um comando, as {pecas.length} peças
            </span>
            <span className="ml-auto flex items-center gap-2 sm:hidden">
              <SfxToggle />
              <Seta dir="prev" onClick={() => passo(-1)} label="Kit anterior" />
              <Seta dir="next" onClick={() => passo(1)} label="Próximo kit" />
            </span>
          </div>
        </header>

        {/*
          O palco. Sem escala e sem moldura própria: a composição divide a
          superfície da sala, porque ela É a tela — não uma peça exposta dentro
          de uma.

          A espera tem a altura de uma tela cheia. Trocar de sala não pode fazer
          a página encolher e voltar a crescer embaixo do dedo de quem clicou.
        */}
        <div className="border-t border-border px-3 pb-6 pt-4 sm:px-6 sm:pb-8">
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

        <Tira kit={kit} onFocus={onFocus} />
      </div>

      {/* A saída para o outro modo de olhar. Não é um filtro nem uma aba
          escondida: é a frase que reconhece que existe gente que já sabe o
          nome da peça que quer. */}
      <p className="mt-6 text-center text-apoio text-muted-foreground">
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
