"use client";

/**
 * A sala do kit — uma por tela, e nada de outro kit na mesma tela.
 *
 * A vitrine antiga era uma coluna de 65 cards com quatro linguagens visuais
 * empilhadas: o painel de metal do rig encostava no papel claro de uma dobra de
 * landing, e rolar a página era atravessar três libraries. Aqui cada kit tem
 * **sala própria**, com o tema aplicado no container (`.dark` + fundo), e a
 * troca entre salas é explícita: seta, tecla ou nome na barra.
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
import { ChevronLeft, ChevronRight, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { KITS, pecasDoKit, type Kit } from "./kits";
import { kitInstallCommand } from "./registry-meta";
import { CopyCommand } from "./copy-command";
import { DepLogo } from "./dep-badges";
import { allDeps } from "./deps";
import { BugButton } from "./bug-report";
import { Aba, Icone } from "./casa-ui";
import { Inspecao } from "./kits/sala";

/**
 * A tira de peças.
 *
 * É onde a peça solta continua existindo — e onde a promessa do comando único
 * se verifica: a pessoa conta os nomes e vê que são os mesmos que o `add`
 * traz, e que são exatamente os que a sala monta (a lista sai dos imports).
 *
 * Os nomes são texto, não pílula: uma fila de onze pastilhas contornadas lia
 * como textura de tags; onze palavras se leem como lista.
 */
