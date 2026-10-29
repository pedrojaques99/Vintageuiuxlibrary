"use client";

/**
 * Motion e estado: o kit montado como um gerador de imagens de exemplo.
 *
 * A versão anterior punha o job inteiro numa tela só: pedido, fila, quatro
 * resultados chegando, duas exportações com porcentagem e um erro, tudo
 * animando junto. O dono leu como "espremido e acontecendo ao mesmo tempo", e
 * era isso: com seis coisas se mexendo, nenhuma é o estado.
 *
 * Agora é UM job, contado em sequência no mesmo lugar: na fila, gerando,
 * pronto, exportando. A tela avança sozinha num ciclo calmo, e as etapas no
 * topo são botões: quem quer ver um estado com calma clica nele. Em cada
 * momento só uma região se mexe; o resto está parado esperando a vez.
 *
 * ── CPU ─────────────────────────────────────────────────────────────────────
 *
 * O relógio para quando a aba some (`usePageVisible`) ou quando a tela sai de
 * vista (`useInView`). Parado, a linha de status vira texto e o esqueleto perde
 * o brilho: nenhuma peça fica rodando loop fora da vista.
 */

import * as React from "react";
import { Download, FileText, ImagePlus, Sparkles } from "lucide-react";

import { StatusTicker } from "../../../registry/visant/ui/status-ticker";
import { WorkingGlyph } from "../../../registry/visant/ui/working-glyph";
import { SkeletonMedia } from "../../../registry/visant/ui/skeleton-rail";
import { PaperShuttle } from "../../../registry/visant/ui/paper-shuttle";
import { DropOverlay } from "../../../registry/visant/ui/drop-overlay";
import { ToastStack, ToastStackProvider, useToastStack } from "../../../registry/visant/ui/toast-stack";
import { Fold, FoldPart } from "../../../registry/visant/lib/fold-motion";
import { Media } from "../media";
import { usePageVisible, useInView } from "../stage";
import { Janela, Pecas } from "./sala";

type Fase = "fila" | "gerando" | "pronto" | "exportando";

const FASES: { id: Fase; rotulo: string }[] = [
  { id: "fila", rotulo: "Na fila" },
  { id: "gerando", rotulo: "Gerando" },
  { id: "pronto", rotulo: "Pronto" },
  { id: "exportando", rotulo: "Exportando" },
];

/* Quanto cada fase segura antes de passar a vez. Exportar termina sozinho. */
const DURACAO: Record<Exclude<Fase, "exportando">, number> = {
  fila: 3400,
  gerando: 5600,
  pronto: 3600,
};

const CHEGADA =
  "animate-in fade-in [animation-duration:var(--dur-base)] [animation-timing-function:var(--ease-out)]";

const BOTAO =
  "alvo-toque inline-flex items-center justify-center gap-1.5 rounded-[var(--r-control,0.5rem)] px-3.5 py-2 text-apoio font-medium outline-none transition-[background-color,border-color,color,opacity] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] focus-visible:[box-shadow:var(--focus)]";

const BOTAO_FORTE = `${BOTAO} bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[color-mix(in_oklab,var(--brand)_88%,var(--foreground))]`;

const BOTAO_CONTORNO = `${BOTAO} border border-border text-foreground hover:border-[color-mix(in_oklab,var(--foreground)_30%,transparent)] disabled:pointer-events-none disabled:opacity-40`;

/** A referência do pedido: um encaixe pequeno que acende quando algo passa por cima. */
function Referencia() {
  const [sobre, setSobre] = React.useState(false);
  return (
    <div
      className="relative size-11 shrink-0"
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
      onDragOver={(e) => {
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
      }}
    >
      <div
        className="grid size-full place-items-center rounded-[var(--r-control,0.5rem)] border border-dashed border-border text-muted-foreground"
        title="Arraste uma imagem de referência"
      >
        <ImagePlus className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Arraste uma imagem de referência</span>
      </div>
      <DropOverlay visible={sobre} message="Solte aqui" />
    </div>
  );
}

