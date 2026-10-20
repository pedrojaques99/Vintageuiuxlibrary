"use client";

/**
 * Motion e estado: o kit montado como um gerador de imagens de exemplo.
 *
 * A versão anterior era a linha do tempo de um job contada em seis trechos
 * numerados ("01 enfileirado", "02 trabalhando"...), cada um com legenda. Lia
 * como aula. Aqui é UMA tela de app: o pedido à esquerda (texto, referência,
 * fila), os resultados chegando no meio e as exportações embaixo, com um erro
 * de verdade no meio delas. Os mesmos estados, no lugar em que a pessoa vai
 * encontrar cada um no produto dela. Quem quer o nome da peça passa o mouse.
 *
 * ── CPU ─────────────────────────────────────────────────────────────────────
 *
 * Um relógio só para a tela inteira, e ele para quando a aba some
 * (`usePageVisible`) ou quando a tela sai de vista (`useInView`). As peças que
 * rodam sozinhas por dentro (o ticker, a névoa) são desmontadas junto: fora de
 * vista os tiles ficam "prontos", que é o estado sem loop.
 */

import * as React from "react";
import { ImagePlus, RotateCcw, Sparkles } from "lucide-react";

import { StatusTicker } from "../../../registry/visant/ui/status-ticker";
import { WorkingGlyph } from "../../../registry/visant/ui/working-glyph";
import { GeneratingTile } from "../../../registry/visant/ui/generating-tile";
import { PaperShuttle } from "../../../registry/visant/ui/paper-shuttle";
import { GlitchChars } from "../../../registry/visant/ui/glitch-chars";
import { TurbulenceField } from "../../../registry/visant/ui/turbulence-field";
import { GridDots } from "../../../registry/visant/ui/grid-dots";
import { DropOverlay } from "../../../registry/visant/ui/drop-overlay";
import { Fold, FoldPart } from "../../../registry/visant/lib/fold-motion";
import { usePointerParallax } from "../../../registry/visant/hooks/use-pointer-parallax";
import { Media } from "../media";
import { usePageVisible, useInView } from "../stage";
import { Janela, Pecas } from "./sala";

/* Meio degrau acima do chão. Separa sem desenhar borda em todo nível. */
const DEGRAU = "bg-[color-mix(in_oklab,var(--card)_82%,var(--foreground)_6%)]";

const CHEGADA =
  "animate-in fade-in [animation-duration:var(--dur-base)] [animation-timing-function:var(--ease-out)]";

const ROTULO = "text-micro text-muted-foreground";