function Tira({
  kit,
  deps,
  onFocus,
}: {
  kit: Kit;
  /** O que o kit puxa de npm. */
  deps: ReturnType<typeof allDeps>;
  onFocus: (name: string) => void;
}) {
  const pecas = pecasDoKit(kit);
  return (
    <div className="casa shell py-8">
      {/* "Zero dependência" é a informação mais cara desta linha para quem
          decide instalar, e ela é calculada, não escrita. Os logos se leem de
          relance; o nome de cada pacote mora no `title`. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-casa-sm text-casa-fg-3">
        <h3>{pecas.length} peças</h3>
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
              {deps.length} {deps.length === 1 ? "pacote" : "pacotes"}
            </span>
          </span>
        ) : (
          <span>nenhum pacote</span>
        )}
      </div>
      {/* Âncora de teste: a suíte conta o que a tira REALMENTE lista pra
          confrontar com o comando. */}
      <div data-tira-pecas className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {pecas.map((p) => {
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => onFocus(p.name)}
              title={p.description}
              className={cn(
                "rounded-control text-casa-base text-casa-fg-2 outline-none transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:text-casa-fg focus-visible:[box-shadow:var(--focus)]",
              )}
            >
              {p.title}
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
}: {
  slug: string;
  onSlug: (slug: string) => void;
  /** Abre a ficha da peça no catálogo. */
  onFocus: (name: string) => void;
}) {
  const indice = Math.max(
    0,
    KITS.findIndex((k) => k.slug === slug || k.apelidos?.includes(slug)),
  );
  const kit = KITS[indice];

  /* Link antigo (apelido) abre a sala e troca o endereço pelo nome de agora,
     sem entrada nova no histórico. */
  React.useEffect(() => {
    if (slug !== kit.slug && kit.apelidos?.includes(slug)) {
      window.history.replaceState(null, "", `/kit/${kit.slug}`);
    }
  }, [slug, kit]);
  const pecas = React.useMemo(() => pecasDoKit(kit), [kit]);
  const deps = React.useMemo(() => allDeps(pecas.map((p) => p.name)), [pecas]);
  /* "Mostrar peças": o equivalente do hover para teclado e toque. */
  const [mostrarPecas, setMostrarPecas] = React.useState(false);

  const passo = React.useCallback(
    (delta: number) => onSlug(KITS[(indice + delta + KITS.length) % KITS.length].slug),
    [indice, onSlug],
  );

  /*
   * ←/→ atravessam as salas — mas só com o foco em NADA.
   *
   * Com um knob focado, → subia o ganho E pulava de kit no mesmo gesto. A seta
   * é da PÁGINA quando nada está focado, e do CONTROLE assim que algo está.
   * Modificador também sai de cena (alt+← é voltar no histórico do navegador).
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
        A barra das salas, grudada abaixo do cabeçalho: atravessar kits é a ação
        principal desta página. Os nomes rolam; as setas não — um par só,
        sempre visível, em qualquer largura.
      */}
      <div className="casa sticky top-[var(--shell-header-h)] z-30 bg-casa-bg">
        <div className="shell flex items-center gap-5 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {KITS.map((k, i) => (
              <Aba key={k.slug} ativa={i === indice} onClick={() => onSlug(k.slug)}>
                {k.label}
              </Aba>
            ))}
          </div>
          <span className="flex shrink-0 items-center gap-1">
            <Icone rotulo="Kit anterior" onClick={() => passo(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Icone>
            <Icone rotulo="Próximo kit" onClick={() => passo(1)}>
              <ChevronRight className="h-4 w-4" />
            </Icone>
          </span>
        </div>
      </div>

      {/*
        O cabeçalho do kit é da CASA, não da sala: o nome, a tese e o comando
        são a vitrine falando. A sala começa embaixo, e é só composição.
      */}
      <header className="casa shell flex flex-col gap-6 pb-10 pt-12 sm:pt-16">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-casa-xl font-medium">{kit.title}</h2>
            <p className="mt-3 max-w-2xl text-casa-lg text-casa-fg-2">{kit.tese}</p>
          </div>
          <BugButton item={kit.slug} />
        </div>

        {/*
          O comando é o destaque; ao lado, a chave da camada de inspeção. A
          sala é um mock de produto sem legenda nenhuma, e é esta chave (e o
          hover) que responde "que peça é essa?". No toque não há hover: ela é
          o único caminho, por isso fica à vista e não num menu.
        */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CopyCommand
            variant="cta"
            text={kitInstallCommand(pecas.map((p) => p.name))}
            className="w-full min-w-0 sm:max-w-[34rem]"
          />
          <button
            type="button"
            aria-pressed={mostrarPecas}
            onClick={() => setMostrarPecas((v) => !v)}
            title="Ou passe o mouse sobre a tela de exemplo"
            className={cn(
              "alvo-toque inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-control px-3.5 text-casa-base outline-none",
              "transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] focus-visible:[box-shadow:var(--focus)]",
              mostrarPecas
                ? "bg-casa-tile-2 text-casa-fg"
                : "bg-casa-tile text-casa-fg-2 hover:text-casa-fg",
            )}
          >
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
            Mostrar peças
          </button>
        </div>
      </header>

      {/*
        A sala — uma FAIXA, não um card.

        A sala sangra até a borda da viewport e pinta a superfície do tema; quem
        a separa da página é o chão mudando. A profundidade vira degrau de
        superfície dentro da composição (`sala.tsx`).

        `key={kit.slug}` desmonta a anterior inteira: as salas têm relógio,
        canvas e estado próprios.

        `.dark` no container, nunca no documento: é o que mantém a casca no tema
        da pessoa enquanto a sala escura acontece dentro dela.
      */}
      <section
        key={kit.slug}
        className={cn("palco", kit.escura && "dark")}
        style={kit.fundo ? { background: kit.fundo } : undefined}
      >
        {/*
          O palco. Sem escala, sem moldura e sem fundo próprios: a composição
          divide a superfície da sala, porque ela É a tela. A espera tem a altura
          de uma tela cheia — trocar de sala não pode encolher a página.
        */}
        <div className="shell py-14 sm:py-20">
          <React.Suspense fallback={<div className="min-h-[60vh] w-full" aria-busy="true" />}>
            <Inspecao todas={mostrarPecas} onAbrir={onFocus}>
              <kit.Composicao />
            </Inspecao>
          </React.Suspense>
        </div>
      </section>

      <Tira kit={kit} deps={deps} onFocus={onFocus} />
    </div>
  );
}