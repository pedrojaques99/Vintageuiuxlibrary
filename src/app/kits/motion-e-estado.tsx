"use client";

/**
 * Motion e estado — a sala escura, e a única em que tudo se move sozinho.
 *
 * As catorze peças deste kit respondem a uma pergunta só: *o que a interface
 * mostra enquanto o resultado não existe?* Card parado numa vitrine é o pior
 * lugar possível para elas — um `paper-shuttle` congelado é um retângulo, um
 * `status-ticker` sem tempo passando é uma frase.
 *
 * Então aqui elas rodam em loop, juntas, montadas como o painel de uma máquina
 * trabalhando: fila de geração, exportação em curso, área de largar arquivo,
 * rota carregando. Vende por hipnose, que é como esse tipo de peça vende.
 *
 * Os relógios param com a aba escondida (`usePageVisible`). Uma sala inteira em
 * `setInterval` num segundo plano é o jeito mais rápido de virar ventilador.
 */

import * as React from "react";

import { StatusTicker } from "../../../registry/visant/ui/status-ticker";
import { WorkingGlyph } from "../../../registry/visant/ui/working-glyph";
import { GeneratingTile } from "../../../registry/visant/ui/generating-tile";
import { PaperShuttle } from "../../../registry/visant/ui/paper-shuttle";
import { OctahedronLoader } from "../../../registry/visant/ui/octahedron-loader";
import { GlitchChars } from "../../../registry/visant/ui/glitch-chars";
import { TurbulenceField } from "../../../registry/visant/ui/turbulence-field";
import { GridDots } from "../../../registry/visant/ui/grid-dots";
import { DropOverlay } from "../../../registry/visant/ui/drop-overlay";
import { SpringDots } from "../../../registry/visant/ui/spring-dots";
import { Fold, FoldPart } from "../../../registry/visant/lib/fold-motion";
import { usePointerParallax } from "../../../registry/visant/hooks/use-pointer-parallax";
import { Media } from "../media";
import { usePageVisible } from "../stage";

function Painel({
  titulo,
  nota,
  children,
  className = "",
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card ${className}`}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <h3 className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
          {titulo}
        </h3>
        {nota ? <span className="font-mono text-micro text-muted-foreground">{nota}</span> : null}
      </header>
      <div className="relative p-3.5">{children}</div>
    </section>
  );
}

/** A colagem que responde ao ponteiro — o hook escreve `--px`/`--py`, o CSS
 *  decide a profundidade de cada objeto por `--d`. */
function Colagem() {
  const ref = React.useRef<HTMLDivElement>(null);
  usePointerParallax(ref);
  const objetos = [
    { d: 30, cls: "left-[8%] top-[14%] w-24", papel: "cena" as const, i: 0 },
    { d: 16, cls: "right-[10%] top-[22%] w-32", papel: "retrato" as const, i: 1 },
    { d: 44, cls: "left-[36%] bottom-[10%] w-20", papel: "textura" as const, i: 2 },
  ];
  return (
    <div ref={ref} className="relative h-[230px] w-full overflow-hidden">
      <GridDots opacity={0.3} spacing={18} />
      {objetos.map((o) => (
        <div
          key={o.cls}
          className={`absolute overflow-hidden rounded-[var(--r-control)] border border-border ${o.cls}`}
          style={{
            transform: `translate3d(calc(var(--px, 0) * ${o.d}px), calc(var(--py, 0) * ${o.d}px), 0)`,
          }}
        >
          <Media papel={o.papel} indice={o.i} ratio="1/1" className="size-full" />
        </div>
      ))}
      <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-micro text-muted-foreground">
        mova o ponteiro
      </span>
    </div>
  );
}

export default function MotionEEstado() {
  const visible = usePageVisible();
  const [progresso, setProgresso] = React.useState(0.08);
  const [gerando, setGerando] = React.useState([true, true, false, true]);
  const [sobre, setSobre] = React.useState(false);

  /* Um relógio só para a sala inteira. Quatro peças em loop com quatro
     `setInterval` próprios é a mesma conta feita quatro vezes. */
  React.useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setProgresso((v) => (v > 0.97 ? 0.03 : v + 0.02)), 110);
    return () => clearInterval(id);
  }, [visible]);

  React.useEffect(() => {
    if (!visible) return;
    const id = setInterval(
      () => setGerando((atual) => atual.map((v, i) => (Math.random() > 0.72 ? !v : v))),
      2600,
    );
    return () => clearInterval(id);
  }, [visible]);

  return (
    <div className="space-y-4">
      {/* A dobra entra uma vez, com hierarquia — é o que o `fold-motion` faz:
          rise para o que abre, e não trinta entradas iguais. */}
      <Fold
        variant="mask"
        className="relative overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card p-6 sm:p-8"
      >
        <TurbulenceField intensity={0.35} />
        <FoldPart>
          <div className="relative flex flex-wrap items-center gap-4">
            <WorkingGlyph size={26} />
            <h2
              className="text-[clamp(1.4rem,3vw,2rem)] font-semibold leading-tight tracking-tight"
              style={{ fontFamily: "var(--font-display, inherit)" }}
            >
              A máquina trabalhando
            </h2>
            <span className="ml-auto font-mono text-apoio text-muted-foreground">
              job <GlitchChars length={4} />
            </span>
          </div>
        </FoldPart>
        <FoldPart>
          <p className="relative mt-3 max-w-xl text-corpo text-muted-foreground">
            Toda peça desta sala existe para o intervalo entre pedir e receber. É o pedaço da
            interface que o usuário mais olha e o que menos costuma ser desenhado.
          </p>
        </FoldPart>
      </Fold>

      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="fila de geração" nota="generating-tile" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gerando.map((carregando, i) => (
              <GeneratingTile key={i} isLoading={carregando} aspectRatio="1/1">
                <Media papel="cena" indice={i} ratio="1/1" className="size-full" />
              </GeneratingTile>
            ))}
          </div>
          <div className="mt-3.5">
            <StatusTicker />
          </div>
        </Painel>

        <Painel titulo="rota carregando" nota="octahedron-loader">
          <div className="grid min-h-[200px] place-items-center [&>[role=status]]:min-h-0">
            <OctahedronLoader size={78} />
          </div>
        </Painel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="exportando" nota="paper-shuttle">
          <div className="grid min-h-[130px] place-items-center">
            <PaperShuttle progress={progresso} label="exportando" />
          </div>
        </Painel>

        <Painel titulo="largue o arquivo" nota="drop-overlay">
          <div
            className="relative min-h-[130px]"
            onMouseEnter={() => setSobre(true)}
            onMouseLeave={() => setSobre(false)}
          >
            <div className="grid h-[130px] place-items-center rounded-[var(--r-control,0.5rem)] border border-dashed border-border text-rotulo text-muted-foreground">
              passe o mouse
            </div>
            <DropOverlay visible={sobre} message="Solte os arquivos" />
          </div>
        </Painel>

        <Painel titulo="campo com mola" nota="spring-dots">
          <SpringDots className="h-[130px] w-full rounded-[var(--r-control,0.5rem)]" />
        </Painel>
      </div>

      <Painel titulo="profundidade por ponteiro" nota="use-pointer-parallax">
        <Colagem />
      </Painel>
    </div>
  );
}
