"use client";

/**
 * Motion e estado — a sala escura, e a única em que tudo se move sozinho.
 *
 * As catorze peças deste kit respondem a uma pergunta só: *o que a interface
 * mostra enquanto o resultado não existe?* Card parado numa vitrine é o pior
 * lugar possível para elas — um `paper-shuttle` congelado é um retângulo, um
 * `status-ticker` sem tempo passando é uma frase.
 *
 * ── O que mudou, e por quê ──────────────────────────────────────────────────
 *
 * Esta era a sala mais culpada da queixa "caixa dentro de caixa": sala →
 * painel `rounded+border+bg-card` → tile com borda, três molduras antes da
 * peça, e o nome dela escrito no canto de cada painel como legenda morta de
 * catálogo. Agora a profundidade é **degrau de superfície e espaço** (as
 * primitivas de `sala.tsx`), e o nome da peça é o botão que copia o `add` dela.
 *
 * Sobrou UMA moldura dentro da sala: o painel do ato 04, que é de fato uma
 * janela de app (a grade de resultados do estúdio). O resto desenha direto na
 * superfície da sala.
 *
 * ── E a ordem ───────────────────────────────────────────────────────────────
 *
 * Antes era uma grade de painéis soltos, sem narrativa: exportação ao lado de
 * área de largar arquivo ao lado de paralaxe. Aqui a sala é a **linha do tempo
 * de um job real**: enfileirado → trabalhando → progresso → chegou, e depois as
 * duas pontas que toda vitrine esquece, falhou e vazio. É nessa ordem que a
 * pessoa vai encontrar esses estados no produto dela.
 *
 * ── CPU ─────────────────────────────────────────────────────────────────────
 *
 * Um relógio só para a sala inteira, e ele para quando a aba some
 * (`usePageVisible`) ou quando a composição sai da tela (`useInView`). As peças
 * que rodam sozinhas por dentro (o ticker, a névoa) são desmontadas junto: com
 * a sala fora de vista os tiles ficam "prontos", que é o estado sem loop. Sala
 * de motion é a que mais queima ciclo à toa.
 */

import * as React from "react";
import { RotateCcw } from "lucide-react";

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
import { Atos, Bloco, Faixa, Fecho, Painel } from "./sala";

/* Meio degrau acima do chão da sala. É o que separa uma caixa da outra sem
   desenhar borda em todo nível — a regra que `sala.tsx` impõe. */
const DEGRAU = "bg-[color-mix(in_oklab,var(--card)_82%,var(--foreground)_6%)]";

/* A entrada do resultado. Uma vez, curta, e o guard global de
   `prefers-reduced-motion` zera a duração sem zerar o resultado. */
const CHEGADA =
  "animate-in fade-in [animation-duration:var(--dur-base)] [animation-timing-function:var(--ease-out)]";