/** A linha que diz o que está acontecendo agora. Uma frase, nunca duas. */
function Status({ fase, ativo, formato }: { fase: Fase; ativo: boolean; formato: "png" | "pdf" }) {
  if (fase === "fila") {
    return (
      <Pecas nomes={["status-ticker"]} className={CHEGADA}>
        {ativo ? (
          <StatusTicker
            variant="pulso"
            steps={["2º na fila", "1º na fila"]}
            rotateEverySec={1.6}
            loop={false}
            showTimer={false}
          />
        ) : (
          <p className="text-apoio text-muted-foreground">1º na fila</p>
        )}
      </Pecas>
    );
  }
  if (fase === "gerando") {
    return (
      <Pecas nomes={["working-glyph", "status-ticker"]} className={`flex items-center gap-2.5 ${CHEGADA}`}>
        <WorkingGlyph variant="pincel" size={16} framed={false} />
        <div className="min-w-0 max-w-xs flex-1">
          {ativo ? (
            <StatusTicker steps={["Desenhando", "Refinando", "Lapidando"]} rotateEverySec={1.8} loop={false} />
          ) : (
            <p className="text-apoio text-muted-foreground">Refinando</p>
          )}
        </div>
      </Pecas>
    );
  }
  return (
    <p className={`text-apoio text-muted-foreground ${CHEGADA}`}>
      {fase === "pronto"
        ? "4 imagens prontas em 0:18"
        : formato === "png"
          ? "Exportando 4 imagens em PNG"
          : "Montando a prancha em PDF"}
    </p>
  );
}

/** O lugar das quatro imagens. O tamanho é o mesmo em toda fase: nada pula. */
function Grade({ fase, ativo, ciclo }: { fase: Fase; ativo: boolean; ciclo: number }) {
  const classeGrade = "grid grid-cols-2 gap-3 sm:grid-cols-4";

  if (fase === "fila") {
    return (
      <div className={classeGrade} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-square rounded-[var(--r-control,0.5rem)] border border-dashed border-border"
          />
        ))}
      </div>
    );
  }

  if (fase === "gerando") {
    return (
      <Pecas nomes={["skeleton-rail"]}>
        <div className={classeGrade}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonMedia
              key={i}
              ratio="1 / 1"
              radius="var(--r-control, 0.5rem)"
              motion={ativo ? "shimmer" : "none"}
              label={i === 0 ? "Gerando as imagens" : false}
              delay={i * 120}
            />
          ))}
        </div>
      </Pecas>
    );
  }

  const imagens = (
    <div className={classeGrade}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-[var(--r-control,0.5rem)]">
          <Media papel="cena" indice={i} ratio="1/1" className="size-full" />
        </div>
      ))}
    </div>
  );

  /* A chegada acontece uma vez por ciclo: em "exportando" as imagens já estão lá. */
  if (fase === "pronto") {
    return (
      <Pecas nomes={["fold-motion"]}>
        <Fold key={ciclo} variant="mist" as="div">
          <FoldPart>{imagens}</FoldPart>
        </Fold>
      </Pecas>
    );
  }
  return imagens;
}

/** O rodapé do job: as saídas, e o envio delas quando a pessoa pede. */
function Saida({
  fase,
  progresso,
  formato,
  exportar,
}: {
  fase: Fase;
  progresso: number;
  formato: "png" | "pdf";
  exportar: (f: "png" | "pdf") => void;
}) {
  const pronto = fase === "pronto";
  return (
    <Pecas nomes={["paper-shuttle", "toast-stack"]} className="grid min-h-[7.5rem] place-items-center">
      {fase === "exportando" && progresso >= 100 ? (
        /* Envio terminado: o rodapé fica livre pro aviso ocupar o mesmo lugar. */
        <span aria-hidden="true" />
      ) : fase === "exportando" ? (
        <PaperShuttle
          className={CHEGADA}
          progress={formato === "png" ? progresso : undefined}
          label={formato === "pdf" ? "Montando o PDF" : undefined}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button type="button" disabled={!pronto} onClick={() => exportar("png")} className={BOTAO_CONTORNO}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar PNG
          </button>
          <button type="button" disabled={!pronto} onClick={() => exportar("pdf")} className={BOTAO_CONTORNO}>
            <FileText className="h-4 w-4" aria-hidden="true" />
            Prancha em PDF
          </button>
        </div>
      )}
      <ToastStack contained position="bottom-center" label="Avisos do gerador" />
    </Pecas>
  );
}