function Botao({
  children,
  onClick,
  forte,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  forte?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "alvo-toque inline-flex items-center justify-center gap-1.5 rounded-[var(--r-control,0.5rem)] px-3 py-2 text-apoio font-medium outline-none transition-[background-color,border-color,color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] focus-visible:[box-shadow:var(--focus)] " +
        (forte
          ? "w-full bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[color-mix(in_oklab,var(--brand)_88%,var(--foreground))]"
          : "border border-border text-muted-foreground hover:border-[color-mix(in_oklab,var(--foreground)_30%,transparent)] hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

/** O pedido foi aceito e ainda não começou: o lugar onde ele está na fila. */
function Fila({ posicao, ativo }: { posicao: number; ativo: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[var(--r-surface,0.875rem)] ${DEGRAU} p-3.5`}>
      <GridDots opacity={0.16} spacing={18} />
      {ativo ? <TurbulenceField intensity={0.14} /> : null}
      <p className={`relative ${ROTULO}`}>Próximo na fila</p>
      <div className="relative mt-2 grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((n) => {
          const meu = n === posicao;
          return (
            <div
              key={n}
              className={`grid h-11 place-items-center rounded-[var(--r-control,0.5rem)] border font-mono text-micro tabular-nums transition-[color,border-color] [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-out)] ${
                meu ? "border-[var(--brand)] text-foreground" : "border-dashed border-border text-muted-foreground"
              }`}
            >
              {n}
            </div>
          );
        })}
      </div>
      <p className="relative mt-2.5 text-apoio text-muted-foreground">
        Seu pedido é o <span className="font-mono tabular-nums text-foreground">{posicao}º</span>.
        Nada foi cobrado ainda.
      </p>
    </div>
  );
}

/** A grade de resultados: o tile ocupa o lugar do resultado até ele existir. */
function Resultados({ prontos }: { prontos: boolean[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  usePointerParallax(ref);
  const profundidade = [14, 6, 16, 9];

  return (
    <div ref={ref} className="relative">
      <GridDots opacity={0.14} spacing={18} />
      <div className="relative grid grid-cols-2 gap-3 xl:grid-cols-4">
        {prontos.map((pronto, i) => (
          <div
            key={i}
            className={`overflow-hidden rounded-[var(--r-control,0.5rem)] ${DEGRAU}`}
            style={{
              transform: `translate3d(calc(var(--px, 0) * ${profundidade[i]}px), calc(var(--py, 0) * ${profundidade[i]}px), 0)`,
            }}
          >
            <GeneratingTile isLoading={!pronto} aspectRatio="1/1" showFrame={false}>
              <Media papel="cena" indice={i} ratio="1/1" className={`size-full ${CHEGADA}`} />
            </GeneratingTile>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A exportação que falhou: a caixa não encolhe e o "tentar de novo" mora nela. */
function Falha() {
  type Estado = "erro" | "tentando" | "refeito";
  const [estado, setEstado] = React.useState<Estado>("erro");

  React.useEffect(() => {
    if (estado !== "tentando") return;
    const id = setTimeout(() => setEstado("refeito"), 2400);
    return () => clearTimeout(id);
  }, [estado]);

  return (
    <div className={`flex h-full min-h-[150px] flex-col rounded-[var(--r-surface,0.875rem)] ${DEGRAU} p-4`} role="status" aria-live="polite">
      <p className={ROTULO}>Variação 5, em 4K</p>
      <div className="grid flex-1 place-items-center">
        {estado === "tentando" ? (
          <GeneratingTile isLoading variant="inline" steps={["Refazendo", "Reenviando"]} />
        ) : estado === "refeito" ? (
          <div className={`flex w-full items-center gap-3 ${CHEGADA}`}>
            <Media papel="cena" indice={2} ratio="1/1" className="size-12 shrink-0 rounded-[var(--r-control,0.5rem)]" />
            <p className="text-apoio text-foreground">Pronta na segunda tentativa.</p>
          </div>
        ) : (
          <div className="w-full">
            <p className="text-apoio leading-relaxed text-foreground">
              Falhou em 0:22. O modelo recusou o pedido e nada foi cobrado.
            </p>
            <div className="mt-3">
              <Botao onClick={() => setEstado("tentando")}>
                <RotateCcw className="h-3.5 w-3.5" />
                Tentar de novo
              </Botao>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** A área de referência: vazia até chegar o primeiro arquivo. */
function Referencia() {
  const [sobre, setSobre] = React.useState(false);
  return (
    <div
      className="relative"
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
      <div className="relative grid h-[104px] place-items-center overflow-hidden rounded-[var(--r-control,0.5rem)] border border-dashed border-border px-4 text-center">
        <GridDots opacity={0.2} spacing={16} />
        <p className="relative flex items-center gap-2 text-apoio text-muted-foreground">
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Arraste uma imagem de referência
        </p>
      </div>
      <DropOverlay visible={sobre} message="Solte para usar como referência" />
    </div>
  );
}

export default function MotionEEstado() {
  const [raiz, naTela] = useInView<HTMLDivElement>("200px");
  const abaVisivel = usePageVisible();
  const ativo = naTela && abaVisivel;

  /* Um relógio só; cada parte deriva o estado dela por aritmética. */
  const [tique, setTique] = React.useState(0);
  React.useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => setTique((t) => t + 1), 120);
    return () => clearInterval(id);
  }, [ativo]);

  const posicaoNaFila = 4 - Math.floor((tique % 96) / 24);
  /* Sobe até 100 e segura alguns segundos antes de recomeçar. */
  const progresso = Math.min(100, (tique % 96) * 1.6);
  const prontos = [0, 1, 2, 3].map((i) => (ativo ? (tique + i * 19) % 116 > 58 : true));
  const quantos = prontos.filter(Boolean).length;

  return (
    <div ref={raiz}>
      <Janela endereco="prisma.app/gerar">
        <div className="grid lg:grid-cols-[19rem_1fr]">
          {/* o pedido */}
          <aside className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div>
              <p className={ROTULO}>Descreva a imagem</p>
              <p className="mt-1.5 rounded-[var(--r-control,0.5rem)] border border-border bg-background px-3 py-2.5 text-apoio leading-relaxed text-foreground">
                Garrafa de vidro âmbar sobre mesa de pedra, luz de fim de tarde, fundo desfocado.
              </p>
            </div>
            <Pecas nomes={["drop-overlay", "grid-dots"]}>
              <Referencia />
            </Pecas>
            <div className="flex items-center justify-between text-apoio text-muted-foreground">
              <span>4 variações</span>
              <span className="font-mono tabular-nums">1:1 · 2048 px</span>
            </div>
            <Botao forte>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Gerar de novo
            </Botao>
            <Pecas nomes={["turbulence-field", "grid-dots"]}>
              <Fila posicao={posicaoNaFila} ativo={ativo} />
            </Pecas>
          </aside>

          {/* o que está chegando */}
          <main className="min-w-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4">
              <Pecas nomes={["working-glyph", "status-ticker"]} className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0">
                <WorkingGlyph size={22} />
                <div className="min-h-[1.75rem] min-w-0 max-w-xs flex-1">{ativo ? <StatusTicker /> : null}</div>
              </Pecas>
              <Pecas nomes={["glitch-chars"]} canto="base-fim">
                <span className="font-mono text-apoio text-muted-foreground">
                  pedido #{ativo ? <GlitchChars length={4} /> : "7f3a"}
                </span>
              </Pecas>
              <span className="font-mono text-micro tabular-nums text-muted-foreground">
                {quantos} de 4 prontas
              </span>
            </div>

            <Fold variant="mask" as="div">
              <FoldPart>
                <Pecas nomes={["generating-tile", "use-pointer-parallax", "fold-motion"]}>
                  <Resultados prontos={prontos} />
                </Pecas>
              </FoldPart>
            </Fold>

            <h3 className="mt-7 text-apoio font-medium">Exportações</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Pecas nomes={["paper-shuttle"]}>
                <div className={`flex min-h-[150px] flex-col rounded-[var(--r-surface,0.875rem)] ${DEGRAU} p-4`}>
                  <p className={ROTULO}>4 imagens em PNG</p>
                  <div className="grid flex-1 place-items-center">
                    {ativo ? <PaperShuttle progress={progresso} /> : null}
                  </div>
                </div>
              </Pecas>
              <Pecas nomes={["paper-shuttle"]}>
                <div className={`flex min-h-[150px] flex-col rounded-[var(--r-surface,0.875rem)] ${DEGRAU} p-4`}>
                  <p className={ROTULO}>Prancha em PDF</p>
                  <div className="grid flex-1 place-items-center">
                    {ativo ? <PaperShuttle label="Montando o PDF" /> : null}
                  </div>
                </div>
              </Pecas>
              <Pecas nomes={["generating-tile"]}>
                <Falha />
              </Pecas>
            </div>
          </main>
        </div>
      </Janela>
    </div>
  );
}
