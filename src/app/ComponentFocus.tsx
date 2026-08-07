"use client";

/**
 * A vista de foco: um item, tela cheia, tamanho real.
 *
 * O card da grade responde "isso existe?". Ele não responde "isso serve pro meu
 * caso?" — pra isso a pessoa precisa *usar* a peça: arrastar o knob, largar um
 * card no board, ver o que acontece a 360px de largura. É o que esta vista faz.
 *
 * Três decisões que valem explicação:
 *
 * - **Presets de viewport.** A pergunta que mais aparece sobre um componente de
 *   library é se ele aguenta o celular. Aqui a resposta é um clique, não um
 *   devtools — e a peça é escalada, nunca cortada, quando o preset não cabe.
 * - **`←` `→` navegam sem fechar.** Percorrer o catálogo é o gesto principal;
 *   obrigar a fechar e reabrir mataria o ritmo.
 * - **Rota no hash (`#/c/<nome>`), decidida pelo App.** Dá link compartilhável e
 *   faz o botão voltar do navegador significar "voltar pra grade", que é o que a
 *   pessoa espera. Esta vista não conhece a URL: recebe o item e devolve eventos.
 */

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Monitor, Smartphone, Tablet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "../../registry/visant/ui/segmented-control";
import { FitStage, useElementWidth } from "./stage";
import { MSG_ALTURA } from "./Solo";
import { useBrandTheme } from "@/lib/brand-theme";
import { TYPE_LABEL, familyLabel, previewOf, stageSurfaceOf, type CatalogItem } from "./catalog";
import { installCommand } from "./registry-meta";
import { CopyCommand } from "./copy-command";
import { DepResumo } from "./dep-badges";
import { CodigoDoItem, TabelaDeProps } from "./ItemDocs";

/** Larguras de teste. `0` = o que couber na tela. */
const VIEWPORTS = [
  { value: "sm" as const, px: 360, icon: Smartphone, ariaLabel: "Largura de celular (360px)" },
  { value: "md" as const, px: 768, icon: Tablet, ariaLabel: "Largura de tablet (768px)" },
  { value: "full" as const, px: 0, icon: Monitor, ariaLabel: "Largura cheia" },
];

type ViewportKey = (typeof VIEWPORTS)[number]["value"];

/**
 * As três perguntas que se faz sobre um item, na ordem em que se fazem: como é,
 * como se escreve, o que aceita.
 */
const ABAS = [
  { value: "demo" as const, label: "Demo" },
  { value: "codigo" as const, label: "Código" },
  { value: "props" as const, label: "Props" },
];

type Aba = (typeof ABAS)[number]["value"];

/** Altura mínima do palco em foco: abaixo disso a peça encosta nas bordas. */
const MIN_STAGE_H = 340;

/**
 * A peça rodando num viewport de verdade.
 *
 * O iframe carrega a MESMA aplicação em `?solo=1` — mesmo bundle, mesmo CSS,
 * mesmo componente. Não é um preview reimplementado: é a peça, num documento com
 * a largura do preset, que é a única condição em que uma media query diz a
 * verdade.
 *
 * A altura vem de dentro por `postMessage`. Chutar altura de iframe é como
 * chutar altura de palco — foi o que encheu a vitrine antiga de vazio.
 */