function Gerador() {
  const [raiz, naTela] = useInView<HTMLDivElement>("200px");
  const abaVisivel = usePageVisible();
  const ativo = naTela && abaVisivel;
  const { toast } = useToastStack();

  const [fase, setFase] = React.useState<Fase>("fila");
  const [ciclo, setCiclo] = React.useState(0);
  const [formato, setFormato] = React.useState<"png" | "pdf">("png");
  const [progresso, setProgresso] = React.useState(0);
  const avisado = React.useRef(-1);

  const recomecar = React.useCallback(() => {
    setCiclo((c) => c + 1);
    setFase("fila");
  }, []);

  const exportar = React.useCallback((f: "png" | "pdf") => {
    avisado.current = -1;
    setFormato(f);
    setProgresso(0);
    setFase("exportando");
  }, []);

  /* As três primeiras fases passam a vez por tempo. */
  React.useEffect(() => {
    if (!ativo || fase === "exportando") return;
    const id = window.setTimeout(() => {
      if (fase === "pronto") exportar(ciclo % 2 ? "pdf" : "png");
      else setFase(fase === "fila" ? "gerando" : "pronto");
    }, DURACAO[fase]);
    return () => window.clearTimeout(id);
  }, [ativo, fase, ciclo, exportar]);

  /* Exportar anda até o fim, avisa e recomeça o ciclo depois de um respiro. */
  React.useEffect(() => {
    if (!ativo || fase !== "exportando") return;
    if (progresso >= 100) {
      /* Voltar à vista com o envio já completo não repete o aviso. */
      if (avisado.current !== ciclo) {
        avisado.current = ciclo;
        toast({
          type: "success",
          title: formato === "png" ? "4 imagens exportadas" : "Prancha pronta",
          description: formato === "png" ? "garrafa-ambar.zip" : "garrafa-ambar.pdf",
          duration: 3200,
        });
      }
      const id = window.setTimeout(recomecar, 3600);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setProgresso((p) => Math.min(100, p + 4)), 140);
    return () => window.clearTimeout(id);
  }, [ativo, fase, progresso, formato, toast, recomecar]);

  const escolher = (f: Fase) => {
    if (f === "exportando") exportar(formato);
    else setFase(f);
  };

  return (
    <div ref={raiz}>
      <Janela endereco="prisma.app/gerar">
        <div className="mx-auto flex max-w-3xl flex-col px-4 py-8 sm:px-8 sm:py-12">
          {/* o pedido */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 rounded-[var(--r-control,0.5rem)] border border-border bg-background px-3.5 py-2.5 text-apoio leading-relaxed text-foreground">
              Garrafa de vidro âmbar sobre mesa de pedra, luz de fim de tarde.
            </p>
            <div className="flex items-center gap-3">
              <Pecas nomes={["drop-overlay"]}>
                <Referencia />
              </Pecas>
              <button type="button" onClick={recomecar} className={`${BOTAO_FORTE} flex-1 sm:flex-none`}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Gerar
              </button>
            </div>
          </div>

          {/* as etapas: dizem onde o job está e deixam ir direto a uma delas */}
          <ol className="mt-10 grid grid-cols-4 gap-2 sm:mt-12" aria-label="Etapas do pedido">
            {FASES.map((f) => {
              const atual = f.id === fase;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => escolher(f.id)}
                    aria-current={atual ? "step" : undefined}
                    className={`alvo-toque flex w-full flex-col gap-2 rounded-[var(--r-control,0.5rem)] pb-1 text-left text-micro outline-none transition-[color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] focus-visible:[box-shadow:var(--focus)] sm:text-apoio ${
                      atual ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-0.5 w-full rounded-full transition-[background-color] [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-out)] ${
                        atual ? "bg-[var(--brand)]" : "bg-border"
                      }`}
                    />
                    {f.rotulo}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* o estado atual, num lugar só */}
          <div className="mt-8 flex min-h-[2rem] items-center" role="status" aria-live="polite">
            <Status key={`${fase}-${ciclo}`} fase={fase} ativo={ativo} formato={formato} />
          </div>

          <div className="mt-4">
            <Grade fase={fase} ativo={ativo} ciclo={ciclo} />
          </div>

          <div className="mt-6">
            <Saida fase={fase} progresso={progresso} formato={formato} exportar={exportar} />
          </div>
        </div>
      </Janela>
    </div>
  );
}

export default function MotionEEstado() {
  return (
    <ToastStackProvider>
      <Gerador />
    </ToastStackProvider>
  );
}