/** Botão de chrome da vitrine (não é peça de registry, e não finge ser). */
function BotaoChrome({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="alvo-toque inline-flex items-center gap-1.5 rounded-[var(--r-control,0.5rem)] border border-border px-2.5 py-1.5 text-apoio text-muted-foreground outline-none transition-[color,border-color,transform] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--brand)] hover:text-foreground focus-visible:border-[var(--brand)] active:scale-[0.97] active:[transition-duration:var(--dur-press)] motion-reduce:active:scale-100"
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* 01 · enfileirado                                                            */
/* -------------------------------------------------------------------------- */

/**
 * O pedido foi aceito e ainda não começou.
 *
 * O estado que quase ninguém desenha, porque não tem o que animar: não existe
 * progresso, e uma barra em 0% aqui seria mentira. O que dá para prometer é o
 * LUGAR onde o resultado vai cair, e a posição na fila.
 */
function Fila({ posicao, ativo }: { posicao: number; ativo: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[var(--r-surface,0.875rem)] ${DEGRAU} p-4 sm:p-5`}>
      <GridDots opacity={0.16} spacing={18} />
      {/* A névoa só existe enquanto a sala está na tela: é filtro SVG animado,
          e animar filtro fora de vista é a conta mais cara desta página. */}
      {ativo ? <TurbulenceField intensity={0.14} /> : null}

      {/* Largura travada: esticados na coluna inteira os quatro lugares viravam
          barras horizontais e paravam de ler como "vaga de resultado". */}
      <div className="relative grid max-w-md grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((n) => {
          const meu = n === posicao;
          return (
            <div
              key={n}
              className={`grid h-16 place-items-center rounded-[var(--r-control,0.5rem)] border font-mono text-micro tabular-nums transition-[color,border-color] [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-out)] sm:h-20 ${
                meu
                  ? "border-[var(--brand)] text-foreground"
                  : "border-dashed border-border text-muted-foreground"
              }`}
            >
              {n}
            </div>
          );
        })}
      </div>

      <p className="relative mt-3.5 text-apoio text-muted-foreground">
        Seu pedido é o{" "}
        <span className="font-mono tabular-nums text-foreground">{posicao}º</span> da fila. Quatro
        lugares guardados, nenhum resultado ainda.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 04 · chegou                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A grade do estúdio: o tile ocupa o lugar do resultado até o resultado existir.
 *
 * A profundidade por ponteiro entra AQUI, e não num painel próprio de demo: o
 * hook existe para a colagem parecer objeto e não print, e é no momento em que
 * o resultado chega que ele deixa de ser placeholder. Cada tile carrega o seu
 * `--d`; o hook só escreve `--px`/`--py` uma vez por quadro.
 */
function Resultados({ prontos }: { prontos: boolean[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  usePointerParallax(ref);
  /* Profundidades curtas de propósito: acima de ~16px a grade lê como grade
     quebrada em vez de colagem com camada. */
  const profundidade = [14, 6, 16, 9];

  return (
    <div ref={ref} className="relative p-3.5 sm:p-4">
      <GridDots opacity={0.16} spacing={18} />
      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
        {prontos.map((pronto, i) => (
          <div
            key={i}
            className={`overflow-hidden rounded-[var(--r-control,0.5rem)] ${DEGRAU}`}
            style={{
              transform: `translate3d(calc(var(--px, 0) * ${profundidade[i]}px), calc(var(--py, 0) * ${profundidade[i]}px), 0)`,
            }}
          >
            {/* `showFrame={false}`: a moldura é do painel, uma vez. Sem isto o
                tile trazia a terceira borda da tela. */}
            <GeneratingTile isLoading={!pronto} aspectRatio="1/1" showFrame={false}>
              <Media
                papel="cena"
                indice={i}
                ratio="1/1"
                className={`size-full ${CHEGADA}`}
              />
            </GeneratingTile>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 05 · falhou                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A ponta que a vitrine sempre esquece, e a que dói mais: a espera prometeu
 * conteúdo por vinte segundos e entregou nada.
 *
 * Duas decisões que o desenho carrega: a caixa NÃO encolhe quando o erro chega
 * (o layout desabando é a segunda má notícia), e o "tentar de novo" mora dentro
 * dela, porque procurar o botão de retry em outro canto é o terceiro castigo.
 */
function Falha() {
  type Estado = "erro" | "tentando" | "refeito";
  const [estado, setEstado] = React.useState<Estado>("erro");

  React.useEffect(() => {
    if (estado !== "tentando") return;
    const id = setTimeout(() => setEstado("refeito"), 2400);
    return () => clearTimeout(id);
  }, [estado]);

  return (
    <div
      className={`grid min-h-[168px] place-items-center rounded-[var(--r-surface,0.875rem)] ${DEGRAU} p-5`}
      role="status"
      aria-live="polite"
    >
      {estado === "tentando" ? (
        <GeneratingTile isLoading variant="inline" steps={["Refazendo", "Reenviando"]} />
      ) : estado === "refeito" ? (
        <div className={`flex w-full items-center gap-3 ${CHEGADA}`}>
          <Media papel="cena" indice={2} ratio="1/1" className="size-14 shrink-0 rounded-[var(--r-control,0.5rem)]" />
          <div className="min-w-0">
            <p className="text-corpo text-foreground">Chegou na segunda tentativa.</p>
            <p className="mt-0.5 text-apoio text-muted-foreground">
              O resultado entra no mesmo lugar que o erro ocupava.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <p className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
            falhou em 0:22
          </p>
          <p className="mt-1.5 text-corpo leading-relaxed text-foreground">
            O modelo recusou o pedido. Nada foi cobrado.
          </p>
          <div className="mt-3.5">
            <BotaoChrome onClick={() => setEstado("tentando")}>
              <RotateCcw className="h-3.5 w-3.5" />
              Tentar de novo
            </BotaoChrome>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 06 · vazio                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * O vazio é uma espera também: a do primeiro arquivo. Por isso ele não é uma
 * frase cinza no meio de um retângulo, é a superfície que começa o trabalho.
 */
function Vazio() {
  const [sobre, setSobre] = React.useState(false);

  return (
    <div
      className="relative min-h-[168px]"
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
      <div className="relative grid h-[168px] place-items-center overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-dashed border-border px-5 text-center">
        <GridDots opacity={0.2} spacing={18} />
        <div className="relative">
          <p className="text-corpo text-foreground">Nenhum job por aqui.</p>
          <p className="mt-1 text-apoio text-muted-foreground">
            {/* Era "passe o ponteiro ou arraste um arquivo PARA VER O ALVO
                APARECER" — a segunda metade ensinava a olhar a demo, não a usar
                o produto. Um estado vazio de verdade diz o que fazer, não o que
                observar. */}
            Arraste um arquivo para começar.
          </p>
        </div>
      </div>
      <DropOverlay visible={sobre} message="Solte para começar" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export default function MotionEEstado() {
  const [raiz, naTela] = useInView<HTMLDivElement>("200px");
  const abaVisivel = usePageVisible();
  const ativo = naTela && abaVisivel;

  /*
   * Um relógio só para a sala inteira.
   *
   * Cada peça em loop com o próprio `setInterval` é a mesma conta feita seis
   * vezes, e seis timers para parar quando a aba some. Aqui existe um tique, e
   * cada ato deriva o estado dele por aritmética.
   */
  const [tique, setTique] = React.useState(0);
  React.useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => setTique((t) => t + 1), 120);
    return () => clearInterval(id);
  }, [ativo]);

  const posicaoNaFila = 4 - Math.floor((tique % 96) / 24);
  /* 0 a 100, porque a prop do `paper-shuttle` é porcentagem. A versão anterior
     mandava 0.03–0.99 e a barra ficava eternamente em "0%": progresso que não
     progride é exatamente o defeito que esta sala existe para denunciar.
     O ciclo é maior que a subida de propósito: a barra chega aos 100 e SEGURA
     alguns segundos antes de recomeçar, senão a volta a zero lê como barra
     andando para trás. */
  const progresso = Math.min(100, (tique % 96) * 1.6);
  /* Fora de vista os quatro chegam: o tile pronto é o único estado sem loop
     por dentro (o que gera roda ticker e névoa). */
  const prontos = [0, 1, 2, 3].map((i) => (ativo ? (tique + i * 19) % 116 > 58 : true));

  return (
    <div ref={raiz}>
      {/* A abertura saiu inteira. Ela dizia "o intervalo entre pedir e receber,
          na ordem em que um job atravessa" — que é, palavra por palavra, o que
          os seis atos numerados logo abaixo mostram acontecendo. Legenda do que
          vem a seguir é o texto que a página menos precisa. */}
      <Atos>
        <Bloco
          titulo="01 enfileirado"
          pecas={["grid-dots", "turbulence-field"]}
          nota="aceito, ainda não começou"
        >
          <Fila posicao={posicaoNaFila} ativo={ativo} />
        </Bloco>

        <Bloco
          titulo="02 trabalhando"
          pecas={["working-glyph", "status-ticker", "glitch-chars"]}
          nota="sem número para mostrar, sobra o texto"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <WorkingGlyph size={26} />
              <div className="min-w-0 flex-1">
                {/* Altura reservada: o ticker troca de verbo sozinho, e sem
                    piso a linha de baixo dança a cada palavra mais longa. */}
                <div className="min-h-[1.75rem] max-w-xs">
                  {ativo ? <StatusTicker /> : null}
                </div>
                <p className="mt-2 max-w-md text-corpo leading-relaxed text-muted-foreground">
                  Numa geração de vinte a sessenta segundos não existe progresso para medir. O verbo
                  que troca sustenta a leitura de que há trabalho acontecendo, e o cronômetro devolve
                  à pessoa a decisão de esperar.
                </p>
              </div>
            </div>
            {/* O glitch tem `setInterval` próprio, e `setInterval` continua
                (throttled) numa aba escondida. Com a sala pausada o id vira
                texto parado: o job existe, só não está sendo reescrito. */}
            <p className="shrink-0 font-mono text-apoio text-muted-foreground">
              job {ativo ? <GlitchChars length={4} /> : "7f3a"}
            </p>
          </div>
        </Bloco>

        <Bloco
          titulo="03 progresso"
          pecas={["paper-shuttle"]}
          nota="a barra só entra quando a porcentagem é verdadeira"
        >
          <div className="grid gap-7 sm:grid-cols-2">
            {/* Cada um ganha o próprio chão. Solto na coluna, o loader de 200px
                ficava centrado e o texto encostado à esquerda, e os dois
                pareciam não ter relação. */}
            <div>
              <div className={`grid min-h-[132px] place-items-center rounded-[var(--r-surface,0.875rem)] ${DEGRAU} p-4`}>
                {ativo ? <PaperShuttle progress={progresso} /> : null}
              </div>
              <p className="mt-3 text-apoio leading-relaxed text-muted-foreground">
                Com número: exportação, conversão, upload. A porcentagem sai do byte que já passou.
              </p>
            </div>
            <div>
              <div className={`grid min-h-[132px] place-items-center rounded-[var(--r-surface,0.875rem)] ${DEGRAU} p-4`}>
                {ativo ? <PaperShuttle label="Convertendo o PDF" /> : null}
              </div>
              <p className="mt-3 text-apoio leading-relaxed text-muted-foreground">
                Sem número: a mesma peça em modo indeterminado. Melhor que uma barra inventada que
                estaciona em 90% e fica lá.
              </p>
            </div>
          </div>
        </Bloco>

        {/* `mask` entra uma vez, com hierarquia — é o que o `fold-motion` faz:
            uma revelação para a dobra, e não trinta entradas iguais. */}
        <Fold variant="mask" as="div">
          <FoldPart>
            <Bloco
              titulo="04 chegou"
              pecas={["generating-tile", "use-pointer-parallax", "fold-motion"]}
              nota="a grade responde ao ponteiro: cada resultado tem a profundidade dele"
            >
              <Painel
                barra={
                  <>
                    <span className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
                      estúdio
                    </span>
                    <span className="ml-auto font-mono text-micro tabular-nums text-muted-foreground">
                      {prontos.filter(Boolean).length} de 4 prontos
                    </span>
                  </>
                }
              >
                <Resultados prontos={prontos} />
              </Painel>
            </Bloco>
          </FoldPart>
        </Fold>

        {/*
          As duas pontas ganham chão próprio.

          Não é hierarquia menor: é o contrário. Falha e vazio são os estados que
          a vitrine corta primeiro e o produto encontra primeiro, e a faixa marca
          que a linha do tempo se abriu em dois finais possíveis.
        */}
        <Faixa tom="recuo" className="py-8 sm:py-10">
          <div className="grid gap-9 lg:grid-cols-2 lg:gap-10">
            <Bloco titulo="05 falhou" nota="a caixa é a mesma do ato anterior, o conteúdo é que troca">
              <Falha />
            </Bloco>
            <Bloco titulo="06 vazio" pecas={["drop-overlay"]} nota="esperando o primeiro arquivo">
              <Vazio />
            </Bloco>
          </div>
        </Faixa>

        <Fecho>
          Espera desenhada é o que separa um app que parece rápido de um que parece travado. Este kit
          cobre os seis momentos do intervalo, do pedido aceito ao erro, e todos param sozinhos
          quando a aba sai da frente.
        </Fecho>
      </Atos>
    </div>
  );
}