function SoloFrame({
  item,
  largura,
  escala,
  alturaMinima,
}: {
  item: CatalogItem;
  largura: number;
  escala: number;
  alturaMinima: number;
}) {
  const [altura, setAltura] = React.useState(alturaMinima);
  const { brand } = useBrandTheme();

  React.useEffect(() => {
    const ouvir = (e: MessageEvent) => {
      // Só a nossa mensagem, e só deste item: a vitrine pode ter outro iframe.
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; name?: string; altura?: number };
      if (d?.type !== MSG_ALTURA || d.name !== item.name || !d.altura) return;
      setAltura(Math.max(alturaMinima, d.altura));
    };
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, [item.name, alturaMinima]);

  const escuro = document.documentElement.classList.contains("dark");
  const query = new URLSearchParams({ solo: "1" });
  // `slug`, que é como o provider procura a marca — passar o id faria o iframe
  // cair na marca padrão e a peça aparecer fora da marca do resto da tela.
  if (brand?.slug) query.set("brand", brand.slug);
  if (escuro) query.set("dark", "1");

  return (
    <div
      className="overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card"
      // A caixa encolhe junto com a escala, senão sobra um buraco do tamanho da
      // diferença embaixo da peça.
      style={{ width: largura * escala, height: altura * escala }}
    >
      <iframe
        // A chave amarra o iframe ao item: trocar de peça com `←`/`→` recarrega
        // o documento em vez de reaproveitar o anterior e piscar o conteúdo velho.
        key={item.name}
        title={`${item.name} em ${largura}px`}
        src={`/c/${encodeURIComponent(item.name)}?${query}`}
        style={{
          width: largura,
          height: altura,
          border: 0,
          transform: `scale(${escala})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}

export function ComponentFocus({
  item,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  item: CatalogItem;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [aba, setAba] = React.useState<Aba>(() => (item.demo ? "demo" : "codigo"));
  const [viewport, setViewport] = React.useState<ViewportKey>("full");
  const [stageRef, available] = useElementWidth<HTMLDivElement>();
  const Demo = item.demo;
  const natural = previewOf(item);

  // Setas percorrem o catálogo. Ignoradas enquanto alguém digita dentro da demo —
  // várias peças aqui têm input, e roubar a seta do cursor seria hostil.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onPrev, onNext]);

  const preset = VIEWPORTS.find((v) => v.value === viewport)!;
  const frameW = preset.px || Math.max(available, 320);
  const frameH = Math.max(natural.h, MIN_STAGE_H);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-background outline-none",
            "sm:inset-4 sm:rounded-[var(--r-surface,0.875rem)] sm:border sm:border-border sm:shadow-2xl",
            "origin-center data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          {/* cabeçalho */}
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 sm:px-5">
            <Dialog.Title className="font-mono text-corpo">{item.name}</Dialog.Title>
            <span className="rounded-full border border-border px-1.5 py-px font-mono text-micro uppercase tracking-wider text-muted-foreground">
              {TYPE_LABEL[item.type]}
            </span>
            <span className="hidden text-rotulo text-muted-foreground sm:inline">
              {familyLabel(item.family)}
            </span>

            <div className="ml-auto flex items-center gap-1">
              <span className="mr-1 hidden font-mono text-rotulo tabular-nums text-muted-foreground sm:inline">
                {index + 1}/{total}
              </span>
              <button
                type="button"
                onClick={onPrev}
                aria-label="Item anterior"
                className="alvo-toque grid h-8 w-8 place-items-center rounded-[var(--r-control,0.5rem)] border border-border text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="Próximo item"
                className="alvo-toque grid h-8 w-8 place-items-center rounded-[var(--r-control,0.5rem)] border border-border text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <Dialog.Close
                aria-label="Fechar"
                className="alvo-toque ml-1 grid h-8 w-8 place-items-center rounded-[var(--r-control,0.5rem)] border border-border text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-auto lg:flex-row">
            {/* palco / código / props */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 sm:px-5">
                <SegmentedControl
                  value={aba}
                  onChange={setAba}
                  aria-label="O que ver deste item"
                  className="w-full max-w-[300px]"
                  options={ABAS}
                />
              </div>

              {aba === "codigo" ? <CodigoDoItem name={item.name} /> : null}
              {aba === "props" ? (
                <div className="min-h-0 flex-1 overflow-auto">
                  <TabelaDeProps name={item.name} />
                </div>
              ) : null}

              {aba === "demo" && Demo ? (
                <>
                  <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 sm:px-5">
                    <SegmentedControl
                      value={viewport}
                      onChange={setViewport}
                      variant="compact"
                      aria-label="Largura de teste"
                      options={VIEWPORTS}
                    />
                    <span className="ml-auto font-mono text-micro tabular-nums text-muted-foreground">
                      {Math.round(Math.min(frameW, available || frameW))}px
                    </span>
                  </div>

                  <div
                    ref={stageRef}
                    className="flex flex-1 items-start justify-center overflow-auto p-4 sm:p-8"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
                      backgroundSize: "18px 18px",
                    }}
                  >
                    {preset.px ? (
                      /*
                       * Preset de largura = iframe, sem discussão.
                       *
                       * A versão anterior desenhava a peça no tamanho declarado e
                       * aplicava `scale` para caber em 360px. Isso muda o tamanho
                       * na tela e NÃO muda nada para o CSS: media query lê o
                       * viewport, não o container — com a janela em 1440, `sm:`
                       * continuava valendo dentro do "celular". A barra do
                       * `cta-surface` não empilhava no preset de 360 e o título
                       * espremia em cinco linhas: o palco é que estava mentindo.
                       *
                       * O iframe tem viewport próprio, então o breakpoint vale. E
                       * quando o preset não cabe na tela, quem encolhe é o iframe
                       * inteiro por `transform` — a largura INTERNA continua 360,
                       * então a peça segue reagindo como reagiria no celular.
                       */
                      <SoloFrame
                        item={item}
                        largura={preset.px}
                        escala={Math.min(1, (available || preset.px) / preset.px)}
                        alturaMinima={MIN_STAGE_H}
                      />
                    ) : (
                      <div
                        className="overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card"
                        style={{
                          width: Math.min(frameW, available || frameW),
                          ...stageSurfaceOf(item),
                        }}
                      >
                        {/* Escala só entra quando o preset não cabe — nunca amplia. */}
                        <FitStage w={frameW} h={frameH} maxScale={1}>
                          <Demo />
                        </FitStage>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              {aba === "demo" && !Demo ? (
                <div className="grid flex-1 place-items-center p-10 text-center">
                  <p className="max-w-sm text-corpo leading-relaxed text-muted-foreground">
                    Este item não tem superfície visual própria — é{" "}
                    <span className="font-mono">{TYPE_LABEL[item.type]}</span>. O que ele entrega
                    está na aba de código.
                  </p>
                </div>
              ) : null}
            </div>

            {/* ficha */}
            <aside className="shrink-0 space-y-4 border-t border-border p-4 sm:p-5 lg:w-[300px] lg:border-l lg:border-t-0">
              <div>
                <h2
                  className="text-titulo font-semibold tracking-[-0.02em]"
                  style={{ fontFamily: "var(--font-display, inherit)" }}
                >
                  {item.title}
                </h2>
                <p className="mt-2 text-corpo leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>

              <CopyCommand text={installCommand(item.name)} />

              {/* Logo abaixo do comando, de propósito: a conta do que esse `add`
                  traz junto tem de estar do lado do gesto de instalar, não no
                  fim da ficha, depois das tags. */}
              <DepResumo name={item.name} className="border-t border-border pt-4" />

              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-[var(--r-pill,9999px)] border border-border px-2 py-0.5 text-rotulo text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <p className="text-rotulo leading-relaxed text-muted-foreground">
                <kbd className="rounded border border-border px-1 font-mono">←</kbd>{" "}
                <kbd className="rounded border border-border px-1 font-mono">→</kbd> percorre o
                catálogo · <kbd className="rounded border border-border px-1 font-mono">Esc</kbd>{" "}
                volta pra grade
              </p>
            </aside>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
